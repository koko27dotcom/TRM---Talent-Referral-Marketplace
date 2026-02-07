/**
 * Main Seeder Index
 * Runs all seeders in the correct order
 * 
 * Usage:
 *   node seeders/index.js              - Seed all data
 *   node seeders/index.js --users      - Seed only users
 *   node seeders/index.js --jobs       - Seed only jobs
 *   node seeders/index.js --market     - Seed only market data
 *   node seeders/index.js --academy    - Seed only academy courses
 *   node seeders/index.js --clear      - Clear all data
 */

const mongoose = require('mongoose');
const { connectDatabase } = require('../config/database.js');

// Import all seeders
const seedAcademy = require('./academySeeder.js');
const seedMarket = require('./marketSeeder.js');
const seedJobs = require('./jobSeeder.js');
const seedUsers = require('./userSeeder.js');

// Import models for clearing
const AcademyCourse = require('../models/AcademyCourse.js');
const AcademyProgress = require('../models/AcademyProgress.js');
const MarketTrend = require('../models/MarketTrend.js');
const SalaryBenchmark = require('../models/SalaryBenchmark.js');
const Job = require('../models/Job.js');
const Company = require('../models/Company.js');
const User = require('../models/User.js');

async function clearAllData() {
  console.log('⚠️  Clearing all data...\n');
  
  await AcademyCourse.deleteMany({});
  console.log('✓ Cleared Academy courses');
  
  await AcademyProgress.deleteMany({});
  console.log('✓ Cleared Academy progress');
  
  await MarketTrend.deleteMany({});
  console.log('✓ Cleared Market trends');
  
  await SalaryBenchmark.deleteMany({});
  console.log('✓ Cleared Salary benchmarks');
  
  await Job.deleteMany({});
  console.log('✓ Cleared Jobs');
  
  await Company.deleteMany({});
  console.log('✓ Cleared Companies');
  
  await User.deleteMany({});
  console.log('✓ Cleared Users');
  
  console.log('\n✅ All data cleared successfully');
}

async function seedAll() {
  const startTime = Date.now();
  
  console.log('🌱 Starting database seeding...\n');
  console.log('================================\n');
  
  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to database\n');
    
    // 1. Seed Users (must be first - referenced by other models)
    console.log('📦 SEEDING USERS');
    console.log('----------------');
    await seedUsers();
    console.log('\n');
    
    // 2. Seed Jobs (depends on companies which are created in jobSeeder)
    console.log('📦 SEEDING JOBS');
    console.log('----------------');
    await seedJobs();
    console.log('\n');
    
    // 3. Seed Market Data
    console.log('📦 SEEDING MARKET DATA');
    console.log('----------------------');
    await seedMarket();
    console.log('\n');
    
    // 4. Seed Academy Courses
    console.log('📦 SEEDING ACADEMY COURSES');
    console.log('--------------------------');
    await seedAcademy();
    console.log('\n');
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('================================');
    console.log(`✅ Seeding completed in ${duration}s`);
    console.log('================================\n');
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--clear')) {
    await connectDatabase();
    await clearAllData();
    await mongoose.disconnect();
    return;
  }
  
  if (args.includes('--users')) {
    await connectDatabase();
    await seedUsers();
    await mongoose.disconnect();
    return;
  }
  
  if (args.includes('--jobs')) {
    await connectDatabase();
    await seedJobs();
    await mongoose.disconnect();
    return;
  }
  
  if (args.includes('--market')) {
    await connectDatabase();
    await seedMarket();
    await mongoose.disconnect();
    return;
  }
  
  if (args.includes('--academy')) {
    await connectDatabase();
    await seedAcademy();
    await mongoose.disconnect();
    return;
  }
  
  // Default: seed all
  await seedAll();
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
