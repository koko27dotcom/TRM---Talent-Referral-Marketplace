# CV Scraping Service Documentation

## Overview

The CV Scraping Service is designed to collect candidate profiles from various job portals in Myanmar, targeting **100,000 CVs** to build a comprehensive talent pool for the referral platform.

## Architecture

```
server/
├── services/
│   └── cvScrapingService.js    # Core scraping logic
├── routes/
│   └── cvScraping.js           # API endpoints
├── models/
│   ├── CandidateSource.js      # Source configurations
│   └── TalentPool.js           # Scraped candidate storage
└── cron/
    └── scrapingCron.js         # Scheduled scraping jobs
```

## Supported Sources

| Source | URL | Status | Rate Limit |
|--------|-----|--------|------------|
| JobNet Myanmar | jobnet.com.mm | Active | 1 req/sec |
| Jobs in Yangon | jobsinyangon.com | Active | 1 req/sec |
| Myanmar Jobs DB | myanmarjobsdb.com | Active | 1 req/sec |
| CareerJet Myanmar | careerjet.com.mm | Active | 1.5 req/sec |
| LinkedIn | linkedin.com | Inactive | 2 req/sec |

## Features

### 1. Multi-Source Scraping
- Concurrent scraping from multiple job portals
- Configurable rate limiting per source
- Automatic retry on failure

### 2. Data Enrichment
- AI-powered skill categorization
- Experience level calculation
- Location preference inference
- Salary expectation estimation

### 3. Duplicate Detection
- Prevents duplicate entries
- Updates existing profiles
- Tracks source changes

### 4. Scheduled Operations
- Automated daily scraping
- Configurable intervals
- Background processing

## API Endpoints

### Admin Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cv-scraping/scrape` | POST | Scrape all sources |
| `/api/cv-scraping/scrape/:source` | POST | Scrape specific source |
| `/api/cv-scraping/stats` | GET | Get scraping statistics |
| `/api/cv-scraping/sources` | GET | List available sources |
| `/api/cv-scraping/enrich/:talentId` | POST | Enrich CV data |
| `/api/cv-scraping/schedule` | POST | Schedule regular scraping |

## Data Model

### TalentPool Entry
```javascript
{
  fullName: String,
  currentTitle: String,
  location: String,
  experienceYears: Number,
  skills: [String],
  education: [String],
  source: {
    name: String,
    externalId: String,
    url: String,
    scrapedAt: Date
  },
  enrichedData: {
    skillCategories: {
      technical: [String],
      soft: [String],
      domain: [String],
      other: [String]
    },
    experienceLevel: String, // entry, mid, senior
    locationPreference: String,
    salaryExpectation: Number
  },
  status: String, // new, processed, contacted, converted
  isScraped: Boolean,
  metadata: {
    rawData: Object
  }
}
```

## Configuration

### Environment Variables
```bash
# Scraping Settings
SCRAPING_ENABLED=true
SCRAPING_MAX_CONCURRENT=5
SCRAPING_REQUEST_TIMEOUT=30000
SCRAPING_RETRY_ATTEMPTS=3
SCRAPING_RETRY_DELAY=5000

# User Agent
SCRAPING_USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
```

### Source Configuration
```javascript
const SCRAPING_SOURCES = {
  JOBNET_MYANMAR: {
    name: 'JobNet Myanmar',
    baseUrl: 'https://www.jobnet.com.mm',
    enabled: true,
    rateLimit: 1000,
    selectors: {
      name: '.candidate-name',
      title: '.job-title',
      location: '.location',
      experience: '.experience',
      skills: '.skills'
    }
  }
};
```

## Usage Examples

### Scrape All Sources
```bash
curl -X POST http://localhost:5000/api/cv-scraping/scrape \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"pageCount": 5}'
```

Response:
```json
{
  "success": true,
  "data": {
    "totalSources": 4,
    "totalCVs": 156,
    "results": [
      {
        "source": "JOBNET_MYANMAR",
        "count": 45,
        "cvs": [...]
      }
    ]
  }
}
```

### Scrape Specific Source
```bash
curl -X POST http://localhost:5000/api/cv-scraping/scrape/JOBNET_MYANMAR \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"pageCount": 3}'
```

### Get Statistics
```bash
curl http://localhost:5000/api/cv-scraping/stats \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "totalScraped": 10047,
    "totalNew": 5234,
    "totalProcessed": 4813,
    "bySource": [
      {
        "_id": "JOBNET_MYANMAR",
        "count": 4523,
        "lastScraped": "2026-02-05T10:30:00Z"
      }
    ]
  }
}
```

### Enrich CV Data
```bash
curl -X POST http://localhost:5000/api/cv-scraping/enrich/65abc123 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## Scraping Process

### 1. Fetch Page
```javascript
const html = await fetchPage(pageUrl);
```

### 2. Parse Data
```javascript
const cvs = parseCVData(html, sourceKey);
```

### 3. Save to Database
```javascript
for (const cv of cvs) {
  await saveCVToTalentPool(cv, sourceKey);
}
```

### 4. Enrich Data
```javascript
await enrichCVData(talentId);
```

## Data Enrichment

### Skill Categorization
```javascript
const categories = {
  technical: ['javascript', 'python', 'java', 'react', 'node', 'sql', 'aws'],
  soft: ['communication', 'leadership', 'teamwork'],
  domain: ['finance', 'healthcare', 'retail', 'manufacturing'],
  other: []
};
```

### Experience Level
- **Entry**: < 2 years
- **Mid**: 2-5 years
- **Senior**: > 5 years

### Salary Estimation
```javascript
const baseSalaries = {
  entry: 300000,    // MMK
  mid: 600000,
  senior: 1200000,
  unknown: 400000
};

// + 50,000 MMK per high-demand skill
```

## Rate Limiting & Ethics

### Best Practices
1. **Respect robots.txt**: Check before scraping
2. **Rate limiting**: Max 1 request per second per source
3. **User-Agent**: Identify your bot properly
4. **Caching**: Don't scrape same pages repeatedly
5. **Off-peak hours**: Schedule scraping during low traffic

### Rate Limits
```javascript
const rateLimits = {
  JOBNET_MYANMAR: 1000,      // 1 second
  JOBS_IN_YANGON: 1000,      // 1 second
  MYANMAR_JOBS_DB: 1000,     // 1 second
  CAREER_JET: 1500,          // 1.5 seconds
  LINKEDIN: 2000             // 2 seconds
};
```

## Scheduled Scraping

### Setup
```javascript
// Schedule daily scraping at 2 AM
cvScrapingService.scheduleScraping(24);
```

### Cron Job
```javascript
// server/cron/scrapingCron.js
const cron = require('node-cron');
const cvScrapingService = require('../services/cvScrapingService.js');

// Run every day at 2:00 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Starting scheduled CV scraping...');
  await cvScrapingService.scrapeAllSources(5);
});
```

## Statistics & Monitoring

### Key Metrics
- Total CVs scraped
- New CVs per day
- Processing rate
- Source distribution
- Data quality score

### Dashboard
```javascript
const stats = await cvScrapingService.getScrapingStats();
```

## Legal Considerations

### Compliance
1. **Terms of Service**: Review each site's ToS
2. **Data Privacy**: Comply with local data protection laws
3. **Opt-out**: Respect candidate removal requests
4. **Attribution**: Credit data sources where required

### Data Usage
- Scraped data is for internal platform use only
- Not for resale or redistribution
- Candidates can request profile removal
- Regular data freshness checks

## Troubleshooting

### Common Issues

1. **403 Forbidden**
   - Check User-Agent
   - Verify IP not blocked
   - Reduce request frequency

2. **Parse Errors**
   - Site structure changed
   - Update CSS selectors
   - Check for JavaScript-rendered content

3. **Duplicate Entries**
   - Verify externalId uniqueness
   - Check normalization logic
   - Review matching algorithm

### Debug Mode
```bash
DEBUG=scraping npm run dev
```

## Future Enhancements

- [ ] Puppeteer/Playwright for JS-rendered sites
- [ ] Machine learning for better parsing
- [ ] Real-time scraping notifications
- [ ] Candidate matching algorithm
- [ ] Automated outreach to scraped candidates
- [ ] Resume parsing from PDFs
- [ ] LinkedIn Sales Navigator integration
- [ ] API integrations with job boards

## Performance Targets

| Metric | Target |
|--------|--------|
| Total CVs | 100,000 |
| Daily New CVs | 500-1000 |
| Processing Rate | > 95% |
| Data Quality Score | > 85% |
| Uptime | 99.5% |
