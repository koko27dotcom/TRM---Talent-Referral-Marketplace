/**
 * Market Seeder
 * Seeds sample market trends and salary benchmarks
 */

const mongoose = require('mongoose');
const MarketTrend = require('../models/MarketTrend.js');
const SalaryBenchmark = require('../models/SalaryBenchmark.js');
const { connectDatabase } = require('../config/database.js');

// Helper to generate date range
function getDates(daysBack) {
  const dates = [];
  for (let i = daysBack; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date);
  }
  return dates;
}

const sampleMarketTrends = [];

// Generate 30 days of market trends
const dates = getDates(30);

const jobCategories = [
  'Software Development',
  'Data Science',
  'Design',
  'Marketing',
  'Sales',
  'Finance',
  'Human Resources',
  'Operations',
  'Customer Support',
  'Product Management',
];

const locations = ['Yangon', 'Mandalay', 'Naypyitaw', 'Remote'];

// Generate trends for each category
jobCategories.forEach(category => {
  dates.forEach((date, index) => {
    const baseJobs = Math.floor(Math.random() * 50) + 20;
    const growthFactor = 1 + (index * 0.02); // Slight upward trend
    
    sampleMarketTrends.push({
      date,
      category,
      totalJobs: Math.floor(baseJobs * growthFactor),
      newJobs: Math.floor(Math.random() * 10) + 1,
      closedJobs: Math.floor(Math.random() * 5),
      averageSalary: Math.floor(Math.random() * 1000000) + 500000,
      medianSalary: Math.floor(Math.random() * 800000) + 400000,
      salaryRange: {
        min: Math.floor(Math.random() * 300000) + 200000,
        max: Math.floor(Math.random() * 2000000) + 1000000,
      },
      topSkills: [
        { name: 'JavaScript', demand: Math.floor(Math.random() * 100) },
        { name: 'Python', demand: Math.floor(Math.random() * 100) },
        { name: 'React', demand: Math.floor(Math.random() * 100) },
        { name: 'Node.js', demand: Math.floor(Math.random() * 100) },
        { name: 'SQL', demand: Math.floor(Math.random() * 100) },
      ].sort((a, b) => b.demand - a.demand).slice(0, 5),
      demandTrend: Math.random() > 0.5 ? 'up' : 'stable',
      locationDistribution: locations.map(loc => ({
        location: loc,
        count: Math.floor(Math.random() * 20),
        percentage: Math.floor(Math.random() * 100),
      })),
      experienceLevelDistribution: [
        { level: 'entry', count: Math.floor(Math.random() * 15), percentage: 30 },
        { level: 'mid', count: Math.floor(Math.random() * 20), percentage: 50 },
        { level: 'senior', count: Math.floor(Math.random() * 10), percentage: 20 },
      ],
      metadata: {
        source: 'platform',
        confidence: 0.85,
        sampleSize: Math.floor(Math.random() * 100) + 50,
      },
    });
  });
});

const sampleSalaryBenchmarks = [
  {
    jobTitle: 'Software Engineer',
    category: 'Software Development',
    experienceLevel: 'entry',
    location: 'Yangon',
    industry: 'Technology',
    companySize: 'medium',
    salary: {
      min: 400000,
      max: 800000,
      median: 600000,
      average: 620000,
      currency: 'MMK',
    },
    bonus: {
      min: 0,
      max: 100000,
      median: 50000,
      frequency: 'yearly',
    },
    benefits: ['Health Insurance', 'Transportation Allowance', 'Meal Allowance'],
    skills: ['JavaScript', 'React', 'Node.js', 'Git'],
    dataPoints: 45,
    lastUpdated: new Date(),
    trend: 'up',
    trendPercentage: 5.2,
    period: {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31'),
    },
  },
  {
    jobTitle: 'Senior Software Engineer',
    category: 'Software Development',
    experienceLevel: 'senior',
    location: 'Yangon',
    industry: 'Technology',
    companySize: 'large',
    salary: {
      min: 1200000,
      max: 2500000,
      median: 1800000,
      average: 1850000,
      currency: 'MMK',
    },
    bonus: {
      min: 100000,
      max: 500000,
      median: 250000,
      frequency: 'yearly',
    },
    benefits: ['Health Insurance', 'Transportation Allowance', 'Meal Allowance', 'Stock Options'],
    skills: ['JavaScript', 'React', 'Node.js', 'AWS', 'System Design'],
    dataPoints: 32,
    lastUpdated: new Date(),
    trend: 'up',
    trendPercentage: 8.5,
    period: {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31'),
    },
  },
  {
    jobTitle: 'Data Analyst',
    category: 'Data Science',
    experienceLevel: 'mid',
    location: 'Yangon',
    industry: 'Technology',
    companySize: 'medium',
    salary: {
      min: 600000,
      max: 1200000,
      median: 900000,
      average: 920000,
      currency: 'MMK',
    },
    bonus: {
      min: 0,
      max: 150000,
      median: 75000,
      frequency: 'yearly',
    },
    benefits: ['Health Insurance', 'Transportation Allowance'],
    skills: ['Python', 'SQL', 'Tableau', 'Excel'],
    dataPoints: 28,
    lastUpdated: new Date(),
    trend: 'up',
    trendPercentage: 12.3,
    period: {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31'),
    },
  },
  {
    jobTitle: 'UI/UX Designer',
    category: 'Design',
    experienceLevel: 'mid',
    location: 'Yangon',
    industry: 'Technology',
    companySize: 'small',
    salary: {
      min: 500000,
      max: 1000000,
      median: 750000,
      average: 780000,
      currency: 'MMK',
    },
    bonus: {
      min: 0,
      max: 100000,
      median: 50000,
      frequency: 'yearly',
    },
    benefits: ['Health Insurance', 'Flexible Hours'],
    skills: ['Figma', 'Adobe XD', 'Photoshop', 'User Research'],
    dataPoints: 22,
    lastUpdated: new Date(),
    trend: 'stable',
    trendPercentage: 2.1,
    period: {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31'),
    },
  },
  {
    jobTitle: 'Digital Marketing Manager',
    category: 'Marketing',
    experienceLevel: 'senior',
    location: 'Yangon',
    industry: 'E-commerce',
    companySize: 'medium',
    salary: {
      min: 1000000,
      max: 2000000,
      median: 1500000,
      average: 1550000,
      currency: 'MMK',
    },
    bonus: {
      min: 50000,
      max: 300000,
      median: 150000,
      frequency: 'quarterly',
    },
    benefits: ['Health Insurance', 'Transportation Allowance', 'Performance Bonus'],
    skills: ['SEO', 'Google Ads', 'Facebook Ads', 'Content Strategy', 'Analytics'],
    dataPoints: 18,
    lastUpdated: new Date(),
    trend: 'up',
    trendPercentage: 6.8,
    period: {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31'),
    },
  },
  {
    jobTitle: 'Sales Executive',
    category: 'Sales',
    experienceLevel: 'entry',
    location: 'Mandalay',
    industry: 'Telecommunications',
    companySize: 'large',
    salary: {
      min: 300000,
      max: 600000,
      median: 450000,
      average: 460000,
      currency: 'MMK',
    },
    bonus: {
      min: 50000,
      max: 200000,
      median: 100000,
      frequency: 'monthly',
    },
    benefits: ['Health Insurance', 'Commission', 'Phone Allowance'],
    skills: ['Communication', 'Negotiation', 'CRM', 'Presentation'],
    dataPoints: 35,
    lastUpdated: new Date(),
    trend: 'stable',
    trendPercentage: 1.5,
    period: {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31'),
    },
  },
  {
    jobTitle: 'Accountant',
    category: 'Finance',
    experienceLevel: 'mid',
    location: 'Yangon',
    industry: 'Finance',
    companySize: 'medium',
    salary: {
      min: 500000,
      max: 1000000,
      median: 750000,
      average: 780000,
      currency: 'MMK',
    },
    bonus: {
      min: 0,
      max: 150000,
      median: 75000,
      frequency: 'yearly',
    },
    benefits: ['Health Insurance', 'Transportation Allowance'],
    skills: ['Accounting', 'Excel', 'QuickBooks', 'Financial Analysis'],
    dataPoints: 40,
    lastUpdated: new Date(),
    trend: 'stable',
    trendPercentage: 3.2,
    period: {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31'),
    },
  },
  {
    jobTitle: 'HR Manager',
    category: 'Human Resources',
    experienceLevel: 'senior',
    location: 'Yangon',
    industry: 'Technology',
    companySize: 'large',
    salary: {
      min: 1200000,
      max: 2500000,
      median: 1800000,
      average: 1900000,
      currency: 'MMK',
    },
    bonus: {
      min: 100000,
      max: 400000,
      median: 200000,
      frequency: 'yearly',
    },
    benefits: ['Health Insurance', 'Transportation Allowance', 'Meal Allowance', 'Training Budget'],
    skills: ['Recruitment', 'Employee Relations', 'HRIS', 'Performance Management'],
    dataPoints: 25,
    lastUpdated: new Date(),
    trend: 'up',
    trendPercentage: 4.5,
    period: {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31'),
    },
  },
  {
    jobTitle: 'Customer Support Representative',
    category: 'Customer Support',
    experienceLevel: 'entry',
    location: 'Yangon',
    industry: 'BPO',
    companySize: 'large',
    salary: {
      min: 250000,
      max: 500000,
      median: 375000,
      average: 380000,
      currency: 'MMK',
    },
    bonus: {
      min: 0,
      max: 50000,
      median: 25000,
      frequency: 'monthly',
    },
    benefits: ['Health Insurance', 'Night Shift Allowance', 'Transportation'],
    skills: ['Communication', 'Problem Solving', 'CRM', 'English'],
    dataPoints: 50,
    lastUpdated: new Date(),
    trend: 'up',
    trendPercentage: 7.2,
    period: {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31'),
    },
  },
  {
    jobTitle: 'Product Manager',
    category: 'Product Management',
    experienceLevel: 'senior',
    location: 'Yangon',
    industry: 'Technology',
    companySize: 'startup',
    salary: {
      min: 1500000,
      max: 3500000,
      median: 2500000,
      average: 2600000,
      currency: 'MMK',
    },
    bonus: {
      min: 200000,
      max: 1000000,
      median: 500000,
      frequency: 'yearly',
    },
    benefits: ['Health Insurance', 'Stock Options', 'Flexible Hours', 'Remote Work'],
    skills: ['Product Strategy', 'Agile', 'Data Analysis', 'User Research', 'Stakeholder Management'],
    dataPoints: 15,
    lastUpdated: new Date(),
    trend: 'up',
    trendPercentage: 15.5,
    period: {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31'),
    },
  },
];

async function seedMarket() {
  try {
    console.log('Connecting to database...');
    await connectDatabase();

    console.log('Clearing existing market data...');
    await MarketTrend.deleteMany({});
    await SalaryBenchmark.deleteMany({});

    console.log('Seeding market trends...');
    await MarketTrend.insertMany(sampleMarketTrends);
    console.log(`✅ Created ${sampleMarketTrends.length} market trend records`);

    console.log('Seeding salary benchmarks...');
    await SalaryBenchmark.insertMany(sampleSalaryBenchmarks);
    console.log(`✅ Created ${sampleSalaryBenchmarks.length} salary benchmarks`);

    console.log('\n📊 Market Data Summary:');
    console.log(`  - Categories: ${jobCategories.length}`);
    console.log(`  - Days of trends: ${dates.length}`);
    console.log(`  - Locations: ${locations.join(', ')}`);
    console.log(`  - Benchmarks: ${sampleSalaryBenchmarks.length} positions`);

  } catch (error) {
    console.error('Error seeding market data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase connection closed');
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedMarket();
}

module.exports = seedMarket;
