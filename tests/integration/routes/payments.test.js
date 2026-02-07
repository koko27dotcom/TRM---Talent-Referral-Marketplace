/**
 * Payment Routes Integration Tests
 * Tests for payment API endpoints
 */

const request = require('supertest');
const app = require('../../../server/server');
const { PaymentTransaction, PaymentMethod, User } = require('../../../server/models');
const { userFactory } = require('../../factories');

describe('Payment Routes', () => {
  let authToken;
  let user;

  beforeEach(async () => {
    user = await userFactory.createVerifiedReferrer();
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: 'TestPassword123!',
      });
    authToken = loginResponse.body.data.tokens.accessToken;
  });

  describe('GET /api/payments/methods', () => {
    it('should get user payment methods', async () => {
      const response = await request(app)
        .get('/api/payments/methods')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.methods)).toBe(true);
    });
  });

  describe('POST /api/payments/methods', () => {
    it('should add a new payment method', async () => {
      const methodData = {
        type: 'kbz_pay',
        accountNumber: '09123456789',
        accountName: 'Test User',
        isDefault: true,
      };

      const response = await request(app)
        .post('/api/payments/methods')
        .set('Authorization', `Bearer ${authToken}`)
        .send(methodData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.method.type).toBe(methodData.type);
    });

    it('should reject invalid payment method type', async () => {
      const response = await request(app)
        .post('/api/payments/methods')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'invalid_provider',
          accountNumber: '09123456789',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/payments/deposit', () => {
    it('should initiate a deposit', async () => {
      const depositData = {
        amount: 50000,
        currency: 'MMK',
        provider: 'kbz_pay',
      };

      const response = await request(app)
        .post('/api/payments/deposit')
        .set('Authorization', `Bearer ${authToken}`)
        .send(depositData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction).toBeDefined();
      expect(response.body.data.transaction.amount).toBe(depositData.amount);
      expect(response.body.data.transaction.type).toBe('deposit');
    });

    it('should reject deposit with invalid amount', async () => {
      const response = await request(app)
        .post('/api/payments/deposit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: -100,
          currency: 'MMK',
          provider: 'kbz_pay',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject deposit exceeding limit', async () => {
      const response = await request(app)
        .post('/api/payments/deposit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100000000, // Exceeds limit
          currency: 'MMK',
          provider: 'kbz_pay',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/payments/withdrawal', () => {
    beforeEach(async () => {
      // Add payment method and balance for withdrawal
      await PaymentMethod.create({
        userId: user._id,
        type: 'kbz_pay',
        accountNumber: '09123456789',
        accountName: 'Test User',
        isDefault: true,
        isVerified: true,
      });

      // Update user balance
      await User.findByIdAndUpdate(user._id, { availableBalance: 100000 });
    });

    it('should initiate a withdrawal', async () => {
      const withdrawalData = {
        amount: 50000,
        currency: 'MMK',
        paymentMethodId: (await PaymentMethod.findOne({ userId: user._id }))._id.toString(),
      };

      const response = await request(app)
        .post('/api/payments/withdrawal')
        .set('Authorization', `Bearer ${authToken}`)
        .send(withdrawalData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction).toBeDefined();
      expect(response.body.data.transaction.type).toBe('withdrawal');
    });

    it('should reject withdrawal with insufficient balance', async () => {
      const response = await request(app)
        .post('/api/payments/withdrawal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 200000, // More than available balance
          currency: 'MMK',
          paymentMethodId: (await PaymentMethod.findOne({ userId: user._id }))._id.toString(),
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/payments/transactions', () => {
    it('should get transaction history', async () => {
      // Create some transactions
      await PaymentTransaction.create([
        {
          userId: user._id,
          type: 'deposit',
          amount: 50000,
          currency: 'MMK',
          status: 'completed',
          provider: 'kbz_pay',
        },
        {
          userId: user._id,
          type: 'withdrawal',
          amount: 20000,
          currency: 'MMK',
          status: 'completed',
          provider: 'kbz_pay',
        },
      ]);

      const response = await request(app)
        .get('/api/payments/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.transactions)).toBe(true);
      expect(response.body.data.transactions.length).toBeGreaterThanOrEqual(2);
    });

    it('should support filtering by type', async () => {
      const response = await request(app)
        .get('/api/payments/transactions?type=deposit')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions.every(t => t.type === 'deposit')).toBe(true);
    });
  });

  describe('GET /api/payments/balance', () => {
    it('should get user balance', async () => {
      const response = await request(app)
        .get('/api/payments/balance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.balance).toBeDefined();
      expect(typeof response.body.data.balance.available).toBe('number');
      expect(typeof response.body.data.balance.pending).toBe('number');
    });
  });

  describe('POST /api/payments/webhook/:provider', () => {
    it('should handle KBZPay webhook', async () => {
      const transaction = await PaymentTransaction.create({
        userId: user._id,
        type: 'deposit',
        amount: 50000,
        currency: 'MMK',
        status: 'pending',
        provider: 'kbz_pay',
        providerTransactionId: 'KBZ123456',
      });

      const webhookData = {
        transactionId: 'KBZ123456',
        status: 'success',
        amount: 50000,
        signature: 'valid-signature',
      };

      const response = await request(app)
        .post('/api/payments/webhook/kbz_pay')
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);

      const updatedTransaction = await PaymentTransaction.findById(transaction._id);
      expect(updatedTransaction.status).toBe('completed');
    });
  });
});
