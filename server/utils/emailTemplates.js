/**
 * Email Templates
 * Predefined email templates for the TRM platform
 * Includes English and Burmese (Unicode) translations
 */

// Welcome Series Templates
const WELCOME_REFERRER_TEMPLATES = {
  welcome_email: {
    name: 'Welcome - New Referrer',
    slug: 'welcome-referrer',
    category: 'welcome',
    subject: 'Welcome to TRM Jobs - Start Earning Today!',
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to TRM Jobs</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .feature { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to TRM Jobs!</h1>
    </div>
    <div class="content">
      <h2>Hello {{name}},</h2>
      <p>Thank you for joining TRM Jobs - Myanmar's premier referral recruitment platform!</p>
      
      <p>You're now part of a growing community of referrers who are helping connect talented professionals with amazing opportunities while earning competitive commissions.</p>
      
      <div class="feature">
        <strong>🎯 Your Referral Code:</strong> {{referralCode}}
      </div>
      
      <div class="feature">
        <strong>💰 Commission Rates:</strong><br>
        • Bronze (0-5 referrals): 5%<br>
        • Silver (6-15): 7%<br>
        • Gold (16-30): 10%<br>
        • Platinum (30+): 15%
      </div>
      
      <center>
        <a href="{{dashboardUrl}}" class="button">Go to Dashboard</a>
      </center>
      
      <p><strong>Quick Start Tips:</strong></p>
      <ul>
        <li>Browse available jobs in your network</li>
        <li>Share opportunities with qualified candidates</li>
        <li>Track your referrals in real-time</li>
        <li>Get paid when your referrals get hired!</li>
      </ul>
      
      <p>Need help? Reply to this email or contact our support team.</p>
      
      <p>Best regards,<br>The TRM Jobs Team</p>
    </div>
    <div class="footer">
      <p>© {{currentYear}} TRM Jobs. All rights reserved.</p>
      <p><a href="{{unsubscribeUrl}}">Unsubscribe</a> | <a href="{{preferencesUrl}}">Email Preferences</a></p>
    </div>
  </div>
</body>
</html>
    `,
    textContent: `
Welcome to TRM Jobs!

Hello {{name}},

Thank you for joining TRM Jobs - Myanmar's premier referral recruitment platform!

Your Referral Code: {{referralCode}}

Commission Rates:
- Bronze (0-5 referrals): 5%
- Silver (6-15): 7%
- Gold (16-30): 10%
- Platinum (30+): 15%

Go to Dashboard: {{dashboardUrl}}

Quick Start Tips:
- Browse available jobs in your network
- Share opportunities with qualified candidates
- Track your referrals in real-time
- Get paid when your referrals get hired!

Best regards,
The TRM Jobs Team

© {{currentYear}} TRM Jobs. All rights reserved.
Unsubscribe: {{unsubscribeUrl}}
    `,
    variables: [
      { name: 'name', description: 'User name', required: true },
      { name: 'referralCode', description: 'User referral code', required: true },
      { name: 'dashboardUrl', description: 'Dashboard URL', required: true },
      { name: 'preferencesUrl', description: 'Preferences URL', required: false },
      { name: 'currentYear', description: 'Current year', required: false },
      { name: 'unsubscribeUrl', description: 'Unsubscribe URL', required: true },
    ],
    translations: {
      my: {
        subject: 'TRM Jobs မှ ကြိုဆိုပါသည် - ယနေ့စတင်အမြတ်ရယူပါ!',
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TRM Jobs မှ ကြိုဆိုပါသည်</title>
  <style>
    body { font-family: 'Pyidaungsu', 'Myanmar Text', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .feature { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 TRM Jobs မှ ကြိုဆိုပါသည်!</h1>
    </div>
    <div class="content">
      <h2>မင်္ဂလာပါ {{name}}၊</h2>
      <p>TRM Jobs - မြန်မာနိုင်ငံ၏ အကောင်းဆုံး လွှဲပြောင်းခန့်အပ်ရေးပလက်ဖောင်းသို့ ဝင်ရောက်လာခြင်းအတွက် ကျေးဇူးတင်ပါသည်!</p>
      
      <p>ယခုအခါ သင်သည် ထူးချွန်သော ပညာရှင်များကို အခွင့်အလမ်းကောင်းများနှင့် ဆက်သွယ်ပေးနေသော ပိုမိုကြီးထွားလာသော လွှဲပြောင်းခန့်အပ်ရေးအဖွဲ့ဝင်တစ်ဦး ဖြစ်လာပါပြီ။</p>
      
      <div class="feature">
        <strong>🎯 သင့်လွှဲပြောင်းကုဒ် -</strong> {{referralCode}}
      </div>
      
      <div class="feature">
        <strong>💰 ကော်မရှင်နှုန်းထား -</strong><br>
        • ဘရွန်းဇ် (၀-၅ လွှဲပြောင်း): ၅%<br>
        • ရွှေရောင် (၆-၁၅): ၇%<br>
        • ရွှေဝါရောင် (၁၆-၃၀): ၁၀%<br>
        • ပလက်တိနမ် (၃၀+): ၁၅%
      </div>
      
      <center>
        <a href="{{dashboardUrl}}" class="button">ဒက်ရှ်ဘုတ်သို့သွားပါ</a>
      </center>
      
      <p><strong>အမြန်စတင်နည်းလမ်းများ -</strong></p>
      <ul>
        <li>သင့်ကွန်ရက်ထဲရှိ အလုပ်ခေါ်စာများကို ရှာဖွေပါ</li>
        <li>အရည်အချင်းပြည့်မီသော လျှောက်ထားသူများနှင့် အခွင့်အလမ်းများကို မျှဝေပါ</li>
        <li>သင့်လွှဲပြောင်းများကို တိုက်ရိုက်စောင့်ကြည့်ပါ</li>
        <li>သင့်လွှဲပြောင်းများ ခန့်အပ်ခံရပါက လစာရရှိမည်!</li>
      </ul>
      
      <p>အကူအညီလိုပါက ဤအီးမေးလ်သို့ ပြန်ဖြေကြားပါ သို့မဟုတ် ကျွန်ုပ်တို့၏ ပံ့ပိုးရေးအဖွဲ့ကို ဆက်သွယ်ပါ။</p>
      
      <p>ဂုဏ်ယူစွာဖြင့်၊<br>TRM Jobs အဖွဲ့</p>
    </div>
    <div class="footer">
      <p>© {{currentYear}} TRM Jobs။ အခွင့်အရေးအားလုံး ရယူထားသည်။</p>
      <p><a href="{{unsubscribeUrl}}">စာရင်းမှဖယ်ရှားရန်</a></p>
    </div>
  </div>
</body>
</html>
        `,
      },
    },
  },
};

// Job Alert Templates
const JOB_ALERT_TEMPLATES = {
  daily_digest: {
    name: 'Daily Job Digest',
    slug: 'job-daily-digest',
    category: 'job_alert',
    subject: 'New Jobs Matching Your Interests - {{date}}',
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job Alert</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #667eea; padding: 20px; text-align: center; color: white; }
    .job-card { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; }
    .job-title { font-size: 18px; font-weight: bold; color: #667eea; margin-bottom: 5px; }
    .job-meta { color: #666; font-size: 14px; }
    .salary { color: #28a745; font-weight: bold; }
    .button { display: inline-block; background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 New Job Opportunities</h1>
      <p>Hi {{name}}, here are the latest jobs matching your interests</p>
    </div>
    
    <div style="padding: 20px;">
      {{#each jobs}}
      <div class="job-card">
        <div class="job-title">{{title}}</div>
        <div class="job-meta">
          {{company}} • {{location}}<br>
          <span class="salary">{{salary}}</span>
        </div>
        <p>{{description}}</p>
        <a href="{{referralUrl}}" class="button">Refer Candidate</a>
      </div>
      {{/each}}
      
      <center style="margin-top: 30px;">
        <a href="{{allJobsUrl}}" class="button">View All Jobs</a>
      </center>
    </div>
    
    <div class="footer">
      <p>© {{currentYear}} TRM Jobs. All rights reserved.</p>
      <p><a href="{{unsubscribeUrl}}">Unsubscribe from job alerts</a></p>
    </div>
  </div>
</body>
</html>
    `,
    variables: [
      { name: 'name', description: 'User name', required: true },
      { name: 'date', description: 'Current date', required: true },
      { name: 'jobs', description: 'Array of job objects', required: true },
      { name: 'allJobsUrl', description: 'All jobs URL', required: true },
      { name: 'currentYear', description: 'Current year', required: false },
      { name: 'unsubscribeUrl', description: 'Unsubscribe URL', required: true },
    ],
  },
};

// Referral Status Templates
const REFERRAL_STATUS_TEMPLATES = {
  referral_submitted: {
    name: 'Referral Submitted',
    slug: 'referral-submitted',
    category: 'referral',
    subject: 'Your Referral Has Been Submitted - {{candidateName}}',
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Referral Submitted</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #28a745; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #fff; }
    .status-box { background: #e8f5e9; border: 1px solid #4caf50; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Referral Submitted Successfully</h1>
    </div>
    <div class="content">
      <h2>Hello {{referrerName}},</h2>
      
      <p>Great news! Your referral has been successfully submitted.</p>
      
      <div class="status-box">
        <strong>Candidate:</strong> {{candidateName}}<br>
        <strong>Position:</strong> {{jobTitle}}<br>
        <strong>Company:</strong> {{companyName}}<br>
        <strong>Referral ID:</strong> {{referralId}}
      </div>
      
      <p><strong>What's Next?</strong></p>
      <ul>
        <li>The hiring team will review the candidate's profile</li>
        <li>You'll receive updates at each stage</li>
        <li>If hired, you'll earn {{commissionRate}}% commission</li>
      </ul>
      
      <p>Track your referral status anytime in your dashboard.</p>
      
      <center>
        <a href="{{trackingUrl}}" style="display:inline-block;background:#667eea;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;">Track Referral</a>
      </center>
    </div>
    <div class="footer">
      <p>© {{currentYear}} TRM Jobs. All rights reserved.</p>
      <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
    `,
    variables: [
      { name: 'referrerName', description: 'Referrer name', required: true },
      { name: 'candidateName', description: 'Candidate name', required: true },
      { name: 'jobTitle', description: 'Job title', required: true },
      { name: 'companyName', description: 'Company name', required: true },
      { name: 'referralId', description: 'Referral ID', required: true },
      { name: 'commissionRate', description: 'Commission rate', required: true },
      { name: 'trackingUrl', description: 'Tracking URL', required: true },
      { name: 'currentYear', description: 'Current year', required: false },
      { name: 'unsubscribeUrl', description: 'Unsubscribe URL', required: true },
    ],
  },
  
  status_update: {
    name: 'Referral Status Update',
    slug: 'referral-status-update',
    category: 'referral',
    subject: 'Update on {{candidateName}} - {{newStatus}}',
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Referral Status Update</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #667eea; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #fff; }
    .status-update { background: #f0f4ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Referral Status Update</h1>
    </div>
    <div class="content">
      <h2>Hello {{referrerName}},</h2>
      
      <p>There's an update on your referral:</p>
      
      <div class="status-update">
        <strong>Candidate:</strong> {{candidateName}}<br>
        <strong>Position:</strong> {{jobTitle}}<br>
        <strong>Previous Status:</strong> {{oldStatus}}<br>
        <strong>New Status:</strong> <span style="color: #667eea; font-weight: bold;">{{newStatus}}</span><br>
        <strong>Updated:</strong> {{updateDate}}
      </div>
      
      {{#if notes}}
      <p><strong>Notes:</strong> {{notes}}</p>
      {{/if}}
      
      <center>
        <a href="{{trackingUrl}}" style="display:inline-block;background:#667eea;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;">View Full Details</a>
      </center>
    </div>
    <div class="footer">
      <p>© {{currentYear}} TRM Jobs. All rights reserved.</p>
      <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
    `,
    variables: [
      { name: 'referrerName', description: 'Referrer name', required: true },
      { name: 'candidateName', description: 'Candidate name', required: true },
      { name: 'jobTitle', description: 'Job title', required: true },
      { name: 'oldStatus', description: 'Previous status', required: true },
      { name: 'newStatus', description: 'New status', required: true },
      { name: 'updateDate', description: 'Update date', required: true },
      { name: 'notes', description: 'Additional notes', required: false },
      { name: 'trackingUrl', description: 'Tracking URL', required: true },
      { name: 'currentYear', description: 'Current year', required: false },
      { name: 'unsubscribeUrl', description: 'Unsubscribe URL', required: true },
    ],
  },
};

// Payout Templates
const PAYOUT_TEMPLATES = {
  payout_processed: {
    name: 'Payout Processed',
    slug: 'payout-processed',
    category: 'payout',
    subject: '💰 Your Payout Has Been Processed - {{amount}} MMK',
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payout Processed</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; background: #fff; }
    .amount { font-size: 36px; color: #28a745; text-align: center; margin: 20px 0; }
    .details { background: #f8f9fa; padding: 20px; border-radius: 8px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Payout Processed!</h1>
    </div>
    <div class="content">
      <h2>Hello {{name}},</h2>
      
      <p>Great news! Your payout has been processed successfully.</p>
      
      <div class="amount">{{amount}} MMK</div>
      
      <div class="details">
        <strong>Payout Details:</strong><br>
        Payout ID: {{payoutId}}<br>
        Method: {{payoutMethod}}<br>
        Account: {{accountNumber}}<br>
        Processed Date: {{processedDate}}<br>
        Expected Arrival: {{expectedDate}}
      </div>
      
      <p style="margin-top: 20px;">Thank you for being a valued referrer on TRM Jobs!</p>
      
      <center>
        <a href="{{payoutsUrl}}" style="display:inline-block;background:#667eea;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;">View Payout History</a>
      </center>
    </div>
    <div class="footer">
      <p>© {{currentYear}} TRM Jobs. All rights reserved.</p>
      <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
    `,
    variables: [
      { name: 'name', description: 'User name', required: true },
      { name: 'amount', description: 'Payout amount', required: true },
      { name: 'payoutId', description: 'Payout ID', required: true },
      { name: 'payoutMethod', description: 'Payment method', required: true },
      { name: 'accountNumber', description: 'Account number (masked)', required: true },
      { name: 'processedDate', description: 'Processing date', required: true },
      { name: 'expectedDate', description: 'Expected arrival date', required: true },
      { name: 'payoutsUrl', description: 'Payouts page URL', required: true },
      { name: 'currentYear', description: 'Current year', required: false },
      { name: 'unsubscribeUrl', description: 'Unsubscribe URL', required: true },
    ],
  },
};

// Re-engagement Templates
const REENGAGEMENT_TEMPLATES = {
  we_miss_you: {
    name: 'We Miss You',
    slug: 'we-miss-you',
    category: 're_engagement',
    subject: 'We miss you! Here are the top jobs this week',
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>We Miss You</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #667eea; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; background: #fff; }
    .job-card { border: 1px solid #e0e0e0; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .highlight { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>👋 We Miss You!</h1>
      <p>It's been a while since your last visit</p>
    </div>
    <div class="content">
      <h2>Hello {{name}},</h2>
      
      <p>We noticed you haven't been active lately. The referral market is hot right now - don't miss out on these opportunities!</p>
      
      <div class="highlight">
        <strong>💡 Did you know?</strong><br>
        Top referrers are earning an average of 500,000 MMK per month!
      </div>
      
      <h3>🔥 Hot Jobs This Week:</h3>
      {{#each topJobs}}
      <div class="job-card">
        <strong>{{title}}</strong><br>
        {{company}} • {{location}}<br>
        <span style="color: #28a745;">{{salary}}</span>
      </div>
      {{/each}}
      
      <center style="margin-top: 30px;">
        <a href="{{dashboardUrl}}" style="display:inline-block;background:#667eea;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;">Start Referring Now</a>
      </center>
    </div>
    <div class="footer">
      <p>© {{currentYear}} TRM Jobs. All rights reserved.</p>
      <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
    `,
    variables: [
      { name: 'name', description: 'User name', required: true },
      { name: 'topJobs', description: 'Array of top job objects', required: true },
      { name: 'dashboardUrl', description: 'Dashboard URL', required: true },
      { name: 'currentYear', description: 'Current year', required: false },
      { name: 'unsubscribeUrl', description: 'Unsubscribe URL', required: true },
    ],
  },
};

// Company Activation Templates
const COMPANY_ACTIVATION_TEMPLATES = {
  get_more_referrals: {
    name: 'Get More Referrals',
    slug: 'get-more-referrals',
    category: 'marketing',
    subject: 'Tips to Get More Quality Referrals',
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Get More Referrals</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #667eea; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; background: #fff; }
    .tip { background: #f0f4ff; padding: 15px; margin: 15px 0; border-left: 4px solid #667eea; }
    .stat { text-align: center; padding: 20px; background: #f8f9fa; margin: 10px 0; }
    .stat-number { font-size: 32px; color: #667eea; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Boost Your Referrals</h1>
    </div>
    <div class="content">
      <h2>Hello {{name}},</h2>
      
      <p>We noticed you've posted {{jobCount}} job(s) but haven't received referrals yet. Here are some tips to get started:</p>
      
      <div class="tip">
        <strong>1. Share on Social Media</strong><br>
        Post your job links on Facebook, LinkedIn, and professional groups
      </div>
      
      <div class="tip">
        <strong>2. Engage Your Network</strong><br>
        Reach out directly to people in your industry who might know qualified candidates
      </div>
      
      <div class="tip">
        <strong>3. Offer Competitive Commissions</strong><br>
        Higher commission rates attract more active referrers
      </div>
      
      <div class="stat">
        <div class="stat-number">3x</div>
        <div>More referrals when actively shared on social media</div>
      </div>
      
      <center style="margin-top: 30px;">
        <a href="{{jobsUrl}}" style="display:inline-block;background:#667eea;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;">View Your Jobs</a>
      </center>
    </div>
    <div class="footer">
      <p>© {{currentYear}} TRM Jobs. All rights reserved.</p>
      <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
    `,
    variables: [
      { name: 'name', description: 'User name', required: true },
      { name: 'jobCount', description: 'Number of jobs posted', required: true },
      { name: 'jobsUrl', description: 'Jobs page URL', required: true },
      { name: 'currentYear', description: 'Current year', required: false },
      { name: 'unsubscribeUrl', description: 'Unsubscribe URL', required: true },
    ],
  },
};

// Candidate Follow-up Templates
const CANDIDATE_FOLLOWUP_TEMPLATES = {
  application_reminder_24h: {
    name: 'Application Reminder - 24hr',
    slug: 'application-reminder-24h',
    category: 'notification',
    subject: 'Complete Your Application - {{jobTitle}}',
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Complete Your Application</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ffc107; color: #333; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #fff; }
    .job-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .urgent { color: #dc3545; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Don't Miss Out!</h1>
    </div>
    <div class="content">
      <h2>Hello {{name}},</h2>
      
      <p>You started an application for:</p>
      
      <div class="job-box">
        <strong>{{jobTitle}}</strong><br>
        {{companyName}}<br>
        {{location}}
      </div>
      
      <p class="urgent">But you haven't completed it yet!</p>
      
      <p>This is a great opportunity. Complete your application now to be considered.</p>
      
      <center>
        <a href="{{applicationUrl}}" style="display:inline-block;background:#28a745;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;">Complete Application</a>
      </center>
      
      <p style="margin-top: 20px; font-size: 14px; color: #666;">
        Need help? Contact us at support@trmjobs.com
      </p>
    </div>
    <div class="footer">
      <p>© {{currentYear}} TRM Jobs. All rights reserved.</p>
      <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
    `,
    variables: [
      { name: 'name', description: 'Candidate name', required: true },
      { name: 'jobTitle', description: 'Job title', required: true },
      { name: 'companyName', description: 'Company name', required: true },
      { name: 'location', description: 'Job location', required: true },
      { name: 'applicationUrl', description: 'Application URL', required: true },
      { name: 'currentYear', description: 'Current year', required: false },
      { name: 'unsubscribeUrl', description: 'Unsubscribe URL', required: true },
    ],
  },
};

// System/Transactional Templates
const SYSTEM_TEMPLATES = {
  password_reset: {
    name: 'Password Reset',
    slug: 'password-reset',
    category: 'transactional',
    subject: 'Password Reset Request',
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Password Reset</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #667eea; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #fff; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Password Reset</h1>
    </div>
    <div class="content">
      <h2>Hello {{name}},</h2>
      
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      
      <center>
        <a href="{{resetUrl}}" style="display:inline-block;background:#667eea;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;">Reset Password</a>
      </center>
      
      <p style="margin-top: 20px;">This link will expire in 1 hour.</p>
      
      <p>If you didn't request this, please ignore this email or contact support if you have concerns.</p>
    </div>
    <div class="footer">
      <p>© {{currentYear}} TRM Jobs. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `,
    variables: [
      { name: 'name', description: 'User name', required: true },
      { name: 'resetUrl', description: 'Password reset URL', required: true },
      { name: 'currentYear', description: 'Current year', required: false },
    ],
  },
};

// Export all template collections
const ALL_TEMPLATES = {
  ...WELCOME_REFERRER_TEMPLATES,
  ...JOB_ALERT_TEMPLATES,
  ...REFERRAL_STATUS_TEMPLATES,
  ...PAYOUT_TEMPLATES,
  ...REENGAGEMENT_TEMPLATES,
  ...COMPANY_ACTIVATION_TEMPLATES,
  ...CANDIDATE_FOLLOWUP_TEMPLATES,
  ...SYSTEM_TEMPLATES,
};

/**
 * Initialize default templates in database
 * @param {string} createdBy - User ID creating templates
 */
const initializeDefaultTemplates = async (createdBy) => {
  const { default: EmailTemplate } = await import('../models/EmailTemplate.js');
  
  const created = [];
  
  for (const [key, templateData] of Object.entries(ALL_TEMPLATES)) {
    const existing = await EmailTemplate.findOne({ slug: templateData.slug });
    if (!existing) {
      const template = new EmailTemplate({
        ...templateData,
        status: 'active',
        createdBy,
      });
      await template.save();
      created.push(template);
    }
  }
  
  return created;
};

module.exports = {
  WELCOME_REFERRER_TEMPLATES,
  JOB_ALERT_TEMPLATES,
  REFERRAL_STATUS_TEMPLATES,
  PAYOUT_TEMPLATES,
  REENGAGEMENT_TEMPLATES,
  COMPANY_ACTIVATION_TEMPLATES,
  CANDIDATE_FOLLOWUP_TEMPLATES,
  SYSTEM_TEMPLATES,
  ALL_TEMPLATES,
  initializeDefaultTemplates,
};
