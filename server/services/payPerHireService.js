/**
 * PayPerHireService
 * Service for managing pay-per-hire billing model
 * Tracks successful hires and calculates fees based on candidate salary
 */

const {
  PayPerHireTransaction,
  BillingRecord,
  Company,
  Subscription,
  SubscriptionPlan,
} = require('../models/index.js');
const mongoose = require('mongoose');

class PayPerHireService {
  constructor() {
    // Default percentage rates by plan
    this.ratesByPlan = {
      basic: 15,      // 15% for Basic plan
      growth: 10,     // 10% for Growth plan
      enterprise: 5,  // 5% for Enterprise plan
      default: 15,    // 15% default for non-subscribers
    };

    // Minimum and maximum fee caps
    this.minFee = 50000;    // 50,000 MMK minimum
    this.maxFee = 5000000;  // 5,000,000 MMK maximum
  }

  // ==================== TRANSACTION MANAGEMENT ====================

  /**
   * Create a new pay-per-hire transaction
   * @param {Object} data - Transaction data
   * @returns {Promise<Object>} Created transaction
   */
  async createTransaction(data) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const {
        companyId,
        jobId,
        hireId,
        candidateId,
        candidateSalary,
        hiredAt,
        metadata = {},
      } = data;

      // Get company's subscription to determine rate
      const rate = await this.getCompanyRate(companyId);

      // Calculate fee
      const fee = this.calculateFee(candidateSalary, rate);

      // Create transaction
      const transaction = await PayPerHireTransaction.create(
        [
          {
            companyId,
            jobId,
            hireId,
            candidateId,
            candidateSalary,
            percentageRate: rate,
            amount: fee,
            status: 'pending',
            hiredAt: hiredAt || new Date(),
            metadata,
          },
        ],
        { session }
      );

      await session.commitTransaction();

      return {
        transaction: transaction[0],
        fee,
        rate,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Calculate pay-per-hire fee
   * @param {number} salary - Candidate salary
   * @param {number} rate - Percentage rate
   * @returns {number} Calculated fee
   */
  calculateFee(salary, rate) {
    const fee = Math.round(salary * (rate / 100));

    // Apply caps
    if (fee < this.minFee) return this.minFee;
    if (fee > this.maxFee) return this.maxFee;

    return fee;
  }

  /**
   * Get company's pay-per-hire rate
   * @param {string} companyId - Company ID
   * @returns {Promise<number>} Percentage rate
   */
  async getCompanyRate(companyId) {
    // Check if company has active subscription
    const subscription = await Subscription.findOne({
      companyId,
      status: { $in: ['active', 'trialing'] },
    }).populate('planId');

    if (subscription && subscription.planId) {
      const planSlug = subscription.planId.slug;
      return this.ratesByPlan[planSlug] || this.ratesByPlan.default;
    }

    // Check if company has a custom rate
    const company = await Company.findById(companyId);
    if (company && company.payPerHireRate) {
      return company.payPerHireRate;
    }

    return this.ratesByPlan.default;
  }

  /**
   * Generate invoice for pay-per-hire transaction
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} Generated invoice
   */
  async generateInvoice(transactionId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const transaction = await PayPerHireTransaction.findById(transactionId)
        .populate('companyId', 'name email')
        .session(session);

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.invoiceId) {
        throw new Error('Invoice already generated for this transaction');
      }

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Create invoice
      const invoice = await BillingRecord.create(
        [
          {
            companyId: transaction.companyId,
            invoiceNumber,
            invoiceType: 'per_hire_fee',
            items: [
              {
                description: `Pay-per-hire fee for candidate placement`,
                type: 'per_hire_fee',
                quantity: 1,
                unitPrice: transaction.amount,
                amount: transaction.amount,
                metadata: {
                  transactionId: transaction._id,
                  jobId: transaction.jobId,
                  hireId: transaction.hireId,
                  candidateSalary: transaction.candidateSalary,
                  percentageRate: transaction.percentageRate,
                },
              },
            ],
            subtotal: transaction.amount,
            total: transaction.amount,
            currency: 'MMK',
            amountDue: transaction.amount,
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
            status: 'pending',
            notes: `Pay-per-hire fee: ${transaction.percentageRate}% of candidate salary (MMK ${transaction.candidateSalary.toLocaleString()})`,
          },
        ],
        { session }
      );

      // Update transaction with invoice reference
      transaction.invoiceId = invoice[0]._id;
      transaction.status = 'invoiced';
      await transaction.save({ session });

      await session.commitTransaction();

      return {
        transaction,
        invoice: invoice[0],
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Mark transaction as paid
   * @param {string} transactionId - Transaction ID
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Updated transaction
   */
  async markAsPaid(transactionId, paymentData) {
    const { invoiceId, paidAt, paymentMethod } = paymentData;

    const transaction = await PayPerHireTransaction.findById(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    transaction.status = 'paid';
    transaction.paidAt = paidAt || new Date();
    transaction.invoiceId = invoiceId;

    await transaction.save();

    return transaction;
  }

  /**
   * Mark transaction as failed
   * @param {string} transactionId - Transaction ID
   * @param {string} reason - Failure reason
   * @returns {Promise<Object>} Updated transaction
   */
  async markAsFailed(transactionId, reason) {
    const transaction = await PayPerHireTransaction.findById(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    transaction.status = 'failed';
    transaction.metadata = {
      ...transaction.metadata,
      failureReason: reason,
      failedAt: new Date(),
    };

    await transaction.save();

    return transaction;
  }

  // ==================== CALCULATOR ====================

  /**
   * Calculate estimated fee
   * @param {string} companyId - Company ID
   * @param {number} salary - Candidate salary
   * @returns {Promise<Object>} Fee estimate
   */
  async calculateEstimate(companyId, salary) {
    const rate = await this.getCompanyRate(companyId);
    const fee = this.calculateFee(salary, rate);

    return {
      salary,
      rate,
      fee,
      currency: 'MMK',
      breakdown: {
        baseFee: Math.round(salary * (rate / 100)),
        minFeeApplied: fee === this.minFee,
        maxFeeApplied: fee === this.maxFee,
        minFee: this.minFee,
        maxFee: this.maxFee,
      },
    };
  }

  /**
   * Get fee calculator for all tiers
   * @param {number} salary - Candidate salary
   * @returns {Object} Fee breakdown by tier
   */
  getTierCalculator(salary) {
    const tiers = Object.keys(this.ratesByPlan).filter(key => key !== 'default');

    return tiers.map(tier => ({
      tier,
      rate: this.ratesByPlan[tier],
      fee: this.calculateFee(salary, this.ratesByPlan[tier]),
      savings: this.calculateFee(salary, this.ratesByPlan.default) -
               this.calculateFee(salary, this.ratesByPlan[tier]),
    }));
  }

  // ==================== REPORTING ====================

  /**
   * Get company pay-per-hire transactions
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Transactions
   */
  async getCompanyTransactions(companyId, options = {}) {
    const { limit = 50, skip = 0, status, startDate, endDate } = options;

    const query = { companyId };

    if (status) query.status = status;
    if (startDate || endDate) {
      query.hiredAt = {};
      if (startDate) query.hiredAt.$gte = startDate;
      if (endDate) query.hiredAt.$lte = endDate;
    }

    return await PayPerHireTransaction.find(query)
      .sort({ hiredAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('jobId', 'title')
      .populate('hireId', 'name email');
  }

  /**
   * Get pay-per-hire summary for company
   * @param {string} companyId - Company ID
   * @param {Object} filters - Date filters
   * @returns {Promise<Object>} Summary
   */
  async getCompanySummary(companyId, filters = {}) {
    const matchStage = { companyId: new mongoose.Types.ObjectId(companyId) };

    if (filters.startDate || filters.endDate) {
      matchStage.hiredAt = {};
      if (filters.startDate) matchStage.hiredAt.$gte = filters.startDate;
      if (filters.endDate) matchStage.hiredAt.$lte = filters.endDate;
    }

    const stats = await PayPerHireTransaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalHires: { $sum: 1 },
          totalFees: { $sum: '$amount' },
          averageFee: { $avg: '$amount' },
          averageSalary: { $avg: '$candidateSalary' },
          byStatus: {
            $push: {
              k: '$status',
              v: 1,
            },
          },
        },
      },
      {
        $project: {
          totalHires: 1,
          totalFees: 1,
          averageFee: 1,
          averageSalary: 1,
          statusBreakdown: { $arrayToObject: '$byStatus' },
        },
      },
    ]);

    return stats[0] || {
      totalHires: 0,
      totalFees: 0,
      averageFee: 0,
      averageSalary: 0,
      statusBreakdown: {},
    };
  }

  /**
   * Get platform-wide pay-per-hire statistics
   * @param {Object} filters - Date filters
   * @returns {Promise<Object>} Platform statistics
   */
  async getPlatformStats(filters = {}) {
    const matchStage = {};

    if (filters.startDate || filters.endDate) {
      matchStage.hiredAt = {};
      if (filters.startDate) matchStage.hiredAt.$gte = filters.startDate;
      if (filters.endDate) matchStage.hiredAt.$lte = filters.endDate;
    }

    const stats = await PayPerHireTransaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalRevenue: { $sum: '$amount' },
          totalSalaryVolume: { $sum: '$candidateSalary' },
          averageFee: { $avg: '$amount' },
          averageRate: { $avg: '$percentageRate' },
        },
      },
    ]);

    const statusBreakdown = await PayPerHireTransaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$amount' },
        },
      },
    ]);

    return {
      ...(stats[0] || {
        totalTransactions: 0,
        totalRevenue: 0,
        totalSalaryVolume: 0,
        averageFee: 0,
        averageRate: 0,
      }),
      statusBreakdown: statusBreakdown.reduce((acc, curr) => {
        acc[curr._id] = { count: curr.count, total: curr.total };
        return acc;
      }, {}),
    };
  }

  // ==================== SETUP ====================

  /**
   * Setup pay-per-hire billing for company
   * @param {string} companyId - Company ID
   * @param {Object} setupData - Setup data
   * @returns {Promise<Object>} Setup result
   */
  async setupPayPerHire(companyId, setupData) {
    const { customRate, billingPreferences } = setupData;

    const company = await Company.findById(companyId);
    if (!company) {
      throw new Error('Company not found');
    }

    // Validate custom rate
    if (customRate !== undefined) {
      if (customRate < 0 || customRate > 50) {
        throw new Error('Custom rate must be between 0 and 50%');
      }
      company.payPerHireRate = customRate;
    }

    // Store billing preferences
    company.billingPreferences = {
      ...company.billingPreferences,
      ...billingPreferences,
      payPerHireEnabled: true,
      setupAt: new Date(),
    };

    await company.save();

    return {
      companyId,
      rate: customRate || await this.getCompanyRate(companyId),
      setupAt: new Date(),
      message: 'Pay-per-hire billing setup successfully',
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Generate unique invoice number
   */
  async generateInvoiceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const count = await BillingRecord.countDocuments({
      invoiceType: 'per_hire_fee',
      createdAt: {
        $gte: new Date(year, now.getMonth(), 1),
        $lt: new Date(year, now.getMonth() + 1, 1),
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `PH-${year}${month}-${sequence}`;
  }

  /**
   * Get pending transactions for invoicing
   * @returns {Promise<Array>} Pending transactions
   */
  async getPendingTransactions() {
    return await PayPerHireTransaction.find({
      status: 'pending',
      hiredAt: { $lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // 7 days grace period
    }).populate('companyId', 'name email');
  }
}

// Export singleton instance
const payPerHireService = new PayPerHireService();
module.exports = PayPerHireService;
