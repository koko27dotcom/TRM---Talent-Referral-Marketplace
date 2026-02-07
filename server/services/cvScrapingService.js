/**
 * CV Scraping Service
 * Architecture for scraping and processing CVs from various sources
 * Target: 100K CVs for Myanmar job market
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { CandidateSource, TalentPool } = require('../models/index.js');

// Scraping sources configuration
const SCRAPING_SOURCES = {
  JOBNET_MYANMAR: {
    name: 'JobNet Myanmar',
    baseUrl: 'https://www.jobnet.com.mm',
    enabled: true,
    rateLimit: 1000, // ms between requests
  },
  JOBS_IN_YANGON: {
    name: 'Jobs in Yangon',
    baseUrl: 'https://www.jobsinyangon.com',
    enabled: true,
    rateLimit: 1000,
  },
  MYANMAR_JOBS_DB: {
    name: 'Myanmar Jobs DB',
    baseUrl: 'https://www.myanmarjobsdb.com',
    enabled: true,
    rateLimit: 1000,
  },
  CAREER_JET: {
    name: 'CareerJet Myanmar',
    baseUrl: 'https://www.careerjet.com.mm',
    enabled: true,
    rateLimit: 1500,
  },
  LINKEDIN: {
    name: 'LinkedIn',
    baseUrl: 'https://www.linkedin.com',
    enabled: false, // Requires special API access
    rateLimit: 2000,
  },
};

// Configuration
const config = {
  maxConcurrentRequests: 5,
  requestTimeout: 30000,
  retryAttempts: 3,
  retryDelay: 5000,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};

/**
 * Delay utility
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch page with retry logic
 */
const fetchPage = async (url, options = {}) => {
  let lastError;
  
  for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: config.requestTimeout,
        headers: {
          'User-Agent': config.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          ...options.headers,
        },
        ...options,
      });
      
      return response.data;
    } catch (error) {
      lastError = error;
      console.warn(`Fetch attempt ${attempt} failed for ${url}:`, error.message);
      
      if (attempt < config.retryAttempts) {
        await delay(config.retryDelay * attempt);
      }
    }
  }
  
  throw lastError;
};

/**
 * Parse CV data from HTML
 */
const parseCVData = (html, source) => {
  const $ = cheerio.load(html);
  const cvData = [];
  
  // This is a template - actual selectors depend on each site's structure
  switch (source) {
    case 'JOBNET_MYANMAR':
      $('.cv-listing, .resume-item, .candidate-profile').each((i, elem) => {
        const cv = {
          name: $(elem).find('.name, .candidate-name, .profile-name').text().trim(),
          title: $(elem).find('.job-title, .current-position, .title').text().trim(),
          location: $(elem).find('.location, .city').text().trim(),
          experience: $(elem).find('.experience, .years').text().trim(),
          skills: $(elem).find('.skills, .skill-tags').text().trim().split(',').map(s => s.trim()),
          education: $(elem).find('.education').text().trim(),
          source: 'JOBNET_MYANMAR',
          scrapedAt: new Date(),
        };
        
        if (cv.name) cvData.push(cv);
      });
      break;
      
    case 'JOBS_IN_YANGON':
      $('.resume-card, .cv-entry').each((i, elem) => {
        const cv = {
          name: $(elem).find('.name').text().trim(),
          title: $(elem).find('.position').text().trim(),
          location: $(elem).find('.location').text().trim(),
          experience: $(elem).find('.experience').text().trim(),
          skills: [],
          source: 'JOBS_IN_YANGON',
          scrapedAt: new Date(),
        };
        
        $(elem).find('.skill').each((j, skill) => {
          cv.skills.push($(skill).text().trim());
        });
        
        if (cv.name) cvData.push(cv);
      });
      break;
      
    default:
      console.warn(`No parser implemented for source: ${source}`);
  }
  
  return cvData;
};

/**
 * Scrape CVs from a single source
 */
const scrapeSource = async (sourceKey, pageCount = 1) => {
  const source = SCRAPING_SOURCES[sourceKey];
  if (!source || !source.enabled) {
    console.log(`Source ${sourceKey} is disabled or not configured`);
    return { source: sourceKey, cvs: [], count: 0 };
  }
  
  console.log(`Starting scrape for ${source.name}...`);
  const allCVs = [];
  
  try {
    for (let page = 1; page <= pageCount; page++) {
      // Construct page URL (varies by site)
      const pageUrl = `${source.baseUrl}/resumes?page=${page}`;
      
      console.log(`Fetching page ${page}: ${pageUrl}`);
      const html = await fetchPage(pageUrl);
      
      // Parse CVs from page
      const cvs = parseCVData(html, sourceKey);
      allCVs.push(...cvs);
      
      console.log(`Found ${cvs.length} CVs on page ${page}`);
      
      // Respect rate limit
      if (page < pageCount) {
        await delay(source.rateLimit);
      }
    }
    
    // Save to database
    for (const cv of allCVs) {
      await saveCVToTalentPool(cv, sourceKey);
    }
    
    return {
      source: sourceKey,
      cvs: allCVs,
      count: allCVs.length,
    };
  } catch (error) {
    console.error(`Error scraping ${source.name}:`, error.message);
    return {
      source: sourceKey,
      cvs: allCVs,
      count: allCVs.length,
      error: error.message,
    };
  }
};

/**
 * Save scraped CV to talent pool
 */
const saveCVToTalentPool = async (cvData, source) => {
  try {
    // Check if already exists
    const existing = await TalentPool.findOne({
      'source.name': source,
      'source.externalId': cvData.externalId || cvData.name,
    });
    
    if (existing) {
      console.log(`CV already exists: ${cvData.name}`);
      return existing;
    }
    
    // Create talent pool entry
    const talentEntry = await TalentPool.create({
      fullName: cvData.name,
      currentTitle: cvData.title,
      location: cvData.location,
      experienceYears: parseExperience(cvData.experience),
      skills: cvData.skills || [],
      education: cvData.education ? [cvData.education] : [],
      source: {
        name: source,
        externalId: cvData.externalId || cvData.name,
        url: cvData.profileUrl,
        scrapedAt: cvData.scrapedAt,
      },
      status: 'new',
      isScraped: true,
      metadata: {
        rawData: cvData,
      },
    });
    
    return talentEntry;
  } catch (error) {
    console.error('Error saving CV to talent pool:', error.message);
    throw error;
  }
};

/**
 * Parse experience string to years
 */
const parseExperience = (experienceStr) => {
  if (!experienceStr) return null;
  
  const match = experienceStr.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
};

/**
 * Scrape all enabled sources
 */
const scrapeAllSources = async (pageCount = 1) => {
  const results = [];
  const sources = Object.keys(SCRAPING_SOURCES).filter(
    key => SCRAPING_SOURCES[key].enabled
  );
  
  console.log(`Starting scrape for ${sources.length} sources...`);
  
  for (const sourceKey of sources) {
    const result = await scrapeSource(sourceKey, pageCount);
    results.push(result);
    
    // Delay between sources
    await delay(2000);
  }
  
  const totalCVs = results.reduce((sum, r) => sum + r.count, 0);
  
  return {
    totalSources: sources.length,
    totalCVs,
    results,
  };
};

/**
 * Get scraping statistics
 */
const getScrapingStats = async () => {
  const stats = await TalentPool.aggregate([
    { $match: { isScraped: true } },
    {
      $group: {
        _id: '$source.name',
        count: { $sum: 1 },
        lastScraped: { $max: '$source.scrapedAt' },
      },
    },
    { $sort: { count: -1 } },
  ]);
  
  const totalScraped = await TalentPool.countDocuments({ isScraped: true });
  const totalNew = await TalentPool.countDocuments({ isScraped: true, status: 'new' });
  const totalProcessed = await TalentPool.countDocuments({ isScraped: true, status: 'processed' });
  
  return {
    totalScraped,
    totalNew,
    totalProcessed,
    bySource: stats,
  };
};

/**
 * Schedule regular scraping
 */
const scheduleScraping = async (intervalHours = 24) => {
  console.log(`Scheduling CV scraping every ${intervalHours} hours`);
  
  // Initial scrape
  await scrapeAllSources(5);
  
  // Schedule recurring
  setInterval(async () => {
    console.log('Running scheduled CV scraping...');
    await scrapeAllSources(5);
  }, intervalHours * 60 * 60 * 1000);
};

/**
 * Enrich scraped CV data with AI
 */
const enrichCVData = async (talentId) => {
  const talent = await TalentPool.findById(talentId);
  if (!talent) {
    throw new Error('Talent not found');
  }
  
  // Use AI to extract skills, categorize, etc.
  // This would integrate with your existing AI service
  
  // Example enrichment:
  const enrichedData = {
    skillCategories: categorizeSkills(talent.skills),
    experienceLevel: calculateExperienceLevel(talent.experienceYears),
    locationPreference: inferLocationPreference(talent.location),
    salaryExpectation: estimateSalaryExpectation(talent),
  };
  
  talent.enrichedData = enrichedData;
  talent.status = 'processed';
  await talent.save();
  
  return talent;
};

/**
 * Categorize skills
 */
const categorizeSkills = (skills) => {
  const categories = {
    technical: ['javascript', 'python', 'java', 'react', 'node', 'sql', 'aws'],
    soft: ['communication', 'leadership', 'teamwork', 'problem solving'],
    domain: ['finance', 'healthcare', 'retail', 'manufacturing'],
  };
  
  const result = {
    technical: [],
    soft: [],
    domain: [],
    other: [],
  };
  
  skills.forEach(skill => {
    const lowerSkill = skill.toLowerCase();
    let categorized = false;
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(k => lowerSkill.includes(k))) {
        result[category].push(skill);
        categorized = true;
        break;
      }
    }
    
    if (!categorized) {
      result.other.push(skill);
    }
  });
  
  return result;
};

/**
 * Calculate experience level
 */
const calculateExperienceLevel = (years) => {
  if (!years) return 'unknown';
  if (years < 2) return 'entry';
  if (years < 5) return 'mid';
  return 'senior';
};

/**
 * Infer location preference
 */
const inferLocationPreference = (location) => {
  if (!location) return 'unknown';
  
  const yangonKeywords = ['yangon', 'rangoon', 'ရန်ကုန်'];
  const mandalayKeywords = ['mandalay', 'မန္တလေး'];
  
  const lowerLocation = location.toLowerCase();
  
  if (yangonKeywords.some(k => lowerLocation.includes(k))) return 'yangon';
  if (mandalayKeywords.some(k => lowerLocation.includes(k))) return 'mandalay';
  
  return 'other';
};

/**
 * Estimate salary expectation
 */
const estimateSalaryExpectation = (talent) => {
  // Base salary by experience level (in MMK)
  const baseSalaries = {
    entry: 300000,
    mid: 600000,
    senior: 1200000,
    unknown: 400000,
  };
  
  const experienceLevel = calculateExperienceLevel(talent.experienceYears);
  let baseSalary = baseSalaries[experienceLevel];
  
  // Adjust based on skills
  const highDemandSkills = ['react', 'node', 'python', 'aws', 'devops'];
  const skillBonus = talent.skills.filter(s => 
    highDemandSkills.some(hds => s.toLowerCase().includes(hds))
  ).length * 50000;
  
  return baseSalary + skillBonus;
};

module.exports = {
  // Scraping
  scrapeSource,
  scrapeAllSources,
  scheduleScraping,
  
  // Statistics
  getScrapingStats,
  
  // Enrichment
  enrichCVData,
  
  // Configuration
  SCRAPING_SOURCES,
  config,
};

