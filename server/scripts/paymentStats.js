/**
 * Payment Statistics Script
 * Generate payment statistics report
 * Usage: npm run payment:stats
 */

require('dotenv').config();
const mongoose = require('mongoose');
const PaymentTransaction = require('../models/PaymentTransaction');

async function generateStats() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myanjobs');
    console.log('✓ Connected to database\n');

    // Get date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);
    
    const thisMonth = new Date(today);
    thisMonth.setMonth(thisMonth.getMonth() - 1);

    console.log('========================================');
    console.log('Payment Statistics Report');
    console.log('========================================\n');

    // Overall statistics
    console.log('--- Overall Statistics ---');
    const overallStats = await PaymentTransaction.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalFees: { $sum: '$fees' },
          totalNetAmount: { $sum: '$netAmount' }
        }
      }
    ]);

    overallStats.forEach(stat => {
      console.log(`${stat._id}:`);
      console.log(`  Count: ${stat.count}`);
      console.log(`  Amount: ${formatMMK(stat.totalAmount)}`);
      console.log(`  Fees: ${formatMMK(stat.totalFees)}`);
      console.log(`  Net: ${formatMMK(stat.totalNetAmount)}`);
      console.log('');
    });

    // Today's statistics
    console.log('--- Today\'s Statistics ---');
    const todayStats = await getStatsForPeriod(today, new Date());
    printStats(todayStats);

    // This week's statistics
    console.log('--- This Week\'s Statistics ---');
    const weekStats = await getStatsForPeriod(thisWeek, new Date());
    printStats(weekStats);

    // This month's statistics
    console.log('--- This Month\'s Statistics ---');
    const monthStats = await getStatsForPeriod(thisMonth, new Date());
    printStats(monthStats);

    // By provider
    console.log('--- By Provider ---');
    const providerStats = await PaymentTransaction.aggregate([
      {
        $group: {
          _id: '$provider',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          successCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    providerStats.forEach(stat => {
      const successRate = stat.count > 0 ? ((stat.successCount / stat.count) * 100).toFixed(1) : 0;
      console.log(`${stat._id}:`);
      console.log(`  Transactions: ${stat.count}`);
      console.log(`  Volume: ${formatMMK(stat.totalAmount)}`);
      console.log(`  Success Rate: ${successRate}%`);
      console.log('');
    });

    // By type
    console.log('--- By Transaction Type ---');
    const typeStats = await PaymentTransaction.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    typeStats.forEach(stat => {
      console.log(`${stat._id}: ${stat.count} transactions, ${formatMMK(stat.totalAmount)}`);
    });

    console.log('\n========================================');
    console.log('Report Complete');
    console.log('========================================');

    process.exit(0);
  } catch (error) {
    console.error('Failed to generate statistics:', error);
    process.exit(1);
  }
}

async function getStatsForPeriod(startDate, endDate) {
  return await PaymentTransaction.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalTransactions: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalFees: { $sum: '$fees' },
        completedAmount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0]
          }
        },
        completedCount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
          }
        }
      }
    }
  ]);
}

function printStats(stats) {
  if (stats.length === 0) {
    console.log('No transactions\n');
    return;
  }

  const s = stats[0];
  const successRate = s.totalTransactions > 0 ? ((s.completedCount / s.totalTransactions) * 100).toFixed(1) : 0;

  console.log(`Total Transactions: ${s.totalTransactions}`);
  console.log(`Total Amount: ${formatMMK(s.totalAmount)}`);
  console.log(`Total Fees: ${formatMMK(s.totalFees)}`);
  console.log(`Completed: ${s.completedCount} (${successRate}%)`);
  console.log(`Completed Amount: ${formatMMK(s.completedAmount)}`);
  console.log('');
}

function formatMMK(amount) {
  if (!amount) return '0 Ks';
  return amount.toLocaleString('en-MM') + ' Ks';
}

// Run statistics
generateStats();
