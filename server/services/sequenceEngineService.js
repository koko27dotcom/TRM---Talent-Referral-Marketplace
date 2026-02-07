/**
 * Sequence Engine Service
 * Handles drip sequence processing, triggers, and automation
 * Runs scheduled jobs to process sequence enrollments
 */

const cron = require('node-cron');
const { 
  EmailSequence, 
  EmailCampaign, 
  EmailTemplate, 
  EmailLog,
  User,
  UserSegment,
  Job,
  Referral,
  Application,
  Company,
} = require('../models/index.js');
const { sendEmail, queueEmail } = require('./emailMarketingService.js');

// Active cron jobs storage
const activeJobs = new Map();

/**
 * Initialize the sequence engine
 * Sets up cron jobs for sequence processing
 */
const initializeSequenceEngine = () => {
  // Process sequences every 5 minutes
  const sequenceJob = cron.schedule('*/5 * * * *', async () => {
    console.log('[SequenceEngine] Processing sequences...');
    await processSequences();
  });
  
  // Check triggers every minute
  const triggerJob = cron.schedule('* * * * *', async () => {
    await checkEventTriggers();
  });
  
  // Refresh dynamic segments hourly
  const segmentJob = cron.schedule('0 * * * *', async () => {
    await refreshDynamicSegments();
  });
  
  activeJobs.set('sequence', sequenceJob);
  activeJobs.set('trigger', triggerJob);
  activeJobs.set('segment', segmentJob);
  
  console.log('[SequenceEngine] Initialized successfully');
};

/**
 * Stop the sequence engine
 */
const stopSequenceEngine = () => {
  activeJobs.forEach((job, name) => {
    job.stop();
    console.log(`[SequenceEngine] Stopped ${name} job`);
  });
  activeJobs.clear();
};

/**
 * Process all active sequences
 * Checks for users ready for their next step
 */
const processSequences = async () => {
  try {
    // Find sequences with active enrollments ready for next step
    const sequences = await EmailSequence.find({
      status: 'active',
      'enrollments.status': 'active',
      'enrollments.nextStepAt': { $lte: new Date() },
    });
    
    for (const sequence of sequences) {
      await processSequence(sequence);
    }
    
    console.log(`[SequenceEngine] Processed ${sequences.length} sequences`);
  } catch (error) {
    console.error('[SequenceEngine] Error processing sequences:', error);
  }
};

/**
 * Process a single sequence
 * @param {EmailSequence} sequence - Sequence to process
 */
const processSequence = async (sequence) => {
  const readyEnrollments = sequence.enrollments.filter(
    e => e.status === 'active' && e.nextStepAt && e.nextStepAt <= new Date()
  );
  
  for (const enrollment of readyEnrollments) {
    try {
      await processSequenceStep(sequence, enrollment);
    } catch (error) {
      console.error(`[SequenceEngine] Error processing enrollment ${enrollment._id}:`, error);
    }
  }
};

/**
 * Process a single sequence step for an enrollment
 * @param {EmailSequence} sequence - Parent sequence
 * @param {Object} enrollment - User enrollment
 */
const processSequenceStep = async (sequence, enrollment) => {
  const step = sequence.steps.find(s => s.stepNumber === enrollment.currentStep);
  
  if (!step || !step.isActive) {
    // Skip to next step if current step is inactive
    await sequence.advanceUser(enrollment.userId);
    return;
  }
  
  // Get user details
  const user = await User.findById(enrollment.userId);
  if (!user) {
    enrollment.status = 'cancelled';
    await sequence.save();
    return;
  }
  
  // Build context for condition evaluation
  const context = await buildContext(user, enrollment);
  
  // Check exit conditions
  const exitCheck = sequence.checkExitConditions(context);
  if (exitCheck.shouldExit) {
    enrollment.status = 'completed';
    enrollment.completedAt = new Date();
    await sequence.save();
    return;
  }
  
  // Check skip conditions
  const shouldSkip = sequence.evaluateConditions(step.skipConditions, context);
  if (shouldSkip) {
    step.stats.skipped += 1;
    await sequence.advanceUser(enrollment.userId);
    await sequence.save();
    return;
  }
  
  // Check send conditions
  const shouldSend = sequence.evaluateConditions(step.sendConditions, context);
  if (!shouldSend && step.sendConditions.length > 0) {
    // Conditions not met, delay and try again later
    enrollment.nextStepAt = new Date(Date.now() + 60 * 60 * 1000); // Try again in 1 hour
    await sequence.save();
    return;
  }
  
  // Get template
  const template = await EmailTemplate.findById(step.templateId);
  if (!template) {
    console.error(`[SequenceEngine] Template not found for step ${step.stepNumber}`);
    await sequence.advanceUser(enrollment.userId);
    return;
  }
  
  // Determine A/B variant if enabled
  let selectedTemplate = template;
  let variantName = null;
  
  if (step.abTesting.enabled && step.abTesting.variants.length > 0) {
    const assignedVariant = enrollment.assignedVariant.get(String(step.stepNumber));
    
    if (assignedVariant) {
      const variant = step.abTesting.variants.find(v => v.name === assignedVariant);
      if (variant) {
        selectedTemplate = await EmailTemplate.findById(variant.templateId) || template;
        variantName = variant.name;
      }
    } else {
      // Assign variant based on percentage
      const random = Math.random() * 100;
      let cumulative = 0;
      
      for (const variant of step.abTesting.variants) {
        cumulative += variant.percentage;
        if (random <= cumulative) {
          selectedTemplate = await EmailTemplate.findById(variant.templateId) || template;
          variantName = variant.name;
          enrollment.assignedVariant.set(String(step.stepNumber), variant.name);
          break;
        }
      }
    }
  }
  
  // Prepare variables
  const variables = {
    name: user.name || user.email.split('@')[0],
    email: user.email,
    ...enrollment.context,
    ...context,
    stepNumber: step.stepNumber,
    sequenceName: sequence.name,
  };
  
  // Override subject if specified
  const subject = step.overrides.subject || selectedTemplate.subject;
  const fromName = step.overrides.fromName || sequence.settings?.fromName || 'TRM Jobs';
  const fromEmail = step.overrides.fromEmail || sequence.settings?.fromEmail || 'noreply@trmjobs.com';
  
  // Send email
  const result = await sendEmail({
    to: user.email,
    toName: user.name,
    from: fromEmail,
    fromName: fromName,
    subject: subject,
    templateId: selectedTemplate._id,
    variables,
    sequenceId: sequence._id,
    sequenceStep: step.stepNumber,
    userId: user._id,
    type: 'sequence',
    trackOpens: true,
    trackClicks: true,
    categories: [sequence.type, sequence.slug],
  });
  
  // Update step stats
  step.stats.sent += 1;
  
  // Record in enrollment history
  enrollment.stepHistory.push({
    stepNumber: step.stepNumber,
    sentAt: new Date(),
    emailLogId: result.logId,
    status: 'sent',
  });
  
  // Update sequence stats
  sequence.stats.totalEmailsSent += 1;
  
  // Advance to next step or complete
  await sequence.advanceUser(enrollment.userId);
  await sequence.save();
  
  console.log(`[SequenceEngine] Sent step ${step.stepNumber} of "${sequence.name}" to ${user.email}`);
};

/**
 * Build context for condition evaluation
 * @param {User} user - User document
 * @param {Object} enrollment - Enrollment data
 * @returns {Promise<Object>} Context object
 */
const buildContext = async (user, enrollment) => {
  const context = {
    userId: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    tier: user.tier,
    createdAt: user.createdAt,
    lastActiveAt: user.lastActiveAt,
    ...enrollment.context,
  };
  
  // Add referral stats if user is a referrer
  if (user.role === 'referrer') {
    const referralStats = await Referral.aggregate([
      { $match: { referrer: user._id } },
      {
        $group: {
          _id: null,
          totalReferrals: { $sum: 1 },
          successfulReferrals: {
            $sum: { $cond: [{ $eq: ['$status', 'hired'] }, 1, 0] },
          },
          pendingReferrals: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'reviewing', 'interviewing']] }, 1, 0] },
          },
          totalEarnings: { $sum: '$commission.amount' },
        },
      },
    ]);
    
    if (referralStats.length > 0) {
      context.referralCount = referralStats[0].totalReferrals;
      context.successfulReferrals = referralStats[0].successfulReferrals;
      context.pendingReferrals = referralStats[0].pendingReferrals;
      context.totalEarnings = referralStats[0].totalEarnings;
    } else {
      context.referralCount = 0;
      context.successfulReferrals = 0;
      context.pendingReferrals = 0;
      context.totalEarnings = 0;
    }
  }
  
  // Add application stats if user is a job seeker
  if (user.role === 'job_seeker') {
    const applicationCount = await Application.countDocuments({ applicant: user._id });
    context.applicationCount = applicationCount;
  }
  
  // Add company stats if user is corporate
  if (user.role?.startsWith('corporate_')) {
    const companyUser = await Company.findOne({ users: user._id });
    if (companyUser) {
      context.companyId = companyUser._id.toString();
      context.companyName = companyUser.name;
      
      const jobCount = await Job.countDocuments({ company: companyUser._id });
      const activeJobCount = await Job.countDocuments({ 
        company: companyUser._id,
        status: 'active',
      });
      
      context.companyJobCount = jobCount;
      context.companyActiveJobCount = activeJobCount;
    }
  }
  
  // Add days since enrollment
  context.daysInSequence = Math.floor(
    (Date.now() - enrollment.enrolledAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Add email engagement score
  const emailStats = await EmailLog.aggregate([
    { $match: { 'recipient.userId': user._id } },
    {
      $group: {
        _id: null,
        totalEmails: { $sum: 1 },
        openedEmails: { $sum: { $cond: ['$tracking.opened', 1, 0] } },
        clickedEmails: { $sum: { $cond: ['$tracking.clicked', 1, 0] } },
      },
    },
  ]);
  
  if (emailStats.length > 0) {
    const stats = emailStats[0];
    context.emailEngagementScore = stats.totalEmails > 0
      ? Math.round(((stats.openedEmails + stats.clickedEmails * 2) / (stats.totalEmails * 3)) * 100)
      : 50;
    context.totalEmailsReceived = stats.totalEmails;
  } else {
    context.emailEngagementScore = 50;
    context.totalEmailsReceived = 0;
  }
  
  return context;
};

/**
 * Enroll a user in a sequence
 * @param {string} sequenceId - Sequence ID
 * @param {string} userId - User ID
 * @param {Object} context - Enrollment context
 * @param {string} source - Enrollment source
 * @returns {Promise<Object>} Enrollment result
 */
const enrollInSequence = async (sequenceId, userId, context = {}, source = 'manual') => {
  const sequence = await EmailSequence.findById(sequenceId);
  if (!sequence) {
    throw new Error('Sequence not found');
  }
  
  if (sequence.status !== 'active') {
    throw new Error('Sequence is not active');
  }
  
  const enrollment = await sequence.enrollUser(userId, context, source);
  
  return {
    success: true,
    enrollment,
    sequenceName: sequence.name,
  };
};

/**
 * Unenroll a user from a sequence
 * @param {string} sequenceId - Sequence ID
 * @param {string} userId - User ID
 * @param {string} reason - Unenrollment reason
 * @returns {Promise<Object>} Result
 */
const unenrollFromSequence = async (sequenceId, userId, reason = 'manual') => {
  const sequence = await EmailSequence.findById(sequenceId);
  if (!sequence) {
    throw new Error('Sequence not found');
  }
  
  const enrollment = sequence.enrollments.find(
    e => e.userId.toString() === userId && ['active', 'paused'].includes(e.status)
  );
  
  if (!enrollment) {
    throw new Error('Active enrollment not found');
  }
  
  enrollment.status = 'cancelled';
  sequence.stats.activeEnrollments -= 1;
  await sequence.save();
  
  return {
    success: true,
    reason,
  };
};

/**
 * Check and process event-based triggers
 */
const checkEventTriggers = async () => {
  // This would integrate with an event queue or database
  // For now, we'll check for common triggers
  
  try {
    // Check for incomplete applications (candidate follow-up)
    await checkIncompleteApplications();
    
    // Check for dormant referrers (re-engagement)
    await checkDormantReferrers();
    
    // Check for companies with no referrals
    await checkInactiveCompanies();
    
  } catch (error) {
    console.error('[SequenceEngine] Error checking triggers:', error);
  }
};

/**
 * Check for incomplete applications and trigger follow-up
 */
const checkIncompleteApplications = async () => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  // Find applications that need follow-up
  const incompleteApplications = await Application.find({
    status: 'started',
    createdAt: { $lte: twentyFourHoursAgo },
    'metadata.followUpSent': { $ne: true },
  }).populate('applicant');
  
  for (const application of incompleteApplications) {
    // Find or create candidate follow-up sequence
    let sequence = await EmailSequence.findOne({ 
      type: 'candidate_followup',
      status: 'active',
    });
    
    if (sequence && application.applicant) {
      try {
        await enrollInSequence(sequence._id, application.applicant._id, {
          applicationId: application._id.toString(),
          jobId: application.job?.toString(),
        }, 'trigger');
        
        application.metadata = application.metadata || {};
        application.metadata.followUpSent = true;
        await application.save();
      } catch (error) {
        // User might already be enrolled
      }
    }
  }
};

/**
 * Check for dormant referrers and trigger re-engagement
 */
const checkDormantReferrers = async () => {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  
  const dormantReferrers = await User.find({
    role: 'referrer',
    lastActiveAt: { $lte: fourteenDaysAgo },
    'metadata.reengagementSent': { $ne: true },
  });
  
  const sequence = await EmailSequence.findOne({
    type: 'referrer_reengagement',
    status: 'active',
  });
  
  if (sequence) {
    for (const referrer of dormantReferrers) {
      try {
        // Get top jobs for the email
        const topJobs = await Job.find({ status: 'active' })
          .sort({ createdAt: -1 })
          .limit(5)
          .select('title company location salary');
        
        await enrollInSequence(sequence._id, referrer._id, {
          topJobs: topJobs.map(j => ({
            title: j.title,
            company: j.company?.name,
            location: j.location,
            salary: j.salary,
          })),
        }, 'trigger');
        
        referrer.metadata = referrer.metadata || {};
        referrer.metadata.reengagementSent = true;
        await referrer.save();
      } catch (error) {
        // User might already be enrolled
      }
    }
  }
};

/**
 * Check for companies with no referrals
 */
const checkInactiveCompanies = async () => {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  
  // Find companies with jobs posted 3+ days ago but no referrals
  const companies = await Company.aggregate([
    {
      $lookup: {
        from: 'jobs',
        localField: '_id',
        foreignField: 'company',
        as: 'jobs',
      },
    },
    {
      $lookup: {
        from: 'referrals',
        localField: 'jobs._id',
        foreignField: 'job',
        as: 'referrals',
      },
    },
    {
      $match: {
        'jobs.createdAt': { $lte: threeDaysAgo },
        referrals: { $size: 0 },
      },
    },
  ]);
  
  const sequence = await EmailSequence.findOne({
    type: 'company_activation',
    status: 'active',
  });
  
  if (sequence) {
    for (const company of companies) {
      // Get company admin users
      const companyUsers = await User.find({
        _id: { $in: company.users },
        role: 'corporate_admin',
      });
      
      for (const user of companyUsers) {
        try {
          await enrollInSequence(sequence._id, user._id, {
            companyId: company._id.toString(),
            companyName: company.name,
            jobCount: company.jobs.length,
          }, 'trigger');
        } catch (error) {
          // User might already be enrolled
        }
      }
    }
  }
};

/**
 * Refresh dynamic segments
 */
const refreshDynamicSegments = async () => {
  const segments = await UserSegment.find({
    type: 'dynamic',
    status: 'active',
    'autoRefresh.enabled': true,
    $or: [
      { 'autoRefresh.nextRefreshAt': { $lte: new Date() } },
      { 'autoRefresh.lastRefreshedAt': null },
    ],
  });
  
  for (const segment of segments) {
    try {
      await segment.refreshMembers(User);
      console.log(`[SequenceEngine] Refreshed segment: ${segment.name}`);
    } catch (error) {
      console.error(`[SequenceEngine] Error refreshing segment ${segment.name}:`, error);
    }
  }
};

/**
 * Create predefined sequences
 */
const createPredefinedSequences = async () => {
  const predefinedSequences = [
    {
      name: 'Candidate Application Follow-up',
      slug: 'candidate-followup',
      type: 'candidate_followup',
      description: 'Follow-up sequence for candidates with incomplete applications',
      steps: [
        {
          stepNumber: 1,
          name: '24-Hour Reminder',
          description: 'Gentle reminder to complete application',
          trigger: {
            type: 'time_delay',
            delay: { value: 24, unit: 'hours' },
          },
          templateId: null, // Will be set after template creation
          sendConditions: [
            { field: 'applicationStatus', operator: 'equals', value: 'incomplete' },
          ],
        },
        {
          stepNumber: 2,
          name: '72-Hour Follow-up',
          description: 'More urgent follow-up with help offer',
          trigger: {
            type: 'time_delay',
            delay: { value: 72, unit: 'hours' },
          },
          templateId: null,
          sendConditions: [
            { field: 'applicationStatus', operator: 'equals', value: 'incomplete' },
          ],
        },
        {
          stepNumber: 3,
          name: '7-Day Final Reminder',
          description: 'Final reminder before application expires',
          trigger: {
            type: 'time_delay',
            delay: { value: 7, unit: 'days' },
          },
          templateId: null,
          sendConditions: [
            { field: 'applicationStatus', operator: 'equals', value: 'incomplete' },
          ],
        },
      ],
      exitConditions: [
        { name: 'Application Completed', field: 'applicationStatus', operator: 'equals', value: 'submitted' },
      ],
    },
    {
      name: 'Referrer Re-engagement',
      slug: 'referrer-reengagement',
      type: 'referrer_reengagement',
      description: 'Re-engage dormant referrers with top jobs',
      steps: [
        {
          stepNumber: 1,
          name: 'We Miss You',
          description: 'Friendly re-engagement with top jobs',
          trigger: {
            type: 'time_delay',
            delay: { value: 0, unit: 'hours' },
          },
          templateId: null,
        },
        {
          stepNumber: 2,
          name: 'Weekly Jobs Digest',
          description: 'Weekly digest of new opportunities',
          trigger: {
            type: 'time_delay',
            delay: { value: 7, unit: 'days' },
          },
          templateId: null,
        },
      ],
      exitConditions: [
        { name: 'Made Referral', field: 'referralCount', operator: 'greater_than', value: 0 },
      ],
    },
    {
      name: 'Company Activation',
      slug: 'company-activation',
      type: 'company_activation',
      description: 'Activate companies with no referral activity',
      steps: [
        {
          stepNumber: 1,
          name: 'Referral Tips',
          description: 'Tips to get more referrals',
          trigger: {
            type: 'time_delay',
            delay: { value: 3, unit: 'days' },
          },
          templateId: null,
        },
        {
          stepNumber: 2,
          name: 'Success Stories',
          description: 'Share success stories from other companies',
          trigger: {
            type: 'time_delay',
            delay: { value: 7, unit: 'days' },
          },
          templateId: null,
        },
      ],
      exitConditions: [
        { name: 'Received Referral', field: 'referralCount', operator: 'greater_than', value: 0 },
      ],
    },
    {
      name: 'Weekly Referrer Reminder',
      slug: 'weekly-referrer-reminder',
      type: 'referrer_weekly_reminder',
      description: 'Weekly reminder about pending referrals',
      steps: [
        {
          stepNumber: 1,
          name: 'Pending Referrals Reminder',
          description: 'Remind about pending referral status',
          trigger: {
            type: 'time_delay',
            delay: { value: 0, unit: 'hours' },
          },
          templateId: null,
          sendConditions: [
            { field: 'pendingReferrals', operator: 'greater_than', value: 0 },
          ],
        },
      ],
      settings: {
        sendDays: ['monday'],
        sendWindow: { start: '09:00', end: '17:00', timezone: 'Asia/Yangon' },
      },
    },
  ];
  
  const createdSequences = [];
  
  for (const seqData of predefinedSequences) {
    const existing = await EmailSequence.findOne({ slug: seqData.slug });
    if (!existing) {
      const sequence = new EmailSequence({
        ...seqData,
        status: 'draft',
        createdBy: null, // System created
      });
      await sequence.save();
      createdSequences.push(sequence);
    }
  }
  
  return createdSequences;
};

/**
 * Get sequence statistics
 * @param {string} sequenceId - Sequence ID
 * @returns {Promise<Object>} Statistics
 */
const getSequenceStats = async (sequenceId) => {
  const sequence = await EmailSequence.findById(sequenceId);
  if (!sequence) {
    throw new Error('Sequence not found');
  }
  
  const stats = {
    overview: sequence.stats,
    stepStats: sequence.steps.map(step => ({
      stepNumber: step.stepNumber,
      name: step.name,
      stats: step.stats,
    })),
    enrollments: {
      total: sequence.enrollments.length,
      active: sequence.enrollments.filter(e => e.status === 'active').length,
      completed: sequence.enrollments.filter(e => e.status === 'completed').length,
      cancelled: sequence.enrollments.filter(e => e.status === 'cancelled').length,
    },
  };
  
  return stats;
};

module.exports = {
  initializeSequenceEngine,
  stopSequenceEngine,
  processSequences,
  enrollInSequence,
  unenrollFromSequence,
  createPredefinedSequences,
  getSequenceStats,
};
