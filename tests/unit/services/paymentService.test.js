/**
 * Payment Service Unit Tests
 * Tests for payment processing, MMQR, and Myanmar payment providers
 */

const paymentService = require('../../../server/services/payment/PaymentService');
const MMQRService = require('../../../server/services/payment/MMQRService');
const { kbzPayMocks, wavePayMocks, ayaPayMocks, stripeMocks } = require('../../mocks/external-apis');

describe('Payment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Payment Creation', () => {
    it('should create a payment intent', async () => {
      const paymentData = {
        amount: 100000,
        currency: 'MMK',
        description: 'Test payment',
        metadata: { orderId: 'order123' },
      };

      const result = await paymentService.createPayment(paymentData);

      expect(result).toBeDefined();
      expect(result.amount).toBe(paymentData.amount);
      expect(result.currency).toBe(paymentData.currency);
    });

    it('should validate payment amount', async () => {
      const paymentData = {
        amount: -100,
        currency: 'MMK',
      };

      await expect(paymentService.createPayment(paymentData))
        .rejects.toThrow('Invalid payment amount');
    });

    it('should validate currency', async () => {
      const paymentData = {
        amount: 100000,
        currency: 'INVALID',
      };

      await expect(paymentService.createPayment(paymentData))
        .rejects.toThrow('Invalid currency');
    });
  });

  describe('Payment Retrieval', () => {
    it('should retrieve payment by ID', async () => {
      const paymentId = 'pay_123';
      const result = await paymentService.getPayment(paymentId);

      expect(result).toBeDefined();
      expect(result.id).toBe(paymentId);
    });

    it('should throw error for non-existent payment', async () => {
      await expect(paymentService.getPayment('non_existent'))
        .rejects.toThrow('Payment not found');
    });
  });

  describe('Payment Confirmation', () => {
    it('should confirm successful payment', async () => {
      const paymentId = 'pay_123';
      const result = await paymentService.confirmPayment(paymentId);

      expect(result.status).toBe('succeeded');
    });

    it('should handle payment failure', async () => {
      const paymentId = 'pay_failed';

      await expect(paymentService.confirmPayment(paymentId))
        .rejects.toThrow('Payment failed');
    });
  });

  describe('Refund Processing', () => {
    it('should process full refund', async () => {
      const paymentId = 'pay_123';
      const result = await paymentService.refundPayment(paymentId);

      expect(result.status).toBe('refunded');
      expect(result.refundAmount).toBeDefined();
    });

    it('should process partial refund', async () => {
      const paymentId = 'pay_123';
      const refundAmount = 50000;

      const result = await paymentService.refundPayment(paymentId, refundAmount);

      expect(result.status).toBe('partially_refunded');
      expect(result.refundAmount).toBe(refundAmount);
    });
  });
});

describe('MMQR Service', () => {
  let mmqrService;

  beforeEach(() => {
    mmqrService = new MMQRService({
      merchantId: 'test_merchant',
      merchantName: 'Test Merchant',
    });
  });

  describe('QR Code Generation', () => {
    it('should generate MMQR code', async () => {
      const params = {
        amount: 100000,
        currency: 'MMK',
        orderId: 'order123',
        description: 'Test payment',
      };

      const result = await mmqrService.generateQRCode(params);

      expect(result).toBeDefined();
      expect(result.qrString).toBeDefined();
      expect(result.qrImage).toBeDefined();
      expect(result.qrString).toContain('MM');
    });

    it('should include CRC in QR string', async () => {
      const params = {
        amount: 100000,
        currency: 'MMK',
      };

      const result = await mmqrService.generateQRCode(params);
      const qrString = result.qrString;

      // CRC should be at the end
      expect(qrString).toMatch(/6304[A-F0-9]{4}$/);
    });

    it('should format amount correctly', async () => {
      const params = {
        amount: 100000.50,
        currency: 'MMK',
      };

      const result = await mmqrService.generateQRCode(params);

      expect(result.qrString).toContain('100000.50');
    });
  });

  describe('EMVCo String Generation', () => {
    it('should generate valid EMVCo string', () => {
      const params = {
        amount: 100000,
        currency: 'MMK',
        orderId: 'order123',
      };

      const emvString = mmqrService.generateEMVCoString(params);

      expect(emvString).toContain('00'); // Payload format indicator
      expect(emvString).toContain('01'); // Point of initiation
      expect(emvString).toContain('52'); // Merchant category code
      expect(emvString).toContain('53'); // Transaction currency
      expect(emvString).toContain('54'); // Transaction amount
    });

    it('should include merchant information', () => {
      const params = {
        amount: 100000,
        currency: 'MMK',
      };

      const emvString = mmqrService.generateEMVCoString(params);

      expect(emvString).toContain(mmqrService.config.merchantId);
      expect(emvString).toContain(mmqrService.config.merchantName);
    });
  });

  describe('CRC Calculation', () => {
    it('should calculate valid CRC', () => {
      const data = '0002010102';
      const crc = mmqrService.calculateCRC(data);

      expect(crc).toMatch(/^[A-F0-9]{4}$/);
    });

    it('should validate CRC correctly', () => {
      const data = '0002010102';
      const crc = mmqrService.calculateCRC(data);
      const fullString = data + '6304' + crc;

      const isValid = mmqrService.validateCRC(fullString);
      expect(isValid).toBe(true);
    });

    it('should detect invalid CRC', () => {
      const invalidString = '00020101026304ABCD';

      const isValid = mmqrService.validateCRC(invalidString);
      expect(isValid).toBe(false);
    });
  });

  describe('Provider-Specific QR', () => {
    it('should generate KBZPay QR', async () => {
      const params = {
        amount: 100000,
        provider: 'kbzpay',
      };

      const result = await mmqrService.generateQRCode(params);

      expect(result.provider).toBe('kbzpay');
    });

    it('should generate WavePay QR', async () => {
      const params = {
        amount: 100000,
        provider: 'wavepay',
      };

      const result = await mmqrService.generateQRCode(params);

      expect(result.provider).toBe('wavepay');
    });

    it('should generate unified QR for all providers', async () => {
      const params = {
        amount: 100000,
        provider: 'unified',
      };

      const result = await mmqrService.generateQRCode(params);

      expect(result.provider).toBe('unified');
      expect(result.compatibleProviders).toContain('kbzpay');
      expect(result.compatibleProviders).toContain('wavepay');
      expect(result.compatibleProviders).toContain('ayapay');
    });
  });
});

describe('Myanmar Payment Providers', () => {
  describe('KBZPay Provider', () => {
    it('should create KBZPay order', async () => {
      const orderData = {
        amount: 100000,
        orderId: 'order123',
        description: 'Test order',
      };

      const result = await paymentService.createKBZPayOrder(orderData);

      expect(result.Response.ResultCode).toBe('0');
      expect(result.Response.OrderId).toBeDefined();
      expect(result.Response.PrepayId).toBeDefined();
    });

    it('should query KBZPay order status', async () => {
      const orderId = 'KBZ123456';
      const result = await paymentService.queryKBZPayOrder(orderId);

      expect(result.Response.ResultCode).toBe('0');
      expect(result.Response.TransStatus).toBeDefined();
    });
  });

  describe('WavePay Provider', () => {
    it('should create WavePay payment', async () => {
      const paymentData = {
        amount: 100000,
        orderId: 'order123',
      };

      const result = await paymentService.createWavePayPayment(paymentData);

      expect(result.status).toBe('success');
      expect(result.data.payment_url).toBeDefined();
      expect(result.data.transaction_id).toBeDefined();
    });

    it('should verify WavePay payment', async () => {
      const transactionId = 'WAVE123456';
      const result = await paymentService.verifyWavePayPayment(transactionId);

      expect(result.status).toBe('success');
      expect(result.data.status).toBeDefined();
    });
  });

  describe('AYAPay Provider', () => {
    it('should create AYAPay payment', async () => {
      const paymentData = {
        amount: 100000,
        orderId: 'order123',
      };

      const result = await paymentService.createAYAPayPayment(paymentData);

      expect(result.statusCode).toBe('0000');
      expect(result.paymentToken).toBeDefined();
      expect(result.deepLink).toBeDefined();
    });

    it('should check AYAPay payment status', async () => {
      const transactionId = 'AYA123456';
      const result = await paymentService.checkAYAPayStatus(transactionId);

      expect(result.statusCode).toBe('0000');
      expect(result.transactionStatus).toBeDefined();
    });
  });
});

describe('Stripe Integration', () => {
  it('should create Stripe payment intent', async () => {
    const paymentData = {
      amount: 100000,
      currency: 'mmk',
    };

    const result = await paymentService.createStripePaymentIntent(paymentData);

    expect(result.id).toBeDefined();
    expect(result.client_secret).toBeDefined();
  });

  it('should handle Stripe webhook', async () => {
    const webhookData = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_123',
          amount: 100000,
        },
      },
    };

    const result = await paymentService.handleStripeWebhook(webhookData);

    expect(result.received).toBe(true);
  });
});
