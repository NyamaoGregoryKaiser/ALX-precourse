```javascript
const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/db');
const { hashPassword } = require('../../src/utils/crypt');
const { signToken } = require('../../src/utils/jwt');
const cacheService = require('../../src/services/cacheService');
const config = require('../../src/config');
const { v4: uuidv4 } = require('uuid');

// Mock paymentGatewayService to control external calls
jest.mock('../../src/services/paymentGatewayService', () => ({
  processPayment: jest.fn(),
  refundPayment: jest.fn(),
}));
const paymentGatewayService = require('../../src/services/paymentGatewayService');

// Use a separate test database
process.env.NODE_ENV = 'test';
process.env.DB_NAME = config.db.testName;

describe('Transaction Flow Integration Tests', () => {
  let userToken, userId;
  let merchantToken, merchantId, merchantUserId;
  let adminToken, adminId;
  let testMerchant;

  beforeAll(async () => {
    // Run migrations and seeds for the test database
    await db.migrate.latest();
    await db.seed.run();

    // Setup a test user, merchant, and admin
    const hashedPassword = await hashPassword('testpassword');

    // Create a regular user
    const newUser = { id: uuidv4(), name: 'Test User', email: 'test@user.com', password: hashedPassword, type: 'user', status: 'active' };
    await db('users').insert(newUser);
    userId = newUser.id;
    userToken = signToken({ id: userId, type: 'user' });

    // Create a merchant user
    const newMerchantUser = { id: uuidv4(), name: 'Test Merchant User', email: 'test@merchant.com', password: hashedPassword, type: 'merchant', status: 'active' };
    await db('users').insert(newMerchantUser);
    merchantUserId = newMerchantUser.id;
    merchantToken = signToken({ id: merchantUserId, type: 'merchant' });

    // Create a merchant account linked to the merchant user
    testMerchant = { id: uuidv4(), user_id: merchantUserId, name: 'Test Merchant', webhook_url: 'http://example.com/webhook', status: 'active' };
    await db('merchants').insert(testMerchant);
    merchantId = testMerchant.id;
    await db('users').where({ id: merchantUserId }).update({ merchant_id: merchantId });


    // Create an admin user
    const newAdminUser = { id: uuidv4(), name: 'Admin User', email: 'admin@test.com', password: hashedPassword, type: 'admin', status: 'active' };
    await db('users').insert(newAdminUser);
    adminId = newAdminUser.id;
    adminToken = signToken({ id: adminId, type: 'admin' });

    // Clear cache
    await cacheService.invalidatePrefix('*');
  });

  afterAll(async () => {
    await db.migrate.rollback();
    await db.destroy();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure mocks return successful responses by default
    paymentGatewayService.processPayment.mockResolvedValue({
      status: 'approved',
      gatewayTransactionId: `gtx_${uuidv4()}`,
      message: 'Payment approved',
      metadata: { mockResponse: 'success' },
    });
    paymentGatewayService.refundPayment.mockResolvedValue({
      status: 'refunded',
      gatewayRefundId: `grf_${uuidv4()}`,
      message: 'Refund processed',
      metadata: { mockResponse: 'refund_success' },
    });
  });


  // --- Create Transaction Tests ---
  describe('POST /api/v1/transactions', () => {
    const validCardDetails = {
      cardHolderName: 'John Doe',
      cardNumber: '4242424242424242',
      expiryMonth: 12,
      expiryYear: 2025,
      cvv: '123',
    };

    it('should allow a regular user to create a new transaction with direct card details', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 50.00,
          currency: 'USD',
          description: 'Test purchase',
          merchantId: merchantId,
          ...validCardDetails,
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.transaction).toHaveProperty('id');
      expect(res.body.data.transaction.status).toBe('completed');
      expect(res.body.data.transaction.user_id).toBe(userId);
      expect(res.body.data.transaction.merchant_id).toBe(merchantId);
      expect(paymentGatewayService.processPayment).toHaveBeenCalledTimes(1);

      // Verify transaction is in DB
      const transactionInDb = await db('transactions').where({ id: res.body.data.transaction.id }).first();
      expect(transactionInDb).not.toBeNull();
      expect(transactionInDb.status).toBe('completed');
    });

    it('should return 400 if validation fails for transaction creation', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: -10, // Invalid amount
          currency: 'USD',
          merchantId: merchantId,
          ...validCardDetails,
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('error');
      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(paymentGatewayService.processPayment).not.toHaveBeenCalled();
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .send({
          amount: 50.00,
          currency: 'USD',
          merchantId: merchantId,
          ...validCardDetails,
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe('error');
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it('should return 403 if a merchant tries to create a charge', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          amount: 50.00,
          currency: 'USD',
          merchantId: merchantId,
          ...validCardDetails,
        });

      expect(res.statusCode).toEqual(403);
      expect(res.body.status).toBe('error');
      expect(res.body.code).toBe('UNAUTHORIZED_ACTION');
    });

    it('should set transaction status to failed if payment gateway declines', async () => {
      paymentGatewayService.processPayment.mockRejectedValue(
        new AppError('Payment declined by gateway', 400, 'GATEWAY_DECLINED')
      );

      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 1.00,
          currency: 'USD',
          description: 'Declined test',
          merchantId: merchantId,
          ...validCardDetails,
        });

      expect(res.statusCode).toEqual(400); // Because gateway error propagates as 400
      expect(res.body.status).toBe('error');
      expect(res.body.code).toBe('GATEWAY_DECLINED');

      // Check DB to ensure transaction status is 'failed'
      const transactionInDb = await db('transactions')
        .where({ user_id: userId, amount: 1.00 })
        .orderBy('created_at', 'desc')
        .first();
      expect(transactionInDb).not.toBeNull();
      expect(transactionInDb.status).toBe('failed');
    });
  });


  // --- Refund Transaction Tests ---
  describe('POST /api/v1/transactions/:transactionId/refund', () => {
    let completedTransactionId;

    beforeEach(async () => {
      // Create a completed transaction for testing refunds
      const transaction = {
        id: uuidv4(),
        user_id: userId,
        merchant_id: merchantId,
        amount: 100.00,
        currency: 'USD',
        status: 'completed',
        type: 'charge',
        gateway_transaction_id: `gtx_completed_${uuidv4()}`,
        created_at: new Date(),
        updated_at: new Date(),
        card_last_four: '4242',
        card_brand: 'Visa',
        card_holder_name: 'John Doe',
      };
      await db('transactions').insert(transaction);
      completedTransactionId = transaction.id;
    });

    it('should allow a merchant to refund a completed transaction', async () => {
      const res = await request(app)
        .post(`/api/v1/transactions/${completedTransactionId}/refund`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({ amount: 50.00, reason: 'Customer requested partial refund' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.refund).toHaveProperty('id');
      expect(res.body.data.refund.status).toBe('completed');
      expect(res.body.data.refund.amount).toBe('50.00'); // Knex returns decimal as string
      expect(res.body.data.refund.parent_transaction_id).toBe(completedTransactionId);
      expect(paymentGatewayService.refundPayment).toHaveBeenCalledTimes(1);

      // Verify refund is in DB
      const refundInDb = await db('transactions').where({ id: res.body.data.refund.id }).first();
      expect(refundInDb).not.toBeNull();
      expect(refundInDb.status).toBe('completed');
      expect(refundInDb.type).toBe('refund');
    });

    it('should allow an admin to refund a completed transaction', async () => {
      const res = await request(app)
        .post(`/api/v1/transactions/${completedTransactionId}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 100.00, reason: 'Full refund by admin' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.refund.status).toBe('completed');
      expect(paymentGatewayService.refundPayment).toHaveBeenCalledTimes(1);
    });

    it('should return 403 if a regular user tries to refund', async () => {
      const res = await request(app)
        .post(`/api/v1/transactions/${completedTransactionId}/refund`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ amount: 10.00, reason: 'Unauthorized refund' });

      expect(res.statusCode).toEqual(403);
      expect(res.body.status).toBe('error');
      expect(res.body.code).toBe('UNAUTHORIZED_ACTION');
      expect(paymentGatewayService.refundPayment).not.toHaveBeenCalled();
    });

    it('should return 404 if transaction is not found or not completed', async () => {
      const nonExistentId = uuidv4();
      const res = await request(app)
        .post(`/api/v1/transactions/${nonExistentId}/refund`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({ amount: 10.00, reason: 'Non-existent transaction' });

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toBe('error');
      expect(res.body.code).toBe('TRANSACTION_NOT_FOUND');
    });

    it('should set refund status to failed if payment gateway declines refund', async () => {
      paymentGatewayService.refundPayment.mockRejectedValue(
        new AppError('Refund declined by gateway', 400, 'GATEWAY_REFUND_DECLINED')
      );

      const res = await request(app)
        .post(`/api/v1/transactions/${completedTransactionId}/refund`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({ amount: 10.00, reason: 'Gateway decline test' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('error');
      expect(res.body.code).toBe('GATEWAY_REFUND_DECLINED');

      // Verify a 'failed' refund record exists in DB
      const failedRefundInDb = await db('transactions')
        .where({ parent_transaction_id: completedTransactionId, type: 'refund' })
        .orderBy('created_at', 'desc')
        .first();
      expect(failedRefundInDb).not.toBeNull();
      expect(failedRefundInDb.status).toBe('failed');
    });
  });

  // --- Get Transaction Tests ---
  describe('GET /api/v1/transactions/:transactionId', () => {
    let userTransactionId, merchantTransactionId;

    beforeAll(async () => {
      // Create a transaction for the user
      const userTxn = {
        id: uuidv4(),
        user_id: userId,
        merchant_id: merchantId,
        amount: 25.00,
        currency: 'USD',
        status: 'completed',
        type: 'charge',
        gateway_transaction_id: `gtx_user_${uuidv4()}`,
        created_at: new Date(),
        updated_at: new Date(),
        card_last_four: '1111',
        card_brand: 'Visa',
        card_holder_name: 'Test User',
      };
      await db('transactions').insert(userTxn);
      userTransactionId = userTxn.id;

      // Create another transaction for a different merchant (if needed for admin tests)
      const otherMerchant = { id: uuidv4(), user_id: uuidv4(), name: 'Other Shop', status: 'active' };
      await db('users').insert({ id: otherMerchant.user_id, name: 'Other Merchant User', email: 'other@merchant.com', password: await hashPassword('password'), type: 'merchant', status: 'active', merchant_id: otherMerchant.id });
      await db('merchants').insert(otherMerchant);

      const merchantTxn = {
        id: uuidv4(),
        user_id: userId, // User made payment to this merchant
        merchant_id: otherMerchant.id,
        amount: 75.00,
        currency: 'USD',
        status: 'completed',
        type: 'charge',
        gateway_transaction_id: `gtx_merchant_${uuidv4()}`,
        created_at: new Date(),
        updated_at: new Date(),
        card_last_four: '2222',
        card_brand: 'Mastercard',
        card_holder_name: 'Test User',
      };
      await db('transactions').insert(merchantTxn);
      merchantTransactionId = merchantTxn.id;
    });

    it('should allow a user to view their own transaction', async () => {
      const res = await request(app)
        .get(`/api/v1/transactions/${userTransactionId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.transaction.id).toBe(userTransactionId);
      expect(res.body.data.transaction.user_id).toBe(userId);
      expect(res.body.data.transaction).toHaveProperty('user_name', 'Test User');
      expect(res.body.data.transaction).toHaveProperty('merchant_name', 'Test Merchant');
    });

    it('should allow a merchant to view transactions made to their merchant account', async () => {
      const res = await request(app)
        .get(`/api/v1/transactions/${userTransactionId}`)
        .set('Authorization', `Bearer ${merchantToken}`); // merchantToken is for Test Merchant

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.transaction.id).toBe(userTransactionId);
      expect(res.body.data.transaction.merchant_id).toBe(merchantId);
    });

    it('should allow an admin to view any transaction', async () => {
      const res = await request(app)
        .get(`/api/v1/transactions/${merchantTransactionId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.transaction.id).toBe(merchantTransactionId);
    });

    it('should return 404 if transaction not found for user', async () => {
      const nonExistentId = uuidv4();
      const res = await request(app)
        .get(`/api/v1/transactions/${nonExistentId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toBe('error');
      expect(res.body.code).toBe('TRANSACTION_NOT_FOUND');
    });

    it('should return 404 if transaction not associated with merchant user', async () => {
      const res = await request(app)
        .get(`/api/v1/transactions/${merchantTransactionId}`) // This transaction is for 'Other Shop'
        .set('Authorization', `Bearer ${merchantToken}`); // This merchantToken is for 'Test Merchant'

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toBe('error');
      expect(res.body.code).toBe('TRANSACTION_NOT_FOUND');
    });
  });

  // --- Get All Transactions Tests ---
  describe('GET /api/v1/transactions', () => {
    // Data setup for filtering
    let userTxn1, userTxn2;
    let merchantTxn1, merchantTxn2;

    beforeAll(async () => {
      // Clear existing transactions to ensure clean test data for "all transactions"
      await db('transactions').del();

      // Transactions for the main user to the test merchant
      userTxn1 = { id: uuidv4(), user_id: userId, merchant_id: merchantId, amount: 10.00, currency: 'USD', status: 'completed', type: 'charge', created_at: new Date('2023-01-01'), card_last_four: '1111', card_brand: 'Visa', card_holder_name: 'User 1' };
      userTxn2 = { id: uuidv4(), user_id: userId, merchant_id: merchantId, amount: 20.00, currency: 'USD', status: 'pending', type: 'charge', created_at: new Date('2023-01-02'), card_last_four: '2222', card_brand: 'Mastercard', card_holder_name: 'User 1' };
      await db('transactions').insert([userTxn1, userTxn2]);

      // Transactions made by another user to the test merchant
      const otherUser = { id: uuidv4(), name: 'Other Payer', email: 'other@payer.com', password: await hashPassword('password'), type: 'user', status: 'active' };
      await db('users').insert(otherUser);

      merchantTxn1 = { id: uuidv4(), user_id: otherUser.id, merchant_id: merchantId, amount: 30.00, currency: 'USD', status: 'completed', type: 'charge', created_at: new Date('2023-01-03'), card_last_four: '3333', card_brand: 'Amex', card_holder_name: 'Other Payer' };
      merchantTxn2 = { id: uuidv4(), user_id: otherUser.id, merchant_id: merchantId, amount: 40.00, currency: 'USD', status: 'refunded', type: 'charge', created_at: new Date('2023-01-04'), card_last_four: '4444', card_brand: 'Visa', card_holder_name: 'Other Payer' };
      await db('transactions').insert([merchantTxn1, merchantTxn2]);
    });

    it('should allow a user to get their own transactions', async () => {
      const res = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.results).toBe(2);
      expect(res.body.data.transactions.map(t => t.id)).toEqual(expect.arrayContaining([userTxn1.id, userTxn2.id]));
    });

    it('should allow a merchant to get transactions for their merchant account', async () => {
      const res = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${merchantToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.results).toBe(4); // All transactions involving merchantId
      expect(res.body.data.transactions.map(t => t.id)).toEqual(
        expect.arrayContaining([userTxn1.id, userTxn2.id, merchantTxn1.id, merchantTxn2.id])
      );
    });

    it('should allow an admin to get all transactions', async () => {
      const res = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.results).toBe(4); // Total transactions
    });

    it('should filter transactions by status for admin', async () => {
      const res = await request(app)
        .get('/api/v1/transactions?status=completed')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.results).toBe(2);
      expect(res.body.data.transactions.map(t => t.id)).toEqual(expect.arrayContaining([userTxn1.id, merchantTxn1.id]));
    });

    it('should apply pagination and sorting', async () => {
      const res = await request(app)
        .get('/api/v1/transactions?page=1&limit=2&sortBy=created_at&sortOrder=asc')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.results).toBe(2);
      expect(res.body.data.transactions[0].id).toBe(userTxn1.id);
      expect(res.body.data.transactions[1].id).toBe(userTxn2.id);
    });
  });
});
```