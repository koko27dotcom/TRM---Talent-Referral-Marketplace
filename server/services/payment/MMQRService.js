/**
 * MMQRService
 * Myanmar Quick Response (MMQR) standard implementation
 * Provides unified QR code generation for interoperability between payment providers
 * Based on Myanmar Payment Union (MPU) and Central Bank of Myanmar standards
 */

const QRCode = require('qrcode');
const crypto = require('crypto');

class MMQRService {
  constructor(config = {}) {
    this.config = {
      merchantId: config.merchantId || process.env.MMQR_MERCHANT_ID,
      merchantName: config.merchantName || process.env.MMQR_MERCHANT_NAME || 'MyanJobs',
      merchantCity: config.merchantCity || process.env.MMQR_MERCHANT_CITY || 'Yangon',
      countryCode: config.countryCode || 'MM',
      currencyCode: config.currencyCode || '104', // MMK ISO numeric code
      ...config
    };

    // MMQR TLV (Tag-Length-Value) tags
    this.TAGS = {
      PAYLOAD_FORMAT_INDICATOR: '00',
      POINT_OF_INITIATION_METHOD: '01',
      MERCHANT_ACCOUNT_INFORMATION: '26',
      MERCHANT_ACCOUNT_INFORMATION_RESERVED: '26',
      MERCHANT_ACCOUNT_INFORMATION_RESERVED_ADDITIONAL: '27',
      MERCHANT_CATEGORY_CODE: '52',
      TRANSACTION_CURRENCY: '53',
      TRANSACTION_AMOUNT: '54',
      TIP_OR_CONVENIENCE_INDICATOR: '55',
      VALUE_OF_CONVENIENCE_FEE_FIXED: '56',
      VALUE_OF_CONVENIENCE_FEE_PERCENTAGE: '57',
      COUNTRY_CODE: '58',
      MERCHANT_NAME: '59',
      MERCHANT_CITY: '60',
      POSTAL_CODE: '61',
      ADDITIONAL_DATA_FIELD_TEMPLATE: '62',
      CRC: '63'
    };

    // Myanmar-specific payment network identifiers
    this.PAYMENT_NETWORKS = {
      KBZPAY: 'kbzpay',
      WAVEPAY: 'wavepay',
      AYAPAY: 'ayapay',
      MPU: 'mpu',
      ONESTOP: 'onestop',
      UNIFIED: 'unified'
    };
  }

  /**
   * Generate MMQR code data
   * @param {Object} params - QR generation parameters
   * @param {number} params.amount - Transaction amount
   * @param {string} params.currency - Currency code (default: MMK)
   * @param {string} params.orderId - Order/invoice ID
   * @param {string} params.description - Transaction description
   * @param {string} params.provider - Preferred provider (kbzpay, wavepay, ayapay, unified)
   * @param {Object} params.additionalData - Additional data fields
   * @returns {Object} QR code data and image
   */
  async generateQRCode(params) {
    const {
      amount,
      currency = 'MMK',
      orderId,
      description,
      provider = 'unified',
      additionalData = {}
    } = params;

    try {
      // Generate EMVCo-compliant QR string
      const qrString = this.generateEMVCoString({
        amount,
        currency,
        orderId,
        description,
        provider,
        additionalData
      });

      // Calculate CRC
      const qrWithCRC = this.calculateCRC(qrString);

      // Generate QR code image
      const qrImage = await QRCode.toDataURL(qrWithCRC, {
        type: 'image/png',
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return {
        success: true,
        qrString: qrWithCRC,
        qrImage,
        provider,
        amount,
        currency,
        orderId,
        expiryTime: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min expiry
      };
    } catch (error) {
      console.error('MMQR Generation Error:', error);
      throw new Error(`Failed to generate MMQR code: ${error.message}`);
    }
  }

  /**
   * Generate unified MMQR that works with multiple providers
   * @param {Object} params - Generation parameters
   * @returns {Object} Unified QR code data
   */
  async generateUnifiedQRCode(params) {
    const {
      amount,
      currency = 'MMK',
      orderId,
      description,
      supportedProviders = ['kbzpay', 'wavepay', 'ayapay'],
      additionalData = {}
    } = params;

    try {
      // Generate merchant account information for each provider
      const merchantAccounts = supportedProviders.map(provider => 
        this.generateMerchantAccountInfo(provider, orderId)
      );

      // Build unified QR string
      const qrString = this.buildUnifiedQRString({
        amount,
        currency,
        orderId,
        description,
        merchantAccounts,
        additionalData
      });

      // Calculate CRC
      const qrWithCRC = this.calculateCRC(qrString);

      // Generate QR code image
      const qrImage = await QRCode.toDataURL(qrWithCRC, {
        type: 'image/png',
        width: 512,
        margin: 2,
        errorCorrectionLevel: 'H'
      });

      return {
        success: true,
        qrString: qrWithCRC,
        qrImage,
        type: 'unified',
        supportedProviders,
        amount,
        currency,
        orderId,
        expiryTime: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      };
    } catch (error) {
      console.error('Unified MMQR Generation Error:', error);
      throw new Error(`Failed to generate unified MMQR code: ${error.message}`);
    }
  }

  /**
   * Generate EMVCo-compliant QR string
   */
  generateEMVCoString(params) {
    const { amount, currency, orderId, description, provider, additionalData } = params;

    const data = [];

    // Payload Format Indicator (required)
    data.push(this.buildTLV(this.TAGS.PAYLOAD_FORMAT_INDICATOR, '01'));

    // Point of Initiation Method (static = 11, dynamic = 12)
    data.push(this.buildTLV(this.TAGS.POINT_OF_INITIATION_METHOD, '11'));

    // Merchant Account Information
    const merchantAccountInfo = this.generateMerchantAccountInfo(provider, orderId);
    data.push(this.buildTLV(this.TAGS.MERCHANT_ACCOUNT_INFORMATION, merchantAccountInfo));

    // Merchant Category Code (MCC) - 7399 for Business Services
    data.push(this.buildTLV(this.TAGS.MERCHANT_CATEGORY_CODE, '7399'));

    // Transaction Currency
    const currencyCode = this.getCurrencyCode(currency);
    data.push(this.buildTLV(this.TAGS.TRANSACTION_CURRENCY, currencyCode));

    // Transaction Amount (if provided)
    if (amount) {
      const formattedAmount = parseFloat(amount).toFixed(2);
      data.push(this.buildTLV(this.TAGS.TRANSACTION_AMOUNT, formattedAmount));
    }

    // Country Code
    data.push(this.buildTLV(this.TAGS.COUNTRY_CODE, this.config.countryCode));

    // Merchant Name
    data.push(this.buildTLV(this.TAGS.MERCHANT_NAME, this.config.merchantName));

    // Merchant City
    data.push(this.buildTLV(this.TAGS.MERCHANT_CITY, this.config.merchantCity));

    // Additional Data Field Template
    const additionalDataField = this.buildAdditionalDataField({
      orderId,
      description,
      ...additionalData
    });
    data.push(this.buildTLV(this.TAGS.ADDITIONAL_DATA_FIELD_TEMPLATE, additionalDataField));

    // Join all fields
    return data.join('');
  }

  /**
   * Build unified QR string with multiple merchant accounts
   */
  buildUnifiedQRString(params) {
    const { amount, currency, orderId, description, merchantAccounts, additionalData } = params;

    const data = [];

    // Payload Format Indicator
    data.push(this.buildTLV(this.TAGS.PAYLOAD_FORMAT_INDICATOR, '01'));

    // Point of Initiation Method
    data.push(this.buildTLV(this.TAGS.POINT_OF_INITIATION_METHOD, '12'));

    // Multiple Merchant Account Information (one per provider)
    merchantAccounts.forEach((accountInfo, index) => {
      const tag = index === 0 ? this.TAGS.MERCHANT_ACCOUNT_INFORMATION : '27';
      data.push(this.buildTLV(tag, accountInfo));
    });

    // Merchant Category Code
    data.push(this.buildTLV(this.TAGS.MERCHANT_CATEGORY_CODE, '7399'));

    // Transaction Currency
    const currencyCode = this.getCurrencyCode(currency);
    data.push(this.buildTLV(this.TAGS.TRANSACTION_CURRENCY, currencyCode));

    // Transaction Amount
    if (amount) {
      const formattedAmount = parseFloat(amount).toFixed(2);
      data.push(this.buildTLV(this.TAGS.TRANSACTION_AMOUNT, formattedAmount));
    }

    // Country Code
    data.push(this.buildTLV(this.TAGS.COUNTRY_CODE, this.config.countryCode));

    // Merchant Name
    data.push(this.buildTLV(this.TAGS.MERCHANT_NAME, this.config.merchantName));

    // Merchant City
    data.push(this.buildTLV(this.TAGS.MERCHANT_CITY, this.config.merchantCity));

    // Additional Data Field Template
    const additionalDataField = this.buildAdditionalDataField({
      orderId,
      description,
      ...additionalData
    });
    data.push(this.buildTLV(this.TAGS.ADDITIONAL_DATA_FIELD_TEMPLATE, additionalDataField));

    return data.join('');
  }

  /**
   * Generate merchant account information for specific provider
   */
  generateMerchantAccountInfo(provider, orderId) {
    const data = [];

    // Global Unique Identifier (GUI) for Myanmar payment networks
    const guiMap = {
      kbzpay: 'mm.kbzpay',
      wavepay: 'mm.wavepay',
      ayapay: 'mm.ayapay',
      mpu: 'mm.mpu',
      onestop: 'mm.onestop',
      unified: 'mm.unified'
    };

    const gui = guiMap[provider] || 'mm.unified';
    data.push(this.buildTLV('00', gui));

    // Merchant account ID
    data.push(this.buildTLV('01', this.config.merchantId));

    // Merchant reference/order ID
    data.push(this.buildTLV('02', orderId));

    // Provider-specific data
    if (provider === 'kbzpay') {
      data.push(this.buildTLV('03', 'KBZ'));
    } else if (provider === 'wavepay') {
      data.push(this.buildTLV('03', 'WAVE'));
    } else if (provider === 'ayapay') {
      data.push(this.buildTLV('03', 'AYA'));
    }

    return data.join('');
  }

  /**
   * Build additional data field template
   */
  buildAdditionalDataField(data) {
    const fields = [];

    // Bill Number (Order ID)
    if (data.orderId) {
      fields.push(this.buildTLV('01', data.orderId));
    }

    // Mobile Number
    if (data.mobileNumber) {
      fields.push(this.buildTLV('02', data.mobileNumber));
    }

    // Store Label
    if (data.storeLabel) {
      fields.push(this.buildTLV('03', data.storeLabel));
    }

    // Loyalty Number
    if (data.loyaltyNumber) {
      fields.push(this.buildTLV('04', data.loyaltyNumber));
    }

    // Reference Label
    if (data.referenceLabel) {
      fields.push(this.buildTLV('05', data.referenceLabel));
    }

    // Customer Label
    if (data.customerLabel) {
      fields.push(this.buildTLV('06', data.customerLabel));
    }

    // Terminal Label
    if (data.terminalLabel) {
      fields.push(this.buildTLV('07', data.terminalLabel));
    }

    // Purpose of Transaction (Description)
    if (data.description) {
      fields.push(this.buildTLV('08', data.description.substring(0, 25)));
    }

    // Additional Consumer Data Request
    if (data.consumerDataRequest) {
      fields.push(this.buildTLV('09', data.consumerDataRequest));
    }

    // Payment System Specific
    if (data.paymentSystemSpecific) {
      Object.entries(data.paymentSystemSpecific).forEach(([key, value]) => {
        fields.push(this.buildTLV(key, value));
      });
    }

    return fields.join('');
  }

  /**
   * Build TLV (Tag-Length-Value) string
   */
  buildTLV(tag, value) {
    if (!value) return '';
    const length = value.length.toString().padStart(2, '0');
    return `${tag}${length}${value}`;
  }

  /**
   * Calculate CRC16-CCITT checksum
   */
  calculateCRC(qrString) {
    // Append CRC tag without value
    const data = qrString + this.TAGS.CRC + '04';
    
    // Calculate CRC16-CCITT
    let crc = 0xFFFF;
    const polynomial = 0x1021;

    for (let i = 0; i < data.length; i++) {
      const byte = data.charCodeAt(i);
      crc ^= (byte << 8);
      
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ polynomial;
        } else {
          crc = crc << 1;
        }
        crc &= 0xFFFF;
      }
    }

    const crcHex = crc.toString(16).toUpperCase().padStart(4, '0');
    return data + crcHex;
  }

  /**
   * Parse MMQR code string
   * @param {string} qrString - QR code string to parse
   * @returns {Object} Parsed QR data
   */
  parseQRCode(qrString) {
    try {
      const result = {};
      let index = 0;

      while (index < qrString.length) {
        // Extract tag (2 characters)
        const tag = qrString.substring(index, index + 2);
        index += 2;

        // Extract length (2 characters)
        const length = parseInt(qrString.substring(index, index + 2), 10);
        index += 2;

        // Extract value
        const value = qrString.substring(index, index + length);
        index += length;

        // Handle nested TLV structures
        if (tag === this.TAGS.MERCHANT_ACCOUNT_INFORMATION || 
            tag === this.TAGS.ADDITIONAL_DATA_FIELD_TEMPLATE) {
          result[tag] = this.parseNestedTLV(value);
        } else {
          result[tag] = value;
        }

        // Stop at CRC
        if (tag === this.TAGS.CRC) break;
      }

      return this.normalizeParsedData(result);
    } catch (error) {
      throw new Error(`Failed to parse MMQR code: ${error.message}`);
    }
  }

  /**
   * Parse nested TLV structure
   */
  parseNestedTLV(data) {
    const result = {};
    let index = 0;

    while (index < data.length) {
      const tag = data.substring(index, index + 2);
      index += 2;

      const length = parseInt(data.substring(index, index + 2), 10);
      index += 2;

      const value = data.substring(index, index + length);
      index += length;

      result[tag] = value;
    }

    return result;
  }

  /**
   * Normalize parsed QR data
   */
  normalizeParsedData(data) {
    return {
      payloadFormat: data[this.TAGS.PAYLOAD_FORMAT_INDICATOR],
      pointOfInitiation: data[this.TAGS.POINT_OF_INITIATION_METHOD],
      merchantAccountInfo: data[this.TAGS.MERCHANT_ACCOUNT_INFORMATION],
      merchantCategoryCode: data[this.TAGS.MERCHANT_CATEGORY_CODE],
      currency: this.getCurrencyFromCode(data[this.TAGS.TRANSACTION_CURRENCY]),
      amount: data[this.TAGS.TRANSACTION_AMOUNT],
      countryCode: data[this.TAGS.COUNTRY_CODE],
      merchantName: data[this.TAGS.MERCHANT_NAME],
      merchantCity: data[this.TAGS.MERCHANT_CITY],
      postalCode: data[this.TAGS.POSTAL_CODE],
      additionalData: data[this.TAGS.ADDITIONAL_DATA_FIELD_TEMPLATE],
      crc: data[this.TAGS.CRC]
    };
  }

  /**
   * Get ISO numeric currency code
   */
  getCurrencyCode(currency) {
    const codes = {
      'MMK': '104',
      'USD': '840',
      'THB': '764',
      'SGD': '702'
    };
    return codes[currency] || '104';
  }

  /**
   * Get currency from ISO numeric code
   */
  getCurrencyFromCode(code) {
    const currencies = {
      '104': 'MMK',
      '840': 'USD',
      '764': 'THB',
      '702': 'SGD'
    };
    return currencies[code] || 'MMK';
  }

  /**
   * Validate QR code string
   */
  validateQRCode(qrString) {
    try {
      // Check minimum length
      if (qrString.length < 10) {
        return { valid: false, error: 'QR code too short' };
      }

      // Check payload format indicator
      if (!qrString.startsWith('0002')) {
        return { valid: false, error: 'Invalid payload format' };
      }

      // Verify CRC
      const dataWithoutCRC = qrString.substring(0, qrString.length - 4);
      const providedCRC = qrString.substring(qrString.length - 4);
      const calculatedCRC = this.calculateCRC(dataWithoutCRC).slice(-4);

      if (providedCRC.toUpperCase() !== calculatedCRC.toUpperCase()) {
        return { valid: false, error: 'CRC mismatch' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Generate payment URL from QR data
   */
  generatePaymentUrl(qrData) {
    const { provider, orderId, amount } = qrData;
    
    const urlMap = {
      kbzpay: `kbzpay://payment?orderId=${orderId}&amount=${amount}`,
      wavepay: `wavepay://payment?orderId=${orderId}&amount=${amount}`,
      ayapay: `ayapay://payment?orderId=${orderId}&amount=${amount}`
    };

    return urlMap[provider] || null;
  }
}

module.exports = MMQRService;
