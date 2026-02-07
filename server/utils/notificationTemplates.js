/**
 * Notification Templates
 * Pre-defined templates for various notification types
 * Supports in-app, email, and SMS formats
 */

const { NOTIFICATION_TYPES } = require('../models/Notification.js');

// Format currency helper
const formatCurrency = (amount, currency = 'MMK') => {
  if (currency === 'MMK') {
    return `${Number(amount).toLocaleString()} MMK`;
  }
  return `$${Number(amount).toLocaleString()}`;
};

// Format date helper
const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// ==================== IN-APP TEMPLATES ====================

const inAppTemplates = {
  // Referral notifications
  [NOTIFICATION_TYPES.REFERRAL_SUBMITTED]: (data) => ({
    title: 'Referral Submitted',
    message: `Your referral for ${data.jobTitle || 'the position'} at ${data.companyName || 'the company'} has been submitted successfully.`,
    actions: [
      { label: 'View Details', action: 'view_referral', url: `/referrals/${data.referralId}` },
    ],
    deepLink: `saramart://referrals/${data.referralId}`,
  }),

  [NOTIFICATION_TYPES.REFERRAL_STATUS_CHANGED]: (data) => ({
    title: 'Referral Status Updated',
    message: `Your referral for ${data.jobTitle || 'the position'} has been updated to: ${data.status}.`,
    actions: [
      { label: 'View Details', action: 'view_referral', url: `/referrals/${data.referralId}` },
    ],
    deepLink: `saramart://referrals/${data.referralId}`,
  }),

  [NOTIFICATION_TYPES.REFERRAL_HIRED]: (data) => ({
    title: '🎉 Referral Hired!',
    message: `Great news! ${data.candidateName || 'Your referral'} has been hired for ${data.jobTitle || 'the position'}. Your bonus of ${formatCurrency(data.bonusAmount)} will be processed soon.`,
    actions: [
      { label: 'View Details', action: 'view_referral', url: `/referrals/${data.referralId}` },
      { label: 'Request Payout', action: 'request_payout', url: '/payouts', style: 'primary' },
    ],
    deepLink: `saramart://referrals/${data.referralId}`,
  }),

  [NOTIFICATION_TYPES.REFERRAL_PAID]: (data) => ({
    title: '💰 Referral Bonus Paid',
    message: `Your referral bonus of ${formatCurrency(data.amount)} has been paid. Check your account!`,
    actions: [
      { label: 'View Transaction', action: 'view_transaction', url: `/payouts/${data.payoutId}` },
    ],
    deepLink: `saramart://payouts/${data.payoutId}`,
  }),

  // Payout notifications
  [NOTIFICATION_TYPES.PAYOUT_REQUESTED]: (data) => ({
    title: 'Payout Request Received',
    message: `Your payout request for ${formatCurrency(data.amount)} has been received and is pending review.`,
    actions: [
      { label: 'View Status', action: 'view_payout', url: `/payouts/${data.payoutId}` },
    ],
    deepLink: `saramart://payouts/${data.payoutId}`,
  }),

  [NOTIFICATION_TYPES.PAYOUT_APPROVED]: (data) => ({
    title: 'Payout Approved',
    message: `Your payout request for ${formatCurrency(data.amount)} has been approved and is being processed.`,
    actions: [
      { label: 'View Details', action: 'view_payout', url: `/payouts/${data.payoutId}` },
    ],
    deepLink: `saramart://payouts/${data.payoutId}`,
  }),

  [NOTIFICATION_TYPES.PAYOUT_PROCESSING]: (data) => ({
    title: 'Payout Processing',
    message: `Your payout of ${formatCurrency(data.amount)} is now being processed. You will receive it within 1-2 business days.`,
    actions: [
      { label: 'View Details', action: 'view_payout', url: `/payouts/${data.payoutId}` },
    ],
    deepLink: `saramart://payouts/${data.payoutId}`,
  }),

  [NOTIFICATION_TYPES.PAYOUT_PAID]: (data) => ({
    title: '✅ Payout Completed',
    message: `Your payout of ${formatCurrency(data.amount)} has been sent to your ${data.paymentMethod || 'registered payment method'}. Transaction ID: ${data.transactionId || 'N/A'}`,
    actions: [
      { label: 'View Receipt', action: 'view_receipt', url: `/payouts/${data.payoutId}/receipt` },
    ],
    deepLink: `saramart://payouts/${data.payoutId}`,
  }),

  [NOTIFICATION_TYPES.PAYOUT_REJECTED]: (data) => ({
    title: 'Payout Request Rejected',
    message: `Your payout request for ${formatCurrency(data.amount)} has been rejected. Reason: ${data.reason || 'Please contact support for details.'}`,
    actions: [
      { label: 'Contact Support', action: 'contact_support', url: '/support' },
      { label: 'View Details', action: 'view_payout', url: `/payouts/${data.payoutId}` },
    ],
    deepLink: `saramart://payouts/${data.payoutId}`,
  }),

  [NOTIFICATION_TYPES.PAYOUT_CANCELLED]: (data) => ({
    title: 'Payout Cancelled',
    message: `Your payout request for ${formatCurrency(data.amount)} has been cancelled as requested.`,
    actions: [
      { label: 'View Details', action: 'view_payout', url: `/payouts/${data.payoutId}` },
    ],
    deepLink: `saramart://payouts/${data.payoutId}`,
  }),

  // Subscription notifications
  [NOTIFICATION_TYPES.SUBSCRIPTION_CREATED]: (data) => ({
    title: 'Subscription Activated',
    message: `Your ${data.planName || 'subscription'} has been activated successfully. Welcome to Saramart!`,
    actions: [
      { label: 'View Dashboard', action: 'view_dashboard', url: '/dashboard' },
    ],
    deepLink: 'saramart://dashboard',
  }),

  [NOTIFICATION_TYPES.SUBSCRIPTION_RENEWED]: (data) => ({
    title: 'Subscription Renewed',
    message: `Your ${data.planName || 'subscription'} has been renewed successfully. Next billing date: ${formatDate(data.nextBillingDate)}.`,
    actions: [
      { label: 'View Billing', action: 'view_billing', url: '/billing' },
    ],
    deepLink: 'saramart://billing',
  }),

  [NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING]: (data) => ({
    title: '⚠️ Subscription Expiring Soon',
    message: `Your ${data.planName || 'subscription'} will expire on ${formatDate(data.expiryDate)}. Renew now to avoid interruption.`,
    actions: [
      { label: 'Renew Now', action: 'renew_subscription', url: '/plans', style: 'primary' },
      { label: 'View Details', action: 'view_subscription', url: '/billing' },
    ],
    deepLink: 'saramart://plans',
  }),

  [NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRED]: (data) => ({
    title: 'Subscription Expired',
    message: `Your ${data.planName || 'subscription'} has expired. Renew now to restore access to all features.`,
    actions: [
      { label: 'Renew Now', action: 'renew_subscription', url: '/plans', style: 'primary' },
    ],
    deepLink: 'saramart://plans',
  }),

  [NOTIFICATION_TYPES.SUBSCRIPTION_CANCELLED]: (data) => ({
    title: 'Subscription Cancelled',
    message: `Your ${data.planName || 'subscription'} has been cancelled. You will have access until ${formatDate(data.endDate)}.`,
    actions: [
      { label: 'Reactivate', action: 'reactivate_subscription', url: '/plans' },
    ],
    deepLink: 'saramart://plans',
  }),

  // Billing notifications
  [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: (data) => ({
    title: 'Payment Received',
    message: `We have received your payment of ${formatCurrency(data.amount)}. Thank you!`,
    actions: [
      { label: 'View Invoice', action: 'view_invoice', url: `/invoices/${data.invoiceId}` },
    ],
    deepLink: `saramart://invoices/${data.invoiceId}`,
  }),

  [NOTIFICATION_TYPES.PAYMENT_FAILED]: (data) => ({
    title: '⚠️ Payment Failed',
    message: `Your payment of ${formatCurrency(data.amount)} could not be processed. Please update your payment method.`,
    actions: [
      { label: 'Update Payment', action: 'update_payment', url: '/billing/payment', style: 'primary' },
    ],
    deepLink: 'saramart://billing/payment',
  }),

  [NOTIFICATION_TYPES.INVOICE_GENERATED]: (data) => ({
    title: 'New Invoice Available',
    message: `Your invoice #${data.invoiceNumber} for ${formatCurrency(data.amount)} is now available.`,
    actions: [
      { label: 'View Invoice', action: 'view_invoice', url: `/invoices/${data.invoiceId}` },
      { label: 'Pay Now', action: 'pay_invoice', url: `/invoices/${data.invoiceId}/pay`, style: 'primary' },
    ],
    deepLink: `saramart://invoices/${data.invoiceId}`,
  }),

  // Job notifications
  [NOTIFICATION_TYPES.JOB_POSTED]: (data) => ({
    title: 'New Job Posted',
    message: `A new ${data.jobTitle || 'position'} is now available at ${data.companyName || 'a company'}. Refer and earn ${formatCurrency(data.referralBonus)}!`,
    actions: [
      { label: 'View Job', action: 'view_job', url: `/jobs/${data.jobId}` },
      { label: 'Refer Now', action: 'refer_now', url: `/jobs/${data.jobId}/refer`, style: 'primary' },
    ],
    deepLink: `saramart://jobs/${data.jobId}`,
  }),

  [NOTIFICATION_TYPES.JOB_EXPIRED]: (data) => ({
    title: 'Job Expired',
    message: `The job posting for ${data.jobTitle || 'the position'} has expired.`,
    actions: [
      { label: 'Browse Jobs', action: 'browse_jobs', url: '/jobs' },
    ],
    deepLink: 'saramart://jobs',
  }),

  [NOTIFICATION_TYPES.JOB_APPLICATION_RECEIVED]: (data) => ({
    title: 'New Application Received',
    message: `You have received a new application for ${data.jobTitle || 'your job posting'}.`,
    actions: [
      { label: 'View Application', action: 'view_application', url: `/applications/${data.applicationId}` },
    ],
    deepLink: `saramart://applications/${data.applicationId}`,
  }),

  // System notifications
  [NOTIFICATION_TYPES.WELCOME]: (data) => ({
    title: 'Welcome to Saramart! 🎉',
    message: `Hi ${data.userName || 'there'}! Welcome to Saramart. Start referring and earning today!`,
    actions: [
      { label: 'Browse Jobs', action: 'browse_jobs', url: '/jobs', style: 'primary' },
      { label: 'View Dashboard', action: 'view_dashboard', url: '/referral-dashboard' },
    ],
    deepLink: 'saramart://jobs',
  }),

  [NOTIFICATION_TYPES.KYC_VERIFIED]: (data) => ({
    title: '✅ KYC Verified',
    message: 'Your identity verification has been completed successfully. You can now request payouts!',
    actions: [
      { label: 'Request Payout', action: 'request_payout', url: '/payouts', style: 'primary' },
    ],
    deepLink: 'saramart://payouts',
  }),

  [NOTIFICATION_TYPES.KYC_REJECTED]: (data) => ({
    title: 'KYC Verification Failed',
    message: `Your identity verification could not be completed. Reason: ${data.reason || 'Please check your documents and try again.'}`,
    actions: [
      { label: 'Resubmit KYC', action: 'resubmit_kyc', url: '/profile/kyc', style: 'primary' },
    ],
    deepLink: 'saramart://profile/kyc',
  }),

  [NOTIFICATION_TYPES.PASSWORD_CHANGED]: (data) => ({
    title: 'Password Changed',
    message: 'Your password was changed successfully. If you did not make this change, please contact support immediately.',
    actions: [
      { label: 'Contact Support', action: 'contact_support', url: '/support' },
    ],
    deepLink: 'saramart://support',
  }),

  [NOTIFICATION_TYPES.ACCOUNT_SUSPENDED]: (data) => ({
    title: 'Account Suspended',
    message: `Your account has been suspended. Reason: ${data.reason || 'Please contact support for more information.'}`,
    actions: [
      { label: 'Contact Support', action: 'contact_support', url: '/support', style: 'primary' },
    ],
    deepLink: 'saramart://support',
  }),

  [NOTIFICATION_TYPES.SYSTEM_MAINTENANCE]: (data) => ({
    title: '🔧 Scheduled Maintenance',
    message: `Our system will be under maintenance on ${formatDate(data.maintenanceDate)} from ${data.startTime} to ${data.endTime}. Some features may be unavailable.`,
    actions: [],
    deepLink: null,
  }),

  // Admin notifications
  [NOTIFICATION_TYPES.NEW_COMPANY_REGISTERED]: (data) => ({
    title: 'New Company Registered',
    message: `${data.companyName} has registered and is pending verification.`,
    actions: [
      { label: 'Review Company', action: 'review_company', url: `/admin/companies/${data.companyId}` },
    ],
    deepLink: `saramart://admin/companies/${data.companyId}`,
  }),

  [NOTIFICATION_TYPES.NEW_PAYOUT_REQUEST]: (data) => ({
    title: 'New Payout Request',
    message: `${data.referrerName} has requested a payout of ${formatCurrency(data.amount)}.`,
    actions: [
      { label: 'Review Request', action: 'review_payout', url: `/admin/payouts/${data.payoutId}`, style: 'primary' },
    ],
    deepLink: `saramart://admin/payouts/${data.payoutId}`,
  }),

  [NOTIFICATION_TYPES.HIGH_VALUE_REFERRAL]: (data) => ({
    title: 'High Value Referral',
    message: `A referral with ${formatCurrency(data.bonusAmount)} bonus has been submitted for ${data.jobTitle}.`,
    actions: [
      { label: 'View Referral', action: 'view_referral', url: `/admin/referrals/${data.referralId}` },
    ],
    deepLink: `saramart://admin/referrals/${data.referralId}`,
  }),
};

// ==================== EMAIL TEMPLATES ====================

const emailTemplates = {
  [NOTIFICATION_TYPES.REFERRAL_HIRED]: (data) => ({
    subject: '🎉 Congratulations! Your Referral Was Hired',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10b981;">Congratulations!</h1>
        <p>Great news! <strong>${data.candidateName || 'Your referral'}</strong> has been hired for <strong>${data.jobTitle || 'the position'}</strong> at <strong>${data.companyName || 'the company'}</strong>.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 18px;"><strong>Your Bonus:</strong> ${formatCurrency(data.bonusAmount)}</p>
          <p style="margin: 10px 0 0 0; color: #6b7280;">This amount will be available in your account within 24 hours.</p>
        </div>
        <a href="${process.env.FRONTEND_URL}/referrals/${data.referralId}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Referral Details</a>
      </div>
    `,
    text: `Congratulations! Your referral for ${data.jobTitle} has been hired. Your bonus of ${formatCurrency(data.bonusAmount)} will be available soon. View details: ${process.env.FRONTEND_URL}/referrals/${data.referralId}`,
  }),

  [NOTIFICATION_TYPES.PAYOUT_PAID]: (data) => ({
    subject: '✅ Your Payout Has Been Processed',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10b981;">Payout Completed</h1>
        <p>Your payout has been successfully processed and sent to your ${data.paymentMethod || 'registered payment method'}.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Amount:</strong> ${formatCurrency(data.amount)}</p>
          <p style="margin: 10px 0 0 0;"><strong>Transaction ID:</strong> ${data.transactionId || 'N/A'}</p>
          <p style="margin: 10px 0 0 0;"><strong>Date:</strong> ${formatDate(data.paidAt)}</p>
        </div>
        <a href="${process.env.FRONTEND_URL}/payouts/${data.payoutId}/receipt" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Download Receipt</a>
      </div>
    `,
    text: `Your payout of ${formatCurrency(data.amount)} has been processed. Transaction ID: ${data.transactionId}. View receipt: ${process.env.FRONTEND_URL}/payouts/${data.payoutId}/receipt`,
  }),

  [NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING]: (data) => ({
    subject: '⚠️ Your Subscription Expires Soon',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f59e0b;">Subscription Expiring Soon</h1>
        <p>Your ${data.planName || 'subscription'} will expire on <strong>${formatDate(data.expiryDate)}</strong>.</p>
        <p>Renew now to avoid interruption to your service.</p>
        <a href="${process.env.FRONTEND_URL}/plans" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Renew Now</a>
      </div>
    `,
    text: `Your subscription expires on ${formatDate(data.expiryDate)}. Renew now: ${process.env.FRONTEND_URL}/plans`,
  }),

  [NOTIFICATION_TYPES.WELCOME]: (data) => ({
    subject: 'Welcome to Saramart!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Welcome to Saramart!</h1>
        <p>Hi ${data.userName || 'there'},</p>
        <p>We're excited to have you on board! Saramart connects talented job seekers with great companies, and rewards you for successful referrals.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Get Started:</h3>
          <ul>
            <li>Browse available jobs</li>
            <li>Refer friends and colleagues</li>
            <li>Earn bonuses when they get hired</li>
          </ul>
        </div>
        <a href="${process.env.FRONTEND_URL}/jobs" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Browse Jobs</a>
      </div>
    `,
    text: `Welcome to Saramart! Start browsing jobs and earning referral bonuses today: ${process.env.FRONTEND_URL}/jobs`,
  }),
};

// ==================== SMS TEMPLATES ====================

const smsTemplates = {
  [NOTIFICATION_TYPES.PAYOUT_PAID]: (data) => ({
    message: `Saramart: Your payout of ${formatCurrency(data.amount)} has been processed. Transaction ID: ${data.transactionId || 'N/A'}. Check your email for details.`,
  }),

  [NOTIFICATION_TYPES.REFERRAL_HIRED]: (data) => ({
    message: `Saramart: Congratulations! Your referral for ${data.jobTitle} was hired. Bonus: ${formatCurrency(data.bonusAmount)}. Check your dashboard for details.`,
  }),

  [NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING]: (data) => ({
    message: `Saramart: Your subscription expires on ${formatDate(data.expiryDate)}. Renew at ${process.env.FRONTEND_URL}/plans to avoid interruption.`,
  }),

  [NOTIFICATION_TYPES.PAYMENT_FAILED]: (data) => ({
    message: `Saramart: Payment of ${formatCurrency(data.amount)} failed. Please update your payment method at ${process.env.FRONTEND_URL}/billing`,
  }),
};

// ==================== TEMPLATE GETTERS ====================

/**
 * Get in-app notification template
 * @param {string} type - Notification type
 * @param {Object} data - Template data
 * @returns {Object}
 */
const getInAppTemplate = (type, data = {}) => {
  const templateFn = inAppTemplates[type];
  if (templateFn) {
    return templateFn(data);
  }
  
  // Default template
  return {
    title: data.title || 'Notification',
    message: data.message || 'You have a new notification.',
    actions: [],
    deepLink: null,
  };
};

/**
 * Get email notification template
 * @param {string} type - Notification type
 * @param {Object} data - Template data
 * @returns {Object}
 */
const getEmailTemplate = (type, data = {}) => {
  const templateFn = emailTemplates[type];
  if (templateFn) {
    return templateFn(data);
  }
  
  // Default template
  return {
    subject: data.title || 'Saramart Notification',
    html: `<p>${data.message || 'You have a new notification.'}</p>`,
    text: data.message || 'You have a new notification.',
  };
};

/**
 * Get SMS notification template
 * @param {string} type - Notification type
 * @param {Object} data - Template data
 * @returns {Object}
 */
const getSMSTemplate = (type, data = {}) => {
  const templateFn = smsTemplates[type];
  if (templateFn) {
    return templateFn(data);
  }
  
  // Default template (empty - don't send SMS for unknown types)
  return {
    message: '',
  };
};

// Export all template getters
module.exports = {
  getInAppTemplate,
  getEmailTemplate,
  getSMSTemplate,
};
