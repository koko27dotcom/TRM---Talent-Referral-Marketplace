/**
 * TalentScraperService
 * Advanced scraping service for LinkedIn, Facebook, and Job.com.mm
 * Implements stealth mode, proxy rotation, and rate limiting
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
const { executablePath } = require('puppeteer');
const TalentPool = require('../models/TalentPool.js');
const CandidateSource = require('../models/CandidateSource.js');
const { AuditLog } = require('../models/index.js');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

/**
 * Service class for scraping candidate profiles from various sources
 */
class TalentScraperService {
  constructor() {
    this.browser = null;
    this.activeScrapes = new Map();
    this.proxyRotation = new Map();
    this.rateLimiters = new Map();
  }

  /**
   * Initialize browser instance
   */
  async initBrowser(proxy = null) {
    const launchOptions = {
      headless: true,
      executablePath: executablePath(),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled',
      ],
    };

    if (proxy) {
      launchOptions.args.push(`--proxy-server=${proxy.protocol}://${proxy.host}:${proxy.port}`);
    }

    this.browser = await puppeteer.launch(launchOptions);
    return this.browser;
  }

  /**
   * Close browser instance
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Apply rate limiting
   */
  async applyRateLimit(sourceId, config) {
    const now = Date.now();
    const limiter = this.rateLimiters.get(sourceId) || { lastRequest: 0, requestCount: 0 };
    
    const delay = config.randomizeDelay 
      ? config.delayBetweenRequests + (Math.random() * config.delayVariance * 2 - config.delayVariance)
      : config.delayBetweenRequests;
    
    const timeSinceLastRequest = now - limiter.lastRequest;
    if (timeSinceLastRequest < delay) {
      await new Promise(resolve => setTimeout(resolve, delay - timeSinceLastRequest));
    }
    
    limiter.lastRequest = Date.now();
    limiter.requestCount++;
    this.rateLimiters.set(sourceId, limiter);
  }

  /**
   * Get next proxy from rotation
   */
  getNextProxy(sourceId, proxies) {
    if (!proxies || proxies.length === 0) return null;
    
    const rotation = this.proxyRotation.get(sourceId) || { index: 0 };
    const activeProxies = proxies.filter(p => p.isActive);
    
    if (activeProxies.length === 0) return null;
    
    const proxy = activeProxies[rotation.index % activeProxies.length];
    rotation.index = (rotation.index + 1) % activeProxies.length;
    this.proxyRotation.set(sourceId, rotation);
    
    return proxy;
  }

  /**
   * Scrape LinkedIn profiles
   */
  async scrapeLinkedIn(sourceId, config, userId) {
    const source = await CandidateSource.findById(sourceId);
    if (!source) throw new Error('Source not found');

    const runHistory = {
      startedAt: new Date(),
      status: 'running',
      candidatesFound: 0,
      candidatesAdded: 0,
      duplicatesSkipped: 0,
      errors: [],
      pagesScraped: 0,
      triggeredBy: 'manual',
      triggeredByUser: userId,
    };

    try {
      const proxy = this.getNextProxy(sourceId, source.proxySettings?.proxies);
      await this.initBrowser(proxy);
      
      const page = await this.browser.newPage();
      
      // Set user agent and viewport
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Navigate to LinkedIn
      await page.goto('https://www.linkedin.com', { waitUntil: 'networkidle2' });
      
      // Check if login required
      const loginButton = await page.$('.nav__button-secondary');
      if (loginButton) {
        runHistory.errors.push({
          message: 'LinkedIn login required - manual authentication needed',
          timestamp: new Date(),
        });
        throw new Error('Authentication required for LinkedIn');
      }

      const candidates = [];
      const searchKeywords = config.searchKeywords?.join(' ') || 'software engineer';
      const locations = config.locations?.join(',') || 'Myanmar';
      
      // Build search URL
      const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(searchKeywords)}&location=${encodeURIComponent(locations)}`;
      
      for (let pageNum = 1; pageNum <= (config.maxPages || 10); pageNum++) {
        try {
          await this.applyRateLimit(sourceId, source.rateLimitConfig);
          
          const pageUrl = `${searchUrl}&page=${pageNum}`;
          await page.goto(pageUrl, { waitUntil: 'networkidle2' });
          
          // Wait for results to load
          await page.waitForSelector('.reusable-search__result-container', { timeout: 10000 });
          
          // Extract profile data
          const pageCandidates = await page.evaluate(() => {
            const results = [];
            const cards = document.querySelectorAll('.reusable-search__result-container');
            
            cards.forEach(card => {
              try {
                const nameEl = card.querySelector('.entity-result__title-text a span[aria-hidden="true"]');
                const titleEl = card.querySelector('.entity-result__primary-subtitle');
                const companyEl = card.querySelector('.entity-result__secondary-subtitle');
                const locationEl = card.querySelector('.entity-result__simple-insight-text');
                const linkEl = card.querySelector('.entity-result__title-text a');
                
                if (nameEl && titleEl) {
                  results.push({
                    name: nameEl.textContent.trim(),
                    currentTitle: titleEl.textContent.trim(),
                    currentCompany: companyEl?.textContent.trim() || '',
                    location: locationEl?.textContent.trim() || '',
                    profileUrl: linkEl?.href || '',
                  });
                }
              } catch (e) {
                console.error('Error parsing card:', e);
              }
            });
            
            return results;
          });
          
          candidates.push(...pageCandidates);
          runHistory.pagesScraped++;
          runHistory.candidatesFound += pageCandidates.length;
          
          // Save candidates to database
          for (const candidate of pageCandidates) {
            try {
              const existing = await TalentPool.findOne({ 
                $or: [
                  { profileUrl: candidate.profileUrl },
                  { name: candidate.name, currentCompany: candidate.currentCompany }
                ]
              });
              
              if (!existing) {
                await TalentPool.create({
                  name: candidate.name,
                  currentTitle: candidate.currentTitle,
                  currentCompany: candidate.currentCompany,
                  location: { city: candidate.location },
                  profileUrl: candidate.profileUrl,
                  source: 'linkedin',
                  sourceId: sourceId,
                  contactStatus: 'not_contacted',
                  createdBy: userId,
                });
                runHistory.candidatesAdded++;
              } else {
                runHistory.duplicatesSkipped++;
              }
            } catch (err) {
              runHistory.errors.push({
                message: err.message,
                timestamp: new Date(),
              });
            }
          }
          
        } catch (err) {
          runHistory.errors.push({
            message: `Page ${pageNum} error: ${err.message}`,
            timestamp: new Date(),
            url: page.url(),
          });
        }
      }
      
      runHistory.status = 'completed';
      runHistory.completedAt = new Date();
      
    } catch (err) {
      runHistory.status = 'failed';
      runHistory.errors.push({
        message: err.message,
        timestamp: new Date(),
      });
      throw err;
    } finally {
      await this.closeBrowser();
      await source.addRunHistory(runHistory);
      
      // Log audit
      await AuditLog.create({
        action: 'SCRAPE_COMPLETED',
        entity: 'CandidateSource',
        entityId: sourceId,
        userId: userId,
        details: runHistory,
      });
    }
    
    return runHistory;
  }

  /**
   * Scrape Facebook profiles
   */
  async scrapeFacebook(sourceId, config, userId) {
    const source = await CandidateSource.findById(sourceId);
    if (!source) throw new Error('Source not found');

    const runHistory = {
      startedAt: new Date(),
      status: 'running',
      candidatesFound: 0,
      candidatesAdded: 0,
      duplicatesSkipped: 0,
      errors: [],
      pagesScraped: 0,
      triggeredBy: 'manual',
      triggeredByUser: userId,
    };

    try {
      const proxy = this.getNextProxy(sourceId, source.proxySettings?.proxies);
      await this.initBrowser(proxy);
      
      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Note: Facebook scraping is more restricted
      // This is a simplified implementation
      
      runHistory.status = 'completed';
      runHistory.completedAt = new Date();
      
    } catch (err) {
      runHistory.status = 'failed';
      runHistory.errors.push({
        message: err.message,
        timestamp: new Date(),
      });
      throw err;
    } finally {
      await this.closeBrowser();
      await source.addRunHistory(runHistory);
    }
    
    return runHistory;
  }

  /**
   * Scrape Job.com.mm profiles
   */
  async scrapeJobComMm(sourceId, config, userId) {
    const source = await CandidateSource.findById(sourceId);
    if (!source) throw new Error('Source not found');

    const runHistory = {
      startedAt: new Date(),
      status: 'running',
      candidatesFound: 0,
      candidatesAdded: 0,
      duplicatesSkipped: 0,
      errors: [],
      pagesScraped: 0,
      triggeredBy: 'manual',
      triggeredByUser: userId,
    };

    try {
      const proxy = this.getNextProxy(sourceId, source.proxySettings?.proxies);
      await this.initBrowser(proxy);
      
      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      
      const searchKeywords = config.searchKeywords?.join(' ') || '';
      const baseUrl = 'https://www.job.com.mm';
      
      for (let pageNum = 1; pageNum <= (config.maxPages || 10); pageNum++) {
        try {
          await this.applyRateLimit(sourceId, source.rateLimitConfig);
          
          const searchUrl = `${baseUrl}/jobs?page=${pageNum}&q=${encodeURIComponent(searchKeywords)}`;
          await page.goto(searchUrl, { waitUntil: 'networkidle2' });
          
          // Extract job listings and company info
          const pageData = await page.evaluate(() => {
            const results = [];
            const jobCards = document.querySelectorAll('.job-item, .job-listing, [data-job-id]');
            
            jobCards.forEach(card => {
              try {
                const titleEl = card.querySelector('.job-title, h2, h3');
                const companyEl = card.querySelector('.company-name, .employer-name');
                const locationEl = card.querySelector('.location, .job-location');
                
                if (titleEl) {
                  results.push({
                    currentTitle: titleEl.textContent.trim(),
                    currentCompany: companyEl?.textContent.trim() || '',
                    location: locationEl?.textContent.trim() || '',
                  });
                }
              } catch (e) {
                console.error('Error parsing card:', e);
              }
            });
            
            return results;
          });
          
          runHistory.pagesScraped++;
          runHistory.candidatesFound += pageData.length;
          
          // Save to database
          for (const data of pageData) {
            try {
              const existing = await TalentPool.findOne({
                currentTitle: data.currentTitle,
                currentCompany: data.currentCompany,
              });
              
              if (!existing) {
                await TalentPool.create({
                  currentTitle: data.currentTitle,
                  currentCompany: data.currentCompany,
                  location: { city: data.location },
                  source: 'job.com.mm',
                  sourceId: sourceId,
                  contactStatus: 'not_contacted',
                  createdBy: userId,
                });
                runHistory.candidatesAdded++;
              } else {
                runHistory.duplicatesSkipped++;
              }
            } catch (err) {
              runHistory.errors.push({
                message: err.message,
                timestamp: new Date(),
              });
            }
          }
          
        } catch (err) {
          runHistory.errors.push({
            message: `Page ${pageNum} error: ${err.message}`,
            timestamp: new Date(),
          });
        }
      }
      
      runHistory.status = 'completed';
      runHistory.completedAt = new Date();
      
    } catch (err) {
      runHistory.status = 'failed';
      runHistory.errors.push({
        message: err.message,
        timestamp: new Date(),
      });
      throw err;
    } finally {
      await this.closeBrowser();
      await source.addRunHistory(runHistory);
      
      await AuditLog.create({
        action: 'SCRAPE_COMPLETED',
        entity: 'CandidateSource',
        entityId: sourceId,
        userId: userId,
        details: runHistory,
      });
    }
    
    return runHistory;
  }

  /**
   * Main scrape method - routes to appropriate platform scraper
   */
  async scrape(sourceId, userId) {
    const source = await CandidateSource.findById(sourceId);
    if (!source) throw new Error('Source not found');
    
    if (this.activeScrapes.has(sourceId)) {
      throw new Error('Scrape already in progress for this source');
    }
    
    this.activeScrapes.set(sourceId, { startedAt: new Date(), userId });
    
    try {
      let result;
      
      switch (source.platform) {
        case 'linkedin':
          result = await this.scrapeLinkedIn(sourceId, source.config, userId);
          break;
        case 'facebook':
          result = await this.scrapeFacebook(sourceId, source.config, userId);
          break;
        case 'job.com.mm':
          result = await this.scrapeJobComMm(sourceId, source.config, userId);
          break;
        default:
          throw new Error(`Unsupported platform: ${source.platform}`);
      }
      
      return result;
    } finally {
      this.activeScrapes.delete(sourceId);
    }
  }

  /**
   * Get active scrape status
   */
  getActiveScrapeStatus(sourceId) {
    return this.activeScrapes.get(sourceId) || null;
  }

  /**
   * Stop active scrape
   */
  async stopScrape(sourceId) {
    const activeScrape = this.activeScrapes.get(sourceId);
    if (!activeScrape) return false;
    
    await this.closeBrowser();
    this.activeScrapes.delete(sourceId);
    
    return true;
  }

  /**
   * Import candidates from CSV/JSON
   */
  async importCandidates(data, sourceId, userId) {
    const results = {
      total: data.length,
      added: 0,
      duplicates: 0,
      errors: [],
    };

    for (const candidate of data) {
      try {
        // Validate required fields
        if (!candidate.name) {
          results.errors.push({ candidate, error: 'Name is required' });
          continue;
        }

        // Check for duplicates
        const existing = await TalentPool.findOne({
          $or: [
            { email: candidate.email },
            { phone: candidate.phone },
            { profileUrl: candidate.profileUrl },
          ].filter(Boolean),
        });

        if (existing) {
          results.duplicates++;
          continue;
        }

        // Create candidate
        await TalentPool.create({
          ...candidate,
          source: 'import',
          sourceId: sourceId,
          createdBy: userId,
        });

        results.added++;
      } catch (err) {
        results.errors.push({ candidate, error: err.message });
      }
    }

    return results;
  }
}

// Export singleton instance
const talentScraperService = new TalentScraperService();
module.exports = TalentScraperService;
