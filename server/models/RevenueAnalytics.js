/**
 * RevenueAnalytics Model
 * Stores daily/weekly/monthly revenue snapshots and analytics data
 * Enables data-driven decisions for the TRM platform
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Revenue by source schema
const RevenueBySourceSchema = new Schema({
  source: {
    type: String,
    enum: ['job_postings', 'subscriptions', 'featured_listings', 'per_hire_fees', 'overage', 'other'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  count: {
    type: Number,
    default: 0,
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100,
  },
}, { _id: false });

// Revenue by company schema
const RevenueByCompanySchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  companyName: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  jobCount: {
    type: Number,
    default: 0,
  },
  subscriptionAmount: {
    type: Number,
    default: 0,
  },
  perHireAmount: {
    type: Number,
    default: 0,
  },
}, { _id: false });

// MRR breakdown schema
const MRRBreakdownSchema = new Schema({
  newMrr: {
    type: Number,
    default: 0,
  },
  expansionMrr: {
    type: Number,
    default: 0,
  },
  contractionMrr: {
    type: Number,
    default: 0,
  },
  churnedMrr: {
    type: Number,
    default: 0,
  },
  reactivationMrr: {
    type: Number,
    default: 0,
  },
}, { _id: false });

// Referrer activation metrics schema
const ReferrerActivationSchema = new Schema({
  totalReferrers: {
    type: Number,
    default: 0,
  },
  activeReferrers: {
    type: Number,
    default: 0,
  },
  newReferrers: {
    type: Number,
    default: 0,
  },
  activationRate: {
    type: Number,
    default: 0,
  },
  avgReferralsPerReferrer: {
    type: Number,
    default: 0,
  },
}, { _id: false });

// Time-to-first-hire metrics schema
const TimeToFirstHireSchema = new Schema({
  avgDaysToFirstHire: {
    type: Number,
    default: 0,
  },
  medianDaysToFirstHire: {
    type: Number,
    default: 0,
  },
  minDaysToFirstHire: {
    type: Number,
    default: 0,
  },
  maxDaysToFirstHire: {
    type: Number,
    default: 0,
  },
  hiresThisPeriod: {
    type: Number,
    default: 0,
  },
}, { _id: false });

// Conversion rates schema
const ConversionRatesSchema = new Schema({
  referralToApplication: {
    type: Number,
    default: 0,
  },
  applicationToInterview: {
    type: Number,
    default: 0,
  },
  interviewToHire: {
    type: Number,
    default: 0,
  },
  referralToHire: {
    type: Number,
    default: 0,
  },
  jobPostToHire: {
    type: Number,
    default: 0,
  },
}, { _id: false });

// Cohort data schema
const CohortDataSchema = new Schema({
  cohortMonth: {
    type: String,
    required: true,
  },
  cohortSize: {
    type: Number,
    required: true,
  },
  retentionRates: [{
    month: Number,
    rate: Number,
    activeCount: Number,
  }],
  revenue: [{
    month: Number,
    amount: Number,
  }],
  ltv: {
    type: Number,
    default: 0,
  },
}, { _id: false });

// Forecast data schema
const ForecastDataSchema = new Schema({
  period: {
    type: String,
    required: true,
  },
  predictedRevenue: {
    type: Number,
    required: true,
  },
  confidenceInterval: {
    lower: Number,
    upper: Number,
  },
  growthRate: {
    type: Number,
    default: 0,
  },
}, { _id: false });

// Main RevenueAnalytics Schema
const RevenueAnalyticsSchema = new Schema({
  // Snapshot period
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true,
  },
  date: {
    type: Date,
    required: true,
    index: true,
  },
  
  // Period range
  periodStart: {
    type: Date,
    required: true,
  },
  periodEnd: {
    type: Date,
    required: true,
  },
  
  // Revenue totals
  totalRevenue: {
    type: Number,
    required: true,
    min: 0,
  },
  previousPeriodRevenue: {
    type: Number,
    default: 0,
  },
  revenueGrowth: {
    type: Number,
    default: 0,
  },
  revenueGrowthPercentage: {
    type: Number,
    default: 0,
  },
  
  // MRR (Monthly Recurring Revenue)
  mrr: {
    type: Number,
    default: 0,
  },
  arr: {
    type: Number,
    default: 0,
  },
  mrrGrowth: {
    type: Number,
    default: 0,
  },
  mrrBreakdown: {
    type: MRRBreakdownSchema,
    default: () => ({}),
  },
  
  // Revenue breakdown
  revenueBySource: [RevenueBySourceSchema],
  revenueByCompany: [RevenueByCompanySchema],
  
  // Top performing metrics
  topCompaniesByRevenue: [RevenueByCompanySchema],
  
  // Referrer metrics
  referrerMetrics: {
    type: ReferrerActivationSchema,
    default: () => ({}),
  },
  
  // Time-to-first-hire metrics
  timeToFirstHire: {
    type: TimeToFirstHireSchema,
    default: () => ({}),
  },
  
  // Conversion rates
  conversionRates: {
    type: ConversionRatesSchema,
    default: () => ({}),
  },
  
  // Cohort analysis
  cohorts: [CohortDataSchema],
  
  // Forecast data
  forecast: [ForecastDataSchema],
  
  // Job posting metrics
  jobMetrics: {
    totalJobsPosted: {
      type: Number,
      default: 0,
    },
    activeJobs: {
      type: Number,
      default: 0,
    },
    filledJobs: {
      type: Number,
      default: 0,
    },
    revenuePerJob: {
      type: Number,
      default: 0,
    },
  },
  
  // Subscription metrics
  subscriptionMetrics: {
    activeSubscriptions: {
      type: Number,
      default: 0,
    },
    newSubscriptions: {
      type: Number,
      default: 0,
    },
    cancelledSubscriptions: {
      type: Number,
      default: 0,
    },
    churnRate: {
      type: Number,
      default: 0,
    },
    avgRevenuePerUser: {
      type: Number,
      default: 0,
    },
  },
  
  // Referral metrics
  referralMetrics: {
    totalReferrals: {
      type: Number,
      default: 0,
    },
    successfulReferrals: {
      type: Number,
      default: 0,
    },
    totalPayouts: {
      type: Number,
      default: 0,
    },
    avgPayoutAmount: {
      type: Number,
      default: 0,
    },
  },
  
  // Metadata
  isFinal: {
    type: Boolean,
    default: false,
  },
  calculatedAt: {
    type: Date,
    default: Date.now,
  },
  nextCalculationAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
RevenueAnalyticsSchema.index({ period: 1, date: -1 });
RevenueAnalyticsSchema.index({ date: -1 });
RevenueAnalyticsSchema.index({ period: 1, periodStart: -1, periodEnd: -1 });

// Static methods
RevenueAnalyticsSchema.statics.getLatestSnapshot = async function(period = 'daily') {
  return this.findOne({ period })
    .sort({ date: -1 })
    .exec();
};

RevenueAnalyticsSchema.statics.getSnapshotsInRange = async function(period, startDate, endDate) {
  return this.find({
    period,
    date: {
      $gte: startDate,
      $lte: endDate,
    },
  })
    .sort({ date: 1 })
    .exec();
};

RevenueAnalyticsSchema.statics.getRevenueByDateRange = async function(startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        period: 'daily',
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalRevenue' },
        avgMrr: { $avg: '$mrr' },
        totalReferrals: { $sum: '$referralMetrics.totalReferrals' },
        successfulReferrals: { $sum: '$referralMetrics.successfulReferrals' },
      },
    },
  ]);
  
  return result[0] || {
    totalRevenue: 0,
    avgMrr: 0,
    totalReferrals: 0,
    successfulReferrals: 0,
  };
};

// Instance methods
RevenueAnalyticsSchema.methods.getGrowthRate = function() {
  if (!this.previousPeriodRevenue || this.previousPeriodRevenue === 0) {
    return 0;
  }
  return ((this.totalRevenue - this.previousPeriodRevenue) / this.previousPeriodRevenue) * 100;
};

RevenueAnalyticsSchema.methods.getTopRevenueSource = function() {
  if (!this.revenueBySource || this.revenueBySource.length === 0) {
    return null;
  }
  return this.revenueBySource.reduce((max, source) => 
    source.amount > max.amount ? source : max
  );
};

const RevenueAnalytics = mongoose.model('RevenueAnalytics', RevenueAnalyticsSchema);

module.exports = RevenueAnalytics;
