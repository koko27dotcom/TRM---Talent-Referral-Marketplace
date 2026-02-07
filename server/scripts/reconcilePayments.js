/**
 * Payment Reconciliation Script
 * Manually reconcile pending transactions
 * Usage: npm run payment:reconcile
 */

require('dotenv').config();
const mongoose = require('mongoose');
const paymentService = require('../services/payment/PaymentService');
const PaymentTransaction = require('../models/PaymentTransaction');

async function reconcilePayments() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myanjobs');
    console.log('✓ Connected to database');

    // Get pending transactions
    const pendingTransactions = await PaymentTransaction.findPendingForReconciliation({
      before: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes old
    });

    console.log(`Found ${pendingTransactions.length} pending transactions to reconcile`);

    if (pendingTransactions.length === 0) {
      console.log('No transactions to reconcile');
      process.exit(0);
    }

    const results = {
      checked: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    for (const transaction of pendingTransactions) {
      results.checked++;
      console.log(`\nChecking transaction ${transaction.transactionNumber} (${transaction.orderId})...`);

      try {
        const result = await paymentService.checkStatus(transaction._id);

        if (result.success && result.transaction.status !== transaction.status) {
          results.updated++;
          console.log(`  ✓ Status updated: ${transaction.status} → ${result.transaction.status}`);
        } else {
          console.log(`  • Status unchanged: ${transaction.status}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          transactionId: transaction._id,
          orderId: transaction.orderId,
          error: error.message
        });
        console.log(`  ✗ Error: ${error.message}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n========================================');
    console.log('Reconciliation Complete');
    console.log('========================================');
    console.log(`Checked: ${results.checked}`);
    console.log(`Updated: ${results.updated}`);
    console.log(`Failed: ${results.failed}`);

    if (results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.forEach(err => {
        console.log(`  - ${err.orderId}: ${err.error}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Reconciliation failed:', error);
    process.exit(1);
  }
}

// Run reconciliation
reconcilePayments();
