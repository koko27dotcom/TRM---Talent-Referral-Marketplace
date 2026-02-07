/**
 * IntentClassifier Service
 * Combines OpenAI NLP with local fallback for intent classification
 * Provides robust intent detection with confidence scoring
 */

const OpenAI_NLP = require('../nlp/openaiNLP.js');
const Local_NLP = require('../nlp/localNLP.js');
const ChatIntent = require('../models/ChatIntent.js');
const ChatEntity = require('../models/ChatEntity.js');

class IntentClassifier {
  constructor() {
    this.openai = new OpenAI_NLP();
    this.local = new Local_NLP();
    this.useOpenAI = this.openai.isAvailable();
    this.confidenceThreshold = 0.7;
    this.fallbackThreshold = 0.5;
  }
  
  /**
   * Classify intent from user message
   * @param {string} message - User message
   * @param {Object} context - Conversation context
   * @param {string} botType - Type of bot
   * @returns {Promise<Object>} - Classification result
   */
  async classify(message, context = {}, botType = 'general') {
    const startTime = Date.now();
    
    try {
      // Try OpenAI first if available
      if (this.useOpenAI) {
        const openaiResult = await this.classifyWithOpenAI(message, context, botType);
        
        if (openaiResult.confidence >= this.confidenceThreshold) {
          return {
            ...openaiResult,
            processingTime: Date.now() - startTime,
            source: 'openai',
          };
        }
        
        // If OpenAI confidence is low, try local as backup
        if (openaiResult.confidence < this.fallbackThreshold) {
          const localResult = this.classifyWithLocal(message);
          
          // Use local if it has higher confidence
          if (localResult.confidence > openaiResult.confidence) {
            return {
              ...localResult,
              processingTime: Date.now() - startTime,
              source: 'local_fallback',
            };
          }
        }
        
        return {
          ...openaiResult,
          processingTime: Date.now() - startTime,
          source: 'openai',
        };
      }
      
      // Fall back to local NLP
      const localResult = this.classifyWithLocal(message);
      return {
        ...localResult,
        processingTime: Date.now() - startTime,
        source: 'local',
      };
      
    } catch (error) {
      console.error('Intent classification error:', error);
      
      // Emergency fallback
      const localResult = this.classifyWithLocal(message);
      return {
        ...localResult,
        processingTime: Date.now() - startTime,
        source: 'local_emergency',
        error: error.message,
      };
    }
  }
  
  /**
   * Classify using OpenAI
   * @param {string} message - User message
   * @param {Object} context - Conversation context
   * @param {string} botType - Type of bot
   * @returns {Promise<Object>} - OpenAI classification result
   */
  async classifyWithOpenAI(message, context, botType) {
    // Get available intents from database
    const availableIntents = await ChatIntent.find({
      isActive: true,
      $or: [
        { botTypes: botType },
        { botTypes: 'general' },
      ],
    }).select('intentId name description category').limit(50);
    
    const contextString = this.buildContextString(context);
    
    const result = await this.openai.classifyIntent(
      message,
      availableIntents,
      contextString
    );
    
    // Find matching intent from database
    const matchedIntent = await ChatIntent.findOne({
      intentId: result.intent,
      isActive: true,
    });
    
    return {
      intent: result.intent,
      intentId: matchedIntent?.intentId || result.intent,
      intentName: matchedIntent?.name || result.intent,
      confidence: result.confidence,
      category: result.category || matchedIntent?.category || 'general',
      entities: result.entities || [],
      sentiment: result.sentiment,
      requiresFollowUp: result.requiresFollowUp,
      suggestedActions: result.suggestedActions,
      alternativeIntents: result.alternativeIntents || [],
    };
  }
  
  /**
   * Classify using local NLP
   * @param {string} message - User message
   * @returns {Object} - Local classification result
   */
  classifyWithLocal(message) {
    const result = this.local.classifyIntent(message);
    
    return {
      intent: result.intent,
      intentId: result.intent,
      intentName: result.intent,
      confidence: result.confidence,
      category: result.category,
      entities: [],
      sentiment: null,
      requiresFollowUp: false,
      suggestedActions: [],
      alternativeIntents: [],
      matchedKeywords: result.matchedKeywords,
    };
  }
  
  /**
   * Extract entities from message
   * @param {string} message - User message
   * @param {string} botType - Type of bot
   * @returns {Promise<Array>} - Extracted entities
   */
  async extractEntities(message, botType = 'general') {
    const entities = [];
    
    // Get local entities first
    const localEntities = this.local.extractEntities(message);
    entities.push(...localEntities);
    
    // Try OpenAI for more complex extraction
    if (this.useOpenAI) {
      try {
        // Get custom entities from database
        const customEntities = await ChatEntity.find({
          isActive: true,
          $or: [
            { botTypes: botType },
            { botTypes: 'general' },
          ],
        }).limit(20);
        
        const entityTypes = customEntities.map(e => e.name);
        const openaiEntities = await this.openai.extractEntities(message, entityTypes);
        
        // Merge entities, preferring OpenAI for overlapping extractions
        for (const entity of openaiEntities) {
          const overlap = entities.some(e => 
            entity.startIndex < e.endIndex && entity.endIndex > e.startIndex
          );
          
          if (!overlap) {
            entities.push(entity);
          }
        }
      } catch (error) {
        console.error('OpenAI entity extraction error:', error);
      }
    }
    
    // Extract from custom entity patterns in database
    const dbEntities = await this.extractFromDatabaseEntities(message, botType);
    
    // Merge without duplicates
    for (const entity of dbEntities) {
      const exists = entities.some(e => 
        e.name === entity.name && e.value === entity.value
      );
      if (!exists) {
        entities.push(entity);
      }
    }
    
    return entities;
  }
  
  /**
   * Extract entities using database patterns
   * @param {string} message - User message
   * @param {string} botType - Type of bot
   * @returns {Promise<Array>} - Extracted entities
   */
  async extractFromDatabaseEntities(message, botType) {
    const entities = [];
    
    try {
      const dbEntities = await ChatEntity.find({
        isActive: true,
        $or: [
          { botTypes: botType },
          { botTypes: 'general' },
        ],
      });
      
      for (const entityDef of dbEntities) {
        const extractions = entityDef.extract(message);
        
        for (const extraction of extractions) {
          entities.push({
            name: extraction.type,
            value: extraction.normalizedValue || extraction.value,
            originalText: extraction.value,
            type: extraction.type,
            confidence: extraction.confidence,
            startIndex: extraction.startIndex,
            endIndex: extraction.endIndex,
            source: 'database',
          });
          
          // Update analytics
          entityDef.recordExtraction(extraction.confidence).catch(console.error);
        }
      }
    } catch (error) {
      console.error('Database entity extraction error:', error);
    }
    
    return entities;
  }
  
  /**
   * Analyze sentiment of message
   * @param {string} message - User message
   * @returns {Promise<Object>} - Sentiment analysis
   */
  async analyzeSentiment(message) {
    // Try OpenAI first
    if (this.useOpenAI) {
      try {
        const result = await this.openai.analyzeSentiment(message);
        if (result.source === 'openai') {
          return result;
        }
      } catch (error) {
        console.error('OpenAI sentiment analysis error:', error);
      }
    }
    
    // Fall back to local
    return this.local.analyzeSentiment(message);
  }
  
  /**
   * Detect language of message
   * @param {string} message - User message
   * @returns {Promise<string>} - Language code
   */
  async detectLanguage(message) {
    // Try OpenAI first
    if (this.useOpenAI) {
      try {
        return await this.openai.detectLanguage(message);
      } catch (error) {
        console.error('OpenAI language detection error:', error);
      }
    }
    
    // Fall back to local
    return this.local.detectLanguage(message);
  }
  
  /**
   * Build context string for OpenAI
   * @param {Object} context - Conversation context
   * @returns {string} - Context string
   */
  buildContextString(context) {
    const parts = [];
    
    if (context.lastIntent) {
      parts.push(`Previous intent: ${context.lastIntent}`);
    }
    
    if (context.entities && context.entities.length > 0) {
      parts.push(`Known entities: ${context.entities.map(e => `${e.name}=${e.value}`).join(', ')}`);
    }
    
    if (context.userType) {
      parts.push(`User type: ${context.userType}`);
    }
    
    if (context.sessionCount) {
      parts.push(`Message count: ${context.sessionCount}`);
    }
    
    return parts.join('; ') || 'None';
  }
  
  /**
   * Check if message should trigger escalation
   * @param {string} message - User message
   * @param {Object} classification - Intent classification
   * @param {Object} context - Conversation context
   * @returns {Object} - Escalation check result
   */
  shouldEscalate(message, classification, context = {}) {
    const reasons = [];
    
    // Check for explicit escalation keywords
    const escalationKeywords = ['human', 'agent', 'representative', 'supervisor', 'manager', 'speak to someone'];
    if (escalationKeywords.some(kw => message.toLowerCase().includes(kw))) {
      reasons.push('explicit_request');
    }
    
    // Check for low confidence
    if (classification.confidence < 0.3) {
      reasons.push('low_confidence');
    }
    
    // Check for negative sentiment
    if (classification.sentiment === 'negative') {
      reasons.push('negative_sentiment');
    }
    
    // Check for multiple fallbacks
    if (context.fallbackCount >= 3) {
      reasons.push('multiple_fallbacks');
    }
    
    // Check for complaint intent
    if (classification.intent === 'complaint') {
      reasons.push('complaint');
    }
    
    return {
      shouldEscalate: reasons.length > 0,
      reasons,
      priority: reasons.includes('complaint') ? 'high' : 'normal',
    };
  }
  
  /**
   * Get intent suggestions for partial matches
   * @param {string} message - User message
   * @param {string} botType - Type of bot
   * @returns {Promise<Array>} - Suggested intents
   */
  async getIntentSuggestions(message, botType = 'general') {
    const suggestions = [];
    
    try {
      // Get all active intents for this bot type
      const intents = await ChatIntent.find({
        isActive: true,
        $or: [
          { botTypes: botType },
          { botTypes: 'general' },
        ],
      }).select('intentId name category trainingPhrases');
      
      // Calculate similarity with training phrases
      for (const intent of intents) {
        let maxSimilarity = 0;
        
        for (const phrase of intent.trainingPhrases) {
          const similarity = this.local.calculateSimilarity(
            message.toLowerCase(),
            phrase.phrase.toLowerCase()
          );
          
          if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
          }
        }
        
        if (maxSimilarity > 0.5) {
          suggestions.push({
            intentId: intent.intentId,
            name: intent.name,
            category: intent.category,
            confidence: maxSimilarity,
          });
        }
      }
      
      // Sort by confidence
      suggestions.sort((a, b) => b.confidence - a.confidence);
      
      return suggestions.slice(0, 3);
    } catch (error) {
      console.error('Error getting intent suggestions:', error);
      return [];
    }
  }
  
  /**
   * Batch classify multiple messages
   * @param {Array} messages - Array of messages
   * @param {string} botType - Type of bot
   * @returns {Promise<Array>} - Classification results
   */
  async batchClassify(messages, botType = 'general') {
    const results = [];
    
    for (const message of messages) {
      const result = await this.classify(message.text, message.context, botType);
      results.push({
        messageId: message.id,
        ...result,
      });
    }
    
    return results;
  }
}

// Singleton instance
let classifierInstance = null;

function getIntentClassifier() {
  if (!classifierInstance) {
    classifierInstance = new IntentClassifier();
  }
  return classifierInstance;
}

module.exports = IntentClassifier;
