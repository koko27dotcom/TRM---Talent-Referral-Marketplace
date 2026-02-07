/**
 * WhatsApp Message Templates
 * Pre-defined templates for Myanmar market
 * Supports both Burmese (Myanmar) and English languages
 */

const { TEMPLATE_TYPE, TEMPLATE_CATEGORY } = require('../models/WhatsAppTemplate.js');

// ==================== WELCOME TEMPLATES ====================

const welcomeTemplate = {
  name: 'welcome_message',
  type: TEMPLATE_TYPE.WELCOME,
  category: TEMPLATE_CATEGORY.UTILITY,
  defaultLanguage: 'my',
  languages: {
    my: {
      code: 'my_MM',
      components: [
        {
          type: 'header',
          format: 'text',
          text: 'မင်္ဂလာပါ {{1}}! 🎉',
        },
        {
          type: 'body',
          text: 'TRM Referral Platform သို့ ကြိုဆိုပါသည်။\n\nသင့်အားအောက်ပါအကျိုးကျေးဇူးများရရှိမည်:\n• အလုပ်လွှဲပြောင်းခြင်းဖြင့် ဝင်ငွေရရှိရန်\n• သင့်ကွန်ရက်မှသူများမှတဆင့်အပိုဆုရရန်\n• KBZ Pay, Wave Pay ဖြင့်ငွေထုတ်ယူရန်\n\nအကူအညီလိုပါက "help" ဟုရိုက်ထည့်ပါ။',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
        {
          type: 'buttons',
          buttons: [
            {
              type: 'quick_reply',
              text: 'အလုပ်များကြည့်ရန်',
            },
            {
              type: 'quick_reply',
              text: 'အကူအညီ',
            },
          ],
        },
      ],
    },
    en: {
      code: 'en_US',
      components: [
        {
          type: 'header',
          format: 'text',
          text: 'Welcome {{1}}! 🎉',
        },
        {
          type: 'body',
          text: 'Welcome to TRM Referral Platform!\n\nBenefits you will enjoy:\n• Earn by referring candidates\n• Extra bonus from your network\n• Withdraw via KBZ Pay, Wave Pay\n\nType "help" for assistance.',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
        {
          type: 'buttons',
          buttons: [
            {
              type: 'quick_reply',
              text: 'Browse Jobs',
            },
            {
              type: 'quick_reply',
              text: 'Help',
            },
          ],
        },
      ],
    },
  },
  variables: [
    { name: '1', type: 'text', example: 'John', required: true },
  ],
};

// ==================== REFERRAL STATUS TEMPLATES ====================

const referralSubmittedTemplate = {
  name: 'referral_submitted',
  type: TEMPLATE_TYPE.REFERRAL_SUBMITTED,
  category: TEMPLATE_CATEGORY.UTILITY,
  defaultLanguage: 'my',
  languages: {
    my: {
      code: 'my_MM',
      components: [
        {
          type: 'body',
          text: '✅ သင့်လွှဲပြောင်းခြင်း အောင်မြင်စွာတင်သွင်းပြီးပါပြီ။\n\nလွှဲပြောင်းကုဒ်: {{1}}\nအလုပ်: {{2}}\nကုမ္ပဏီ: {{3}}\nဘောနပ်: {{4}} MMK\n\nအခြေအနေကို {{5}} တွင်ကြည့်ရှုနိုင်ပါသည်။',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
      ],
    },
    en: {
      code: 'en_US',
      components: [
        {
          type: 'body',
          text: '✅ Your referral has been submitted successfully!\n\nReferral Code: {{1}}\nJob: {{2}}\nCompany: {{3}}\nBonus: {{4}} MMK\n\nTrack status at {{5}}',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
      ],
    },
  },
  variables: [
    { name: '1', type: 'text', example: 'REF-ABC123', required: true },
    { name: '2', type: 'text', example: 'Software Engineer', required: true },
    { name: '3', type: 'text', example: 'Tech Corp', required: true },
    { name: '4', type: 'text', example: '500,000', required: true },
    { name: '5', type: 'text', example: 'https://trm.com/track', required: true },
  ],
};

const referralStatusUpdateTemplate = {
  name: 'referral_status_update',
  type: TEMPLATE_TYPE.REFERRAL_STATUS_UPDATE,
  category: TEMPLATE_CATEGORY.UTILITY,
  defaultLanguage: 'my',
  languages: {
    my: {
      code: 'my_MM',
      components: [
        {
          type: 'body',
          text: '📊 သင့်လွှဲပြောင်းခြင်း အခြေအနေ အပ်ဒိတ်\n\nလွှဲပြောင်းကုဒ်: {{1}}\nအလုပ်: {{2}}\nအခြေအနေ: {{3}}\nအပ်ဒိတ်ရက်စွဲ: {{4}}\n\n{{5}}',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
      ],
    },
    en: {
      code: 'en_US',
      components: [
        {
          type: 'body',
          text: '📊 Referral Status Update\n\nReferral Code: {{1}}\nJob: {{2}}\nStatus: {{3}}\nUpdated: {{4}}\n\n{{5}}',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
      ],
    },
  },
  variables: [
    { name: '1', type: 'text', example: 'REF-ABC123', required: true },
    { name: '2', type: 'text', example: 'Software Engineer', required: true },
    { name: '3', type: 'text', example: 'Under Review', required: true },
    { name: '4', type: 'text', example: '2024-01-15', required: true },
    { name: '5', type: 'text', example: 'View details at https://trm.com', required: false },
  ],
};

const referralHiredTemplate = {
  name: 'referral_hired',
  type: TEMPLATE_TYPE.REFERRAL_HIRED,
  category: TEMPLATE_CATEGORY.UTILITY,
  defaultLanguage: 'my',
  languages: {
    my: {
      code: 'my_MM',
      components: [
        {
          type: 'header',
          format: 'text',
          text: '🎉 ဂုဏ်ယူပါသည်!',
        },
        {
          type: 'body',
          text: 'သင့်လွှဲပြောင်းခြင်း အောင်မြင်စွာ ခန့်အပ်ခံရပါသည်!\n\nလွှဲပြောင်းကုဒ်: {{1}}\nအလုပ်: {{2}}\nကုမ္ပဏီ: {{3}}\nဘောနပ်: {{4}} MMK\n\nသင့်ဘောနပ်ငွေကို ယခုရယူနိုင်ပါသည်။',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
        {
          type: 'buttons',
          buttons: [
            {
              type: 'quick_reply',
              text: 'ငွေထုတ်ယူရန်',
            },
            {
              type: 'quick_reply',
              text: 'အသေးစိတ်',
            },
          ],
        },
      ],
    },
    en: {
      code: 'en_US',
      components: [
        {
          type: 'header',
          format: 'text',
          text: '🎉 Congratulations!',
        },
        {
          type: 'body',
          text: 'Your referral has been hired successfully!\n\nReferral Code: {{1}}\nJob: {{2}}\nCompany: {{3}}\nBonus: {{4}} MMK\n\nYou can now claim your bonus.',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
        {
          type: 'buttons',
          buttons: [
            {
              type: 'quick_reply',
              text: 'Claim Payout',
            },
            {
              type: 'quick_reply',
              text: 'View Details',
            },
          ],
        },
      ],
    },
  },
  variables: [
    { name: '1', type: 'text', example: 'REF-ABC123', required: true },
    { name: '2', type: 'text', example: 'Software Engineer', required: true },
    { name: '3', type: 'text', example: 'Tech Corp', required: true },
    { name: '4', type: 'text', example: '500,000', required: true },
  ],
};

const referralPaidTemplate = {
  name: 'referral_paid',
  type: TEMPLATE_TYPE.REFERRAL_PAID,
  category: TEMPLATE_CATEGORY.UTILITY,
  defaultLanguage: 'my',
  languages: {
    my: {
      code: 'my_MM',
      components: [
        {
          type: 'header',
          format: 'text',
          text: '💰 ငွေပေးချေမှု အောင်မြင်!',
        },
        {
          type: 'body',
          text: 'သင့်ဘောနပ်ငွေ ပေးအပ်ပြီးပါပြီ။\n\nလွှဲပြောင်းကုဒ်: {{1}}\nပေးအပ်သည့်ငွေ: {{2}} MMK\nလက်ခံသည့်နည်းလမ်း: {{3}}\nလုပ်ငန်းစဉ်ကုဒ်: {{4}}\nရက်စွဲ: {{5}}',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
      ],
    },
    en: {
      code: 'en_US',
      components: [
        {
          type: 'header',
          format: 'text',
          text: '💰 Payment Successful!',
        },
        {
          type: 'body',
          text: 'Your bonus has been paid.\n\nReferral Code: {{1}}\nAmount: {{2}} MMK\nPayment Method: {{3}}\nTransaction ID: {{4}}\nDate: {{5}}',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
      ],
    },
  },
  variables: [
    { name: '1', type: 'text', example: 'REF-ABC123', required: true },
    { name: '2', type: 'text', example: '500,000', required: true },
    { name: '3', type: 'text', example: 'KBZ Pay', required: true },
    { name: '4', type: 'text', example: 'TXN123456', required: true },
    { name: '5', type: 'text', example: '2024-01-15', required: true },
  ],
};

// ==================== PAYOUT TEMPLATES ====================

const payoutNotificationTemplate = {
  name: 'payout_notification',
  type: TEMPLATE_TYPE.PAYOUT_NOTIFICATION,
  category: TEMPLATE_CATEGORY.UTILITY,
  defaultLanguage: 'my',
  languages: {
    my: {
      code: 'my_MM',
      components: [
        {
          type: 'body',
          text: '💳 ငွေထုတ်ယူခြင်း အပ်ဒိတ်\n\nအခြေအနေ: {{1}}\nငွေပမာဏ: {{2}} MMK\n{{3}}\n\n{{4}}',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
      ],
    },
    en: {
      code: 'en_US',
      components: [
        {
          type: 'body',
          text: '💳 Payout Update\n\nStatus: {{1}}\nAmount: {{2}} MMK\n{{3}}\n\n{{4}}',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
      ],
    },
  },
  variables: [
    { name: '1', type: 'text', example: 'Processing', required: true },
    { name: '2', type: 'text', example: '500,000', required: true },
    { name: '3', type: 'text', example: 'Transaction ID: TXN123', required: false },
    { name: '4', type: 'text', example: 'Expected within 1-2 days', required: false },
  ],
};

// ==================== COMPANY APPROVAL TEMPLATES ====================

const companyApprovalRequestTemplate = {
  name: 'company_approval_request',
  type: TEMPLATE_TYPE.COMPANY_APPROVAL_REQUEST,
  category: TEMPLATE_CATEGORY.UTILITY,
  defaultLanguage: 'my',
  languages: {
    my: {
      code: 'my_MM',
      components: [
        {
          type: 'header',
          format: 'text',
          text: '🔔 လွှဲပြောင်းခြင်း အသစ်',
        },
        {
          type: 'body',
          text: 'သင့်လုပ်ငန်းသို့ လူနာတစ်ဦး၏ လွှဲပြောင်းခြင်း ရောက်ရှိပါသည်။\n\nလွှဲပြောင်းကုဒ်: {{1}}\nအလုပ်: {{2}}\nလူနာအမည်: {{3}}\nတင်သွင်းသည့်ရက်စွဲ: {{4}}',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
        {
          type: 'buttons',
          buttons: [
            {
              type: 'quick_reply',
              text: 'အတည်ပြုရန်',
            },
            {
              type: 'quick_reply',
              text: 'ငြင်းပယ်ရန်',
            },
            {
              type: 'quick_reply',
              text: 'ကြည့်ရှုရန်',
            },
          ],
        },
      ],
    },
    en: {
      code: 'en_US',
      components: [
        {
          type: 'header',
          format: 'text',
          text: '🔔 New Referral',
        },
        {
          type: 'body',
          text: 'A new referral has been submitted to your company.\n\nReferral Code: {{1}}\nJob: {{2}}\nCandidate: {{3}}\nSubmitted: {{4}}',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
        {
          type: 'buttons',
          buttons: [
            {
              type: 'quick_reply',
              text: 'Approve',
            },
            {
              type: 'quick_reply',
              text: 'Reject',
            },
            {
              type: 'quick_reply',
              text: 'View',
            },
          ],
        },
      ],
    },
  },
  variables: [
    { name: '1', type: 'text', example: 'REF-ABC123', required: true },
    { name: '2', type: 'text', example: 'Software Engineer', required: true },
    { name: '3', type: 'text', example: 'John Doe', required: true },
    { name: '4', type: 'text', example: '2024-01-15', required: true },
  ],
};

// ==================== JOB ALERT TEMPLATES ====================

const jobAlertTemplate = {
  name: 'job_alert',
  type: TEMPLATE_TYPE.JOB_ALERT,
  category: TEMPLATE_CATEGORY.MARKETING,
  defaultLanguage: 'my',
  languages: {
    my: {
      code: 'my_MM',
      components: [
        {
          type: 'header',
          format: 'text',
          text: '📢 အလုပ် အသစ်',
        },
        {
          type: 'body',
          text: '{{1}}\n\nကုမ္ပဏီ: {{2}}\nတည်နေရာ: {{3}}\nဘောနပ်: {{4}} MMK\n\n{{5}}',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
        {
          type: 'buttons',
          buttons: [
            {
              type: 'quick_reply',
              text: 'လွှဲပြောင်းရန်',
            },
            {
              type: 'quick_reply',
              text: 'အသေးစိတ်',
            },
          ],
        },
      ],
    },
    en: {
      code: 'en_US',
      components: [
        {
          type: 'header',
          format: 'text',
          text: '📢 New Job Alert',
        },
        {
          type: 'body',
          text: '{{1}}\n\nCompany: {{2}}\nLocation: {{3}}\nBonus: {{4}} MMK\n\n{{5}}',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
        {
          type: 'buttons',
          buttons: [
            {
              type: 'quick_reply',
              text: 'Refer Now',
            },
            {
              type: 'quick_reply',
              text: 'Details',
            },
          ],
        },
      ],
    },
  },
  variables: [
    { name: '1', type: 'text', example: 'Senior Software Engineer', required: true },
    { name: '2', type: 'text', example: 'Tech Corp', required: true },
    { name: '3', type: 'text', example: 'Yangon', required: true },
    { name: '4', type: 'text', example: '1,000,000', required: true },
    { name: '5', type: 'text', example: 'Apply at https://trm.com/jobs/123', required: false },
  ],
};

// ==================== APPLICATION REMINDER TEMPLATES ====================

const applicationReminderTemplate = {
  name: 'application_reminder',
  type: TEMPLATE_TYPE.APPLICATION_REMINDER,
  category: TEMPLATE_CATEGORY.UTILITY,
  defaultLanguage: 'my',
  languages: {
    my: {
      code: 'my_MM',
      components: [
        {
          type: 'body',
          text: '⏰ သတိပေးချက်\n\nသင့်လွှဲပြောင်းခြင်း {{1}} သည် {{2}} ရက်ကြာပြီးပါပြီ။\n\nကျေးဇူးပြု၍ အခြေအနေစစ်ဆေးပြီး အပ်ဒိတ်ပေးပါ။',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
      ],
    },
    en: {
      code: 'en_US',
      components: [
        {
          type: 'body',
          text: '⏰ Reminder\n\nYour referral {{1}} has been pending for {{2}} days.\n\nPlease review and provide an update.',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
      ],
    },
  },
  variables: [
    { name: '1', type: 'text', example: 'REF-ABC123', required: true },
    { name: '2', type: 'text', example: '7', required: true },
  ],
};

// ==================== OPT-IN/OPT-OUT TEMPLATES ====================

const optInConfirmationTemplate = {
  name: 'opt_in_confirmation',
  type: TEMPLATE_TYPE.OPT_IN_CONFIRMATION,
  category: TEMPLATE_CATEGORY.UTILITY,
  defaultLanguage: 'my',
  languages: {
    my: {
      code: 'my_MM',
      components: [
        {
          type: 'body',
          text: '✅ အတည်ပြုပြီးပါပြီ\n\nသင်သည် TRM Referral Platform ၏ WhatsApp မက်ဆေ့ချ်များကိုလက်ခံရရှိမည်။\n\n• လွှဲပြောင်းခြင်းအခြေအနေများ\n• ငွေထုတ်ယူခြင်းအပ်ဒိတ်များ\n• အလုပ်အကိုင်အသစ်များ\n\nမက်ဆေ့ချ်များရပ်ဆိုင်းလိုပါက "STOP" ဟုရိုက်ထည့်ပါ။',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
      ],
    },
    en: {
      code: 'en_US',
      components: [
        {
          type: 'body',
          text: '✅ Confirmed\n\nYou will now receive WhatsApp messages from TRM Referral Platform.\n\n• Referral status updates\n• Payout notifications\n• New job alerts\n\nReply "STOP" to unsubscribe.',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
      ],
    },
  },
  variables: [],
};

const optOutConfirmationTemplate = {
  name: 'opt_out_confirmation',
  type: TEMPLATE_TYPE.OPT_OUT_CONFIRMATION,
  category: TEMPLATE_CATEGORY.UTILITY,
  defaultLanguage: 'my',
  languages: {
    my: {
      code: 'my_MM',
      components: [
        {
          type: 'body',
          text: 'သင်သည် WhatsApp မက်ဆေ့ချ်များရပ်ဆိုင်းလိုက်ပါပြီ။\n\nပြန်လည်ချိတ်ဆက်လိုပါက "START" ဟုရိုက်ထည့်ပါ။',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
      ],
    },
    en: {
      code: 'en_US',
      components: [
        {
          type: 'body',
          text: 'You have unsubscribed from WhatsApp messages.\n\nReply "START" to resubscribe.',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
      ],
    },
  },
  variables: [],
};

// ==================== NETWORK/TIER TEMPLATES ====================

const networkInviteTemplate = {
  name: 'network_invite',
  type: TEMPLATE_TYPE.NETWORK_INVITE,
  category: TEMPLATE_CATEGORY.MARKETING,
  defaultLanguage: 'my',
  languages: {
    my: {
      code: 'my_MM',
      components: [
        {
          type: 'header',
          format: 'text',
          text: '🤝 သင့်ကွန်ရက်သို့ ဖိတ်ကြားပါ!',
        },
        {
          type: 'body',
          text: '{{1}} သည် သင့်ကွန်ရက်သို့ ပါဝင်လိုပါသည်။\n\nသင့်ကွန်ရက်မှသူများကအလုပ်လွှဲပြောင်းသောအခါ အပိုဆုရရှိမည်!\n\nဖိတ်ကြားချက်: {{2}}',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
        {
          type: 'buttons',
          buttons: [
            {
              type: 'quick_reply',
              text: 'လက်ခံမည်',
            },
            {
              type: 'quick_reply',
              text: 'ငြင်းပယ်မည်',
            },
          ],
        },
      ],
    },
    en: {
      code: 'en_US',
      components: [
        {
          type: 'header',
          format: 'text',
          text: '🤝 Network Invite!',
        },
        {
          type: 'body',
          text: '{{1}} wants to join your network.\n\nEarn extra bonus when they refer candidates!\n\nInvite: {{2}}',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
        {
          type: 'buttons',
          buttons: [
            {
              type: 'quick_reply',
              text: 'Accept',
            },
            {
              type: 'quick_reply',
              text: 'Decline',
            },
          ],
        },
      ],
    },
  },
  variables: [
    { name: '1', type: 'text', example: 'John Doe', required: true },
    { name: '2', type: 'text', example: 'https://trm.com/invite/ABC123', required: true },
  ],
};

const tierUpgradeTemplate = {
  name: 'tier_upgrade',
  type: TEMPLATE_TYPE.TIER_UPGRADE,
  category: TEMPLATE_CATEGORY.UTILITY,
  defaultLanguage: 'my',
  languages: {
    my: {
      code: 'my_MM',
      components: [
        {
          type: 'header',
          format: 'text',
          text: '🏆 အဆင့်တိုးမြင့်မှု!',
        },
        {
          type: 'body',
          text: 'ဂုဏ်ယူပါသည် {{1}}!\n\nသင်သည် {{2}} Tier သို့ ရောက်ရှိပါပြီ။\n\nအကျိုးကျေးဇူးများ:\n• ဘောနပ် {{3}}% တိုးမြင့်\n• အထူးအလုပ်အကိုင်များ\n• VIP ပံ့ပိုးမှု\n\nဆက်လက်ကြိုးစားပါ!',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
      ],
    },
    en: {
      code: 'en_US',
      components: [
        {
          type: 'header',
          format: 'text',
          text: '🏆 Tier Upgrade!',
        },
        {
          type: 'body',
          text: 'Congratulations {{1}}!\n\nYou have reached {{2}} Tier.\n\nBenefits:\n• {{3}}% bonus increase\n• Exclusive job access\n• VIP support\n\nKeep up the great work!',
        },
        {
          type: 'footer',
          text: 'TRM Referral Platform',
        },
      ],
    },
  },
  variables: [
    { name: '1', type: 'text', example: 'John', required: true },
    { name: '2', type: 'text', example: 'Gold', required: true },
    { name: '3', type: 'text', example: '10', required: true },
  ],
};

// ==================== ALL TEMPLATES ARRAY ====================

const allTemplates = [
  welcomeTemplate,
  referralSubmittedTemplate,
  referralStatusUpdateTemplate,
  referralHiredTemplate,
  referralPaidTemplate,
  payoutNotificationTemplate,
  companyApprovalRequestTemplate,
  jobAlertTemplate,
  applicationReminderTemplate,
  optInConfirmationTemplate,
  optOutConfirmationTemplate,
  networkInviteTemplate,
  tierUpgradeTemplate,
];

// ==================== HELPER FUNCTIONS ====================

/**
 * Get template by type
 * @param {string} type - Template type
 * @returns {Object|null}
 */
const getTemplateByType = (type) => {
  return allTemplates.find(t => t.type === type) || null;
};

/**
 * Get template by name
 * @param {string} name - Template name
 * @returns {Object|null}
 */
const getTemplateByName = (name) => {
  return allTemplates.find(t => t.name === name) || null;
};

/**
 * Initialize all templates in database
 * @param {Function} createFn - Function to create template
 */
const initializeTemplates = async (createFn) => {
  const results = {
    created: [],
    existing: [],
    failed: [],
  };
  
  for (const template of allTemplates) {
    try {
      const result = await createFn(template);
      if (result.created) {
        results.created.push(template.name);
      } else {
        results.existing.push(template.name);
      }
    } catch (error) {
      results.failed.push({ name: template.name, error: error.message });
    }
  }
  
  return results;
};

module.exports = {
  allTemplates,
  getTemplateByType,
  getTemplateByName,
  initializeTemplates,
};
