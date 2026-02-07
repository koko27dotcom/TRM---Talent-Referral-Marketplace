/**
 * BotConfiguration Model
 * Represents bot settings and configuration
 * Stores personality, messages, working hours, and integration settings
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Personality trait schema
const PersonalityTraitSchema = new Schema({
  trait: {
    type: String,
    required: true,
    trim: true,
  },
  value: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5,
  },
  description: String,
}, { _id: false });

// Message template schema
const MessageTemplateSchema = new Schema({
  key: {
    type: String,
    required: true,
    trim: true,
  },
  messages: {
    en: String,
    my: String,
  },
  variations: {
    en: [String],
    my: [String],
  },
  conditions: Schema.Types.Mixed,
}, { _id: false });

// Working hours schema
const WorkingHoursSchema = new Schema({
  enabled: {
    type: Boolean,
    default: false,
  },
  timezone: {
    type: String,
    default: 'Asia/Yangon',
  },
  schedule: {
    monday: { start: String, end: String, enabled: { type: Boolean, default: true } },
    tuesday: { start: String, end: String, enabled: { type: Boolean, default: true } },
    wednesday: { start: String, end: String, enabled: { type: Boolean, default: true } },
    thursday: { start: String, end: String, enabled: { type: Boolean, default: true } },
    friday: { start: String, end: String, enabled: { type: Boolean, default: true } },
    saturday: { start: String, end: String, enabled: { type: Boolean, default: false } },
    sunday: { start: String, end: String, enabled: { type: Boolean, default: false } },
  },
  outsideHoursMessage: {
    en: String,
    my: String,
  },
}, { _id: false });

// Escalation rules schema
const EscalationRulesSchema = new Schema({
  enabled: {
    type: Boolean,
    default: true,
  },
  threshold: {
    type: Number,
    min: 1,
    max: 10,
    default: 3,
  },
  fallbackCount: {
    type: Number,
    default: 3,
  },
  negativeSentiment: {
    type: Boolean,
    default: true,
  },
  explicitRequest: {
    type: Boolean,
    default: true,
  },
  timeout: {
    type: Number, // minutes
    default: 10,
  },
  autoEscalateKeywords: [String],
  departments: [{
    name: String,
    keywords: [String],
    assignee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
}, { _id: false });

// Integration settings schema
const IntegrationSettingsSchema = new Schema({
  whatsapp: {
    enabled: {
      type: Boolean,
      default: false,
    },
    phoneNumberId: String,
    businessAccountId: String,
    webhookVerifyToken: String,
    accessToken: String,
    messageTemplates: [{
      name: String,
      language: String,
      category: String,
      status: String,
    }],
  },
  slack: {
    enabled: {
      type: Boolean,
      default: false,
    },
    webhookUrl: String,
    channel: String,
    botToken: String,
  },
  telegram: {
    enabled: {
      type: Boolean,
      default: false,
    },
    botToken: String,
    webhookUrl: String,
  },
  facebook: {
    enabled: {
      type: Boolean,
      default: false,
    },
    pageId: String,
    pageAccessToken: String,
    appSecret: String,
  },
  email: {
    enabled: {
      type: Boolean,
      default: false,
    },
    smtpHost: String,
    smtpPort: Number,
    smtpUser: String,
    smtpPass: String,
    fromAddress: String,
  },
}, { _id: false });

// ML model settings schema
const MLModelSettingsSchema = new Schema({
  provider: {
    type: String,
    enum: ['openai', 'local', 'hybrid'],
    default: 'hybrid',
  },
  openai: {
    model: {
      type: String,
      default: 'gpt-4o-mini',
    },
    temperature: {
      type: Number,
      min: 0,
      max: 2,
      default: 0.7,
    },
    maxTokens: {
      type: Number,
      default: 500,
    },
    apiKey: String,
    fallbackOnError: {
      type: Boolean,
      default: true,
    },
  },
  local: {
    model: String,
    confidenceThreshold: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.7,
    },
    useCache: {
      type: Boolean,
      default: true,
    },
  },
  training: {
    autoTrain: {
      type: Boolean,
      default: false,
    },
    schedule: String, // cron expression
    minSamples: {
      type: Number,
      default: 10,
    },
  },
}, { _id: false });

// Auto-close settings schema
const AutoCloseSettingsSchema = new Schema({
  enabled: {
    type: Boolean,
    default: true,
  },
  idleTimeout: {
    type: Number, // minutes
    default: 30,
  },
  maxSessionDuration: {
    type: Number, // minutes
    default: 120,
  },
  closeMessage: {
    en: {
      type: String,
      default: 'This conversation has been closed due to inactivity. Feel free to start a new chat anytime!',
    },
    my: {
      type: String,
      default: 'ဤစကားဝိုင်းကို အသုံးမပြုတာကြောင့် ပိတ်လိုက်ပါပြီ။ အချိန်မရွေး စကားဝိုင်းအသစ် စတင်နိုင်ပါသည်!',
    },
  },
}, { _id: false });

// Main BotConfiguration schema
const BotConfigurationSchema = new Schema({
  configId: {
    type: String,
    required: [true, 'Configuration ID is required'],
    unique: true,
    index: true,
  },
  botType: {
    type: String,
    enum: ['recruiter', 'referrer', 'candidate', 'admin', 'general'],
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  displayName: {
    type: String,
    trim: true,
  },
  avatar: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  
  // Personality settings
  personality: {
    traits: {
      type: [PersonalityTraitSchema],
      default: [],
    },
    tone: {
      type: String,
      enum: ['professional', 'friendly', 'casual', 'formal', 'empathetic', 'enthusiastic'],
      default: 'friendly',
    },
    language: {
      type: String,
      enum: ['en', 'my', 'both'],
      default: 'both',
    },
    useEmojis: {
      type: Boolean,
      default: true,
    },
    useMarkdown: {
      type: Boolean,
      default: true,
    },
  },
  
  // Welcome and fallback messages
  welcomeMessage: {
    en: {
      type: String,
      default: 'Hello! 👋 I\'m here to help you. What can I do for you today?',
    },
    my: {
      type: String,
      default: 'မင်္ဂလာပါ! 👋 ကျွန်တော်/မက အကူအညီပေးဖို့ မှာယူထားပါတယ်။ ဒီနေ့ ဘာလုပ်ပေးရမလဲ?',
    },
    variations: {
      en: [String],
      my: [String],
    },
  },
  
  fallbackMessage: {
    en: {
      type: String,
      default: 'I\'m not sure I understand. Could you rephrase that or choose from these options?',
    },
    my: {
      type: String,
      default: 'နားလည်ရခက်နေပါတယ်။ ထပ်မံရှင်းပြပေးပါ။ ဒါမှမဟုတ် အောက်ပါ ရွေးစရာများထဲက ရွေးချယ်ပါ။',
    },
    variations: {
      en: [String],
      my: [String],
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
  },
  
  // Message templates
  messageTemplates: {
    type: [MessageTemplateSchema],
    default: [],
  },
  
  // Working hours
  workingHours: {
    type: WorkingHoursSchema,
    default: () => ({}),
  },
  
  // Escalation rules
  escalationRules: {
    type: EscalationRulesSchema,
    default: () => ({}),
  },
  
  // Auto-close settings
  autoClose: {
    type: AutoCloseSettingsSchema,
    default: () => ({}),
  },
  
  // Integration settings
  integrations: {
    type: IntegrationSettingsSchema,
    default: () => ({}),
  },
  
  // ML model settings
  mlModel: {
    type: MLModelSettingsSchema,
    default: () => ({}),
  },
  
  // Quick replies
  quickReplies: {
    enabled: {
      type: Boolean,
      default: true,
    },
    maxSuggestions: {
      type: Number,
      default: 5,
    },
    suggestions: [{
      label: {
        en: String,
        my: String,
      },
      value: String,
      intent: String,
      icon: String,
    }],
  },
  
  // Typing indicator
  typingIndicator: {
    enabled: {
      type: Boolean,
      default: true,
    },
    minDelay: {
      type: Number,
      default: 500, // ms
    },
    maxDelay: {
      type: Number,
      default: 2000, // ms
    },
  },
  
  // Rate limiting
  rateLimiting: {
    enabled: {
      type: Boolean,
      default: true,
    },
    maxMessagesPerMinute: {
      type: Number,
      default: 30,
    },
    maxMessagesPerHour: {
      type: Number,
      default: 200,
    },
    cooldownMessage: {
      en: {
        type: String,
        default: 'Please slow down. You\'re sending messages too quickly.',
      },
      my: {
        type: String,
        default: 'ဖြည်းဖြည်းပေးပါ။ မက်ဆေ့ချ်များကို အလွန်အမြှောက် ပို့နေပါသည်။',
      },
    },
  },
  
  // Features
  features: {
    fileUpload: {
      type: Boolean,
      default: true,
    },
    voiceMessage: {
      type: Boolean,
      default: false,
    },
    locationShare: {
      type: Boolean,
      default: false,
    },
    richMedia: {
      type: Boolean,
      default: true,
    },
    suggestions: {
      type: Boolean,
      default: true,
    },
    history: {
      type: Boolean,
      default: true,
    },
    feedback: {
      type: Boolean,
      default: true,
    },
  },
  
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Pre-save middleware
BotConfigurationSchema.pre('save', function(next) {
  if (!this.configId) {
    this.configId = `config_${this.botType}_${Date.now()}`;
  }
  if (!this.displayName) {
    this.displayName = this.name;
  }
  next();
});

// Method to get welcome message
BotConfigurationSchema.methods.getWelcomeMessage = function(language = 'en') {
  const messages = this.welcomeMessage[language] || this.welcomeMessage.en;
  const variations = this.welcomeMessage.variations?.[language] || [];
  const allMessages = [messages, ...variations].filter(Boolean);
  return allMessages[Math.floor(Math.random() * allMessages.length)];
};

// Method to get fallback message
BotConfigurationSchema.methods.getFallbackMessage = function(language = 'en') {
  const messages = this.fallbackMessage[language] || this.fallbackMessage.en;
  const variations = this.fallbackMessage.variations?.[language] || [];
  const allMessages = [messages, ...variations].filter(Boolean);
  return allMessages[Math.floor(Math.random() * allMessages.length)];
};

// Method to check if within working hours
BotConfigurationSchema.methods.isWithinWorkingHours = function() {
  if (!this.workingHours.enabled) return true;
  
  const now = new Date();
  const timezone = this.workingHours.timezone || 'Asia/Yangon';
  
  // Get current day and time in the configured timezone
  const options = { timeZone: timezone, weekday: 'long', hour: '2-digit', minute: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(now);
  
  const dayMap = {
    'Monday': 'monday',
    'Tuesday': 'tuesday',
    'Wednesday': 'wednesday',
    'Thursday': 'thursday',
    'Friday': 'friday',
    'Saturday': 'saturday',
    'Sunday': 'sunday',
  };
  
  const dayName = parts.find(p => p.type === 'weekday').value;
  const currentDay = dayMap[dayName];
  const currentTime = parts.find(p => p.type === 'hour').value + ':' + parts.find(p => p.type === 'minute').value;
  
  const schedule = this.workingHours.schedule[currentDay];
  if (!schedule || !schedule.enabled) return false;
  
  return currentTime >= schedule.start && currentTime <= schedule.end;
};

// Method to get typing delay
BotConfigurationSchema.methods.getTypingDelay = function(messageLength = 50) {
  if (!this.typingIndicator.enabled) return 0;
  
  // Calculate delay based on message length (simulate reading time)
  const baseDelay = Math.min(
    this.typingIndicator.maxDelay,
    Math.max(
      this.typingIndicator.minDelay,
      messageLength * 20 // 20ms per character
    )
  );
  
  // Add some randomness
  return baseDelay + Math.random() * 500;
};

// Method to get quick replies
BotConfigurationSchema.methods.getQuickReplies = function(context = {}) {
  if (!this.quickReplies.enabled) return [];
  
  let replies = this.quickReplies.suggestions || [];
  
  // Filter based on context if needed
  if (context.intent) {
    replies = replies.filter(r => !r.intent || r.intent === context.intent);
  }
  
  return replies.slice(0, this.quickReplies.maxSuggestions);
};

// Static method to get configuration by bot type
BotConfigurationSchema.statics.getByBotType = function(botType) {
  return this.findOne({ botType, isActive: true });
};

// Static method to initialize default configurations
BotConfigurationSchema.statics.initializeDefaults = async function() {
  const defaultConfigs = [
    {
      botType: 'candidate',
      name: 'Career Assistant',
      displayName: 'Career Assistant',
      description: 'Your personal career guide for job search and applications',
      personality: {
        traits: [
          { trait: 'helpfulness', value: 0.9 },
          { trait: 'friendliness', value: 0.8 },
          { trait: 'professionalism', value: 0.7 },
        ],
        tone: 'friendly',
        useEmojis: true,
      },
      welcomeMessage: {
        en: 'Hi there! 👋 I\'m your Career Assistant. I can help you find jobs, prepare for interviews, and track your applications. What would you like to do today?',
        my: 'ဟိုင်း! 👋 ကျွန်တော်/မက သင့်ရဲ့အလုပ်ရှာဖွေရေးအကူအညီဖြစ်ပါတယ်။ အလုပ်ရှာဖွေခြင်း၊ အင်တာဗျူးအဆင်သင့်ဖြစ်ခြင်း၊ လျှောက်လွှာများကို ခြေရာခြင်းတို့တွင် ကူညီပေးနိုင်ပါတယ်။ ဒီနေ့ ဘာလုပ်ချင်လဲ?',
      },
      quickReplies: {
        suggestions: [
          { label: { en: 'Find Jobs', my: 'အလုပ်ရှာရန်' }, value: 'find_jobs', intent: 'job_search' },
          { label: { en: 'My Applications', my: 'ကျွန်ုပ့်လျှောက်လွှာများ' }, value: 'my_applications', intent: 'application_status' },
          { label: { en: 'Interview Tips', my: 'အင်တာဗျူးအကြံပေးချက်များ' }, value: 'interview_tips', intent: 'interview_help' },
          { label: { en: 'Resume Help', my: 'CVအကူအညီ' }, value: 'resume_help', intent: 'resume_tips' },
        ],
      },
    },
    {
      botType: 'referrer',
      name: 'Referral Partner',
      displayName: 'Referral Partner',
      description: 'Your partner for successful referrals and earnings',
      personality: {
        traits: [
          { trait: 'helpfulness', value: 0.9 },
          { trait: 'enthusiasm', value: 0.8 },
          { trait: 'professionalism', value: 0.7 },
        ],
        tone: 'enthusiastic',
        useEmojis: true,
      },
      welcomeMessage: {
        en: 'Hello! 🎉 I\'m your Referral Partner. I\'ll help you find great candidates, track your referrals, and maximize your earnings. How can I assist you today?',
        my: 'မင်္ဂလာပါ! 🎉 ကျွန်တော်/မက သင့်ရဲ့လွှဲပြောင်းရေးအဖွဲ့ဝင်ဖြစ်ပါတယ်။ ထိုက်တန်သောလူကိုများရှာဖွေခြင်း၊ သင့်လွှဲပြောင်းမှုများကို ခြေရာခြင်း၊ သင့်ဝင်ငွေများကို အမြင့်ဆုံးပြုလုပ်ခြင်းတို့တွင် ကူညီပေးမယ်။ ဒီနေ့ ဘယ်လိုကူညီပေးရမလဲ?',
      },
      quickReplies: {
        suggestions: [
          { label: { en: 'Find Jobs to Refer', my: 'လွှဲပြောင်းရန် အလုပ်ရှာရန်' }, value: 'find_referral_jobs', intent: 'job_search' },
          { label: { en: 'My Referrals', my: 'ကျွန်ုပ့်လွှဲပြောင်းမှုများ' }, value: 'my_referrals', intent: 'referral_status' },
          { label: { en: 'My Earnings', my: 'ကျွန်ုပ့်ဝင်ငွေ' }, value: 'my_earnings', intent: 'payout_info' },
          { label: { en: 'Referral Tips', my: 'လွှဲပြောင်းရေးအကြံပေးချက်များ' }, value: 'referral_tips', intent: 'referral_help' },
        ],
      },
    },
    {
      botType: 'recruiter',
      name: 'Hiring Assistant',
      displayName: 'Hiring Assistant',
      description: 'Your AI-powered hiring companion',
      personality: {
        traits: [
          { trait: 'professionalism', value: 0.9 },
          { trait: 'efficiency', value: 0.9 },
          { trait: 'helpfulness', value: 0.8 },
        ],
        tone: 'professional',
        useEmojis: false,
      },
      welcomeMessage: {
        en: 'Welcome! I\'m your Hiring Assistant. I can help you write job descriptions, screen candidates, and optimize your hiring process. What would you like to work on?',
        my: 'ကြိုဆိုပါသည်! ကျွန်တော်/မက သင့်ခန့်ထားရေးအကူအညီဖြစ်ပါတယ်။ အလုပ်ဖော်ပြချက်ရေးသားခြင်း၊ လျှောက်ထားသူများကို စစ်ဆေးခြင်း၊ ခန့်ထားရေးလုပ်ငန်းစဉ်ကို အကောင်းဆုံးပြုလုပ်ခြင်းတို့တွင် ကူညီပေးနိုင်ပါတယ်။ ဘာလုပ်ချင်ပါသလဲ?',
      },
      quickReplies: {
        suggestions: [
          { label: { en: 'Write Job Description', my: 'အလုပ်ဖော်ပြချက်ရေးရန်' }, value: 'write_job_desc', intent: 'job_description_help' },
          { label: { en: 'Screen Candidates', my: 'လျှောက်ထားသူများစစ်ဆေးရန်' }, value: 'screen_candidates', intent: 'candidate_screening' },
          { label: { en: 'View Analytics', my: 'အချက်အလက်များကြည့်ရန်' }, value: 'view_analytics', intent: 'analytics' },
          { label: { en: 'Interview Questions', my: 'အင်တာဗျူးမေးခွန်းများ' }, value: 'interview_questions', intent: 'interview_help' },
        ],
      },
    },
    {
      botType: 'admin',
      name: 'Admin Assistant',
      displayName: 'Admin Assistant',
      description: 'Platform administration and insights',
      personality: {
        traits: [
          { trait: 'professionalism', value: 0.9 },
          { trait: 'efficiency', value: 0.9 },
          { trait: 'precision', value: 0.9 },
        ],
        tone: 'professional',
        useEmojis: false,
      },
      welcomeMessage: {
        en: 'Admin Dashboard Assistant ready. I can provide platform statistics, alerts, and optimization suggestions. What information do you need?',
        my: 'အက်ဒမင်ဒက်ဘိုးဒအကူအညီအဆင်သင့်ဖြစ်ပါသည်။ ပလက်ဖောင်းအချက်အလက်များ၊ အသိပေးချက်များနှင့် အကောင်းဆုံးပြုလုပ်မှုအကြံပေးချက်များကို ပေးနိုင်ပါတယ်။ ဘယ်အချက်အလက်လိုအပ်ပါသလဲ?',
      },
      quickReplies: {
        suggestions: [
          { label: { en: 'Platform Stats', my: 'ပလက်ဖောင်းအချက်အလက်များ' }, value: 'platform_stats', intent: 'analytics' },
          { label: { en: 'Anomalies', my: 'ထူးဆန်းသောအရာများ' }, value: 'anomalies', intent: 'alerts' },
          { label: { en: 'Revenue Report', my: 'ဝင်ငွေအစီရင်ခံ' }, value: 'revenue_report', intent: 'revenue' },
          { label: { en: 'User Insights', my: 'အသုံးပြုသူအသေးစိတ်' }, value: 'user_insights', intent: 'user_analytics' },
        ],
      },
    },
    {
      botType: 'general',
      name: 'Support Assistant',
      displayName: 'Support Assistant',
      description: 'General support and help',
      personality: {
        traits: [
          { trait: 'helpfulness', value: 0.9 },
          { trait: 'friendliness', value: 0.8 },
          { trait: 'patience', value: 0.9 },
        ],
        tone: 'friendly',
        useEmojis: true,
      },
      welcomeMessage: {
        en: 'Hello! 👋 I\'m here to help you with any questions about our platform. How can I assist you today?',
        my: 'မင်္ဂလာပါ! 👋 ကျွန်တော်/မက ကျွန်ုပ်တို့ပလက်ဖောင်းအကြောင်း မေးခွန်းများအတွက် ကူညီဖို့မှာယူထားပါတယ်။ ဒီနေ့ ဘယ်လိုကူညီပေးရမလဲ?',
      },
      quickReplies: {
        suggestions: [
          { label: { en: 'Get Help', my: 'အကူအညီရယူရန်' }, value: 'get_help', intent: 'help' },
          { label: { en: 'Contact Support', my: 'ပံ့ပိုးမှုဆက်သွယ်ရန်' }, value: 'contact_support', intent: 'escalate' },
          { label: { en: 'FAQ', my: 'အမြဲမေးသောမေးခွန်းများ' }, value: 'faq', intent: 'faq' },
          { label: { en: 'Account Help', my: 'အကောင့်အကူအညီ' }, value: 'account_help', intent: 'account_help' },
        ],
      },
    },
  ];
  
  for (const config of defaultConfigs) {
    await this.findOneAndUpdate(
      { botType: config.botType },
      { ...config, isActive: true },
      { upsert: true, new: true }
    );
  }
  
  console.log('Default bot configurations initialized');
};

const BotConfiguration = mongoose.model('BotConfiguration', BotConfigurationSchema);

module.exports = BotConfiguration;
