/**
 * End-to-End Payment Flow Integration Tests
 * Tests complete payment lifecycle from deposit to withdrawal
 */

const request = require('supertest');
const app = require('../../../server/server');
const { User, PaymentTransaction, PaymentMethod } = require('../../../server/models');
const { userFactory } = require('../../factories');

describe('Payment Flow Integration', () => {
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

  describe('Deposit Flow', () => {
    it('should complete full deposit flow with KBZPay', async () => {
      // Step 1: Initiate deposit
      const depositResponse = await request(app)
        .post('/api/payments/deposit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50000,
          currency: 'MMK',
          provider: 'kbz_pay',
        })
        .expect(200);

      const transactionId = depositResponse.body.data.transaction._id;
      expect(depositResponse.body.data.transaction.status).toBe('pending');

      // Step 2: Simulate payment provider webhook
      await request(app)
        .post('/api/payments/webhook/kbz_pay')
        .send({
          transactionId: depositResponse.body.data.transaction.providerTransactionId,
          status: 'success',
          amount: 50000,
        })
        .expect(200);

      // Step 3: Verify transaction completed
      const transaction = await PaymentTransaction.findById(transactionId);
      expect(transaction.status).toBe('completed');

      // Step 4: Verify user balance updated
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.availableBalance).toBe(50000);
    });

    it('should handle failed deposit', async () => {
      const depositResponse = await request(app)
        .post('/api/payments/deposit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50000,
          currency: 'MMK',
          provider: 'kbz_pay',
        })
        .expect(200);

      const transactionId = depositResponse.body.data.transaction._id;

      // Simulate failed payment
      await request(app)
        .post('/api/payments/webhook/kbz_pay')
        .send({
          transactionId: depositResponse.body.data.transaction.providerTransactionId,
          status: 'failed',
          amount: 50000,
          errorCode: 'INSUFFICIENT_FUNDS',
        })
        .expect(200);

      const transaction = await PaymentTransaction.findById(transactionId);
      expect(transaction.status).toBe('failed');

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.availableBalance).toBe(0);
    });
  });

  describe('Withdrawal Flow', () => {
    beforeEach(async () => {
      // Setup: Add balance and payment method
      await User.findByIdAndUpdate(user._id, { availableBalance: 100000 });

      const methodResponse = await request(app)
        .post('/api/payments/methods')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'kbz_pay',
          accountNumber: '09123456789',
          accountName: 'Test User',
          isDefault: true,
        })
        .expect(201);

      // Verify the payment method
      await PaymentMethod.findByIdAndUpdate(
        methodResponse.body.data.method._id,
        { isVerified: true }
      );
    });

    it('should complete full withdrawal flow', async () => {
      const paymentMethod = await PaymentMethod.findOne({ userId: user._id });

      // Step 1: Request withdrawal
      const withdrawalResponse = await request(app)
        .post('/api/payments/withdrawal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50000,
          currency: 'MMK',
          paymentMethodId: paymentMethod._id.toString(),
        })
        .expect(200);

      const transactionId = withdrawalResponse.body.data.transaction._id;
      expect(withdrawalResponse.body.data.transaction.status).toBe('pending');

      // Step 2: Verify balance deducted (pending)
      const userAfterRequest = await User.findById(user._id);
      expect(userAfterRequest.availableBalance).toBe(50000);
      expect(userAfterRequest.pendingBalance).toBe(50000);

      // Step 3: Simulate provider confirmation
      await request(app)
        .post('/api/payments/webhook/kbz_pay')
        .send({
          transactionId: withdrawalResponse.body.data.transaction.providerTransactionId,
          status: 'success',
          amount: 50000,
        })
        .expect(200);

      // Step 4: Verify final state
      const transaction = await PaymentTransaction.findById(transactionId);
      expect(transaction.status).toBe('completed');

      const finalUser = await User.findById(user._id);
      expect(finalUser.availableBalance).toBe(50000);
      expect(finalUser.pendingBalance).toBe(0);
    });

    it('should handle withdrawal failure and refund', async () => {
      const paymentMethod = await PaymentMethod.findOne({ userId: user._id });

      const withdrawalResponse = await request(app)
        .post('/api/payments/withdrawal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50000,
          currency: 'MMK',
          paymentMethodId: paymentMethod._id.toString(),
        })
        .expect(200);

      const transactionId = withdrawalResponse.body.data.transaction._id;

      // Simulate failed withdrawal
      await request(app)
        .post('/api/payments/webhook/kbz_pay')
        .send({
          transactionId: withdrawalResponse.body.data.transaction.providerTransactionId,
          status: 'failed',
          amount: 50000,
          errorCode: 'INVALID_ACCOUNT',
        })
        .expect(200);

      // Verify refund
      const transaction = await PaymentTransaction.findById(transactionId);
      expect(transaction.status).toBe('failed');

      const finalUser = await User.findById(user._id);
      expect(finalUser.availableBalance).toBe(100000); // Refunded
      expect(finalUser.pendingBalance).toBe(0);
    });

    it('should reject withdrawal with insufficient balance', async () => {
      const paymentMethod = await PaymentMethod.findOne({ userId: user._id });

      await request(app)
        .post('/api/payments/withdrawal')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 200000, // More than available
          currency: 'MMK',
          paymentMethodId: paymentMethod._id.toString(),
        })
        .expect(400);
    });
  });

  describe('Transaction History', () => {
    it('should track all transactions', async () => {
      // Create multiple transactions
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
        {
          userId: user._id,
          type: 'referral_bonus',
          amount: 150000,
          currency: 'MMK',
          status: 'completed',
          description: 'Referral bonus for hire',
        },
      ]);

      const response = await request(app)
        .get('/api/payments/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.transactions.length).toBeGreaterThanOrEqual(3);

      // Verify transaction types
      const types = response.body.data.transactions.map(t => t.type);
      expect(types).toContain('deposit');
      expect(types).toContain('withdrawal');
      expect(types).toContain('referral_bonus');
    });

    it('should calculate correct balance from transactions', async () => {
      await PaymentTransaction.create([
        { userId: user._id, type: 'deposit', amount: 100000, currency: 'MMK', status: 'completed' },
        { userId: user._id, type: 'withdrawal', amount: 30000, currency: 'MMK', status: 'completed' },
        { userId: user._id, type: 'referral_bonus', amount: 50000, currency: 'MMK', status: 'completed' },
      ]);

      const response = await request(app)
        .get('/api/payments/balance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 100000 - 30000 + 50000 = 120000
      expect(response.body.data.balance.available).toBe(120000);
    });
  });

  describe('Payment Method Management', () => {
    it('should support multiple payment methods', async () => {
      // Add KBZPay
      await request(app)
        .post('/api/payments/methods')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'kbz_pay',
          accountNumber: '09123456789',
          accountName: 'Test User',
          isDefault: true,
        })
        .expect(201);

      // Add WavePay
      await request(app)
        .post('/api/payments/methods')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'wave_pay',
          accountNumber: '09987654321',
          accountName: 'Test User',
          isDefault: false,
        })
        .expect(201);

      // Get all methods
      const response = await request(app)
        .get('/api/payments/methods')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.methods.length).toBe(2);
      expect(response.body.data.methods.some(m => m.type === 'kbz_pay')).toBe(true);
      expect(response.body.data.methods.some(m => m.type === 'wave_pay')).toBe(true);
    });

    it('should set default payment method', async () => {
      const method1 = await request(app)
        .post('/api/payments/methods')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'kbz_pay',
          accountNumber: '09123456789',
          accountName: 'Test User',
          isDefault: true,
        })
        .expect(201);

      const method2 = await request(app)
        .post('/api/payments/methods')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'wave_pay',
          accountNumber: '09987654321',
          accountName: 'Test User',
          isDefault: false,
        })
        .expect(201);

      // Set second method as default
      await request(app)
        .patch(`/api/payments/methods/${method2.body.data.method._id}/default`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify
      const methods = await PaymentMethod.find({ userId: user._id });
      const defaultMethod = methods.find(m => m.isDefault);
      expect(defaultMethod.type).toBe('wave_pay');
    });
  });
});
