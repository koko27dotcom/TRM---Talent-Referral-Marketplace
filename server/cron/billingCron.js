/**
 * Billing Cron Jobs
 * Scheduled tasks for recurring billing, invoice generation, and payment processing
 */

const cron = require('node-cron');
const { subscriptionService } = require('../services/subscriptionService.js');
const { billingEngine } = require('../services/billingEngine.js');
const { payPerHireService } = require('../services/payPerHireService.js');
const { Subscription, BillingRecord, Company, User } = require('../models/index.js');
const { sendNotification } = require('../services/notificationService.js');

/**
 * Initialize all billing cron jobs
 */
function initBillingCron() {
  // Daily at 1:00 AM - Process expired subscriptions
  cron.schedule('0 1 * * *', async () => {
    console.log('[Billing Cron] Processing expired subscriptions...');
    try {
      const processed = await subscriptionService.processExpiredSubscriptions();
      console.log(`[Billing Cron] Processed ${processed} expired subscriptions`);
    } catch (error) {
      console.error('[Billing Cron] Error processing expired subscriptions:', error);
    }
  });

  // Daily at 2:00 AM - Generate renewal invoices
  cron.schedule('0 2 * * *', async () => {
    console.log('[Billing Cron] Generating renewal invoices...');
    try {
      const renewals = await generateRenewalInvoices();
      console.log(`[Billing Cron] Generated ${renewals.length} renewal invoices`);
    } catch (error) {
      console.error('[Billing Cron] Error generating renewal invoices:', error);
    }
  });

  // Daily at 3:00 AM - Process dunning for overdue invoices
  cron.schedule('0 3 * * *', async () => {
    console.log('[Billing Cron] Processing dunning...');
    try {
      const processed = await billingEngine.processDunning();
      console.log(`[Billing Cron] Processed ${processed.length} overdue invoices`);
    } catch (error) {
      console.error('[Billing Cron] Error processing dunning:', error);
    }
  });

  // Daily at 4:00 AM - Generate pay-per-hire invoices
  cron.schedule('0 4 * * *', async () => {
    console.log('[Billing Cron] Generating pay-per-hire invoices...');
    try {
      const invoices = await generatePayPerHireInvoices();
      console.log(`[Billing Cron] Generated ${invoices.length} pay-per-hire invoices`);
    } catch (error) {
      console.error('[Billing Cron] Error generating pay-per-hire invoices:', error);
    }
  });

  // Daily at 8:00 AM - Send subscription expiration warnings
  cron.schedule('0 8 * * *', async () => {
    console.log('[Billing Cron] Sending expiration warnings...');
    try {
      await sendExpirationWarnings(7); // 7 days before expiration
      await sendExpirationWarnings(3); // 3 days before expiration
      await sendExpirationWarnings(1); // 1 day before expiration
      console.log('[Billing Cron] Sent expiration warnings');
    } catch (error) {
      console.error('[Billing Cron] Error sending expiration warnings:', error);
    }
  });

  // Weekly on Monday at 9:00 AM - Send billing summaries
  cron.schedule('0 9 * * 1', async () => {
    console.log('[Billing Cron] Sending weekly billing summaries...');
    try {
      await sendWeeklyBillingSummaries();
      console.log('[Billing Cron] Sent weekly billing summaries');
    } catch (error) {
      console.error('[Billing Cron] Error sending billing summaries:', error);
    }
  });

  // Monthly on 1st at 6:00 AM - Generate monthly reports
  cron.schedule('0 6 1 * *', async () => {
    console.log('[Billing Cron] Generating monthly billing reports...');
    try {
      await generateMonthlyReports();
      console.log('[Billing Cron] Generated monthly billing reports');
    } catch (error) {
      console.error('[Billing Cron] Error generating monthly reports:', error);
    }
  });

  console.log('[Billing Cron] All billing cron jobs initialized');
}

/**
 * Generate renewal invoices for subscriptions expiring soon
 */
async function generateRenewalInvoices() {
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const subscriptions = await Subscription.find({
    status: 'active',
    autoRenew: true,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: {
      $gte: new Date(),
      $lte: threeDaysFromNow,
    },
    'renewalInvoiceGenerated': { $ne: true },
  }).populate('planId');

  const generated = [];

  for (const subscription of subscriptions) {
    try {
      // Check if invoice already exists
      const existingInvoice = await BillingRecord.findOne({
        subscriptionId: subscription._id,
        invoiceType: 'subscription',
        billingPeriodStart: subscription.currentPeriodEnd,
      });

      if (existingInvoice) {
        continue;
      }

      // Generate renewal invoice
      const invoice = await billingEngine.generateRenewalInvoice(subscription._id);

      // Mark subscription as having renewal invoice generated
      subscription.renewalInvoiceGenerated = true;
      await subscription.save();

      // Send notification
      await sendInvoiceNotification(subscription, invoice);

      generated.push({
        subscriptionId: subscription._id,
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
      });
    } catch (error) {
      console.error(`[Billing Cron] Error generating renewal invoice for subscription ${subscription._id}:`, error);
    }
  }

  return generated;
}

/**
 * Generate invoices for pending pay-per-hire transactions
 */
async function generatePayPerHireInvoices() {
  const pendingTransactions = await payPerHireService.getPendingTransactions();
  const generated = [];

  for (const transaction of pendingTransactions) {
    try {
      const result = await payPerHireService.generateInvoice(transaction._id);

      // Send notification
      await sendPayPerHireInvoiceNotification(transaction, result.invoice);

      generated.push({
        transactionId: transaction._id,
        invoiceId: result.invoice._id,
      });
    } catch (error) {
      console.error(`[Billing Cron] Error generating pay-per-hire invoice for transaction ${transaction._id}:`, error);
    }
  }

  return generated;
}

/**
 * Send subscription expiration warnings
 * @param {number} daysBefore - Days before expiration to warn
 */
async function sendExpirationWarnings(daysBefore) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysBefore);

  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const subscriptions = await Subscription.find({
    status: { $in: ['active', 'trialing'] },
    currentPeriodEnd: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  }).populate('companyId userId', 'name email');

  for (const subscription of subscriptions) {
    try {
      const recipient = subscription.companyId || subscription.userId;

      if (!recipient) continue;

      await sendNotification({
        userId: recipient._id,
        type: 'subscription_expiring',
        title: 'Subscription Expiring Soon',
        message: `Your subscription will expire in ${daysBefore} day${daysBefore > 1 ? 's' : ''}. Renew now to avoid interruption.`,
        data: {
          subscriptionId: subscription._id,
          expiresAt: subscription.currentPeriodEnd,
          daysRemaining: daysBefore,
        },
        channels: ['email', 'push'],
      });
    } catch (error) {
      console.error(`[Billing Cron] Error sending expiration warning for subscription ${subscription._id}:`, error);
    }
  }
}

/**
 * Send weekly billing summaries to companies
 */
async function sendWeeklyBillingSummaries() {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Get companies with billing activity in the last week
  const activeCompanies = await BillingRecord.distinct('companyId', {
    createdAt: { $gte: oneWeekAgo },
  });

  for (const companyId of activeCompanies) {
    try {
      const company = await Company.findById(companyId);
      if (!company) continue;

      const summary = await billingEngine.getCompanyBillingHistory(companyId, {
        startDate: oneWeekAgo,
        endDate: new Date(),
      });

      const totalAmount = summary.reduce((sum, inv) => sum + inv.total, 0);
      const paidAmount = summary
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.amountPaid, 0);

      await sendNotification({
        userId: companyId,
        type: 'weekly_billing_summary',
        title: 'Weekly Billing Summary',
        message: `You had ${summary.length} invoice(s) this week totaling MMK ${totalAmount.toLocaleString()}. MMK ${paidAmount.toLocaleString()} paid.`,
        data: {
          invoiceCount: summary.length,
          totalAmount,
          paidAmount,
          pendingAmount: totalAmount - paidAmount,
        },
        channels: ['email'],
      });
    } catch (error) {
      console.error(`[Billing Cron] Error sending billing summary for company ${companyId}:`, error);
    }
  }
}

/**
 * Generate monthly billing reports
 */
async function generateMonthlyReports() {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  lastMonth.setDate(1);

  const endOfLastMonth = new Date(lastMonth);
  endOfLastMonth.setMonth(endOfLastMonth.getMonth() + 1);
  endOfLastMonth.setDate(0);

  // Get billing summary for last month
  const summary = await billingEngine.getBillingSummary({
    startDate: lastMonth,
    endDate: endOfLastMonth,
  });

  // Get pay-per-hire stats for last month
  const payPerHireStats = await payPerHireService.getPlatformStats({
    startDate: lastMonth,
    endDate: endOfLastMonth,
  });

  // Store report
  const report = {
    period: {
      start: lastMonth,
      end: endOfLastMonth,
      month: lastMonth.toLocaleString('default', { month: 'long', year: 'numeric' }),
    },
    subscriptionRevenue: summary,
    payPerHireRevenue: payPerHireStats,
    generatedAt: new Date(),
  };

  console.log('[Billing Cron] Monthly report generated:', report);

  // TODO: Store report in database or send to admin

  return report;
}

/**
 * Send invoice notification
 */
async function sendInvoiceNotification(subscription, invoice) {
  const recipient = subscription.companyId || subscription.userId;

  if (!recipient) return;

  await sendNotification({
    userId: recipient._id,
    type: 'invoice_generated',
    title: 'New Invoice Available',
    message: `Invoice #${invoice.invoiceNumber} for MMK ${invoice.total.toLocaleString()} is ready for payment.`,
    data: {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.total,
      dueDate: invoice.dueDate,
    },
    channels: ['email', 'push'],
  });
}

/**
 * Send pay-per-hire invoice notification
 */
async function sendPayPerHireInvoiceNotification(transaction, invoice) {
  const company = await Company.findById(transaction.companyId);

  if (!company) return;

  await sendNotification({
    userId: company._id,
    type: 'pay_per_hire_invoice',
    title: 'Pay-Per-Hire Invoice',
    message: `Invoice #${invoice.invoiceNumber} for candidate placement fee of MMK ${invoice.total.toLocaleString()} is ready.`,
    data: {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      transactionId: transaction._id,
      amount: invoice.total,
      dueDate: invoice.dueDate,
    },
    channels: ['email'],
  });
}

/**
 * Manually trigger billing tasks (for admin use)
 */
async function triggerBillingTask(task) {
  switch (task) {
    case 'process-expired':
      return await subscriptionService.processExpiredSubscriptions();
    case 'generate-renewals':
      return await generateRenewalInvoices();
    case 'process-dunning':
      return await billingEngine.processDunning();
    case 'generate-pay-per-hire':
      return await generatePayPerHireInvoices();
    case 'send-warnings':
      await sendExpirationWarnings(7);
      await sendExpirationWarnings(3);
      await sendExpirationWarnings(1);
      return 'Warnings sent';
    default:
      throw new Error(`Unknown billing task: ${task}`);
  }
}

module.exports = initBillingCron;
module.exports.triggerBillingTask = triggerBillingTask;
