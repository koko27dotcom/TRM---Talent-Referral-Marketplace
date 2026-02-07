/**
 * CandidateEnrichmentService
 * AI-powered candidate profile enrichment using OpenAI GPT
 * Extracts skills, estimates salary, calculates hire probability
 */

const OpenAI = require('openai');
const TalentPool = require('../models/TalentPool.js');
const Job = require('../models/Job.js');
const { AuditLog } = require('../models/index.js');

// Initialize OpenAI client (lazy loading)
let openai = null;
const getOpenAI = () => {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
};

/**
 * Service class for AI-powered candidate enrichment
 */
class CandidateEnrichmentService {
  constructor() {
    this.batchSize = 10;
    this.enrichmentQueue = [];
    this.isProcessing = false;
  }

  /**
   * Extract skills from profile data using AI
   */
  async extractSkills(profileData) {
    const prompt = `
      Analyze the following professional profile and extract technical and soft skills.
      Return a JSON array of skills with confidence scores (0-1).
      
      Profile:
      Name: ${profileData.name || 'Unknown'}
      Title: ${profileData.currentTitle || 'Unknown'}
      Company: ${profileData.currentCompany || 'Unknown'}
      Experience: ${profileData.experienceYears || 0} years
      Skills mentioned: ${(profileData.skills || []).join(', ')}
      
      Return format:
      [
        { "skill": "skill name", "confidence": 0.95, "category": "technical|soft|domain" }
      ]
    `;

    try {
      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert HR analyst specializing in skill extraction from professional profiles. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch (error) {
      console.error('Error extracting skills:', error);
      return [];
    }
  }

  /**
   * Estimate salary expectations based on profile
   */
  async estimateSalary(profileData) {
    const prompt = `
      Estimate the salary expectation for this professional in Myanmar (MMK).
      Consider their experience, skills, and current position.
      Return a JSON object with min, max, and confidence.
      
      Profile:
      Title: ${profileData.currentTitle || 'Unknown'}
      Experience: ${profileData.experienceYears || 0} years
      Skills: ${(profileData.skills || []).join(', ')}
      Location: ${profileData.location?.city || 'Yangon'}, Myanmar
      
      Return format:
      {
        "min": 500000,
        "max": 800000,
        "currency": "MMK",
        "confidence": 0.75,
        "marketPercentile": 65
      }
    `;

    try {
      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a compensation analyst specializing in Myanmar job market. Return only valid JSON with realistic salary ranges in MMK.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 300,
      });

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      console.error('Error estimating salary:', error);
      return null;
    }
  }

  /**
   * Calculate hire probability score
   */
  async calculateHireProbability(profileData, marketData = {}) {
    const prompt = `
      Calculate a hire probability score (0-100) for this candidate.
      Consider their profile completeness, experience, skills demand, and market factors.
      
      Profile:
      Name: ${profileData.name || 'Unknown'}
      Title: ${profileData.currentTitle || 'Unknown'}
      Experience: ${profileData.experienceYears || 0} years
      Skills: ${(profileData.skills || []).join(', ')}
      Has Email: ${profileData.email ? 'Yes' : 'No'}
      Has Phone: ${profileData.phone ? 'Yes' : 'No'}
      
      Market Context:
      Active Jobs in Field: ${marketData.activeJobs || 'Unknown'}
      Average Time to Hire: ${marketData.avgTimeToHire || 'Unknown'} days
      
      Return format:
      {
        "score": 75,
        "confidence": 0.80,
        "factors": {
          "profileCompleteness": 85,
          "experienceRelevance": 70,
          "skillsDemand": 80,
          "contactAvailability": 60
        },
        "reasoning": "Brief explanation of the score"
      }
    `;

    try {
      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an AI recruiter specializing in candidate assessment. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 400,
      });

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      console.error('Error calculating hire probability:', error);
      return null;
    }
  }

  /**
   * Generate AI insights about candidate
   */
  async generateInsights(profileData) {
    const prompt = `
      Generate professional insights about this candidate for recruiters.
      Include strengths, potential roles, career trajectory, and availability likelihood.
      
      Profile:
      Name: ${profileData.name || 'Unknown'}
      Title: ${profileData.currentTitle || 'Unknown'}
      Company: ${profileData.currentCompany || 'Unknown'}
      Experience: ${profileData.experienceYears || 0} years
      Skills: ${(profileData.skills || []).join(', ')}
      
      Return format:
      {
        "strengths": ["strength 1", "strength 2"],
        "potentialRoles": ["role 1", "role 2"],
        "careerTrajectory": "Brief assessment of career direction",
        "availabilityLikelihood": 70,
        "recommendedApproach": "How to approach this candidate"
      }
    `;

    try {
      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a senior technical recruiter providing candidate insights. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 500,
      });

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      console.error('Error generating insights:', error);
      return null;
    }
  }

  /**
   * Generate personalized outreach message
   */
  async generateOutreachMessage(candidate, job = null, template = null) {
    const prompt = `
      Write a personalized outreach message to this candidate.
      ${job ? `For job: ${job.title} at ${job.company}` : 'For general networking'}
      
      Candidate Profile:
      Name: ${candidate.name}
      Title: ${candidate.currentTitle || 'Unknown'}
      Company: ${candidate.currentCompany || 'Unknown'}
      Experience: ${candidate.experienceYears || 0} years
      Skills: ${(candidate.skills || []).join(', ')}
      
      ${template ? `Template to follow: ${template}` : ''}
      
      Guidelines:
      - Keep it professional but friendly
      - Mention specific details from their profile
      - Explain why they would be a good fit
      - Include a clear call to action
      - Keep under 200 words
      
      Return only the message text, no JSON.
    `;

    try {
      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert recruiter writing personalized outreach messages. Write naturally and persuasively.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 400,
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating outreach message:', error);
      return null;
    }
  }

  /**
   * Enrich a single candidate
   */
  async enrichCandidate(candidateId, userId) {
    const candidate = await TalentPool.findById(candidateId);
    if (!candidate) throw new Error('Candidate not found');

    const enrichmentData = {
      enrichmentDate: new Date(),
      enrichmentVersion: '1.0',
    };

    try {
      // Extract skills
      const extractedSkills = await this.extractSkills(candidate);
      if (extractedSkills && extractedSkills.length > 0) {
        enrichmentData.extractedSkills = extractedSkills;
        
        // Merge with existing skills
        const newSkills = extractedSkills
          .filter(s => s.confidence > 0.7)
          .map(s => s.skill);
        candidate.skills = [...new Set([...candidate.skills, ...newSkills])];
      }

      // Estimate salary
      const salaryEstimate = await this.estimateSalary(candidate);
      if (salaryEstimate) {
        enrichmentData.estimatedSalary = salaryEstimate;
        candidate.salaryExpectation = {
          min: salaryEstimate.min,
          max: salaryEstimate.max,
          currency: salaryEstimate.currency,
        };
      }

      // Calculate hire probability
      const hireProbability = await this.calculateHireProbability(candidate);
      if (hireProbability) {
        candidate.hireProbabilityScore = hireProbability.score;
        enrichmentData.hireProbability = hireProbability;
      }

      // Generate insights
      const insights = await this.generateInsights(candidate);
      if (insights) {
        enrichmentData.aiInsights = insights;
      }

      // Update candidate
      candidate.enrichedData = enrichmentData;
      await candidate.save();

      // Log audit
      await AuditLog.create({
        action: 'CANDIDATE_ENRICHED',
        entity: 'TalentPool',
        entityId: candidateId,
        userId: userId,
        details: { enrichmentData },
      });

      return {
        success: true,
        candidate: candidate,
        enrichmentData: enrichmentData,
      };
    } catch (error) {
      console.error('Error enriching candidate:', error);
      throw error;
    }
  }

  /**
   * Batch enrich candidates
   */
  async batchEnrich(candidateIds, userId, onProgress = null) {
    const results = {
      total: candidateIds.length,
      enriched: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < candidateIds.length; i += this.batchSize) {
      const batch = candidateIds.slice(i, i + this.batchSize);
      
      await Promise.all(
        batch.map(async (candidateId) => {
          try {
            await this.enrichCandidate(candidateId, userId);
            results.enriched++;
          } catch (error) {
            results.failed++;
            results.errors.push({ candidateId, error: error.message });
          }
        })
      );

      if (onProgress) {
        onProgress({
          processed: i + batch.length,
          total: candidateIds.length,
          percentage: Math.round(((i + batch.length) / candidateIds.length) * 100),
        });
      }

      // Rate limiting between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  /**
   * Auto-enrich high-potential candidates
   */
  async autoEnrichHighPotential(limit = 100) {
    const candidates = await TalentPool.find({
      hireProbabilityScore: { $exists: false },
      contactStatus: { $in: ['not_contacted', 'contacted'] },
      isActive: true,
    }).limit(limit);

    const candidateIds = candidates.map(c => c._id);
    return this.batchEnrich(candidateIds, null);
  }

  /**
   * Match candidates to jobs
   */
  async matchCandidatesToJobs(candidateId) {
    const candidate = await TalentPool.findById(candidateId);
    if (!candidate) throw new Error('Candidate not found');

    const jobs = await Job.find({
      status: 'active',
      $or: [
        { skills: { $in: candidate.skills } },
        { title: { $regex: candidate.currentTitle || '', $options: 'i' } },
      ],
    }).limit(20);

    const matches = [];

    for (const job of jobs) {
      const prompt = `
        Calculate a match score (0-100) between this candidate and job.
        
        Candidate:
        Skills: ${(candidate.skills || []).join(', ')}
        Experience: ${candidate.experienceYears || 0} years
        Title: ${candidate.currentTitle || 'Unknown'}
        
        Job:
        Title: ${job.title}
        Required Skills: ${(job.skills || []).join(', ')}
        Experience Required: ${job.experienceRequired || 'Not specified'}
        
        Return format: { "score": 85, "reasoning": "brief explanation" }
      `;

      try {
        const response = await getOpenAI().chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a job matching AI. Return only valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 200,
        });

        const content = response.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const matchResult = JSON.parse(jsonMatch[0]);
          if (matchResult.score >= 60) {
            matches.push({
              jobId: job._id,
              matchScore: matchResult.score,
              reasoning: matchResult.reasoning,
            });
          }
        }
      } catch (error) {
        console.error('Error matching job:', error);
      }
    }

    // Update candidate with matches
    candidate.matchedJobs = matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);
    await candidate.save();

    return matches;
  }

  /**
   * Analyze market trends for skills
   */
  async analyzeSkillTrends(skills) {
    const prompt = `
      Analyze the demand for these skills in the Myanmar job market.
      Skills: ${skills.join(', ')}
      
      Return format:
      {
        "trends": [
          { "skill": "skill name", "demand": "high|medium|low", "growth": "increasing|stable|declining" }
        ],
        "insights": "Brief market insights"
      }
    `;

    try {
      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a labor market analyst specializing in Myanmar. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 400,
      });

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      console.error('Error analyzing skill trends:', error);
      return null;
    }
  }
}

// Export singleton instance
const candidateEnrichmentService = new CandidateEnrichmentService();
module.exports = CandidateEnrichmentService;
