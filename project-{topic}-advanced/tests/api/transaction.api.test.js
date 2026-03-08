```javascript
const request = require('supertest');
const httpStatus = require('http-status-codes');
const app = require('../../src/app');
const { sequelize, User, Account, Transaction } = require('../../models');
const config = require('../../config/config');
const { USER_ROLES, ACCOUNT_TYPE } = require('../../src/utils/constants');
const logger = require('../../src/utils/logger');

describe('Transaction routes', () => {
  let adminUser, regularUser;
  let adminAuthToken, regularUserAuthToken;
  let adminAccount, regularUserSourceAccount, regularUserDestinationAccount;

  beforeAll(async () => {
    // Clear and re-seed database
    await sequelize.drop();
    await sequelize.sync({ force: true });
    await require('../../seeders/20230101000003-initial-data').up(sequelize.getQueryInterface(), sequelize.Sequelize);

    // Get admin user and login
    adminUser = await User.findOne({ where: { email: config.admin.email } });
    const adminLoginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: adminUser.email, password: config.admin.password })
      .expect(httpStatus.OK);
    adminAuthToken = adminLoginRes.body.tokens.access.token;
    adminAccount = await Account.findOne({ where: { userId: adminUser.id, type: ACCOUNT_TYPE.CHECKING } });

    // Get regular user and login
    regularUser = await User.findOne({ where: { email: 'john.doe@example.com' } });
    const regularUserLoginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: regularUser.email, password: 'password123' })
      .expect(httpStatus.OK);
    regularUserAuthToken = regularUserLoginRes.body.tokens.access.token;

    // Get regular user's accounts
    regularUserSourceAccount = await Account.findOne({ where: { userId: regularUser.id, name: 'John\'s Checking' } });
    regularUserDestinationAccount = await Account.findOne({ where: { userId: regularUser.id, name: 'John\'s Savings' } });

    // Ensure accounts are found
    expect(adminUser).toBeDefined();
    expect(regularUser).toBeDefined();
    expect(adminAccount).toBeDefined();
    expect(regularUserSourceAccount).toBeDefined();
    expect(regularUserDestinationAccount).toBeDefined();
    expect(regularUserSourceAccount.balance).toBe('1500.00'); // Check initial seeded balance
  });

  afterAll(async () => {
    await sequelize.drop();
    await sequelize.close();
  });

  describe('POST /v1/transactions', () => {
    test('should return 202 and initiate a transaction if valid data and sufficient funds', async () => {
      const initialSourceBalance = parseFloat(regularUserSourceAccount.balance);

      const res = await request(app)
        .post('/v1/transactions')
        .set('Authorization', `Bearer ${regularUserAuthToken}`)
        .send({
          sourceAccountId: regularUserSourceAccount.id,
          destinationAccountId: regularUserDestinationAccount.id,
          amount: 100.00,
          currency: 'USD',
          description: 'Payment to savings',
        })
        .expect(httpStatus.ACCEPTED);

      expect(res.body).toHaveProperty('message', 'Transaction initiated successfully. Awaiting payment gateway confirmation.');
      expect(res.body).toHaveProperty('transactionId');
      expect(res.body).toHaveProperty('gatewayStatus'); // Will be PENDING or SUCCESS based on mock gateway
      expect(res.body).toHaveProperty('gatewayRefId');

      // Verify source account balance is immediately debited
      const updatedSourceAccount = await Account.findByPk(regularUserSourceAccount.id);
      expect(parseFloat(updatedSourceAccount.balance)).toBe(initialSourceBalance - 100.00);

      // Verify transaction is recorded as PENDING
      const transaction = await Transaction.findByPk(res.body.transactionId);
      expect(transaction).toBeDefined();
      expect(transaction.status).toBe(res.body.gatewayStatus); // Will be PENDING or SUCCESS
    });

    test('should return 400 if amount is zero or negative', async () => {
      await request(app)
        .post('/v1/transactions')
        .set('Authorization', `Bearer ${regularUserAuthToken}`)
        .send({
          sourceAccountId: regularUserSourceAccount.id,
          destinationAccountId: regularUserDestinationAccount.id,
          amount: 0,
          currency: 'USD',
          description: 'Zero amount',
        })
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 if insufficient funds', async () => {
      await request(app)
        .post('/v1/transactions')
        .set('Authorization', `Bearer ${regularUserAuthToken}`)
        .send({
          sourceAccountId: regularUserSourceAccount.id,
          destinationAccountId: regularUserDestinationAccount.id,
          amount: 50000.00, // More than current balance
          currency: 'USD',
          description: 'Too much money',
        })
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 401 if no authentication token', async () => {
      await request(app)
        .post('/v1/transactions')
        .send({
          sourceAccountId: regularUserSourceAccount.id,
          destinationAccountId: regularUserDestinationAccount.id,
          amount: 10.00,
          currency: 'USD',
          description: 'No token',
        })
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 400 if source account does not belong to user', async () => {
      await request(app)
        .post('/v1/transactions')
        .set('Authorization', `Bearer ${regularUserAuthToken}`)
        .send({
          sourceAccountId: adminAccount.id, // Trying to use admin's account
          destinationAccountId: regularUserDestinationAccount.id,
          amount: 10.00,
          currency: 'USD',
          description: 'Wrong account owner',
        })
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('GET /v1/transactions', () => {
    let testTransactionId;

    beforeAll(async () => {
      // Create a transaction to ensure there's data for retrieval tests
      const res = await request(app)
        .post('/v1/transactions')
        .set('Authorization', `Bearer ${regularUserAuthToken}`)
        .send({
          sourceAccountId: regularUserSourceAccount.id,
          destinationAccountId: regularUserDestinationAccount.id,
          amount: 50.00,
          currency: 'USD',
          description: 'Test transaction for GET',
        })
        .expect(httpStatus.ACCEPTED);
      testTransactionId = res.body.transactionId;
    });

    test('should return 200 and user\'s transactions for a regular user', async () => {
      const res = await request(app)
        .get('/v1/transactions')
        .set('Authorization', `Bearer ${regularUserAuthToken}`)
        .expect(httpStatus.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.some(t => t.id === testTransactionId)).toBe(true);
      expect(res.body.every(t => t.userId === regularUser.id)).toBe(true); // Ensure only user's transactions
    });

    test('should return 200 and all transactions for an admin user', async () => {
      const res = await request(app)
        .get('/v1/transactions')
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .expect(httpStatus.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.some(t => t.id === testTransactionId)).toBe(true);
      expect(res.body.some(t => t.userId === adminUser.id)).toBe(true);
    });

    test('should return 401 if no authentication token', async () => {
      await request(app)
        .get('/v1/transactions')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /v1/transactions/:transactionId', () => {
    let userTransactionId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/v1/transactions')
        .set('Authorization', `Bearer ${regularUserAuthToken}`)
        .send({
          sourceAccountId: regularUserSourceAccount.id,
          destinationAccountId: regularUserDestinationAccount.id,
          amount: 25.00,
          currency: 'USD',
          description: 'Transaction for specific GET test',
        })
        .expect(httpStatus.ACCEPTED);
      userTransactionId = res.body.transactionId;
    });

    test('should return 200 and transaction details for owner', async () => {
      const res = await request(app)
        .get(`/v1/transactions/${userTransactionId}`)
        .set('Authorization', `Bearer ${regularUserAuthToken}`)
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('id', userTransactionId);
      expect(res.body).toHaveProperty('amount', '25.00');
    });

    test('should return 200 and transaction details for admin', async () => {
      const res = await request(app)
        .get(`/v1/transactions/${userTransactionId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('id', userTransactionId);
      expect(res.body).toHaveProperty('amount', '25.00');
    });

    test('should return 404 if transaction not found', async () => {
      await request(app)
        .get(`/v1/transactions/non-existent-uuid`)
        .set('Authorization', `Bearer ${regularUserAuthToken}`)
        .expect(httpStatus.NOT_FOUND);
    });

    test('should return 403 if user tries to access another user\'s transaction', async () => {
      // Create a new user and transaction, then try to access it with regularUserAuthToken
      const otherUser = await User.create({
        name: 'Other User',
        email: 'other@example.com',
        password: 'Password123!',
        role: USER_ROLES.USER,
      });
      const otherUserAccount = await Account.create({
        userId: otherUser.id,
        name: 'Other Checking',
        type: ACCOUNT_TYPE.CHECKING,
        currency: 'USD',
        balance: 1000.00,
      });

      const otherUserTransactionRes = await request(app)
        .post('/v1/transactions')
        .set('Authorization', `Bearer ${
          (await request(app).post('/v1/auth/login').send({ email: otherUser.email, password: 'Password123!' })).body.tokens.access.token
        }`)
        .send({
          sourceAccountId: otherUserAccount.id,
          destinationAccountId: otherUserAccount.id,
          amount: 10.00,
          currency: 'USD',
          description: 'Other user transaction',
        })
        .expect(httpStatus.ACCEPTED);

      await request(app)
        .get(`/v1/transactions/${otherUserTransactionRes.body.transactionId}`)
        .set('Authorization', `Bearer ${regularUserAuthToken}`)
        .expect(httpStatus.FORBIDDEN);
    });
  });

  describe('POST /v1/transactions/webhook/payment-gateway', () => {
    test('should return 200 and process payment_success webhook', async () => {
      // First, initiate a pending transaction
      const initiateRes = await request(app)
        .post('/v1/transactions')
        .set('Authorization', `Bearer ${regularUserAuthToken}`)
        .send({
          sourceAccountId: regularUserSourceAccount.id,
          destinationAccountId: regularUserDestinationAccount.id,
          amount: 75.00,
          currency: 'USD',
          description: 'Webhook test',
        })
        .expect(httpStatus.ACCEPTED);

      const transactionId = initiateRes.body.transactionId;
      const gatewayRefId = initiateRes.body.gatewayRefId || `mock_gateway_ref_${Date.now()}`; // Fallback if mock is too quick

      // Ensure transaction is pending (if mock gateway sends PENDING first)
      await Transaction.update({ status: TRANSACTION_STATUS.PENDING }, { where: { id: transactionId } });

      const initialDestBalance = parseFloat((await Account.findByPk(regularUserDestinationAccount.id)).balance);

      // Now send the success webhook
      await request(app)
        .post('/v1/transactions/webhook/payment-gateway')
        .send({
          event: 'payment_success',
          data: {
            transactionId: transactionId,
            gatewayRefId: gatewayRefId,
            amount: 75.00,
            currency: 'USD',
          },
        })
        .expect(httpStatus.OK);

      // Verify transaction status is updated
      const updatedTransaction = await Transaction.findByPk(transactionId);
      expect(updatedTransaction.status).toBe(TRANSACTION_STATUS.COMPLETED);
      expect(updatedTransaction.gatewayRefId).toBe(gatewayRefId);
      expect(updatedTransaction.completedAt).toBeInstanceOf(Date);

      // Verify destination account is credited
      const updatedDestAccount = await Account.findByPk(regularUserDestinationAccount.id);
      expect(parseFloat(updatedDestAccount.balance)).toBe(initialDestBalance + 75.00);
    });

    test('should return 200 and process payment_failed webhook', async () => {
      // Initiate another transaction
      const initiateRes = await request(app)
        .post('/v1/transactions')
        .set('Authorization', `Bearer ${regularUserAuthToken}`)
        .send({
          sourceAccountId: regularUserSourceAccount.id,
          destinationAccountId: regularUserDestinationAccount.id,
          amount: 20.00,
          currency: 'USD',
          description: 'Failed webhook test',
        })
        .expect(httpStatus.ACCEPTED);

      const transactionId = initiateRes.body.transactionId;
      const gatewayRefId = initiateRes.body.gatewayRefId || `mock_gateway_ref_${Date.now()}`;

      // Ensure transaction is pending
      await Transaction.update({ status: TRANSACTION_STATUS.PENDING }, { where: { id: transactionId } });

      const initialSourceBalance = parseFloat((await Account.findByPk(regularUserSourceAccount.id)).balance);

      // Now send the failed webhook
      await request(app)
        .post('/v1/transactions/webhook/payment-gateway')
        .send({
          event: 'payment_failed',
          data: {
            transactionId: transactionId,
            gatewayRefId: gatewayRefId,
            reason: 'Card declined',
          },
        })
        .expect(httpStatus.OK);

      // Verify transaction status is updated
      const updatedTransaction = await Transaction.findByPk(transactionId);
      expect(updatedTransaction.status).toBe(TRANSACTION_STATUS.FAILED);
      expect(updatedTransaction.remarks).toBe('Card declined');
      expect(updatedTransaction.completedAt).toBeInstanceOf(Date);

      // Verify source account is reverted
      const updatedSourceAccount = await Account.findByPk(regularUserSourceAccount.id);
      expect(parseFloat(updatedSourceAccount.balance)).toBe(initialSourceBalance + 20.00); // Amount reverted
    });
  });
});
```