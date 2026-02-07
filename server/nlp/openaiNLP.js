/**
 * OpenAI NLP Integration
 * Provides NLP capabilities using OpenAI GPT models
 * Handles intent classification, entity extraction, and response generation
 */

const OpenAI = require('openai');

class OpenAI_NLP {
  constructor(apiKey = null) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY;
    this.openai = null;
    
    if (this.apiKey) {
      this.openai = new OpenAI({
        apiKey: this.apiKey,
      });
    }
    
    this.defaultModel = 'gpt-4o-mini';
    this.defaultTemperature = 0.3;
    this.maxTokens = 500;
  }
  
  isAvailable() {
    return !!this.openai;
  }
  
  /**
   * Classify intent from user message
   * @param {string} message - User message
   * @param {Array} availableIntents - List of available intents
   * @param {string} context - Conversation context
   * @returns {Promise<Object>} - Intent classification result
   */
  async classifyIntent(message, availableIntents = [], context = '') {
    if (!this.isAvailable()) {
      throw new Error('OpenAI not configured');
    }
    
    const intentList = availableIntents.map(i => 
      `- ${i.name}: ${i.description || 'No description'}`
    ).join('\n');
    
    const prompt = `
You are an intent classifier for a job referral platform chatbot.
Analyze the user's message and classify it into one of the available intents.

Available intents:
${intentList || '- general_help: General help and support\n- greeting: User greetings\n- goodbye: User farewells\n- fallback: Unclear or unknown intent'}

Conversation context: ${context || 'None'}

User message: "${message}"

Respond in JSON format:
{
  "intent": "intent_name",
  "confidence": 0.0-1.0,
  "category": "general|referral|job|payment|support|greeting|goodbye",
  "entities": [
    {"name": "entity_name", "value": "extracted_value", "type": "entity_type"}
  ],
  "sentiment": "positive|negative|neutral",
  "requires_followup": true|false,
  "suggested_actions": ["action1", "action2"]
}
    `.trim();
    
    try {
      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: 'You are an expert intent classifier. Respond only with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: this.defaultTemperature,
        max_tokens: this.maxTokens,
        response_format: { type: 'json_object' },
      });
      
      const result = JSON.parse(response.choices[0].message.content);
      
      return {
        intent: result.intent || 'fallback',
        confidence: result.confidence || 0.5,
        category: result.category || 'general',
        entities: result.entities || [],
        sentiment: result.sentiment || 'neutral',
        requiresFollowUp: result.requires_followup || false,
        suggestedActions: result.suggested_actions || [],
        source: 'openai',
      };
    } catch (error) {
      console.error('OpenAI intent classification error:', error);
      throw error;
    }
  }
  
  /**
   * Extract entities from message
   * @param {string} message - User message
   * @param {Array} entityTypes - Types of entities to extract
   * @returns {Promise<Array>} - Extracted entities
   */
  async extractEntities(message, entityTypes = []) {
    if (!this.isAvailable()) {
      throw new Error('OpenAI not configured');
    }
    
    const entityTypeList = entityTypes.length > 0 
      ? entityTypes.join(', ') 
      : 'job_title, skill, location, company, experience_level, salary_range, date';
    
    const prompt = `
Extract entities from the following message for a job referral platform.

Entity types to look for: ${entityTypeList}

Message: "${message}"

Respond in JSON format:
{
  "entities": [
    {"name": "entity_type", "value": "extracted_value", "original_text": "text_in_message", "confidence": 0.0-1.0}
  ]
}
    `.trim();
    
    try {
      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: 'You are an entity extraction system. Respond only with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });
      
      const result = JSON.parse(response.choices[0].message.content);
      
      return (result.entities || []).map(e => ({
        name: e.name,
        value: e.value,
        originalText: e.original_text,
        confidence: e.confidence || 0.8,
        source: 'openai',
      }));
    } catch (error) {
      console.error('OpenAI entity extraction error:', error);
      return [];
    }
  }
  
  /**
   * Generate bot response
   * @param {string} message - User message
   * @param {Object} context - Conversation context
   * @param {string} botType - Type of bot (candidate, referrer, recruiter, admin)
   * @param {Object} personality - Bot personality settings
   * @returns {Promise<Object>} - Generated response
   */
  async generateResponse(message, context = {}, botType = 'general', personality = {}) {
    if (!this.isAvailable()) {
      throw new Error('OpenAI not configured');
    }
    
    const botTypeDescriptions = {
      candidate: 'You are a helpful career assistant helping job seekers find jobs and prepare for interviews.',
      referrer: 'You are an enthusiastic referral partner helping people earn commission by referring candidates.',
      recruiter: 'You are a professional hiring assistant helping employers find and hire great talent.',
      admin: 'You are an admin assistant providing platform statistics and insights.',
      general: 'You are a helpful support assistant.',
    };
    
    const tone = personality.tone || 'friendly';
    const useEmojis = personality.useEmojis !== false;
    
    const systemPrompt = `
${botTypeDescriptions[botType] || botTypeDescriptions.general}

Tone: ${tone}
${useEmojis ? 'Use appropriate emojis to make responses friendly.' : 'Do not use emojis.'}

Guidelines:
- Be concise but helpful (2-4 sentences max)
- If you don't know something, suggest escalating to human support
- For job-related queries, be professional
- For referral queries, be enthusiastic about earning potential
- Always provide actionable next steps when possible

Platform Context:
- This is a job referral platform for Myanmar
- Candidates apply for jobs
- Referrers earn commission for successful referrals
- Companies post jobs and hire candidates
    `.trim();
    
    const conversationHistory = context.messages || [];
    const recentHistory = conversationHistory.slice(-5);
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...recentHistory.map(m => ({
        role: m.senderType === 'user' ? 'user' : 'assistant',
        content: m.message.text,
      })),
      { role: 'user', content: message },
    ];
    
    try {
      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages,
        temperature: personality.temperature || 0.7,
        max_tokens: this.maxTokens,
      });
      
      const content = response.choices[0].message.content;
      
      // Generate quick replies based on context
      const quickReplies = await this.suggestQuickReplies(message, content, botType);
      
      return {
        text: content,
        quickReplies,
        suggestedActions: [],
        source: 'openai',
      };
    } catch (error) {
      console.error('OpenAI response generation error:', error);
      throw error;
    }
  }
  
  /**
   * Suggest quick replies based on conversation context
   * @param {string} message - User message
   * @param {string} response - Bot response
   * @param {string} botType - Type of bot
   * @returns {Promise<Array>} - Quick reply suggestions
   */
  async suggestQuickReplies(message, response, botType) {
    const prompt = `
Based on this conversation, suggest 3-4 quick reply options for the user.

Bot type: ${botType}
User message: "${message}"
Bot response: "${response}"

Respond in JSON format:
{
  "quick_replies": [
    {"label": "Button text", "value": "value_to_send", "action": "send_message"}
  ]
}
    `.trim();
    
    try {
      const result = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: 'You are a conversation designer. Create helpful quick reply options.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      });
      
      const parsed = JSON.parse(result.choices[0].message.content);
      return parsed.quick_replies || [];
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Analyze sentiment of message
   * @param {string} message - User message
   * @returns {Promise<Object>} - Sentiment analysis
   */
  async analyzeSentiment(message) {
    if (!this.isAvailable()) {
      return { label: 'neutral', score: 0 };
    }
    
    const prompt = `
Analyze the sentiment of this message in the context of customer service.

Message: "${message}"

Respond in JSON format:
{
  "sentiment": "positive|negative|neutral|mixed",
  "score": -1.0 to 1.0,
  "urgency": "low|medium|high"
}
    `.trim();
    
    try {
      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: 'You are a sentiment analysis system. Respond only with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 100,
        response_format: { type: 'json_object' },
      });
      
      const result = JSON.parse(response.choices[0].message.content);
      
      return {
        label: result.sentiment,
        score: result.score,
        urgency: result.urgency,
        source: 'openai',
      };
    } catch (error) {
      console.error('OpenAI sentiment analysis error:', error);
      return { label: 'neutral', score: 0, urgency: 'low', source: 'fallback' };
    }
  }
  
  /**
   * Detect language of message
   * @param {string} message - User message
   * @returns {Promise<string>} - Detected language code
   */
  async detectLanguage(message) {
    if (!this.isAvailable()) {
      return 'en';
    }
    
    const prompt = `
Detect the language of this message. Response should be only the language code (en or my).

Message: "${message}"

Language code (en/my):
    `.trim();
    
    try {
      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 10,
      });
      
      const lang = response.choices[0].message.content.trim().toLowerCase();
      return lang === 'my' ? 'my' : 'en';
    } catch (error) {
      return 'en';
    }
  }
  
  /**
   * Translate text
   * @param {string} text - Text to translate
   * @param {string} targetLang - Target language (en or my)
   * @returns {Promise<string>} - Translated text
   */
  async translate(text, targetLang) {
    if (!this.isAvailable()) {
      return text;
    }
    
    const langName = targetLang === 'my' ? 'Burmese/Myanmar language' : 'English';
    
    const prompt = `
Translate the following text to ${langName}. Maintain the tone and meaning.

Text: "${text}"

Translation:
    `.trim();
    
    try {
      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: `You are a professional translator. Translate to ${langName}.` },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: this.maxTokens,
      });
      
      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('OpenAI translation error:', error);
      return text;
    }
  }
  
  /**
   * Generate job description
   * @param {Object} jobDetails - Job details
   * @returns {Promise<string>} - Generated job description
   */
  async generateJobDescription(jobDetails) {
    if (!this.isAvailable()) {
      throw new Error('OpenAI not configured');
    }
    
    const prompt = `
Write a compelling job description for the following position:

Title: ${jobDetails.title}
Company: ${jobDetails.company}
Location: ${jobDetails.location || 'Not specified'}
Type: ${jobDetails.type || 'Full-time'}
Experience: ${jobDetails.experience || 'Not specified'}
Skills: ${jobDetails.skills?.join(', ') || 'Not specified'}

Write 3 sections:
1. About the Role (2-3 sentences)
2. Responsibilities (bullet points)
3. Requirements (bullet points)

Keep it professional and engaging.
    `.trim();
    
    try {
      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: 'You are an expert job description writer.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });
      
      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('OpenAI job description generation error:', error);
      throw error;
    }
  }
  
  /**
   * Suggest interview questions
   * @param {string} jobTitle - Job title
   * @param {string} level - Experience level
   * @returns {Promise<Array>} - Suggested questions
   */
  async suggestInterviewQuestions(jobTitle, level = 'mid') {
    if (!this.isAvailable()) {
      return [];
    }
    
    const prompt = `
Suggest 5 interview questions for a ${level}-level ${jobTitle} position.

Include:
- 2 technical/skills questions
- 2 behavioral questions
- 1 culture fit question

Respond in JSON format:
{
  "questions": [
    {"type": "technical|behavioral|culture", "question": "The question text", "what_to_look_for": "Brief description"}
  ]
}
    `.trim();
    
    try {
      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: 'You are an expert interviewer.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 600,
        response_format: { type: 'json_object' },
      });
      
      const result = JSON.parse(response.choices[0].message.content);
      return result.questions || [];
    } catch (error) {
      console.error('OpenAI interview questions error:', error);
      return [];
    }
  }
  
  /**
   * Screen candidate based on job requirements
   * @param {Object} candidate - Candidate profile
   * @param {Object} job - Job requirements
   * @returns {Promise<Object>} - Screening result
   */
  async screenCandidate(candidate, job) {
    if (!this.isAvailable()) {
      return { score: 0, fit: 'unknown', summary: 'Screening unavailable' };
    }
    
    const prompt = `
Screen this candidate for the job position:

JOB:
Title: ${job.title}
Required Skills: ${job.requiredSkills?.join(', ')}
Experience: ${job.experience} years

CANDIDATE:
Skills: ${candidate.skills?.join(', ')}
Experience: ${candidate.experience} years
Education: ${candidate.education}

Respond in JSON format:
{
  "match_score": 0-100,
  "fit": "excellent|good|average|poor",
  "matching_skills": ["skill1", "skill2"],
  "missing_skills": ["skill1"],
  "summary": "Brief assessment",
  "recommendation": "strong_recommend|recommend|consider|reject"
}
    `.trim();
    
    try {
      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: 'You are an expert technical recruiter.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 400,
        response_format: { type: 'json_object' },
      });
      
      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI candidate screening error:', error);
      return { score: 0, fit: 'unknown', summary: 'Screening failed' };
    }
  }
  
  /**
   * Summarize conversation
   * @param {Array} messages - Conversation messages
   * @returns {Promise<string>} - Summary
   */
  async summarizeConversation(messages) {
    if (!this.isAvailable() || messages.length === 0) {
      return '';
    }
    
    const conversationText = messages.map(m => 
      `${m.senderType}: ${m.message.text}`
    ).join('\n');
    
    const prompt = `
Summarize this customer support conversation in 2-3 sentences:

${conversationText}

Summary:
    `.trim();
    
    try {
      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 150,
      });
      
      return response.choices[0].message.content.trim();
    } catch (error) {
      return '';
    }
  }
}

module.exports = OpenAI_NLP;
