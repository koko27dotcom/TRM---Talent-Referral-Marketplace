/**
 * Currency Rate Model
 * Stores real-time and historical currency exchange rates
 * Supports multiple rate sources and automatic updates
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Rate source schema
const RateSourceSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    trim: true,
  },
  rate: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 1,
  },
}, { _id: false });

// Historical rate point schema
const HistoricalRateSchema = new Schema({
  date: {
    type: Date,
    required: true,
  },
  rate: {
    type: Number,
    required: true,
  },
  volume: {
    type: Number,
    default: null,
  },
}, { _id: false });

// Main currency rate schema
const CurrencyRateSchema = new Schema({
  // Base currency (e.g., USD)
  baseCurrency: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  
  // Target currency (e.g., MMK, THB, SGD, VND)
  targetCurrency: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  
  // Current exchange rate (base -> target)
  rate: {
    type: Number,
    required: true,
  },
  
  // Inverse rate (target -> base)
  inverseRate: {
    type: Number,
    required: true,
  },
  
  // Rate sources for verification
  sources: [RateSourceSchema],
  
  // Historical rates (last 30 days)
  history: [HistoricalRateSchema],
  
  // Spread/margin for platform conversions
  spread: {
    buy: {
      type: Number,
      default: 0,
    },
    sell: {
      type: Number,
      default: 0,
    },
  },
  
  // Rate validity
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  
  // Last update timestamp
  lastUpdated: {
    type: Date,
    default: Date.now,
    index: true,
  },
  
  // Next scheduled update
  nextUpdate: {
    type: Date,
  },
  
  // Update frequency in minutes
  updateFrequency: {
    type: Number,
    default: 60,
  },
  
  // Rate staleness threshold in minutes
  staleThreshold: {
    type: Number,
    default: 120,
  },
  
  // Metadata
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Compound index for unique currency pairs
CurrencyRateSchema.index({ baseCurrency: 1, targetCurrency: 1 }, { unique: true });

// Static method to get current rate
CurrencyRateSchema.statics.getRate = async function(baseCurrency, targetCurrency) {
  const rate = await this.findOne({
    baseCurrency: baseCurrency.toUpperCase(),
    targetCurrency: targetCurrency.toUpperCase(),
    isActive: true,
  }).lean();
  
  if (!rate) {
    // Try inverse
    const inverseRate = await this.findOne({
      baseCurrency: targetCurrency.toUpperCase(),
      targetCurrency: baseCurrency.toUpperCase(),
      isActive: true,
    }).lean();
    
    if (inverseRate) {
      return {
        rate: inverseRate.inverseRate,
        inverseRate: inverseRate.rate,
        lastUpdated: inverseRate.lastUpdated,
        sources: inverseRate.sources,
      };
    }
    
    return null;
  }
  
  return rate;
};

// Static method to convert amount
CurrencyRateSchema.statics.convert = async function(amount, fromCurrency, toCurrency) {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return {
      amount: amount,
      rate: 1,
      fromCurrency,
      toCurrency,
    };
  }
  
  const rateData = await this.getRate(fromCurrency, toCurrency);
  
  if (!rateData) {
    throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
  }
  
  return {
    amount: amount * rateData.rate,
    rate: rateData.rate,
    fromCurrency: fromCurrency.toUpperCase(),
    toCurrency: toCurrency.toUpperCase(),
    lastUpdated: rateData.lastUpdated,
  };
};

// Static method to get all rates for a base currency
CurrencyRateSchema.statics.getRatesForBase = async function(baseCurrency) {
  return await this.find({
    baseCurrency: baseCurrency.toUpperCase(),
    isActive: true,
  }).lean();
};

// Static method to get supported currency pairs
CurrencyRateSchema.statics.getSupportedPairs = async function() {
  const rates = await this.find({ isActive: true }).select('baseCurrency targetCurrency').lean();
  return rates.map(r => ({
    from: r.baseCurrency,
    to: r.targetCurrency,
  }));
};

// Static method to update rate
CurrencyRateSchema.statics.updateRate = async function(baseCurrency, targetCurrency, rate, source = 'manual') {
  const inverseRate = 1 / rate;
  
  const update = {
    $set: {
      rate: rate,
      inverseRate: inverseRate,
      lastUpdated: new Date(),
      nextUpdate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    },
    $push: {
      sources: {
        $each: [{ name: source, code: source, rate: rate, timestamp: new Date() }],
        $slice: -5, // Keep only last 5 sources
      },
      history: {
        $each: [{ date: new Date(), rate: rate }],
        $slice: -30, // Keep only last 30 days
      },
    },
  };
  
  return await this.findOneAndUpdate(
    { baseCurrency: baseCurrency.toUpperCase(), targetCurrency: targetCurrency.toUpperCase() },
    update,
    { upsert: true, new: true }
  );
};

// Static method to bulk update rates
CurrencyRateSchema.statics.bulkUpdateRates = async function(baseCurrency, rates, source = 'api') {
  const operations = Object.entries(rates).map(([targetCurrency, rate]) => ({
    updateOne: {
      filter: {
        baseCurrency: baseCurrency.toUpperCase(),
        targetCurrency: targetCurrency.toUpperCase(),
      },
      update: {
        $set: {
          rate: rate,
          inverseRate: 1 / rate,
          lastUpdated: new Date(),
          nextUpdate: new Date(Date.now() + 60 * 60 * 1000),
        },
        $push: {
          sources: {
            $each: [{ name: source, code: source, rate: rate, timestamp: new Date() }],
            $slice: -5,
          },
          history: {
            $each: [{ date: new Date(), rate: rate }],
            $slice: -30,
          },
        },
      },
      upsert: true,
    },
  }));
  
  return await this.bulkWrite(operations);
};

// Static method to get stale rates
CurrencyRateSchema.statics.getStaleRates = async function(thresholdMinutes = 120) {
  const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);
  
  return await this.find({
    isActive: true,
    $or: [
      { lastUpdated: { $lt: threshold } },
      { nextUpdate: { $lt: new Date() } },
    ],
  }).lean();
};

// Instance method to check if rate is stale
CurrencyRateSchema.methods.isStale = function() {
  const threshold = new Date(Date.now() - this.staleThreshold * 60 * 1000);
  return this.lastUpdated < threshold;
};

// Instance method to get formatted rate
CurrencyRateSchema.methods.getFormattedRate = function(decimals = 4) {
  return this.rate.toFixed(decimals);
};

// Instance method to calculate conversion with spread
CurrencyRateSchema.methods.convertWithSpread = function(amount, type = 'buy') {
  const spread = type === 'buy' ? this.spread.buy : this.spread.sell;
  const adjustedRate = this.rate * (1 + spread);
  return {
    amount: amount * adjustedRate,
    rate: adjustedRate,
    spread: spread,
  };
};

const CurrencyRate = mongoose.model('CurrencyRate', CurrencyRateSchema);

module.exports = CurrencyRate;
