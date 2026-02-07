/**
 * ResponseGenerator Service
 * Generates bot responses based on intent, context, and user type
 * Combines template-based and AI-generated responses
 */

const OpenAI_NLP = require('../nlp/openaiNLP.js');
const Local_NLP = require('../nlp/localNLP.js');
const ChatIntent = require('../models/ChatIntent.js');
const BotConfiguration = require('../models/BotConfiguration.js');
const KnowledgeBase = require('../models/KnowledgeBase.js');

class ResponseGenerator {
  constructor() {
    this.openai = new OpenAI_NLP();
    this.local = new Local_NLP();
    this.useOpenAI = this.openai.isAvailable();
  }
  
  /**
   * Generate response for user message
   * @param {Object} params - Generation parameters
   * @returns {Promise<Object>} - Generated response
   */
  async generate(params) {
    const {
      message,
      intent,
      entities,
      context,
      botType,
      userType,
      language = 'en',
    } = params;
    
    const startTime = Date.now();
    
    try {
      // Get bot configuration
      const config = await BotConfiguration.getByBotType(botType);
      
      // Check for template-based response first
      const templateResponse = await this.getTemplateResponse(intent, botType, userType, language);
      
      if (templateResponse && templateResponse.confidence > 0.8) {
        return {
          ...templateResponse,
          processingTime: Date.now() - startTime,
          source: 'template',
        };
      }
      
      // Check knowledge base for FAQ-style responses
      const kbResponse = await this.getKnowledgeBaseResponse(message, botType, language);
      
      if (kbResponse && kbResponse.confidence > 0.75) {
        return {
          ...kbResponse,
          processingTime: Date.now() - startTime,
          source: 'knowledge_base',
        };
      }
      
      // Generate AI response if OpenAI is available
      if (this.useOpenAI && config?.mlModel?.provider !== 'local') {
        const aiResponse = await this.generateAIResponse({
          message,
          intent,
          entities,
          context,
          botType,
          config,
          language,
        });
        
        return {
          ...aiResponse,
          processingTime: Date.now() - startTime,
          source: 'ai',
        };
      }
      
      // Fall back to local response generation
      const localResponse = this.generateLocalResponse(intent, botType, language);
      
      return {
        ...localResponse,
        processingTime: Date.now() - startTime,
        source: 'local',
      };
      
    } catch (error) {
      console.error('Response generation error:', error);
      
      // Emergency fallback
      return {
        text: this.getFallbackMessage(botType, language),
        quickReplies: [],
        actions: [],
        processingTime: Date.now() - startTime,
        source: 'emergency_fallback',
        error: error.message,
      };
    }
  }
  
  /**
   * Get template-based response from intent
   * @param {Object} intent - Intent classification
   * @param {string} botType - Type of bot
   * @param {string} userType - Type of user
   * @param {string} language - Language code
   * @returns {Promise<Object|null>} - Template response
   */
  async getTemplateResponse(intent, botType, userType, language) {
    try {
      const intentDoc = await ChatIntent.findOne({
        intentId: intent.intentId,
        isActive: true,
      });
      
      if (!intentDoc || !intentDoc.responses || intentDoc.responses.length === 0) {
        return null;
      }
      
      // Get random response based on language and user type
      const responseText = intentDoc.getRandomResponse(language, userType);
      
      if (!responseText) {
        return null;
      }
      
      // Process template variables
      const processedText = this.processTemplateVariables(responseText, intent.entities);
      
      return {
        text: processedText,
        quickReplies: this.generateQuickReplies(intentDoc, botType),
        actions: intentDoc.actions || [],
        confidence: 0.9,
      };
    } catch (error) {
      console.error('Template response error:', error);
      return null;
    }
  }
  
  /**
   * Get response from knowledge base
   * @param {string} message - User message
   * @param {string} botType - Type of bot
   * @param {string} language - Language code
   * @returns {Promise<Object|null>} - KB response
   */
  async getKnowledgeBaseResponse(message, botType, language) {
    try {
      const articles = await KnowledgeBase.search(message, {
        botType,
        language,
        limit: 3,
      });
      
      if (!articles || articles.length === 0) {
        return null;
      }
      
      const topArticle = articles[0];
      
      // Check if confidence is high enough
      const score = topArticle.score || 0;
      if (score < 0.5) {
        return null;
      }
      
      // Get summary
      const summary = topArticle.getSummary(language);
      
      // Increment views
      topArticle.incrementViews().catch(console.error);
      
      return {
        text: summary,
        quickReplies: [
          { label: language === 'my' ? 'ပိုမိုသိရှိရန်' : 'Read More', value: `kb:${topArticle.articleId}`, action: 'show_article' },
          { label: language === 'my' ? 'အခြားမေးခွန်းများ' : 'Related Questions', value: 'related_questions', action: 'show_options' },
        ],
        actions: [{
          type: 'show_data',
          payload: { articleId: topArticle.articleId, type: 'knowledge_base' },
        }],
        confidence: score,
        articleId: topArticle.articleId,
      };
    } catch (error) {
      console.error('Knowledge base response error:', error);
      return null;
    }
  }
  
  /**
   * Generate AI response using OpenAI
   * @param {Object} params - Generation parameters
   * @returns {Promise<Object>} - AI response
   */
  async generateAIResponse(params) {
    const {
      message,
      intent,
      entities,
      context,
      botType,
      config,
      language,
    } = params;
    
    const personality = config?.personality || {
      tone: 'friendly',
      useEmojis: true,
    };
    
    const aiResult = await this.openai.generateResponse(
      message,
      context,
      botType,
      personality
    );
    
    // Translate if needed
    let text = aiResult.text;
    if (language === 'my' && this.detectLanguage(text) === 'en') {
      text = await this.openai.translate(text, 'my');
    }
    
    return {
      text,
      quickReplies: aiResult.quickReplies || [],
      actions: aiResult.suggestedActions || [],
      confidence: 0.85,
    };
  }
  
  /**
   * Generate local response
   * @param {Object} intent - Intent classification
   * @param {string} botType - Type of bot
   * @param {string} language - Language code
   * @returns {Object} - Local response
   */
  generateLocalResponse(intent, botType, language) {
    const result = this.local.generateResponse(intent.intent, botType);
    
    return {
      text: result.text,
      quickReplies: result.quickReplies,
      actions: [],
      confidence: 0.6,
    };
  }
  
  /**
   * Process template variables
   * @param {string} template - Response template
   * @param {Array} entities - Extracted entities
   * @returns {string} - Processed template
   */
  processTemplateVariables(template, entities) {
    let processed = template;
    
    // Replace entity placeholders
    for (const entity of entities || []) {
      const placeholder = `{{${entity.name}}}`;
      processed = processed.replace(new RegExp(placeholder, 'g'), entity.value);
    }
    
    // Replace common placeholders
    processed = processed.replace(/{{user_name}}/g, 'there');
    processed = processed.replace(/{{bot_name}}/g, 'Assistant');
    
    return processed;
  }
  
  /**
   * Generate quick replies based on intent
   * @param {Object} intentDoc - Intent document
   * @param {string} botType - Type of bot
   * @returns {Array} - Quick replies
   */
  generateQuickReplies(intentDoc, botType) {
    const quickReplies = [];
    
    // Add follow-up intents as quick replies
    if (intentDoc.followUpIntents && intentDoc.followUpIntents.length > 0) {
      for (const followUpId of intentDoc.followUpIntents.slice(0, 3)) {
        quickReplies.push({
          label: followUpId,
          value: followUpId,
          action: 'trigger_intent',
        });
      }
    }
    
    return quickReplies;
  }
  
  /**
   * Get fallback message
   * @param {string} botType - Type of bot
   * @param {string} language - Language code
   * @returns {string} - Fallback message
   */
  async getFallbackMessage(botType, language) {
    try {
      const config = await BotConfiguration.getByBotType(botType);
      if (config) {
        return config.getFallbackMessage(language);
      }
    } catch (error) {
      console.error('Error getting fallback message:', error);
    }
    
    const fallbacks = {
      en: "I'm not sure I understand. Could you rephrase that?",
      my: 'နားလည်ရခက်နေပါတယ်။ ထပ်မံရှင်းပြပေးပါ။',
    };
    
    return fallbacks[language] || fallbacks.en;
  }
  
  /**
   * Get welcome message
   * @param {string} botType - Type of bot
   * @param {string} language - Language code
   * @returns {Promise<string>} - Welcome message
   */
  async getWelcomeMessage(botType, language) {
    try {
      const config = await BotConfiguration.getByBotType(botType);
      if (config) {
        return config.getWelcomeMessage(language);
      }
    } catch (error) {
      console.error('Error getting welcome message:', error);
    }
    
    const welcomes = {
      en: 'Hello! 👋 How can I help you today?',
      my: 'မင်္ဂလာပါ! 👋 ဘာလုပ်ပေးရမလဲ?',
    };
    
    return welcomes[language] || welcomes.en;
  }
  
  /**
   * Detect language of text
   * @param {string} text - Text to analyze
   * @returns {string} - Language code
   */
  detectLanguage(text) {
    // Simple detection
    const myanmarChars = /[\u1000-\u109F]/;
    return myanmarChars.test(text) ? 'my' : 'en';
  }
  
  /**
   * Generate rich response with cards, lists, etc.
   * @param {string} type - Response type
   * @param {Object} data - Response data
   * @returns {Object} - Rich response
   */
  generateRichResponse(type, data) {
    switch (type) {
      case 'job_list':
        return {
          type: 'list',
          items: data.jobs.map(job => ({
            title: job.title,
            subtitle: `${job.company} - ${job.location}`,
            image: job.companyLogo,
            actions: [
              { label: 'View', value: `job:${job._id}`, action: 'navigate' },
              { label: 'Apply', value: `apply:${job._id}`, action: 'api_call' },
            ],
          })),
        };
        
      case 'candidate_card':
        return {
          type: 'card',
          title: data.name,
          subtitle: `${data.title} - ${data.experience} years`,
          image: data.avatar,
          description: data.summary,
          actions: [
            { label: 'View Profile', value: `candidate:${data._id}`, action: 'navigate' },
            { label: 'Contact', value: `contact:${data._id}`, action: 'api_call' },
          ],
        };
        
      case 'referral_status':
        return {
          type: 'status',
          status: data.status,
          steps: [
            { label: 'Referred', completed: true },
            { label: 'Applied', completed: data.hasApplied },
            { label: 'Interview', completed: data.hasInterview },
            { label: 'Hired', completed: data.isHired },
            { label: 'Commission', completed: data.isPaid },
          ],
          details: data,
        };
        
      case 'analytics_chart':
        return {
          type: 'chart',
          chartType: data.chartType || 'line',
          data: data.values,
          labels: data.labels,
          title: data.title,
        };
        
      default:
        return { type: 'text', text: data.text };
    }
  }
  
  /**
   * Format response for WhatsApp
   * @param {Object} response - Original response
   * @returns {Object} - WhatsApp-formatted response
   */
  formatForWhatsApp(response) {
    const formatted = {
      text: response.text,
    };
    
    // Convert quick replies to interactive buttons
    if (response.quickReplies && response.quickReplies.length > 0) {
      formatted.interactive = {
        type: 'button',
        body: { text: response.text },
        action: {
          buttons: response.quickReplies.slice(0, 3).map((qr, index) => ({
            type: 'reply',
            reply: {
              id: `qr_${index}`,
              title: qr.label.substring(0, 20), // WhatsApp limit
            },
          })),
        },
      };
      delete formatted.text;
    }
    
    return formatted;
  }
  
  /**
   * Format response for web widget
   * @param {Object} response - Original response
   * @returns {Object} - Web-formatted response
   */
  formatForWeb(response) {
    return {
      ...response,
      timestamp: new Date(),
      formatted: true,
    };
  }
}

// Singleton instance
let generatorInstance = null;

function getResponseGenerator() {
  if (!generatorInstance) {
    generatorInstance = new ResponseGenerator();
  }
  return generatorInstance;
}

module.exports = ResponseGenerator;
