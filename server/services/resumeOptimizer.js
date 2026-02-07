/**
 * Resume Optimizer Service
 * AI-powered resume optimization using Moonshot AI (Kimi)
 * Extracts text from PDF resumes and generates polished versions
 */

const OpenAI = require('openai');
const fs = require('fs').promises;

// Initialize Moonshot AI client (Kimi) - lazy loading
let moonshotClient = null;
const getMoonshotClient = () => {
  if (!moonshotClient && process.env.MOONSHOT_API_KEY) {
    moonshotClient = new OpenAI({
      apiKey: process.env.MOONSHOT_API_KEY,
      baseURL: 'https://api.moonshot.cn/v1',
    });
  }
  return moonshotClient;
};

class ResumeOptimizer {
  constructor() {
    this.model = 'moonshot-v1-128k';
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  /**
   * Extract text from PDF file
   * @param {string} filePath - Path to PDF file
   * @returns {Promise<string>} Extracted text content
   */
  async extractTextFromPDF(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      
      // Simple text extraction - read as text and extract readable content
      let text = dataBuffer.toString('utf-8');
      
      // Extract text between stream and endstream (basic PDF text extraction)
      const streamMatches = text.match(/stream\r?\n?([\s\S]*?)endstream/g);
      if (streamMatches) {
        text = streamMatches.map(match => 
          match.replace(/stream\r?\n?/, '').replace(/endstream/, '')
        ).join(' ');
      }
      
      // Clean up the extracted text
      text = text
        .replace(/[^\x20-\x7E\n]/g, ' ') // Keep only printable ASCII
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
      
      if (!text || text.length < 50) {
        throw new Error('PDF appears to be empty or contains no readable text');
      }
      
      return text;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  /**
   * Extract text from PDF buffer (for uploaded files)
   * @param {Buffer} buffer - PDF file buffer
   * @returns {Promise<string>} Extracted text content
   */
  async extractTextFromBuffer(buffer) {
    try {
      // Simple text extraction - read as text and extract readable content
      let text = buffer.toString('utf-8');
      
      // Extract text between stream and endstream (basic PDF text extraction)
      const streamMatches = text.match(/stream\r?\n?([\s\S]*?)endstream/g);
      if (streamMatches) {
        text = streamMatches.map(match => 
          match.replace(/stream\r?\n?/, '').replace(/endstream/, '')
        ).join(' ');
      }
      
      // Clean up the extracted text
      text = text
        .replace(/[^\x20-\x7E\n]/g, ' ') // Keep only printable ASCII
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
      
      if (!text || text.length < 50) {
        throw new Error('PDF appears to be empty or contains no readable text');
      }
      
      return text;
    } catch (error) {
      console.error('Error extracting text from PDF buffer:', error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  /**
   * Generate optimization prompt
   * @param {string} resumeText - Original resume text
   * @param {string} jobDescription - Optional job description
   * @returns {string} Formatted prompt
   */
  generatePrompt(resumeText, jobDescription = null) {
    let prompt = `You are an expert resume optimizer and career coach. Your task is to analyze and optimize the following resume to make it more professional, impactful, and ATS-friendly.

## Original Resume:
\`\`\`
${resumeText}
\`\`\``;

    if (jobDescription) {
      prompt += `

## Target Job Description:
\`\`\`
${jobDescription}
\`\`\`

Please optimize the resume specifically for this job position. Highlight relevant skills and experiences that match the job requirements.`;
    }

    prompt += `

## Optimization Instructions:
1. Improve the formatting and structure for better readability
2. Use strong action verbs and quantifiable achievements
3. Optimize keywords for Applicant Tracking Systems (ATS)
4. Ensure professional tone and concise language
5. Highlight key skills and accomplishments prominently
6. Fix any grammar or spelling issues
7. Organize sections logically (Summary, Experience, Education, Skills)

## Output Format:
Please provide the optimized resume in Markdown format with the following structure:
- Professional Summary
- Work Experience (with bullet points)
- Education
- Skills
- Certifications (if applicable)

Return ONLY the optimized resume in Markdown format, without any additional commentary.`;

    return prompt;
  }

  /**
   * Optimize resume using Moonshot AI
   * @param {string} resumeText - Original resume text
   * @param {string} jobDescription - Optional job description
   * @returns {Promise<string>} Optimized resume in Markdown
   */
  async optimizeResume(resumeText, jobDescription = null) {
    const prompt = this.generatePrompt(resumeText, jobDescription);
    
    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Attempting resume optimization (attempt ${attempt}/${this.maxRetries})...`);
        
        const response = await getMoonshotClient().chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert resume optimizer and career coach with deep knowledge of ATS systems and modern resume best practices.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        });

        const optimizedResume = response.choices[0]?.message?.content;
        
        if (!optimizedResume) {
          throw new Error('Empty response from Moonshot AI');
        }

        return optimizedResume.trim();
      } catch (error) {
        console.error(`Optimization attempt ${attempt} failed:`, error.message);
        lastError = error;
        
        if (attempt < this.maxRetries) {
          console.log(`Waiting ${this.retryDelay}ms before retry...`);
          await this.delay(this.retryDelay);
        }
      }
    }

    throw new Error(`Failed to optimize resume after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Analyze resume and provide suggestions
   * @param {string} resumeText - Original resume text
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeResume(resumeText) {
    const prompt = `You are an expert resume reviewer. Analyze the following resume and provide constructive feedback.

## Resume:
\`\`\`
${resumeText}
\`\`\`

Please provide your analysis in the following JSON format:
{
  "overallScore": <number 1-10>,
  "strengths": ["strength 1", "strength 2", ...],
  "weaknesses": ["weakness 1", "weakness 2", ...],
  "suggestions": ["suggestion 1", "suggestion 2", ...],
  "atsCompatibility": {
    "score": <number 1-10>,
    "issues": ["issue 1", "issue 2", ...]
  },
  "keywords": ["keyword 1", "keyword 2", ...]
}

Return ONLY the JSON response, no additional text.`;

    try {
      const response = await getMoonshotClient().chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert resume reviewer and ATS specialist. Provide detailed, actionable feedback.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('Empty response from Moonshot AI');
      }

      return JSON.parse(content);
    } catch (error) {
      console.error('Error analyzing resume:', error);
      throw new Error(`Failed to analyze resume: ${error.message}`);
    }
  }

  /**
   * Full optimization workflow
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @param {string} jobDescription - Optional job description
   * @returns {Promise<Object>} Optimization results
   */
  async optimize(pdfBuffer, jobDescription = null) {
    try {
      // Step 1: Extract text from PDF
      console.log('Extracting text from PDF...');
      const originalText = await this.extractTextFromBuffer(pdfBuffer);
      
      // Step 2: Optimize resume
      console.log('Optimizing resume with AI...');
      const optimizedText = await this.optimizeResume(originalText, jobDescription);
      
      // Step 3: Analyze original resume
      console.log('Analyzing resume...');
      const analysis = await this.analyzeResume(originalText);
      
      return {
        success: true,
        data: {
          originalText,
          optimizedText,
          analysis,
          metadata: {
            originalLength: originalText.length,
            optimizedLength: optimizedText.length,
            hasJobDescription: !!jobDescription,
            timestamp: new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      console.error('Resume optimization failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Utility: Delay function for retries
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
const resumeOptimizer = new ResumeOptimizer();

module.exports = {
  ResumeOptimizer,
  resumeOptimizer,
};