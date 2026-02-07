/**
 * KnowledgeBase Model
 * Represents FAQ and knowledge articles for the chatbot
 * Stores articles, categories, tags, and helpfulness ratings
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Related question schema
const RelatedQuestionSchema = new Schema({
  question: {
    type: String,
    required: true,
    trim: true,
  },
  articleId: {
    type: Schema.Types.ObjectId,
    ref: 'KnowledgeBase',
  },
  similarity: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.8,
  },
}, { _id: false });

// Article section schema
const ArticleSectionSchema = new Schema({
  title: {
    type: String,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  type: {
    type: String,
    enum: ['text', 'code', 'image', 'video', 'link', 'steps'],
    default: 'text',
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, { _id: true });

// Search keyword schema
const SearchKeywordSchema = new Schema({
  keyword: {
    type: String,
    required: true,
    trim: true,
  },
  weight: {
    type: Number,
    min: 0,
    max: 1,
    default: 1,
  },
  language: {
    type: String,
    enum: ['en', 'my', 'both'],
    default: 'en',
  },
}, { _id: false });

// Feedback entry schema
const FeedbackEntrySchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  sessionId: String,
  helpful: {
    type: Boolean,
    required: true,
  },
  comment: String,
  providedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

// Main KnowledgeBase schema
const KnowledgeBaseSchema = new Schema({
  articleId: {
    type: String,
    required: [true, 'Article ID is required'],
    unique: true,
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    index: true,
  },
  slug: {
    type: String,
    unique: true,
    index: true,
    trim: true,
  },
  
  // Content
  content: {
    type: String,
    required: [true, 'Content is required'],
  },
  sections: {
    type: [ArticleSectionSchema],
    default: [],
  },
  
  // Summary for quick answers
  summary: {
    en: String,
    my: String,
  },
  
  // Categorization
  category: {
    type: String,
    required: true,
    index: true,
    trim: true,
  },
  subcategory: {
    type: String,
    trim: true,
    index: true,
  },
  tags: [{
    type: String,
    trim: true,
    index: true,
  }],
  
  // Search optimization
  keywords: {
    type: [SearchKeywordSchema],
    default: [],
  },
  searchTerms: {
    en: [String],
    my: [String],
  },
  
  // Related content
  relatedQuestions: {
    type: [RelatedQuestionSchema],
    default: [],
  },
  relatedArticles: [{
    type: Schema.Types.ObjectId,
    ref: 'KnowledgeBase',
  }],
  
  // Target audience
  targetAudience: {
    userTypes: [{
      type: String,
      enum: ['candidate', 'referrer', 'company', 'admin', 'all'],
      default: 'all',
    }],
    botTypes: [{
      type: String,
      enum: ['recruiter', 'referrer', 'candidate', 'admin', 'general'],
    }],
    experienceLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'all'],
      default: 'all',
    },
  },
  
  // Analytics
  views: {
    type: Number,
    default: 0,
  },
  uniqueViews: {
    type: Number,
    default: 0,
  },
  helpfulVotes: {
    type: Number,
    default: 0,
  },
  notHelpfulVotes: {
    type: Number,
    default: 0,
  },
  feedbackEntries: {
    type: [FeedbackEntrySchema],
    default: [],
  },
  searchAppearances: {
    type: Number,
    default: 0,
  },
  clickThroughRate: {
    type: Number,
    default: 0,
  },
  avgTimeOnPage: {
    type: Number,
    default: 0,
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'deprecated'],
    default: 'draft',
    index: true,
  },
  visibility: {
    type: String,
    enum: ['public', 'internal', 'restricted'],
    default: 'public',
  },
  
  // Versioning
  version: {
    type: Number,
    default: 1,
  },
  previousVersions: [{
    version: Number,
    content: String,
    updatedAt: Date,
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
  
  // SEO
  seo: {
    metaTitle: String,
    metaDescription: String,
    canonicalUrl: String,
  },
  
  // Media
  featuredImage: String,
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number,
  }],
  
  // Timestamps
  publishedAt: Date,
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  
  // Authors
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: Date,
  
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
KnowledgeBaseSchema.index({ category: 1, status: 1 });
KnowledgeBaseSchema.index({ tags: 1 });
KnowledgeBaseSchema.index({ 'targetAudience.userTypes': 1 });
KnowledgeBaseSchema.index({ 'targetAudience.botTypes': 1 });
KnowledgeBaseSchema.index({ status: 1, publishedAt: -1 });
KnowledgeBaseSchema.index({ views: -1 });
KnowledgeBaseSchema.index({ helpfulVotes: -1 });

// Text indexes for search
KnowledgeBaseSchema.index({ title: 'text', content: 'text', 'searchTerms.en': 'text', 'searchTerms.my': 'text' });
KnowledgeBaseSchema.index({ keywords: 'text' });

// Virtual for helpfulness ratio
KnowledgeBaseSchema.virtual('helpfulnessRatio').get(function() {
  const total = this.helpfulVotes + this.notHelpfulVotes;
  return total > 0 ? this.helpfulVotes / total : 0;
});

// Virtual for total feedback
KnowledgeBaseSchema.virtual('totalFeedback').get(function() {
  return this.helpfulVotes + this.notHelpfulVotes;
});

// Virtual for popularity score
KnowledgeBaseSchema.virtual('popularityScore').get(function() {
  const viewWeight = 0.3;
  const helpfulWeight = 0.5;
  const searchWeight = 0.2;
  
  const viewScore = Math.log(this.views + 1);
  const helpfulScore = this.helpfulnessRatio * 10;
  const searchScore = Math.log(this.searchAppearances + 1);
  
  return (viewScore * viewWeight) + (helpfulScore * helpfulWeight) + (searchScore * searchWeight);
});

// Pre-save middleware
KnowledgeBaseSchema.pre('save', function(next) {
  if (!this.articleId) {
    this.articleId = `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  if (!this.slug) {
    this.slug = this.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
  }
  
  if (this.isModified('content') || this.isModified('title')) {
    this.lastUpdated = new Date();
  }
  
  next();
});

// Method to increment views
KnowledgeBaseSchema.methods.incrementViews = function(unique = false) {
  this.views += 1;
  if (unique) {
    this.uniqueViews += 1;
  }
  return this.save();
};

// Method to add feedback
KnowledgeBaseSchema.methods.addFeedback = function(helpful, userId, sessionId, comment = null) {
  if (helpful) {
    this.helpfulVotes += 1;
  } else {
    this.notHelpfulVotes += 1;
  }
  
  this.feedbackEntries.push({
    userId,
    sessionId,
    helpful,
    comment,
    providedAt: new Date(),
  });
  
  return this.save();
};

// Method to record search appearance
KnowledgeBaseSchema.methods.recordSearchAppearance = function() {
  this.searchAppearances += 1;
  return this.save();
};

// Method to record click
KnowledgeBaseSchema.methods.recordClick = function() {
  if (this.searchAppearances > 0) {
    this.clickThroughRate = ((this.clickThroughRate * (this.searchAppearances - 1)) + 1) / this.searchAppearances;
  }
  return this.save();
};

// Method to create new version
KnowledgeBaseSchema.methods.createVersion = function(userId) {
  this.previousVersions.push({
    version: this.version,
    content: this.content,
    updatedAt: this.lastUpdated,
    updatedBy: this.updatedBy,
  });
  this.version += 1;
  this.updatedBy = userId;
  return this.save();
};

// Method to publish
KnowledgeBaseSchema.methods.publish = function(userId) {
  this.status = 'published';
  this.publishedAt = new Date();
  this.updatedBy = userId;
  return this.save();
};

// Method to archive
KnowledgeBaseSchema.methods.archive = function(userId) {
  this.status = 'archived';
  this.updatedBy = userId;
  return this.save();
};

// Method to get summary
KnowledgeBaseSchema.methods.getSummary = function(language = 'en') {
  if (this.summary[language]) {
    return this.summary[language];
  }
  if (this.summary.en) {
    return this.summary.en;
  }
  // Generate summary from content
  return this.content.substring(0, 200) + '...';
};

// Static method to search articles
KnowledgeBaseSchema.statics.search = async function(query, options = {}) {
  const { 
    userType = 'all', 
    botType = null, 
    category = null, 
    limit = 10,
    language = 'en'
  } = options;
  
  const searchQuery = {
    $and: [
      { $text: { $search: query } },
      { status: 'published' },
      { isActive: true },
    ],
  };
  
  // Filter by user type
  if (userType !== 'all') {
    searchQuery.$and.push({
      $or: [
        { 'targetAudience.userTypes': userType },
        { 'targetAudience.userTypes': 'all' },
      ],
    });
  }
  
  // Filter by bot type
  if (botType) {
    searchQuery.$and.push({
      $or: [
        { 'targetAudience.botTypes': botType },
        { 'targetAudience.botTypes': { $exists: false } },
        { 'targetAudience.botTypes': { $size: 0 } },
      ],
    });
  }
  
  // Filter by category
  if (category) {
    searchQuery.$and.push({ category });
  }
  
  const results = await this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' }, helpfulVotes: -1 })
    .limit(limit);
  
  // Record search appearances
  for (const article of results) {
    article.recordSearchAppearance();
  }
  
  return results;
};

// Static method to find by category
KnowledgeBaseSchema.statics.findByCategory = function(category, options = {}) {
  const { status = 'published', limit = 20 } = options;
  
  return this.find({ category, status, isActive: true })
    .sort({ helpfulVotes: -1, views: -1 })
    .limit(limit);
};

// Static method to get popular articles
KnowledgeBaseSchema.statics.getPopular = function(limit = 10) {
  return this.find({ status: 'published', isActive: true })
    .sort({ views: -1 })
    .limit(limit);
};

// Static method to get most helpful articles
KnowledgeBaseSchema.statics.getMostHelpful = function(limit = 10) {
  return this.find({ status: 'published', isActive: true })
    .sort({ helpfulVotes: -1 })
    .limit(limit);
};

// Static method to get categories with counts
KnowledgeBaseSchema.statics.getCategories = async function() {
  return this.aggregate([
    { $match: { status: 'published', isActive: true } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        subcategories: { $addToSet: '$subcategory' },
        totalViews: { $sum: '$views' },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

// Static method to get analytics
KnowledgeBaseSchema.statics.getAnalytics = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        totalArticles: { $sum: 1 },
        publishedArticles: {
          $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] },
        },
        totalViews: { $sum: '$views' },
        totalHelpful: { $sum: '$helpfulVotes' },
        totalNotHelpful: { $sum: '$notHelpfulVotes' },
        avgHelpfulness: { $avg: { $cond: [{ $gt: [{ $add: ['$helpfulVotes', '$notHelpfulVotes'] }, 0] }, { $divide: ['$helpfulVotes', { $add: ['$helpfulVotes', '$notHelpfulVotes'] }] }, 0] } },
      },
    },
  ]);
};

// Static method to initialize default articles
KnowledgeBaseSchema.statics.initializeDefaults = async function(adminUserId) {
  const defaultArticles = [
    {
      title: 'How to Create a Referral',
      category: 'referral',
      subcategory: 'getting_started',
      content: `
# How to Create a Referral

Creating a referral is easy! Follow these steps:

1. **Find a Job**: Browse available jobs on the platform
2. **Click "Refer"**: Select the job and click the refer button
3. **Add Candidate Details**: Enter the candidate's information
4. **Submit**: Review and submit your referral

## Tips for Success

- Make sure you have the candidate's permission
- Provide accurate contact information
- Include a brief note about why they're a good fit

## What Happens Next?

- The candidate will receive an invitation
- You can track the status in your dashboard
- Earn commission when they get hired!
      `,
      summary: {
        en: 'Learn how to create successful referrals and earn commission.',
        my: 'အောင်မြင်သောလွှဲပြောင်းမှုများဖန်တီးပြီး ကော်မရှင်ရယူရန်လေ့လာပါ။',
      },
      tags: ['referral', 'getting started', 'commission', 'how-to'],
      targetAudience: {
        userTypes: ['referrer'],
        botTypes: ['referrer'],
      },
      keywords: [
        { keyword: 'create referral', weight: 1 },
        { keyword: 'how to refer', weight: 0.9 },
        { keyword: 'refer someone', weight: 0.9 },
        { keyword: 'submit referral', weight: 0.8 },
      ],
      status: 'published',
      createdBy: adminUserId,
    },
    {
      title: 'How to Apply for a Job',
      category: 'job_application',
      subcategory: 'getting_started',
      content: `
# How to Apply for a Job

Applying for jobs on our platform is simple:

## Steps to Apply

1. **Create Your Profile**: Complete your candidate profile
2. **Upload Resume**: Add your updated CV/Resume
3. **Browse Jobs**: Search and filter jobs that match your skills
4. **Apply**: Click "Apply" and submit your application

## Application Tips

- Tailor your resume for each job
- Write a compelling cover letter
- Highlight relevant experience
- Follow up appropriately

## Tracking Your Applications

You can track all your applications in your dashboard. You'll receive notifications at each stage of the process.
      `,
      summary: {
        en: 'Step-by-step guide to applying for jobs on our platform.',
        my: 'ကျွန်ုပ်တို့ပလက်ဖောင်းတွင် အလုပ်လျှောက်ထားရန် အဆင့်အချိုးချိန်လမ်းညွှန်။',
      },
      tags: ['job', 'application', 'how-to', 'candidate'],
      targetAudience: {
        userTypes: ['candidate'],
        botTypes: ['candidate'],
      },
      keywords: [
        { keyword: 'apply for job', weight: 1 },
        { keyword: 'how to apply', weight: 0.9 },
        { keyword: 'job application', weight: 0.9 },
        { keyword: 'submit application', weight: 0.8 },
      ],
      status: 'published',
      createdBy: adminUserId,
    },
    {
      title: 'Commission and Payout FAQ',
      category: 'payment',
      subcategory: 'commission',
      content: `
# Commission and Payout FAQ

## How is commission calculated?

Commission is typically a percentage of the candidate's first-year salary, ranging from 5% to 20% depending on the job.

## When do I get paid?

- **Standard**: 30 days after candidate starts
- **Guarantee period**: After the guarantee period (usually 90 days)
- **Payment method**: Bank transfer or mobile money

## How do I track my earnings?

View your earnings in the Referrer Dashboard under "My Earnings" or "Payouts".

## Tax Information

- Commissions are subject to local tax laws
- You may need to provide tax documentation
- Consult with a tax professional for advice

## Minimum Payout

The minimum payout amount is 50,000 MMK. Amounts below this will roll over to the next payment cycle.
      `,
      summary: {
        en: 'Frequently asked questions about referral commissions and payouts.',
        my: 'လွှဲပြောင်းရေးကော်မရှင်နှင့် ငွေပေးချေးမှုများအတွက် အမြဲမေးသောမေးခွန်းများ။',
      },
      tags: ['commission', 'payout', 'payment', 'referrer', 'faq'],
      targetAudience: {
        userTypes: ['referrer'],
        botTypes: ['referrer'],
      },
      keywords: [
        { keyword: 'commission', weight: 1 },
        { keyword: 'payout', weight: 1 },
        { keyword: 'when do I get paid', weight: 0.9 },
        { keyword: 'how much commission', weight: 0.9 },
        { keyword: 'earnings', weight: 0.8 },
      ],
      status: 'published',
      createdBy: adminUserId,
    },
    {
      title: 'Writing Effective Job Descriptions',
      category: 'recruiting',
      subcategory: 'best_practices',
      content: `
# Writing Effective Job Descriptions

## Key Elements

### 1. Clear Job Title
- Use industry-standard titles
- Avoid internal jargon
- Be specific about level (Junior, Senior, etc.)

### 2. Compelling Summary
- Hook candidates in the first 2-3 sentences
- Highlight what makes your company unique
- Mention growth opportunities

### 3. Detailed Responsibilities
- Use bullet points
- Start with action verbs
- Be realistic about expectations

### 4. Requirements vs. Nice-to-Haves
- Clearly distinguish must-haves from preferences
- Avoid unnecessary requirements that may deter diverse candidates

### 5. Compensation and Benefits
- Include salary range when possible
- List key benefits
- Mention unique perks

## Best Practices

- Keep it concise (300-700 words)
- Use inclusive language
- Highlight company culture
- Include application instructions
      `,
      summary: {
        en: 'Best practices for writing job descriptions that attract top talent.',
        my: 'ထိပ်တန်းလူတန်းစုများဆွဲဆောင်နိုင်သော အလုပ်ဖော်ပြချက်ရေးသားမှုအကောင်းဆုံးအလေ့အကျင့်များ။',
      },
      tags: ['job description', 'recruiting', 'hiring', 'best practices'],
      targetAudience: {
        userTypes: ['company'],
        botTypes: ['recruiter'],
      },
      keywords: [
        { keyword: 'job description', weight: 1 },
        { keyword: 'write job posting', weight: 0.9 },
        { keyword: 'job ad', weight: 0.8 },
        { keyword: 'hiring', weight: 0.7 },
      ],
      status: 'published',
      createdBy: adminUserId,
    },
    {
      title: 'Interview Preparation Tips',
      category: 'career',
      subcategory: 'interview',
      content: `
# Interview Preparation Tips

## Before the Interview

### Research the Company
- Understand their products/services
- Know their mission and values
- Recent news and developments

### Prepare Your Answers
- Practice common questions
- Prepare STAR stories (Situation, Task, Action, Result)
- Have questions ready to ask

### Logistics
- Confirm time and location (or video link)
- Plan your route
- Prepare your outfit
- Test technology for virtual interviews

## Common Questions

1. Tell me about yourself
2. Why do you want to work here?
3. What are your strengths/weaknesses?
4. Where do you see yourself in 5 years?
5. Why should we hire you?

## During the Interview

- Arrive early (or join call early)
- Maintain good eye contact
- Listen carefully
- Ask clarifying questions
- Take notes if appropriate

## After the Interview

- Send a thank-you email within 24 hours
- Follow up if you haven't heard back
- Continue your job search
      `,
      summary: {
        en: 'Comprehensive guide to preparing for job interviews.',
        my: 'အလုပ်အင်တာဗျူးအတွက် အဆင်သင့်ဖြစ်ခြင်းအတွက် ဘက်စုံလမ်းညွှန်။',
      },
      tags: ['interview', 'preparation', 'career', 'candidate'],
      targetAudience: {
        userTypes: ['candidate'],
        botTypes: ['candidate'],
      },
      keywords: [
        { keyword: 'interview preparation', weight: 1 },
        { keyword: 'interview tips', weight: 0.9 },
        { keyword: 'how to prepare for interview', weight: 0.9 },
        { keyword: 'interview questions', weight: 0.8 },
      ],
      status: 'published',
      createdBy: adminUserId,
    },
  ];
  
  for (const article of defaultArticles) {
    await this.findOneAndUpdate(
      { title: article.title },
      { ...article, publishedAt: new Date() },
      { upsert: true, new: true }
    );
  }
  
  console.log('Default knowledge base articles initialized');
};

const KnowledgeBase = mongoose.model('KnowledgeBase', KnowledgeBaseSchema);

module.exports = KnowledgeBase;
