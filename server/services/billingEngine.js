/**
 * BillingEngine
 * Core service for generating invoices, processing payments, and managing billing
 * Supports multiple payment providers and handles dunning management
 */

const {
  BillingRecord,
  Subscription,
  Company,
  User,
} = require('../models/index.js');
const mongoose = require('mongoose');

class BillingEngine {
  constructor() {
    this.taxRate = 0; // Myanmar doesn't have VAT currently
    this.currency = 'MMK';
  }

  // ==================== INVOICE GENERATION ====================

  /**
   * Generate a new invoice
   * @param {Object} data - Invoice data
   * @returns {Promise<Object>} Generated invoice
   */
  async generateInvoice(data) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const {
        subscriberId,
        subscriberType,
        subscriptionId,
        items,
        dueDate,
        notes,
      } = data;

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
      const tax = Math.round(subtotal * this.taxRate);
      const total = subtotal + tax;

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Create invoice
      const invoice = await BillingRecord.create(
        [
          {
            companyId: subscriberType === 'company' ? subscriberId : null,
            userId: subscriberType === 'user' ? subscriberId : null,
            subscriptionId,
            invoiceNumber,
            invoiceType: 'subscription',
            items,
            subtotal,
            tax,
            taxRate: this.taxRate,
            total,
            currency: this.currency,
            amountDue: total,
            dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: 'pending',
            notes,
          },
        ],
        { session }
      );

      await session.commitTransaction();

      return invoice[0];
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Generate subscription renewal invoice
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise<Object>} Generated invoice
   */
  async generateRenewalInvoice(subscriptionId) {
    const subscription = await Subscription.findById(subscriptionId).populate('planId');
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const plan = subscription.planId;
    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, subscription.billingCycle);

    const items = [
      {
        description: `${plan.name} Plan - ${subscription.billingCycle} Subscription`,
        type: 'subscription',
        quantity: 1,
        unitPrice: subscription.price,
        amount: subscription.price,
      },
    ];

    return await this.generateInvoice({
      subscriberId: subscription.companyId || subscription.userId,
      subscriberType: subscription.companyId ? 'company' : 'user',
      subscriptionId,
      items,
      dueDate: periodEnd,
    });
  }

  /**
   * Generate prorated invoice for upgrade
   * @param {string} subscriptionId - Subscription ID
   * @param {number} prorationAmount - Prorated amount
   * @returns {Promise<Object>} Generated invoice
   */
  async generateProrationInvoice(subscriptionId, prorationAmount) {
    const subscription = await Subscription.findById(subscriptionId).populate('planId');
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const plan = subscription.planId;

    const items = [
      {
        description: `Prorated upgrade to ${plan.name} Plan`,
        type: 'proration',
        quantity: 1,
        unitPrice: prorationAmount,
        amount: prorationAmount,
      },
    ];

    return await this.generateInvoice({
      subscriberId: subscription.companyId || subscription.userId,
      subscriberType: subscription.companyId ? 'company' : 'user',
      subscriptionId,
      items,
    });
  }

  /**
   * Generate pay-per-hire invoice
   * @param {string} companyId - Company ID
   * @param {Object} hireData - Hire data
   * @returns {Promise<Object>} Generated invoice
   */
  async generatePayPerHireInvoice(companyId, hireData) {
    const { jobId, hireId, candidateSalary, percentageRate } = hireData;

    const amount = Math.round(candidateSalary * (percentageRate / 100));

    const items = [
      {
        description: `Pay-per-hire fee for candidate placement`,
        type: 'per_hire_fee',
        quantity: 1,
        unitPrice: amount,
        amount,
        metadata: {
          jobId,
          hireId,
          candidateSalary,
          percentageRate,
        },
      },
    ];

    return await this.generateInvoice({
      subscriberId: companyId,
      subscriberType: 'company',
      items,
      notes: `Pay-per-hire fee: ${percentageRate}% of candidate salary`,
    });
  }

  // ==================== PAYMENT PROCESSING ====================

  /**
   * Process a payment
   * @param {string} invoiceId - Invoice ID
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Payment result
   */
  async processPayment(invoiceId, paymentData) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { amount, paymentMethod, provider, transactionId, metadata = {} } = paymentData;

      const invoice = await BillingRecord.findById(invoiceId).session(session);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.status === 'paid') {
        throw new Error('Invoice is already paid');
      }

      // Update invoice
      invoice.amountPaid += amount;
      invoice.payment = {
        method: paymentMethod,
        transactionId,
        paidAt: new Date(),
        ...metadata,
      };

      if (invoice.amountPaid >= invoice.total) {
        invoice.status = 'paid';
        invoice.paidAt = new Date();
      } else {
        invoice.status = 'partial';
      }

      await invoice.save({ session });

      // Update subscription payment history if applicable
      if (invoice.subscriptionId) {
        await Subscription.findByIdAndUpdate(
          invoice.subscriptionId,
          {
            $push: {
              paymentHistory: {
                amount,
                currency: invoice.currency,
                paymentMethod,
                transactionId,
                status: 'completed',
                paidAt: new Date(),
              },
            },
          },
          { session }
        );
      }

      await session.commitTransaction();

      return {
        invoice,
        payment: {
          amount,
          transactionId,
          status: 'completed',
        },
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Record a failed payment
   * @param {string} invoiceId - Invoice ID
   * @param {Object} failureData - Failure data
   * @returns {Promise<Object>} Updated invoice
   */
  async recordFailedPayment(invoiceId, failureData) {
    const { reason, provider, attemptNumber } = failureData;

    const invoice = await BillingRecord.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Add to payment history
    if (!invoice.paymentHistory) {
      invoice.paymentHistory = [];
    }

    invoice.paymentHistory.push({
      status: 'failed',
      failureReason: reason,
      provider,
      attemptedAt: new Date(),
      attemptNumber,
    });

    // Update invoice status if max attempts reached
    if (attemptNumber >= 3) {
      invoice.status = 'failed';
    }

    await invoice.save();

    return invoice;
  }

  /**
   * Retry a failed payment
   * @param {string} invoiceId - Invoice ID
   * @param {Object} paymentData - New payment data
   * @returns {Promise<Object>} Payment result
   */
  async retryPayment(invoiceId, paymentData) {
    const invoice = await BillingRecord.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'paid') {
      throw new Error('Invoice is already paid');
    }

    return await this.processPayment(invoiceId, paymentData);
  }

  // ==================== DUNNING MANAGEMENT ====================

  /**
   * Process dunning for overdue invoices
   * @returns {Promise<Array>} Processed invoices
   */
  async processDunning() {
    const now = new Date();
    const overdueInvoices = await BillingRecord.find({
      status: { $in: ['pending', 'partial'] },
      dueDate: { $lt: now },
      isOverdue: { $ne: true },
    }).populate('subscriptionId');

    const processed = [];

    for (const invoice of overdueInvoices) {
      invoice.isOverdue = true;
      invoice.overdueNotifiedAt = now;

      // Calculate days overdue
      const daysOverdue = Math.ceil((now - invoice.dueDate) / (1000 * 60 * 60 * 24));

      // Apply late fee after 7 days
      if (daysOverdue >= 7 && !invoice.lateFeeApplied) {
        const lateFee = Math.round(invoice.total * 0.05); // 5% late fee
        invoice.lateFeeApplied = true;
        invoice.total += lateFee;
        invoice.amountDue += lateFee;

        // Add late fee as line item
        invoice.items.push({
          description: 'Late payment fee (5%)',
          type: 'overage',
          quantity: 1,
          unitPrice: lateFee,
          amount: lateFee,
        });
      }

      // Suspend subscription after 14 days
      if (daysOverdue >= 14 && invoice.subscriptionId) {
        await Subscription.findByIdAndUpdate(invoice.subscriptionId, {
          status: 'past_due',
        });
      }

      await invoice.save();
      processed.push(invoice);
    }

    return processed;
  }

  /**
   * Get overdue invoices
   * @param {number} days - Days overdue
   * @returns {Promise<Array>} Overdue invoices
   */
  async getOverdueInvoices(days = 0) {
    const query = {
      status: { $nin: ['paid', 'cancelled', 'refunded'] },
      dueDate: { $lt: new Date() },
    };

    if (days > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      query.dueDate.$gte = cutoffDate;
    }

    return await BillingRecord.find(query)
      .populate('companyId', 'name email')
      .sort({ dueDate: 1 });
  }

  // ==================== REFUNDS ====================

  /**
   * Process a refund
   * @param {string} invoiceId - Invoice ID
   * @param {Object} refundData - Refund data
   * @returns {Promise<Object>} Refund result
   */
  async processRefund(invoiceId, refundData) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { amount, reason, processedBy } = refundData;

      const invoice = await BillingRecord.findById(invoiceId).session(session);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (amount > invoice.amountPaid) {
        throw new Error('Refund amount cannot exceed amount paid');
      }

      invoice.refundAmount = amount;
      invoice.refundReason = reason;
      invoice.refundedAt = new Date();
      invoice.refundedBy = processedBy;
      invoice.status = 'refunded';

      await invoice.save({ session });

      await session.commitTransaction();

      return {
        invoice,
        refund: {
          amount,
          reason,
          processedAt: new Date(),
        },
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ==================== DISCOUNTS & PROMOS ====================

  /**
   * Apply discount to invoice
   * @param {string} invoiceId - Invoice ID
   * @param {Object} discountData - Discount data
   * @returns {Promise<Object>} Updated invoice
   */
  async applyDiscount(invoiceId, discountData) {
    const { amount, percentage, code, reason } = discountData;

    const invoice = await BillingRecord.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    let discountAmount = 0;

    if (percentage) {
      discountAmount = Math.round(invoice.subtotal * (percentage / 100));
    } else if (amount) {
      discountAmount = amount;
    }

    invoice.discount = discountAmount;
    invoice.discountCode = code;
    invoice.total = invoice.subtotal + invoice.tax - discountAmount;
    invoice.amountDue = invoice.total - invoice.amountPaid;

    await invoice.save();

    return invoice;
  }

  // ==================== REPORTING ====================

  /**
   * Get billing summary
   * @param {Object} filters - Date filters
   * @returns {Promise<Object>} Billing summary
   */
  async getBillingSummary(filters = {}) {
    const matchStage = { status: { $in: ['paid', 'partial'] } };

    if (filters.startDate || filters.endDate) {
      matchStage.createdAt = {};
      if (filters.startDate) matchStage.createdAt.$gte = filters.startDate;
      if (filters.endDate) matchStage.createdAt.$lte = filters.endDate;
    }

    const stats = await BillingRecord.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amountPaid' },
          totalInvoices: { $sum: 1 },
          averageInvoice: { $avg: '$total' },
          byStatus: {
            $push: '$status',
          },
        },
      },
    ]);

    return stats[0] || {
      totalRevenue: 0,
      totalInvoices: 0,
      averageInvoice: 0,
    };
  }

  /**
   * Get company billing history
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Billing history
   */
  async getCompanyBillingHistory(companyId, options = {}) {
    const { limit = 50, skip = 0, status } = options;

    const query = { companyId };
    if (status) query.status = status;

    return await BillingRecord.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
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
      createdAt: {
        $gte: new Date(year, now.getMonth(), 1),
        $lt: new Date(year, now.getMonth() + 1, 1),
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `INV-${year}${month}-${sequence}`;
  }

  /**
   * Calculate period end date
   */
  calculatePeriodEnd(startDate, billingCycle) {
    const endDate = new Date(startDate);

    switch (billingCycle) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }

    return endDate;
  }

  /**
   * Generate PDF for invoice
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generateInvoicePDF(invoiceId) {
    // This would integrate with a PDF generation library
    // For now, return a placeholder
    const invoice = await BillingRecord.findById(invoiceId)
      .populate('companyId', 'name email address')
      .populate('subscriptionId', 'planId');

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Placeholder for PDF generation
    return {
      invoice,
      pdfUrl: `/invoices/${invoiceId}/download`,
      generatedAt: new Date(),
    };
  }
}

// Export singleton instance
const billingEngine = new BillingEngine();
module.exports = BillingEngine;
