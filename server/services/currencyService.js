/**
 * CurrencyService
 * Core business logic for currency conversion and exchange rate management
 * Handles currency conversion, rate updates, caching, and external API integration
 */

const CurrencyRate = require('../models/CurrencyRate.js');
const axios = require('axios');

/**
 * Cache entry with TTL support
 * @typedef {Object} CacheEntry
 * @property {*} value - Cached value
 * @property {number} expiresAt - Timestamp when cache expires
 */

/**
 * Service class for managing currency conversion and exchange rates
 */
class CurrencyService {
  constructor() {
    /** @type {Map<string, CacheEntry>} In-memory cache for rates */
    this.cache = new Map();
    /** @type {number} Default TTL in milliseconds (5 minutes) */
    this.defaultTTL = 5 * 60 * 1000;
    /** @type {string} Base currency */
    this.baseCurrency = 'USD';
    /** @type {Array<string>} Supported currencies */
    this.supportedCurrencies = ['USD', 'MMK', 'THB', 'SGD', 'VND', 'CNY', 'MYR'];
    /** @type {string} External API base URL */
    this.apiBaseUrl = 'https://api.exchangerate-api.com/v4/latest';
    /** @type {Object} Currency metadata */
    this.currencyInfo = {
      USD: { symbol: '$', name: 'US Dollar', decimals: 2, locale: 'en-US' },
      MMK: { symbol: 'K', name: 'Myanmar Kyat', decimals: 0, locale: 'my-MM' },
      THB: { symbol: '฿', name: 'Thai Baht', decimals: 2, locale: 'th-TH' },
      SGD: { symbol: 'S$', name: 'Singapore Dollar', decimals: 2, locale: 'en-SG' },
      VND: { symbol: '₫', name: 'Vietnamese Dong', decimals: 0, locale: 'vi-VN' },
      CNY: { symbol: '¥', name: 'Chinese Yuan', decimals: 2, locale: 'zh-CN' },
      MYR: { symbol: 'RM', name: 'Malaysian Ringgit', decimals: 2, locale: 'ms-MY' },
    };
  }

  // ==================== CACHE MANAGEMENT ====================

  /**
   * Get value from cache
   * @private
   * @param {string} key - Cache key
   * @returns {*} Cached value or null if expired/not found
   */
  _getFromCache(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set value in cache with TTL
   * @private
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} [ttl] - TTL in milliseconds
   */
  _setCache(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Generate cache key
   * @private
   * @param {...string} parts - Key parts
   * @returns {string} Cache key
   */
  _cacheKey(...parts) {
    return parts.join(':');
  }

  /**
   * Clear all cached rates
   */
  clearCache() {
    this.cache.clear();
    console.log('Currency rate cache cleared');
  }

  /**
   * Preload common currency pairs into cache
   * @returns {Promise<void>}
   */
  async warmCache() {
    try {
      // Preload rates for all supported currencies against USD
      for (const currency of this.supportedCurrencies) {
        if (currency !== this.baseCurrency) {
          await this.getRate(this.baseCurrency, currency);
        }
      }

      // Preload inverse rates
      for (const currency of this.supportedCurrencies) {
        if (currency !== this.baseCurrency) {
          await this.getRate(currency, this.baseCurrency);
        }
      }

      console.log('Currency cache warmed successfully');
    } catch (error) {
      console.error('Error warming currency cache:', error);
    }
  }

  // ==================== CURRENCY CONVERSION ====================

  /**
   * Convert amount between currencies
   * @param {number} amount - Amount to convert
   * @param {string} fromCurrency - Source currency code
   * @param {string} toCurrency - Target currency code
   * @returns {Promise<Object>} Conversion result with amount, rate, and metadata
   * @throws {Error} If exchange rate not found
   */
  async convert(amount, fromCurrency, toCurrency) {
    try {
      fromCurrency = fromCurrency.toUpperCase();
      toCurrency = toCurrency.toUpperCase();

      // Same currency, no conversion needed
      if (fromCurrency === toCurrency) {
        return {
          amount: amount,
          rate: 1,
          fromCurrency,
          toCurrency,
          lastUpdated: new Date(),
        };
      }

      const rateData = await this.getRate(fromCurrency, toCurrency);

      if (!rateData) {
        throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
      }

      return {
        amount: amount * rateData.rate,
        rate: rateData.rate,
        fromCurrency,
        toCurrency,
        lastUpdated: rateData.lastUpdated,
      };
    } catch (error) {
      console.error('Error converting currency:', error);
      throw error;
    }
  }

  /**
   * Convert multiple amounts at once
   * @param {Array<number>} amounts - Array of amounts to convert
   * @param {string} fromCurrency - Source currency code
   * @param {string} toCurrency - Target currency code
   * @returns {Promise<Array<Object>>} Array of conversion results
   */
  async convertMultiple(amounts, fromCurrency, toCurrency) {
    try {
      const rateData = await this.getRate(fromCurrency, toCurrency);

      if (!rateData) {
        throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
      }

      return amounts.map((amount) => ({
        originalAmount: amount,
        convertedAmount: amount * rateData.rate,
        rate: rateData.rate,
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        lastUpdated: rateData.lastUpdated,
      }));
    } catch (error) {
      console.error('Error converting multiple amounts:', error);
      throw error;
    }
  }

  /**
   * Get exchange rate between two currencies
   * @param {string} fromCurrency - Source currency code
   * @param {string} toCurrency - Target currency code
   * @returns {Promise<Object|null>} Rate data or null if not found
   */
  async getRate(fromCurrency, toCurrency) {
    try {
      fromCurrency = fromCurrency.toUpperCase();
      toCurrency = toCurrency.toUpperCase();

      // Check cache first
      const cacheKey = this._cacheKey('rate', fromCurrency, toCurrency);
      const cachedRate = this._getFromCache(cacheKey);
      if (cachedRate) {
        return cachedRate;
      }

      // Use model's static method
      const rateData = await CurrencyRate.getRate(fromCurrency, toCurrency);

      if (rateData) {
        // Cache the result
        this._setCache(cacheKey, rateData);
      }

      return rateData;
    } catch (error) {
      console.error('Error getting exchange rate:', error);
      return null;
    }
  }

  /**
   * Get all rates for a base currency
   * @param {string} baseCurrency - Base currency code
   * @returns {Promise<Array<Object>>} Array of rate data
   */
  async getRates(baseCurrency) {
    try {
      baseCurrency = baseCurrency.toUpperCase();

      // Check cache first
      const cacheKey = this._cacheKey('rates', baseCurrency);
      const cachedRates = this._getFromCache(cacheKey);
      if (cachedRates) {
        return cachedRates;
      }

      const rates = await CurrencyRate.getRatesForBase(baseCurrency);

      // Cache the result
      this._setCache(cacheKey, rates);

      return rates;
    } catch (error) {
      console.error('Error getting rates:', error);
      return [];
    }
  }

  // ==================== RATE MANAGEMENT ====================

  /**
   * Update a single exchange rate
   * @param {string} baseCurrency - Base currency code
   * @param {string} targetCurrency - Target currency code
   * @param {number} rate - Exchange rate
   * @param {string} [source='manual'] - Rate source
   * @returns {Promise<Object>} Updated rate document
   */
  async updateRate(baseCurrency, targetCurrency, rate, source = 'manual') {
    try {
      const updatedRate = await CurrencyRate.updateRate(
        baseCurrency,
        targetCurrency,
        rate,
        source
      );

      // Clear relevant cache entries
      this.cache.delete(this._cacheKey('rate', baseCurrency, targetCurrency));
      this.cache.delete(this._cacheKey('rate', targetCurrency, baseCurrency));
      this.cache.delete(this._cacheKey('rates', baseCurrency));

      return updatedRate;
    } catch (error) {
      console.error('Error updating rate:', error);
      throw error;
    }
  }

  /**
   * Bulk update rates from API
   * @param {string} baseCurrency - Base currency code
   * @param {Object} rates - Object with currency codes as keys and rates as values
   * @param {string} [source='api'] - Rate source
   * @returns {Promise<Object>} Bulk write result
   */
  async bulkUpdateRates(baseCurrency, rates, source = 'api') {
    try {
      const result = await CurrencyRate.bulkUpdateRates(baseCurrency, rates, source);

      // Clear cache for this base currency
      this.cache.delete(this._cacheKey('rates', baseCurrency));

      // Clear individual rate caches
      Object.keys(rates).forEach((targetCurrency) => {
        this.cache.delete(this._cacheKey('rate', baseCurrency, targetCurrency));
        this.cache.delete(this._cacheKey('rate', targetCurrency, baseCurrency));
      });

      return result;
    } catch (error) {
      console.error('Error bulk updating rates:', error);
      throw error;
    }
  }

  /**
   * Fetch rates from external API
   * @param {string} [baseCurrency='USD'] - Base currency code
   * @returns {Promise<Object>} Fetched rates
   */
  async fetchRatesFromAPI(baseCurrency = 'USD') {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/${baseCurrency}`, {
        timeout: 10000,
      });

      if (!response.data || !response.data.rates) {
        throw new Error('Invalid API response format');
      }

      // Filter only supported currencies
      const filteredRates = {};
      for (const currency of this.supportedCurrencies) {
        if (currency !== baseCurrency && response.data.rates[currency]) {
          filteredRates[currency] = response.data.rates[currency];
        }
      }

      return {
        base: baseCurrency,
        date: response.data.date || new Date().toISOString().split('T')[0],
        rates: filteredRates,
      };
    } catch (error) {
      console.error('Error fetching rates from API:', error.message);
      throw error;
    }
  }

  /**
   * Sync all rates from external source
   * @returns {Promise<Object>} Sync result with updated currencies
   */
  async syncRates() {
    try {
      const results = {
        success: [],
        failed: [],
        timestamp: new Date(),
      };

      // Fetch and update rates for base currency
      try {
        const apiData = await this.fetchRatesFromAPI(this.baseCurrency);
        await this.bulkUpdateRates(this.baseCurrency, apiData.rates, 'api');
        results.success.push(this.baseCurrency);
      } catch (error) {
        results.failed.push({ currency: this.baseCurrency, error: error.message });
      }

      console.log(`Rate sync completed. Success: ${results.success.length}, Failed: ${results.failed.length}`);
      return results;
    } catch (error) {
      console.error('Error syncing rates:', error);
      throw error;
    }
  }

  // ==================== CURRENCY INFORMATION ====================

  /**
   * Get list of supported currencies with metadata
   * @returns {Array<Object>} Array of currency information
   */
  getSupportedCurrencies() {
    return this.supportedCurrencies.map((code) => ({
      code,
      ...this.currencyInfo[code],
    }));
  }

  /**
   * Get currency details
   * @param {string} currencyCode - Currency code
   * @returns {Object|null} Currency details or null if not supported
   */
  getCurrencyInfo(currencyCode) {
    const code = currencyCode.toUpperCase();
    if (!this.supportedCurrencies.includes(code)) {
      return null;
    }
    return {
      code,
      ...this.currencyInfo[code],
    };
  }

  /**
   * Format amount for display
   * @param {number} amount - Amount to format
   * @param {string} currencyCode - Currency code
   * @param {string} [locale='en'] - Locale for formatting
   * @returns {string} Formatted amount string
   */
  formatAmount(amount, currencyCode, locale = 'en') {
    try {
      const code = currencyCode.toUpperCase();
      const info = this.currencyInfo[code];

      if (!info) {
        return `${amount} ${code}`;
      }

      const useLocale = locale === 'en' ? info.locale : locale;
      const formatter = new Intl.NumberFormat(useLocale, {
        style: 'currency',
        currency: code,
        minimumFractionDigits: info.decimals,
        maximumFractionDigits: info.decimals,
      });

      return formatter.format(amount);
    } catch (error) {
      console.error('Error formatting amount:', error);
      return `${amount} ${currencyCode}`;
    }
  }

  // ==================== RATE MONITORING ====================

  /**
   * Get rates that need updating
   * @param {number} [thresholdMinutes=120] - Staleness threshold in minutes
   * @returns {Promise<Array<Object>>} Array of stale rate documents
   */
  async getStaleRates(thresholdMinutes = 120) {
    try {
      return await CurrencyRate.getStaleRates(thresholdMinutes);
    } catch (error) {
      console.error('Error getting stale rates:', error);
      return [];
    }
  }

  /**
   * Check if a specific rate is stale
   * @param {string} fromCurrency - Source currency code
   * @param {string} toCurrency - Target currency code
   * @returns {Promise<boolean>} True if rate is stale or not found
   */
  async isRateStale(fromCurrency, toCurrency) {
    try {
      fromCurrency = fromCurrency.toUpperCase();
      toCurrency = toCurrency.toUpperCase();

      const rate = await CurrencyRate.findOne({
        baseCurrency: fromCurrency,
        targetCurrency: toCurrency,
        isActive: true,
      });

      if (!rate) {
        return true;
      }

      return rate.isStale();
    } catch (error) {
      console.error('Error checking rate staleness:', error);
      return true;
    }
  }

  /**
   * Get historical rates for a currency pair
   * @param {string} fromCurrency - Source currency code
   * @param {string} toCurrency - Target currency code
   * @param {number} [days=30] - Number of days of history
   * @returns {Promise<Array<Object>>} Array of historical rate data
   */
  async getRateHistory(fromCurrency, toCurrency, days = 30) {
    try {
      fromCurrency = fromCurrency.toUpperCase();
      toCurrency = toCurrency.toUpperCase();

      const rate = await CurrencyRate.findOne({
        baseCurrency: fromCurrency,
        targetCurrency: toCurrency,
        isActive: true,
      });

      if (!rate || !rate.history) {
        return [];
      }

      // Filter history to requested days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return rate.history
        .filter((h) => new Date(h.date) >= cutoffDate)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (error) {
      console.error('Error getting rate history:', error);
      return [];
    }
  }
}

// Create singleton instance
const currencyService = new CurrencyService();

module.exports = currencyService;
