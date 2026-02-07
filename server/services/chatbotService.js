/**
 * ChatbotService
 * Main service for handling chatbot conversations
 * Manages sessions, processes messages, and coordinates responses
 */

const { v4 as uuidv4 } = require('uuid');
const ChatSession = require('../models/ChatSession.js');
const ChatMessage = require('../models/ChatMessage.js');
const ChatAnalytics = require('../models/ChatAnalytics.js');
const BotConfiguration = require('../models/BotConfiguration.js');
const { getIntentClassifier } = require('./intentClassifier.js');
const { getResponseGenerator } = require('./responseGenerator.js');

class ChatbotService {
  constructor() {
    this.intentClassifier = getIntentClassifier();
    this.responseGenerator = getResponseGenerator();
    this.activeSessions = new Map(); // In-memory cache of active sessions
  }
  
  /**
   * Create a new chat session
   * @param {Object} params - Session parameters
   * @returns {Promise<Object>} - Created session
   */
  async createSession(params) {
    const {
      userId,
      userType,
      botType,
      metadata = {},
      language = 'auto',
    } = params;
    
    const sessionId = `sess_${uuidv4()}`;
    
    const session = new ChatSession({
      sessionId,
      userId,
      userType,
      botType,
      status: 'active',
      metadata: {
        ...metadata,
        source: metadata.source || 'web',
      },
      language,
      startedAt: new Date(),
      lastMessageAt: new Date(),
    });
    
    await session.save();
    
    // Cache session
    this.activeSessions.set(sessionId, session);
    
    // Create analytics record
    const analytics = new ChatAnalytics({
      sessionId,
      userId,
      userType,
      botType,
      sessionMetrics: {
        startedAt: new Date(),
      },
      source: metadata.source || 'web',
    });
    await analytics.save();
    
    // Send welcome message
    const welcomeMessage = await this.sendWelcomeMessage(session);
    
    return {
      session,
      welcomeMessage,
    };
  }
  
  /**
   * Send welcome message
   * @param {Object} session - Chat session
   * @returns {Promise<Object>} - Welcome message
   */
  async sendWelcomeMessage(session) {
    const config = await BotConfiguration.getByBotType(session.botType);
    const language = session.language === 'auto' ? 'en' : session.language;
    
    const welcomeText = config 
      ? config.getWelcomeMessage(language)
      : 'Hello! How can I help you today?';
    
    const message = new ChatMessage({
      messageId: `msg_${uuidv4()}`,
      sessionId: session.sessionId,
      senderType: 'bot',
      botType: session.botType,
      message: {
        text: welcomeText,
        language,
      },
      timestamp: new Date(),
    });
    
    await message.save();
    
    // Update session
    session.messageCount += 1;
    session.lastMessageAt = new Date();
    await session.save();
    
    return message;
  }
  
  /**
   * Process user message
   * @param {Object} params - Message parameters
   * @returns {Promise<Object>} - Processing result
   */
  async processMessage(params) {
    const {
      sessionId,
      message,
      attachments = [],
      metadata = {},
    } = params;
    
    const startTime = Date.now();
    
    // Get or create session
    let session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Detect language if auto
    let language = session.language;
    if (language === 'auto') {
      language = await this.intentClassifier.detectLanguage(message);
    }
    
    // Save user message
    const userMessage = new ChatMessage({
      messageId: `msg_${uuidv4()}`,
      sessionId,
      senderType: 'user',
      senderId: session.userId,
      message: {
        text: message,
        language,
      },
      attachments,
      metadata: {
        source: metadata.source || 'web',
        ...metadata,
      },
      timestamp: new Date(),
    });
    
    await userMessage.save();
    
    // Update session
    session.messageCount += 1;
    session.lastMessageAt = new Date();
    await session.save();
    
    // Get conversation context
    const context = await this.buildContext(session);
    
    // Classify intent
    const classification = await this.intentClassifier.classify(
      message,
      context,
      session.botType
    );
    
    // Extract entities
    const entities = await this.intentClassifier.extractEntities(
      message,
      session.botType
    );
    
    // Analyze sentiment
    const sentiment = await this.intentClassifier.analyzeSentiment(message);
    
    // Check for escalation
    const escalationCheck = this.intentClassifier.shouldEscalate(
      message,
      classification,
      context
    );
    
    // Generate response
    let botResponse;
    
    if (escalationCheck.shouldEscalate) {
      botResponse = await this.handleEscalation(session, escalationCheck.reasons);
    } else {
      botResponse = await this.responseGenerator.generate({
        message,
        intent: classification,
        entities,
        context,
        botType: session.botType,
        userType: session.userType,
        language,
      });
    }
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Save bot message
    const botMessage = new ChatMessage({
      messageId: `msg_${uuidv4()}`,
      sessionId,
      senderType: 'bot',
      botType: session.botType,
      message: {
        text: botResponse.text,
        language,
      },
      intent: {
        name: classification.intent,
        confidence: classification.confidence,
        category: classification.category,
      },
      entities: entities.map(e => ({
        name: e.name,
        value: e.value,
        type: e.type,
        confidence: e.confidence,
      })),
      sentiment: {
        label: sentiment.label,
        score: sentiment.score,
      },
      quickReplies: botResponse.quickReplies,
      actions: botResponse.actions,
      metadata: {
        processingTime: responseTime,
        modelUsed: classification.source,
        isFallback: classification.confidence < 0.5,
        isEscalation: escalationCheck.shouldEscalate,
      },
      timestamp: new Date(),
    });
    
    await botMessage.save();
    
    // Update analytics
    await this.updateAnalytics(session, classification, entities, sentiment, responseTime);
    
    // Update session context
    await this.updateSessionContext(session, classification, entities);
    
    return {
      userMessage,
      botMessage,
      classification,
      entities,
      sentiment,
      processingTime: responseTime,
    };
  }
  
  /**
   * Build conversation context
   * @param {Object} session - Chat session
   * @returns {Promise<Object>} - Context object
   */
  async buildContext(session) {
    // Get recent messages
    const messages = await ChatMessage.getBySession(session.sessionId, { limit: 10 });
    
    return {
      messages: messages.map(m => ({
        senderType: m.senderType,
        message: m.message,
        timestamp: m.timestamp,
      })),
      lastIntent: session.getContext('lastIntent'),
      entities: session.context,
      userType: session.userType,
      sessionCount: session.messageCount,
      fallbackCount: session.getContext('fallbackCount') || 0,
    };
  }
  
  /**
   * Update session context
   * @param {Object} session - Chat session
   * @param {Object} classification - Intent classification
   * @param {Array} entities - Extracted entities
   */
  async updateSessionContext(session, classification, entities) {
    // Store last intent
    await session.addContext('lastIntent', classification.intent);
    
    // Store entities
    for (const entity of entities) {
      await session.addContext(`entity_${entity.name}`, entity.value);
    }
    
    // Track fallback count
    if (classification.confidence < 0.5) {
      const currentFallbacks = session.getContext('fallbackCount') || 0;
      await session.addContext('fallbackCount', currentFallbacks + 1);
    }
  }
  
  /**
   * Update analytics
   * @param {Object} session - Chat session
   * @param {Object} classification - Intent classification
   * @param {Array} entities - Extracted entities
   * @param {Object} sentiment - Sentiment analysis
   * @param {number} responseTime - Response time in ms
   */
  async updateAnalytics(session, classification, entities, sentiment, responseTime) {
    try {
      const analytics = await ChatAnalytics.findOne({ sessionId: session.sessionId });
      
      if (analytics) {
        // Update message counts
        analytics.messageCount.user += 1;
        analytics.messageCount.bot += 1;
        
        // Record intent usage
        await analytics.recordIntent(
          classification.intentId,
          classification.intentName,
          classification.confidence
        );
        
        // Record entities
        for (const entity of entities) {
          await analytics.recordEntity(
            entity.name,
            entity.name,
            entity.value,
            entity.confidence
          );
        }
        
        // Record sentiment
        await analytics.recordSentiment(sentiment.label, sentiment.score);
        
        // Record response time
        analytics.responseTime.times.push({
          duration: responseTime,
        });
        
        // Record fallback
        if (classification.confidence < 0.5) {
          await analytics.recordFallback(classification.intent);
        }
        
        await analytics.save();
      }
    } catch (error) {
      console.error('Analytics update error:', error);
    }
  }
  
  /**
   * Handle escalation to human agent
   * @param {Object} session - Chat session
   * @param {Array} reasons - Escalation reasons
   * @returns {Promise<Object>} - Escalation response
   */
  async handleEscalation(session, reasons) {
    // Escalate session
    await session.escalate(reasons.join(', '));
    
    // Update analytics
    const analytics = await ChatAnalytics.findOne({ sessionId: session.sessionId });
    if (analytics) {
      analytics.escalationMetrics.escalated = true;
      analytics.escalationMetrics.escalationReason = reasons.join(', ');
      await analytics.save();
    }
    
    const language = session.language === 'auto' ? 'en' : session.language;
    
    const escalationMessages = {
      en: 'I\'m connecting you with a human agent who can better assist you. Please hold on...',
      my: 'သင့်ကို ပိုမိုကူညီနိုင်မည့် လူအကူအညီများနှင့် ချိတ်ဆက်ပေးနေပါသည်။ ခေတ္တစောင့်ဆိုင်းပေးပါ...',
    };
    
    return {
      text: escalationMessages[language] || escalationMessages.en,
      quickReplies: [],
      actions: [{
        type: 'escalate',
        payload: { reasons },
      }],
    };
  }
  
  /**
   * Get session by ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object|null>} - Session or null
   */
  async getSession(sessionId) {
    // Check cache first
    if (this.activeSessions.has(sessionId)) {
      return this.activeSessions.get(sessionId);
    }
    
    // Get from database
    const session = await ChatSession.findOne({ sessionId });
    
    if (session) {
      this.activeSessions.set(sessionId, session);
    }
    
    return session;
  }
  
  /**
   * Get message history
   * @param {string} sessionId - Session ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Messages
   */
  async getMessageHistory(sessionId, options = {}) {
    const { limit = 50, before, after } = options;
    
    return ChatMessage.getBySession(sessionId, { limit, before, after });
  }
  
  /**
   * Close session
   * @param {string} sessionId - Session ID
   * @param {Object} feedback - User feedback
   * @returns {Promise<Object>} - Closed session
   */
  async closeSession(sessionId, feedback = {}) {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Close session
    await session.close(feedback.rating, feedback.comment);
    
    // Remove from cache
    this.activeSessions.delete(sessionId);
    
    // Update analytics
    const analytics = await ChatAnalytics.findOne({ sessionId });
    if (analytics) {
      await analytics.markResolution(
        feedback.resolved ? 'resolved' : 'abandoned',
        'bot',
        false
      );
      
      if (feedback.rating) {
        await analytics.addFeedback(
          feedback.rating,
          feedback.comment,
          feedback.category
        );
      }
    }
    
    return session;
  }
  
  /**
   * Get user's chat history
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Sessions
   */
  async getUserChatHistory(userId, options = {}) {
    const { limit = 20, offset = 0 } = options;
    
    return ChatSession.find({ userId })
      .sort({ lastMessageAt: -1 })
      .skip(offset)
      .limit(limit);
  }
  
  /**
   * Submit feedback
   * @param {string} sessionId - Session ID
   * @param {Object} feedback - Feedback data
   * @returns {Promise<Object>} - Updated analytics
   */
  async submitFeedback(sessionId, feedback) {
    const analytics = await ChatAnalytics.findOne({ sessionId });
    
    if (!analytics) {
      throw new Error('Session analytics not found');
    }
    
    await analytics.addFeedback(
      feedback.rating,
      feedback.comment,
      feedback.category
    );
    
    // Update session with rating
    const session = await this.getSession(sessionId);
    if (session) {
      session.satisfactionRating = feedback.rating;
      session.feedback = feedback.comment;
      await session.save();
    }
    
    return analytics;
  }
  
  /**
   * Get available bots
   * @returns {Promise<Array>} - Available bots
   */
  async getAvailableBots() {
    const configs = await BotConfiguration.find({ isActive: true });
    
    return configs.map(config => ({
      botType: config.botType,
      name: config.name,
      displayName: config.displayName,
      description: config.description,
      avatar: config.avatar,
      features: config.features,
    }));
  }
  
  /**
   * Get bot configuration
   * @param {string} botType - Bot type
   * @returns {Promise<Object>} - Bot configuration
   */
  async getBotConfig(botType) {
    return BotConfiguration.getByBotType(botType);
  }
  
  /**
   * Clean up idle sessions
   * @param {number} idleThresholdMinutes - Idle threshold
   * @returns {Promise<number>} - Number of closed sessions
   */
  async cleanupIdleSessions(idleThresholdMinutes = 30) {
    const idleSessions = await ChatSession.findIdleSessions(idleThresholdMinutes);
    
    for (const session of idleSessions) {
      await this.closeSession(session.sessionId, {
        resolved: false,
        category: 'timeout',
      });
    }
    
    return idleSessions.length;
  }
}

// Singleton instance
let serviceInstance = null;

function getChatbotService() {
  if (!serviceInstance) {
    serviceInstance = new ChatbotService();
  }
  return serviceInstance;
}

module.exports = ChatbotService;
