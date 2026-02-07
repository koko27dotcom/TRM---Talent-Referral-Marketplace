# Market Analysis Documentation

## Overview

The Market Analysis module provides comprehensive insights into the Myanmar job market, including salary benchmarks, hiring trends, in-demand skills, and industry comparisons. It supports data-driven decision making for both referrers and corporate clients.

## Features

- 📊 **Market Trends**: Track job market trends over time
- 💰 **Salary Benchmarks**: Compare salaries across roles and industries
- 📈 **Hiring Velocity**: Monitor hiring speed and success rates
- 🎯 **Skill Analysis**: Identify in-demand skills
- 🏭 **Industry Comparison**: Compare different industries
- 📋 **Salary Surveys**: Collect and analyze salary data
- 🔮 **Salary Predictions**: AI-powered salary estimates

## Architecture

```
server/
├── services/
│   └── marketAnalysisService.js    # Core analysis logic
├── routes/
│   └── marketAnalysis.js           # API endpoints
└── models/
    ├── MarketTrend.js              # Trend data
    ├── SalaryBenchmark.js          # Salary data
    └── HiringVelocity.js           # Hiring metrics
```

## API Endpoints

### Market Trends

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/api/market/trends` | GET | Get market trends | Public |

**Query Parameters:**
- `industry`: Filter by industry
- `timeframe`: 7d, 30d, 90d, 1y
- `region`: Filter by region

### Salary Data

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/api/market/salary/benchmarks` | GET | Get salary benchmarks | Public |
| `/api/market/salary/stats` | GET | Get salary statistics | Public |
| `/api/market/salary/survey` | POST | Submit salary survey | User |
| `/api/market/salary/predict` | POST | Get salary prediction | Public |

### Job Market

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/api/market/jobs/overview` | GET | Job market overview | Public |
| `/api/market/jobs/top-paying` | GET | Top paying jobs | Public |
| `/api/market/jobs/in-demand-skills` | GET | In-demand skills | Public |
| `/api/market/jobs/industry-comparison` | GET | Industry comparison | Public |

### Hiring Data

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/api/market/hiring-velocity` | GET | Hiring velocity data | Public |

### Reports

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/api/market/report` | POST | Generate market report | Public |
| `/api/market/report/download` | GET | Download report | User |

## Data Models

### MarketTrend
```javascript
{
  date: Date,
  industry: String,
  region: String,
  metrics: {
    jobPostings: Number,
    applications: Number,
    hires: Number,
    averageTimeToHire: Number, // days
    averageReferralBonus: Number,
  },
  trends: {
    jobGrowth: Number, // percentage
    applicationGrowth: Number,
    hireGrowth: Number,
  }
}
```

### SalaryBenchmark
```javascript
{
  jobTitle: String,
  location: String,
  experienceLevel: String, // entry, mid, senior
  industry: String,
  minSalary: Number,
  maxSalary: Number,
  medianSalary: Number,
  percentile25: Number,
  percentile75: Number,
  sampleSize: Number,
  currency: String, // MMK
  updatedAt: Date
}
```

### HiringVelocity
```javascript
{
  companyId: ObjectId,
  industry: String,
  date: Date,
  metrics: {
    jobsPosted: Number,
    applicationsReceived: Number,
    interviewsConducted: Number,
    offersMade: Number,
    offersAccepted: Number,
  },
  velocity: {
    applicationsPerJob: Number,
    interviewRate: Number, // percentage
    offerRate: Number,
    acceptanceRate: Number,
    averageTimeToFill: Number, // days
  }
}
```

## Usage Examples

### Get Salary Statistics

```bash
curl "http://localhost:5000/api/market/salary/stats?jobTitle=Software+Engineer&location=Yangon"
```

Response:
```json
{
  "success": true,
  "data": {
    "avgSalary": 850000,
    "minSalary": 400000,
    "maxSalary": 2000000,
    "count": 156
  }
}
```

### Submit Salary Survey

```bash
curl -X POST http://localhost:5000/api/market/salary/survey \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobTitle": "Software Engineer",
    "location": "Yangon",
    "experienceYears": 3,
    "currentSalary": 800000,
    "industry": "Technology",
    "companySize": "50-200"
  }'
```

### Get Salary Prediction

```bash
curl -X POST http://localhost:5000/api/market/salary/predict \
  -H "Content-Type: application/json" \
  -d '{
    "jobTitle": "Software Engineer",
    "experienceYears": 4,
    "location": "Yangon",
    "skills": ["React", "Node.js", "AWS"]
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "predictedSalary": 950000,
    "baseSalary": 800000,
    "experienceAdjustment": 160000,
    "skillBonus": 75000,
    "confidence": "high",
    "basedOn": 42
  }
}
```

### Get Job Market Overview

```bash
curl "http://localhost:5000/api/market/jobs/overview?region=Yangon"
```

Response:
```json
{
  "success": true,
  "data": {
    "totalJobs": 1256,
    "jobsByCategory": [
      { "category": "Technology", "count": 423 },
      { "category": "Finance", "count": 312 }
    ],
    "jobsByLocation": [
      { "location": "Yangon", "count": 892 },
      { "location": "Mandalay", "count": 234 }
    ],
    "avgReferralBonus": 185000,
    "newJobsThisWeek": 67
  }
}
```

### Get In-Demand Skills

```bash
curl "http://localhost:5000/api/market/jobs/in-demand-skills?limit=10"
```

Response:
```json
{
  "success": true,
  "data": [
    { "skill": "JavaScript", "jobCount": 234, "avgReferralBonus": 195000 },
    { "skill": "Python", "jobCount": 189, "avgReferralBonus": 210000 },
    { "skill": "Sales", "jobCount": 156, "avgReferralBonus": 175000 }
  ]
}
```

### Generate Market Report

```bash
curl -X POST http://localhost:5000/api/market/report \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "Technology",
    "region": "Yangon",
    "timeframe": "30d"
  }'
```

## Market Insights

### Top Industries (by job volume)

1. Technology & IT
2. Finance & Banking
3. Manufacturing
4. Retail & Consumer Goods
5. Healthcare
6. Education
7. Hospitality
8. Construction

### Experience Level Distribution

| Level | Percentage | Avg Salary (MMK) |
|-------|------------|------------------|
| Entry (< 2 years) | 35% | 350,000 |
| Mid (2-5 years) | 45% | 750,000 |
| Senior (> 5 years) | 20% | 1,500,000 |

### Hot Skills 2024

**Technical:**
- JavaScript / TypeScript
- Python
- React / Vue.js
- Node.js
- AWS / Cloud
- Data Analysis
- Cybersecurity

**Business:**
- Digital Marketing
- Sales & Business Development
- Project Management
- Financial Analysis
- Supply Chain

### Location Analysis

| Location | Job Share | Avg Salary | Growth Rate |
|----------|-----------|------------|-------------|
| Yangon | 65% | 850,000 | +12% |
| Mandalay | 18% | 600,000 | +18% |
| Naypyitaw | 8% | 750,000 | +8% |
| Other | 9% | 450,000 | +15% |

## Salary Survey Methodology

### Data Collection
1. Anonymous user submissions
2. Job posting analysis
3. Corporate reporting
4. Third-party data partnerships

### Validation
- Minimum sample size: 10 entries
- Outlier detection and removal
- Regular data freshness checks
- Cross-reference with multiple sources

### Privacy
- Individual data never exposed
- Only aggregated statistics shown
- Opt-out option for users
- Data retention: 2 years

## Implementation Guide

### Adding Salary Data (Admin)

```javascript
const marketAnalysisService = require('./services/marketAnalysisService.js');

// Add benchmark
await marketAnalysisService.addSalaryBenchmark({
  jobTitle: 'Software Engineer',
  location: 'Yangon',
  experienceLevel: 'mid',
  industry: 'Technology',
  minSalary: 600000,
  maxSalary: 1200000,
  medianSalary: 850000,
  sampleSize: 45
});
```

### Recording Market Trends

```javascript
// Record daily trend
await MarketTrend.create({
  date: new Date(),
  industry: 'Technology',
  region: 'Yangon',
  metrics: {
    jobPostings: 45,
    applications: 234,
    hires: 12,
    averageTimeToHire: 21,
    averageReferralBonus: 195000
  }
});
```

## Frontend Integration

### Salary Calculator Component
```javascript
const calculateSalary = async () => {
  const response = await fetch('/api/market/salary/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobTitle,
      experienceYears,
      location,
      skills
    })
  });
  
  const { data } = await response.json();
  setPredictedSalary(data.predictedSalary);
};
```

### Market Trends Chart
```javascript
const fetchTrends = async () => {
  const response = await fetch('/api/market/trends?timeframe=30d');
  const { data } = await response.json();
  
  // Render chart with trend data
  renderChart(data);
};
```

## Analytics Dashboard

### Key Metrics
- Total active jobs
- Average time to fill
- Application rate
- Interview conversion rate
- Offer acceptance rate
- Referral success rate

### Trends
- Job posting trends
- Salary growth by role
- Skill demand changes
- Industry growth rates

## Future Enhancements

- [ ] Real-time market alerts
- [ ] Competitor analysis
- [ ] Salary negotiation guide
- [ ] Cost of living adjustments
- [ ] Remote work impact analysis
- [ ] AI-powered market predictions
- [ ] Custom report builder
- [ ] Export to Excel/PDF
- [ ] API access for enterprise clients

## Data Sources

1. **Internal**: Platform job postings, applications, hires
2. **User Surveys**: Anonymous salary submissions
3. **Public Data**: Government labor statistics
4. **Partnerships**: Industry associations
5. **Third-party**: Market research firms

## Compliance

### Data Accuracy
- Regular audits
- Source attribution
- Confidence intervals
- Update frequency: Weekly

### Legal
- Myanmar labor law compliance
- Data protection regulations
- Transparency in methodology
- User consent for data usage
