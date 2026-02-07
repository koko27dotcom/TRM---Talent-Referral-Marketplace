/**
 * Local NLP Fallback
 * Provides basic NLP capabilities without external API calls
 * Uses pattern matching and keyword-based approaches
 */

class Local_NLP {
  constructor() {
    // Intent patterns with keywords
    this.intentPatterns = {
      greeting: {
        keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings', 'howdy', 'ဟိုင်း', 'မင်္ဂလာပါ'],
        category: 'greeting',
        confidence: 0.9,
      },
      goodbye: {
        keywords: ['bye', 'goodbye', 'see you', 'take care', 'later', 'cya', 'ဘိုး', 'သွားပြီ', 'နောက်မှတွေ့မယ်'],
        category: 'goodbye',
        confidence: 0.9,
      },
      help: {
        keywords: ['help', 'support', 'assist', 'how to', 'how do i', 'what should i', 'guide', 'tutorial', 'အကူအညီ', 'ဘယ်လိုလဲ'],
        category: 'help',
        confidence: 0.8,
      },
      job_search: {
        keywords: ['find job', 'search job', 'looking for job', 'job opening', 'vacancy', 'position', 'career', 'work', 'အလုပ်', 'အလုပ်ရှာ'],
        category: 'job',
        confidence: 0.85,
      },
      application_status: {
        keywords: ['application status', 'my application', 'applied job', 'check status', 'interview status', 'hiring status', 'လျှောက်လွှာ', 'အခြေအနေ'],
        category: 'job',
        confidence: 0.85,
      },
      referral: {
        keywords: ['refer', 'referral', 'refer someone', 'refer candidate', 'recommend', 'လွှဲပြောင်း', 'ညွှန်ပြ'],
        category: 'referral',
        confidence: 0.85,
      },
      referral_status: {
        keywords: ['my referral', 'referral status', 'referred candidate', 'referral progress', 'လွှဲပြောင်းအခြေအနေ'],
        category: 'referral',
        confidence: 0.85,
      },
      commission: {
        keywords: ['commission', 'payout', 'payment', 'earn', 'earning', 'money', 'salary', 'income', 'ကော်မရှင်', 'ဝင်ငွေ'],
        category: 'payment',
        confidence: 0.8,
      },
      interview: {
        keywords: ['interview', 'interview tips', 'prepare', 'interview questions', 'hiring process', 'အင်တာဗျူး'],
        category: 'job',
        confidence: 0.85,
      },
      resume: {
        keywords: ['resume', 'cv', 'profile', 'update profile', 'upload cv', 'ဘယိုစ်', 'ပရိုဖိုင်'],
        category: 'job',
        confidence: 0.8,
      },
      company_info: {
        keywords: ['company', 'about company', 'employer', 'organization', 'business', 'ကုမ္ပဏီ'],
        category: 'job',
        confidence: 0.75,
      },
      salary: {
        keywords: ['salary', 'pay', 'compensation', 'wage', 'how much', 'package', 'လစာ', 'လခ'],
        category: 'payment',
        confidence: 0.8,
      },
      thank_you: {
        keywords: ['thank', 'thanks', 'appreciate', 'grateful', 'thank you', 'ကျေးဇူး'],
        category: 'general',
        confidence: 0.9,
      },
      complaint: {
        keywords: ['problem', 'issue', 'error', 'bug', 'not working', 'broken', 'complaint', 'bad', 'terrible', 'ပြဿနာ'],
        category: 'support',
        confidence: 0.8,
      },
      positive_feedback: {
        keywords: ['good', 'great', 'awesome', 'excellent', 'amazing', 'love', 'perfect', 'wonderful', 'ကောင်းတယ်'],
        category: 'general',
        confidence: 0.8,
      },
      escalate: {
        keywords: ['human', 'agent', 'speak to person', 'talk to someone', 'representative', 'manager', 'supervisor', 'လူ'],
        category: 'support',
        confidence: 0.9,
      },
    };
    
    // Entity patterns
    this.entityPatterns = {
      email: {
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        type: 'email',
      },
      phone: {
        pattern: /\b(?:\+?95|0)?[\s.-]?(?:9\d{1}|7\d{1})[\s.-]?\d{3}[\s.-]?\d{3,4}\b/g,
        type: 'phone',
      },
      url: {
        pattern: /https?:\/\/[^\s]+|www\.[^\s]+/g,
        type: 'url',
      },
      number: {
        pattern: /\b\d+(?:,\d{3})*(?:\.\d+)?\b/g,
        type: 'number',
      },
    };
    
    // Job title keywords
    this.jobTitles = [
      'developer', 'engineer', 'manager', 'designer', 'analyst', 'consultant',
      'director', 'specialist', 'coordinator', 'assistant', 'associate',
      'lead', 'senior', 'junior', 'principal', 'staff', 'architect',
      'administrator', 'representative', 'executive', 'officer',
      'software', 'web', 'frontend', 'backend', 'fullstack', 'devops',
      'data', 'product', 'project', 'marketing', 'sales', 'hr', 'accountant',
    ];
    
    // Skill keywords
    this.skills = [
      'javascript', 'python', 'java', 'react', 'node', 'angular', 'vue',
      'sql', 'mongodb', 'aws', 'azure', 'docker', 'kubernetes',
      'communication', 'leadership', 'management', 'analysis', 'design',
    ];
    
    // Location keywords
    this.locations = [
      'yangon', 'mandalay', 'naypyidaw', 'myanmar', 'burma',
      'bangkok', 'singapore', 'kuala lumpur', 'remote', 'onsite', 'hybrid',
    ];
    
    // Sentiment keywords
    this.sentimentPatterns = {
      positive: ['good', 'great', 'awesome', 'excellent', 'amazing', 'love', 'like', 'happy', 'satisfied', 'perfect', 'wonderful', 'best', 'fantastic', 'thank', 'thanks'],
      negative: ['bad', 'terrible', 'awful', 'hate', 'dislike', 'angry', 'frustrated', 'disappointed', 'worst', 'horrible', 'suck', 'problem', 'issue', 'error', 'bug'],
    };
  }
  
  /**
   * Classify intent using keyword matching
   * @param {string} message - User message
   * @returns {Object} - Intent classification result
   */
  classifyIntent(message) {
    const lowerMessage = message.toLowerCase();
    let bestMatch = null;
    let highestScore = 0;
    
    for (const [intentName, intentData] of Object.entries(this.intentPatterns)) {
      let score = 0;
      let matchedKeywords = [];
      
      for (const keyword of intentData.keywords) {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          score += 1;
          matchedKeywords.push(keyword);
        }
      }
      
      // Boost score for exact matches
      if (matchedKeywords.some(kw => lowerMessage.trim() === kw.toLowerCase())) {
        score += 2;
      }
      
      if (score > highestScore) {
        highestScore = score;
        bestMatch = {
          intent: intentName,
          confidence: Math.min(intentData.confidence + (score * 0.05), 0.95),
          category: intentData.category,
          matchedKeywords,
        };
      }
    }
    
    if (bestMatch) {
      return {
        intent: bestMatch.intent,
        confidence: bestMatch.confidence,
        category: bestMatch.category,
        matchedKeywords: bestMatch.matchedKeywords,
        source: 'local',
      };
    }
    
    return {
      intent: 'fallback',
      confidence: 0.3,
      category: 'general',
      matchedKeywords: [],
      source: 'local',
    };
  }
  
  /**
   * Extract entities using regex patterns
   * @param {string} message - User message
   * @returns {Array} - Extracted entities
   */
  extractEntities(message) {
    const entities = [];
    
    // Extract using regex patterns
    for (const [entityName, entityData] of Object.entries(this.entityPatterns)) {
      const matches = message.match(entityData.pattern);
      if (matches) {
        for (const match of matches) {
          entities.push({
            name: entityName,
            value: match,
            type: entityData.type,
            confidence: 0.9,
            source: 'regex',
          });
        }
      }
    }
    
    // Extract job titles
    const lowerMessage = message.toLowerCase();
    for (const title of this.jobTitles) {
      if (lowerMessage.includes(title.toLowerCase())) {
        // Try to get the full job title with modifiers
        const regex = new RegExp(`(senior|junior|lead|principal)?\\s*${title}\\s*(developer|engineer|manager|designer)?`, 'gi');
        const match = message.match(regex);
        if (match) {
          entities.push({
            name: 'job_title',
            value: match[0],
            type: 'job_title',
            confidence: 0.8,
            source: 'keyword',
          });
        }
      }
    }
    
    // Extract skills
    for (const skill of this.skills) {
      if (lowerMessage.includes(skill.toLowerCase())) {
        entities.push({
          name: 'skill',
          value: skill,
          type: 'skill',
          confidence: 0.85,
          source: 'keyword',
        });
      }
    }
    
    // Extract locations
    for (const location of this.locations) {
      if (lowerMessage.includes(location.toLowerCase())) {
        entities.push({
          name: 'location',
          value: location,
          type: 'location',
          confidence: 0.9,
          source: 'keyword',
        });
      }
    }
    
    return entities;
  }
  
  /**
   * Analyze sentiment using keyword matching
   * @param {string} message - User message
   * @returns {Object} - Sentiment analysis
   */
  analyzeSentiment(message) {
    const lowerMessage = message.toLowerCase();
    let positiveScore = 0;
    let negativeScore = 0;
    
    for (const word of this.sentimentPatterns.positive) {
      if (lowerMessage.includes(word)) {
        positiveScore += 1;
      }
    }
    
    for (const word of this.sentimentPatterns.negative) {
      if (lowerMessage.includes(word)) {
        negativeScore += 1;
      }
    }
    
    const total = positiveScore + negativeScore;
    if (total === 0) {
      return { label: 'neutral', score: 0, source: 'local' };
    }
    
    const score = (positiveScore - negativeScore) / Math.max(total, 1);
    
    let label = 'neutral';
    if (score > 0.2) label = 'positive';
    else if (score < -0.2) label = 'negative';
    
    return { label, score, source: 'local' };
  }
  
  /**
   * Detect language (simple detection)
   * @param {string} message - User message
   * @returns {string} - Language code
   */
  detectLanguage(message) {
    // Simple detection based on common Myanmar words
    const myanmarWords = ['ကျွန်တော်', 'ကျွန်မ', 'မင်္ဂလာ', 'ဟိုင်း', 'ကျေးဇူး', 'ဘယ်လို', 'အလုပ်', 'လစာ', 'ကုမ္ပဏီ'];
    
    for (const word of myanmarWords) {
      if (message.includes(word)) {
        return 'my';
      }
    }
    
    return 'en';
  }
  
  /**
   * Generate a simple response based on intent
   * @param {string} intent - Detected intent
   * @param {string} botType - Type of bot
   * @returns {Object} - Response object
   */
  generateResponse(intent, botType = 'general') {
    const responses = {
      greeting: {
        candidate: [
          'Hello! 👋 Ready to find your dream job?',
          'Hi there! How can I help with your job search today?',
        ],
        referrer: [
          'Hey! 🎉 Ready to make some referrals?',
          'Hello! Looking for great candidates to refer?',
        ],
        recruiter: [
          'Good day! How can I assist with your hiring needs?',
          'Hello! Ready to find great talent?',
        ],
        general: [
          'Hello! 👋 How can I help you today?',
          'Hi there! What can I do for you?',
        ],
      },
      goodbye: {
        default: [
          'Goodbye! Have a great day! 👋',
          'Take care! Feel free to come back anytime.',
          'Bye! See you soon!',
        ],
      },
      help: {
        default: [
          'I\'m here to help! What do you need assistance with?',
          'Sure! What would you like to know?',
        ],
      },
      job_search: {
        candidate: [
          'I can help you find jobs! What type of position are you looking for?',
          'Let\'s find you the perfect job! What are your skills?',
        ],
        default: [
          'I can help with job searches. What are you looking for?',
        ],
      },
      referral: {
        referrer: [
          'Great! Let\'s create a referral. Do you have a candidate in mind?',
          'I can help you refer someone! Which job position?',
        ],
        default: [
          'I can help with referrals. What would you like to know?',
        ],
      },
      commission: {
        referrer: [
          'Your commission is important! Check your dashboard for earnings.',
          'I can help you track your payouts. What would you like to know?',
        ],
        default: [
          'I can provide information about commissions and payouts.',
        ],
      },
      interview: {
        candidate: [
          'I can help you prepare for interviews! What position?',
          'Interview preparation is key! What would you like to know?',
        ],
        recruiter: [
          'I can suggest interview questions! What role are you hiring for?',
        ],
        default: [
          'I can help with interview preparation. What do you need?',
        ],
      },
      resume: {
        candidate: [
          'I can help improve your resume! What field are you in?',
          'A great resume is important! What would you like help with?',
        ],
        default: [
          'I can provide resume tips. What do you need help with?',
        ],
      },
      application_status: {
        candidate: [
          'Let me check your application status! Which job did you apply for?',
          'I can help track your applications. Which one?',
        ],
        default: [
          'I can help check application status. What do you need?',
        ],
      },
      referral_status: {
        referrer: [
          'Let me check your referral status! Which candidate?',
          'I can track your referrals. Which one would you like to check?',
        ],
        default: [
          'I can help with referral status. What do you need?',
        ],
      },
      escalate: {
        default: [
          'I\'ll connect you with a human agent. Please hold on...',
          'Let me transfer you to our support team.',
        ],
      },
      fallback: {
        default: [
          'I\'m not sure I understand. Could you rephrase that?',
          'I didn\'t quite get that. Can you try asking differently?',
          'I\'m still learning! Could you provide more details?',
        ],
      },
    };
    
    const intentResponses = responses[intent] || responses.fallback;
    const botResponses = intentResponses[botType] || intentResponses.default || responses.fallback.default;
    
    const text = botResponses[Math.floor(Math.random() * botResponses.length)];
    
    return {
      text,
      quickReplies: [],
      source: 'local',
    };
  }
  
  /**
   * Calculate similarity between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} - Similarity score (0-1)
   */
  calculateSimilarity(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;
    
    // Simple Levenshtein distance calculation
    const matrix = [];
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    const distance = matrix[s2.length][s1.length];
    const maxLength = Math.max(s1.length, s2.length);
    return 1 - distance / maxLength;
  }
}

module.exports = Local_NLP;
