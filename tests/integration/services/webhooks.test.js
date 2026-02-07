/**
 * Webhook Integration Tests
 * Tests for webhook processing and verification
 */

const request = require('supertest');
const app = require('../../../server/server');
const crypto = require('crypto');

describe('Webhook Integration', () => {
  describe('Payment Webhooks', () => {
    it('should verify KBZPay webhook signature', async () => {
      const payload = {
        transactionId: 'KBZ123456',
        status: 'success',
        amount: 50000,
      };

      const signature = crypto
        .createHmac('sha256', process.env.KBZPAY_WEBHOOK_SECRET || 'test-secret')
        .update(JSON.stringify(payload))
        .digest('hex');

      const response = await request(app)
        .post('/api/payments/webhook/kbz_pay')
        .set('X-Webhook-Signature', signature)
        .send(payload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = {
        transactionId: 'KBZ123456',
        status: 'success',
        amount: 50000,
      };

      const response = await request(app)
        .post('/api/payments/webhook/kbz_pay')
        .set('X-Webhook-Signature', 'invalid-signature')
        .send(payload)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle WavePay webhook', async () => {
      const payload = {
        transactionId: 'WAVE789012',
        status: 'completed',
        amount: 100000,
        currency: 'MMK',
      };

      const response = await request(app)
        .post('/api/payments/webhook/wave_pay')
        .send(payload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle AYA Pay webhook', async () => {
      const payload = {
        transactionId: 'AYA345678',
        status: 'success',
        amount: 75000,
        reference: 'REF123',
      };

      const response = await request(app)
        .post('/api/payments/webhook/aya_pay')
        .send(payload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Messaging Webhooks', () => {
    it('should handle Viber webhook', async () => {
      const payload = {
        event: 'message',
        message: {
          text: 'Hello',
          from: { id: 'viber-user-123' },
        },
        timestamp: Date.now(),
      };

      const response = await request(app)
        .post('/api/webhooks/viber')
        .send(payload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle Telegram webhook', async () => {
      const payload = {
        update_id: 123456789,
        message: {
          message_id: 1,
          from: { id: 123456789, first_name: 'Test' },
          chat: { id: 123456789, type: 'private' },
          date: Date.now(),
          text: '/start',
        },
      };

      const response = await request(app)
        .post('/api/webhooks/telegram')
        .send(payload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Webhook Security', () => {
    it('should verify webhook IP whitelist', async () => {
      const response = await request(app)
        .post('/api/payments/webhook/kbz_pay')
        .set('X-Forwarded-For', '1.2.3.4') // Non-whitelisted IP
        .send({ transactionId: 'TEST' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should handle webhook replay attacks', async () => {
      const payload = {
        transactionId: 'KBZ123456',
        status: 'success',
        timestamp: Date.now() - 600000, // 10 minutes old
      };

      const response = await request(app)
        .post('/api/payments/webhook/kbz_pay')
        .send(payload)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle duplicate webhook deliveries', async () => {
      const payload = {
        transactionId: 'KBZ123456',
        status: 'success',
        amount: 50000,
      };

      // First delivery
      await request(app)
        .post('/api/payments/webhook/kbz_pay')
        .send(payload)
        .expect(200);

      // Duplicate delivery - should be idempotent
      const response = await request(app)
        .post('/api/payments/webhook/kbz_pay')
        .send(payload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Webhook Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/payments/webhook/kbz_pay')
        .set('Content-Type', 'application/json')
        .send('invalid json{')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/payments/webhook/kbz_pay')
        .send({ status: 'success' }) // Missing transactionId
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should log webhook errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await request(app)
        .post('/api/payments/webhook/kbz_pay')
        .send({ invalid: 'data' })
        .expect(400);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
