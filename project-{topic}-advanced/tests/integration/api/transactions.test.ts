```typescript
import request from 'supertest';
import app from '../../../src/app';
import { prisma } from '../../../src/utils/prisma';
import { generateTestToken } from '../../jest.setup';
import { UserRole, Account } from '@prisma/client';

describe('Transactions API', () => {
  let user1Token: string;
  let user2Token: string;
  let adminToken: string;
  let user1Account1: Account;
  let user1Account2: Account; // EUR account
  let user2Account: Account;
  let adminAccount: Account;

  beforeAll(async () => {
    // This setup runs after the global `beforeAll` in jest.setup.ts
    // which has already cleared and seeded base users.
    // We fetch those seeded users/accounts and create tokens.

    const user1 = await prisma.user.findUniqueOrThrow({ where: { email: 'test1@example.com' } });
    const user2 = await prisma.user.findUniqueOrThrow({ where: { email: 'test2@example.com' } });
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });

    user1Account1 = await prisma.account.findFirstOrThrow({ where: { userId: user1.id, currency: 'USD' } });
    user1Account2 = await prisma.account.create({ // Create a new EUR account for user1
      data: {
        userId: user1.id,
        accountNumber: '1111111112',
        balance: 200.00,
        currency: 'EUR',
      }
    });
    user2Account = await prisma.account.findFirstOrThrow({ where: { userId: user2.id, currency: 'USD' } });
    adminAccount = await prisma.account.findFirstOrThrow({ where: { userId: admin.id, currency: 'USD' } });

    user1Token = generateTestToken(user1.id, UserRole.USER);
    user2Token = generateTestToken(user2.id, UserRole.USER);
    adminToken = generateTestToken(admin.id, UserRole.ADMIN);
  });

  beforeEach(async () => {
    // Clear transactions and payments, but keep accounts and users
    await prisma.payment.deleteMany();
    await prisma.transaction.deleteMany();

    // Reset account balances to initial state
    await prisma.account.updateMany({
      where: { id: user1Account1.id },
      data: { balance: 1000.00 }
    });
    await prisma.account.updateMany({
      where: { id: user1Account2.id },
      data: { balance: 200.00 }
    });
    await prisma.account.updateMany({
      where: { id: user2Account.id },
      data: { balance: 500.00 }
    });
    await prisma.account.updateMany({
      where: { id: adminAccount.id },
      data: { balance: 5000.00 }
    });
  });

  describe('POST /api/v1/payments', () => {
    const paymentUrl = '/api/v1/payments';

    it('should allow an authenticated user to make a payment to another user (USD)', async () => {
      const initialBalance1 = (await prisma.account.findUniqueOrThrow({ where: { id: user1Account1.id } })).balance.toNumber();
      const initialBalance2 = (await prisma.account.findUniqueOrThrow({ where: { id: user2Account.id } })).balance.toNumber();
      const amount = 100.00;

      const res = await request(app)
        .post(paymentUrl)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          sourceAccountId: user1Account1.id,
          destinationAccountNumber: user2Account.accountNumber,
          amount: amount,
          description: 'Payment for services',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('Payment initiated successfully');
      expect(res.body.payment.status).toBe('COMPLETED');
      expect(res.body.payment.transactionId).toBeDefined();

      const finalBalance1 = (await prisma.account.findUniqueOrThrow({ where: { id: user1Account1.id } })).balance.toNumber();
      const finalBalance2 = (await prisma.account.findUniqueOrThrow({ where: { id: user2Account.id } })).balance.toNumber();

      expect(finalBalance1).toBe(initialBalance1 - amount);
      expect(finalBalance2).toBe(initialBalance2 + amount);
    });

    it('should return 400 for currency mismatch', async () => {
      const res = await request(app)
        .post(paymentUrl)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          sourceAccountId: user1Account1.id, // USD
          destinationAccountNumber: user1Account2.accountNumber, // EUR
          amount: 50.00,
          description: 'Currency mismatch test',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Currency mismatch');
    });

    it('should return 400 for insufficient funds', async () => {
      const res = await request(app)
        .post(paymentUrl)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          sourceAccountId: user1Account1.id,
          destinationAccountNumber: user2Account.accountNumber,
          amount: 5000.00, // More than initial balance
          description: 'Insufficient funds test',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Insufficient balance');
    });

    it('should prevent duplicate payments using idempotency key', async () => {
      const idempotencyKey = 'unique-payment-idempotency-key-123';
      const amount = 10.00;

      // First request
      await request(app)
        .post(paymentUrl)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          sourceAccountId: user1Account1.id,
          destinationAccountNumber: user2Account.accountNumber,
          amount: amount,
          description: 'Idempotent payment test',
          idempotencyKey: idempotencyKey,
        })
        .expect(201);

      // Second request with the same idempotency key
      const res = await request(app)
        .post(paymentUrl)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          sourceAccountId: user1Account1.id,
          destinationAccountNumber: user2Account.accountNumber,
          amount: amount,
          description: 'Idempotent payment test',
          idempotencyKey: idempotencyKey,
        });

      expect(res.statusCode).toBe(409); // Conflict
      expect(res.body.message).toContain('Duplicate request');

      // Verify balances were only affected once
      const finalBalance1 = (await prisma.account.findUniqueOrThrow({ where: { id: user1Account1.id } })).balance.toNumber();
      const finalBalance2 = (await prisma.account.findUniqueOrThrow({ where: { id: user2Account.id } })).balance.toNumber();
      expect(finalBalance1).toBe(1000.00 - amount);
      expect(finalBalance2).toBe(500.00 + amount);
    });
  });

  describe('GET /api/v1/transactions/account/:accountId', () => {
    const transactionsUrl = '/api/v1/transactions/account';

    beforeEach(async () => {
      // Create some transactions for user1Account1 and user2Account
      await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          sourceAccountId: user1Account1.id,
          destinationAccountNumber: user2Account.accountNumber,
          amount: 10.00,
          description: 'Tx from user1 to user2',
          idempotencyKey: 'tx-1-idempotent-key',
        });

      await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          sourceAccountId: user2Account.id,
          destinationAccountNumber: user1Account1.accountNumber,
          amount: 5.00,
          description: 'Tx from user2 to user1',
          idempotencyKey: 'tx-2-idempotent-key',
        });
    });

    it('should return transactions for the user\'s own account', async () => {
      const res = await request(app)
        .get(`${transactionsUrl}/${user1Account1.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].description).toBe('Tx from user2 to user1'); // Newest first
    });

    it('should return 403 if user tries to access another user\'s account transactions', async () => {
      const res = await request(app)
        .get(`${transactionsUrl}/${user2Account.id}`)
        .set('Authorization', `Bearer ${user1Token}`); // User1 trying to access user2's account

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe('Unauthorized to view transactions for this account');
    });

    it('should allow admin to view any account\'s transactions', async () => {
      const res = await request(app)
        .get(`${transactionsUrl}/${user1Account1.id}`)
        .set('Authorization', `Bearer ${adminToken}`); // Admin accessing user1's account

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('should apply limit and offset parameters', async () => {
      const res = await request(app)
        .get(`${transactionsUrl}/${user1Account1.id}?limit=1&offset=1`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].description).toBe('Tx from user1 to user2'); // Second transaction
    });
  });

  describe('GET /api/v1/transactions/:id', () => {
    let transactionId: string;

    beforeEach(async () => {
      const paymentRes = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          sourceAccountId: user1Account1.id,
          destinationAccountNumber: user2Account.accountNumber,
          amount: 25.00,
          description: 'Specific transaction for lookup',
          idempotencyKey: 'specific-tx-idempotency-key',
        });
      transactionId = paymentRes.body.payment.transactionId;
    });

    it('should return a specific transaction if user is involved', async () => {
      const res = await request(app)
        .get(`/api/v1/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(transactionId);
      expect(res.body.description).toBe('Specific transaction for lookup');
    });

    it('should return 404 for a non-existent transaction', async () => {
      const res = await request(app)
        .get(`/api/v1/transactions/non-existent-transaction-id`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Transaction not found');
    });

    it('should return 403 if user is not involved in the transaction and not an admin', async () => {
      // Admin initiated a transaction with adminAccount and user2Account
      const adminTxRes = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sourceAccountId: adminAccount.id,
          destinationAccountNumber: user2Account.accountNumber,
          amount: 50.00,
          description: 'Admin-user2 transaction',
          idempotencyKey: 'admin-tx-idempotent-key',
        });
      const adminTransactionId = adminTxRes.body.payment.transactionId;

      const res = await request(app)
        .get(`/api/v1/transactions/${adminTransactionId}`)
        .set('Authorization', `Bearer ${user1Token}`); // User1 is not involved

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe('Unauthorized to view this transaction');
    });

    it('should allow admin to view any transaction', async () => {
      const res = await request(app)
        .get(`/api/v1/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${adminToken}`); // Admin viewing user1's transaction

      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(transactionId);
    });
  });
});
```