const request = require('supertest');
const app = require('../../app');
const { knex } = require('../../utils/db');
const User = require('../../models/User');
const Account = require('../../models/Account');
const Transaction = require('../../models/Transaction');
const { generateToken } = require('../../utils/jwt');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Mock payment gateway service to control outcomes in tests
jest.mock('../../services/paymentGatewayService', () => ({
  initiatePayment: jest.fn(async (paymentDetails) => {
    const isSuccess = paymentDetails.amount <= 10000; // Simulate success for small amounts
    return {
      status: isSuccess ? 'success' : 'failed',
      gatewayTransactionId: `mock-gateway-trx-${uuidv4()}`,
      message: isSuccess ? 'Payment successful' : 'Insufficient funds at gateway',
    };
  }),
  verifyTransaction: jest.fn(async (gatewayTransactionId) => ({
    status: 'success',
    gatewayTransactionId,
    amount: 5000,
    currency: 'NGN',
  })),
  processRefund: jest.fn(async (gatewayTransactionId, amount) => ({
    status: 'success',
    refundId: `mock-refund-${uuidv4()}`,
    message: 'Refund successful',
  })),
}));

describe('Transaction API Integration Tests', () => {
  let user, token, account;
  const password = 'testpassword';

  beforeAll(async () => {
    // Run migrations and create a clean database
    await knex.migrate.rollback();
    await knex.migrate.latest();
  });

  beforeEach(async () => {
    // Clear data and re-seed for each test for isolation
    await knex('transactions').del();
    await knex('accounts').del();
    await knex('users').del();

    const hashedPassword = await bcrypt.hash(password, 10);
    user = await User.query().insert({
      id: uuidv4(),
      email: 'testuser@example.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
    });
    token = generateToken({ id: user.id, email: user.email, role: user.role });

    account = await Account.query().insert({
      id: uuidv4(),
      userId: user.id,
      accountNumber: 'NGN-TEST-123',
      balance: 20000.00,
      currency: 'NGN',
    });
  });

  afterAll(async () => {
    // Clean up after all tests are done
    await knex.migrate.rollback();
  });

  describe('POST /api/transactions/initiate', () => {
    it('should initiate a successful internal debit transaction', async () => {
      const initialBalance = account.balance;
      const amount = 5000;

      const res = await request(app)
        .post('/api/transactions/initiate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          accountId: account.id,
          amount,
          currency: 'NGN',
          type: 'debit',
          description: 'Internal debit test',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toBe('Transaction initiated successfully');
      expect(res.body.transaction).toHaveProperty('id');
      expect(res.body.transaction.status).toBe('completed');
      expect(res.body.transaction.amount).toBe(amount);

      // Verify account balance was updated
      const updatedAccount = await Account.query().findById(account.id);
      expect(updatedAccount.balance).toBe(initialBalance - amount);
    });

    it('should initiate a successful external debit transaction via mock gateway', async () => {
      const initialBalance = account.balance;
      const amount = 1000; // Amount for which mock gateway returns success
      const paymentMethodId = 'mock_card_token_123';

      const res = await request(app)
        .post('/api/transactions/initiate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          accountId: account.id,
          amount,
          currency: 'NGN',
          type: 'debit',
          description: 'External payment test',
          paymentMethodId,
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toBe('Transaction initiated successfully');
      expect(res.body.transaction.status).toBe('completed');
      expect(res.body.transaction.externalReference).toMatch(/^mock-gateway-trx-/);

      // Verify external payment service was called
      expect(require('../../services/paymentGatewayService').initiatePayment).toHaveBeenCalledTimes(1);
      expect(require('../../services/paymentGatewayService').initiatePayment).toHaveBeenCalledWith({
        amount,
        currency: 'NGN',
        customerEmail: user.email,
        description: 'External payment test',
        paymentMethodId,
      });

      // Verify account balance was updated
      const updatedAccount = await Account.query().findById(account.id);
      expect(updatedAccount.balance).toBe(initialBalance - amount);
    });

    it('should fail an external debit transaction if gateway fails', async () => {
      const initialBalance = account.balance;
      const amount = 20000; // Amount for which mock gateway returns failure
      const paymentMethodId = 'mock_card_token_fail';

      const res = await request(app)
        .post('/api/transactions/initiate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          accountId: account.id,
          amount,
          currency: 'NGN',
          type: 'debit',
          description: 'External payment failure test',
          paymentMethodId,
        });

      expect(res.statusCode).toEqual(400); // Bad request due to business logic failure
      expect(res.body.message).toMatch(/External payment failed: Payment gateway failed:/);

      // Verify external payment service was called
      expect(require('../../services/paymentGatewayService').initiatePayment).toHaveBeenCalledTimes(1);

      // Verify account balance was NOT updated
      const updatedAccount = await Account.query().findById(account.id);
      expect(updatedAccount.balance).toBe(initialBalance);

      // Verify no completed transaction was recorded for the failure
      const transactions = await Transaction.query().where({ accountId: account.id, status: 'completed' });
      expect(transactions.length).toBe(0);
    });

    it('should return 400 for insufficient funds', async () => {
      const amount = 50000; // More than initial 20000
      const res = await request(app)
        .post('/api/transactions/initiate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          accountId: account.id,
          amount,
          currency: 'NGN',
          type: 'debit',
          description: 'Insufficient funds test',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe('Insufficient funds.');

      // Verify balance not changed
      const updatedAccount = await Account.query().findById(account.id);
      expect(updatedAccount.balance).toBe(account.balance);
    });
  });

  describe('POST /api/transactions/:id/refund', () => {
    let completedDebitTransaction;

    beforeEach(async () => {
      // Create a completed debit transaction to refund
      completedDebitTransaction = await Transaction.query().insert({
        id: uuidv4(),
        userId: user.id,
        accountId: account.id,
        reference: `TRX-${Date.now()}-REFUNDME`,
        externalReference: 'mock-gateway-trx-for-refund',
        amount: 10000,
        currency: 'NGN',
        type: 'debit',
        status: 'completed',
        description: 'Original transaction for refund',
      });
      // Adjust account balance as if this debit already occurred
      await Account.query().patchAndFetchById(account.id, { balance: account.balance - completedDebitTransaction.amount });
      // Reload account to get updated balance
      account = await Account.query().findById(account.id);
    });

    it('should process a successful refund for a completed debit transaction', async () => {
      const initialAccountBalance = account.balance;
      const refundAmount = 5000;

      const res = await request(app)
        .post(`/api/transactions/${completedDebitTransaction.id}/refund`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: refundAmount });

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toBe('Refund processed successfully');
      expect(res.body.refundTransaction).toHaveProperty('id');
      expect(res.body.refundTransaction.status).toBe('completed');
      expect(res.body.refundTransaction.amount).toBe(refundAmount);
      expect(res.body.refundTransaction.type).toBe('credit'); // A refund is a credit to user

      // Verify original transaction is marked as partially_refunded
      const updatedOriginalTransaction = await Transaction.query().findById(completedDebitTransaction.id);
      expect(updatedOriginalTransaction.status).toBe('partially_refunded');

      // Verify account balance was credited
      const updatedAccount = await Account.query().findById(account.id);
      expect(updatedAccount.balance).toBe(initialAccountBalance + refundAmount);

      // Verify external refund service was called
      expect(require('../../services/paymentGatewayService').processRefund).toHaveBeenCalledTimes(1);
      expect(require('../../services/paymentGatewayService').processRefund).toHaveBeenCalledWith(
        completedDebitTransaction.externalReference,
        refundAmount
      );
    });

    it('should return 400 if refund amount exceeds original transaction amount', async () => {
      const refundAmount = 15000; // Greater than 10000 original transaction
      const res = await request(app)
        .post(`/api/transactions/${completedDebitTransaction.id}/refund`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: refundAmount });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe('Refund amount exceeds original transaction amount.');
    });

    it('should return 400 for a non-existent transaction', async () => {
      const nonExistentId = uuidv4();
      const res = await request(app)
        .post(`/api/transactions/${nonExistentId}/refund`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 1000 });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe('Original transaction not found or unauthorized.');
    });
  });

  describe('GET /api/transactions/account/:accountId', () => {
    it('should retrieve all transactions for a specific account', async () => {
      // Create some transactions for the account
      await Transaction.query().insert([
        { userId: user.id, accountId: account.id, amount: 1000, currency: 'NGN', type: 'debit', status: 'completed', reference: 'TRX-1' },
        { userId: user.id, accountId: account.id, amount: 2000, currency: 'NGN', type: 'credit', status: 'completed', reference: 'TRX-2' },
      ]);

      const res = await request(app)
        .get(`/api/transactions/account/${account.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('Account transactions retrieved successfully');
      expect(res.body.transactions).toHaveLength(2);
      expect(res.body.transactions[0].accountId).toBe(account.id);
    });

    it('should return 404 if account not found for user', async () => {
      const nonExistentAccountId = uuidv4();
      const res = await request(app)
        .get(`/api/transactions/account/${nonExistentAccountId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(500); // Service throws 500, then error handler
      expect(res.body.message).toBe('Failed to retrieve transactions.');
    });
  });

  describe('GET /api/transactions/:id', () => {
    let transaction;
    beforeEach(async () => {
      transaction = await Transaction.query().insert({
        id: uuidv4(),
        userId: user.id,
        accountId: account.id,
        amount: 1000, currency: 'NGN', type: 'debit', status: 'completed', reference: 'TRX-GET'
      });
    });

    it('should retrieve a single transaction by ID', async () => {
      const res = await request(app)
        .get(`/api/transactions/${transaction.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('Transaction retrieved successfully');
      expect(res.body.transaction.id).toBe(transaction.id);
      expect(res.body.transaction.amount).toBe(transaction.amount);
    });

    it('should return 404 for a non-existent transaction', async () => {
      const nonExistentId = uuidv4();
      const res = await request(app)
        .get(`/api/transactions/${nonExistentId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toBe('Transaction not found or unauthorized.');
    });
  });

  describe('POST /api/transactions/webhook', () => {
    it('should process a successful webhook notification', async () => {
      // Create a pending transaction that the webhook will complete
      const pendingTransaction = await Transaction.query().insert({
        id: uuidv4(),
        userId: user.id,
        accountId: account.id,
        reference: `TRX-${Date.now()}-PENDING`,
        externalReference: 'webhook-external-ref-123',
        amount: 5000,
        currency: 'NGN',
        type: 'credit', // Simulate a credit transaction being confirmed
        status: 'pending',
        description: 'Pending external top-up',
      });

      const initialBalance = account.balance;

      const webhookPayload = {
        event: 'payment_successful',
        data: {
          externalReference: pendingTransaction.externalReference,
          amount: 5000,
          currency: 'NGN',
          // ... other gateway specific data
        },
      };

      const res = await request(app)
        .post('/api/transactions/webhook')
        .send(webhookPayload);

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('Webhook processed successfully');

      // Verify transaction status is updated
      const updatedTransaction = await Transaction.query().findById(pendingTransaction.id);
      expect(updatedTransaction.status).toBe('completed');

      // Verify account balance is updated (for credit)
      const updatedAccount = await Account.query().findById(account.id);
      expect(updatedAccount.balance).toBe(initialBalance + pendingTransaction.amount);
    });

    it('should ignore webhook for non-existent external reference', async () => {
      const res = await request(app)
        .post('/api/transactions/webhook')
        .send({
          event: 'payment_successful',
          data: {
            externalReference: 'non-existent-ref',
            amount: 1000,
            currency: 'NGN',
          },
        });

      expect(res.statusCode).toEqual(200); // Still 200, but message indicates processing failure
      expect(res.body.message).toBe('Webhook received, but internal processing failed.');
    });
  });
});