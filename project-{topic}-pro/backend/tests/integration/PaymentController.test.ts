import request from 'supertest';
import AppDataSource from '../../ormconfig';
import app from '../../src/app';
import { User, UserRole } from '../../src/entities/User';
import { Merchant } from '../../src/entities/Merchant';
import { Payment, PaymentMethod, PaymentStatus } from '../../src/entities/Payment';
import { Transaction, TransactionStatus, TransactionType } from '../../src/entities/Transaction';
import { WebhookEvent, WebhookEventType, WebhookEventStatus } from '../../src/entities/WebhookEvent';
import { generateToken } from '../../src/utils/jwt';
import bcrypt from 'bcryptjs';
import { config } from '../../src/config';
import logger from '../../src/utils/logger'; // Import the mock logger
import axios from 'axios';

jest.mock('axios'); // Mock axios for webhook service

describe('PaymentController (Integration)', () => {
  let adminToken: string;
  let merchantToken: string;
  let regularUserToken: string;
  let adminUser: User;
  let merchantUser: User;
  let alxStoreMerchant: Merchant;

  beforeAll(async () => {
    await AppDataSource.initialize(); // Ensure DB is initialized
    await AppDataSource.runMigrations(); // Run migrations on test DB
    // Clear data from setup.ts should handle this
  });

  beforeEach(async () => {
    // Clear database tables before each test
    const entities = AppDataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = AppDataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }

    // Seed test data
    const passwordHash = await bcrypt.hash('password123', config.hashSaltRounds);

    adminUser = AppDataSource.getRepository(User).create({
      email: 'admin_test@alxpay.com',
      passwordHash,
      role: UserRole.ADMIN,
      isEmailVerified: true,
    });
    await AppDataSource.getRepository(User).save(adminUser);
    adminToken = generateToken(adminUser);

    merchantUser = AppDataSource.getRepository(User).create({
      email: 'merchant_test@alxpay.com',
      passwordHash,
      role: UserRole.MERCHANT,
      isEmailVerified: true,
    });
    await AppDataSource.getRepository(User).save(merchantUser);
    merchantToken = generateToken(merchantUser);

    alxStoreMerchant = AppDataSource.getRepository(Merchant).create({
      name: 'ALX Test Store',
      businessAddress: '456 Test St',
      publicKey: 'test_pk_123',
      secretKey: 'test_sk_123',
      balance: 1000.00,
      owner: merchantUser,
    });
    await AppDataSource.getRepository(Merchant).save(alxStoreMerchant);

    const regularUser = AppDataSource.getRepository(User).create({
      email: 'user_test@alxpay.com',
      passwordHash,
      role: UserRole.USER,
      isEmailVerified: true,
    });
    await AppDataSource.getRepository(User).save(regularUser);
    regularUserToken = generateToken(regularUser);
  });

  afterAll(async () => {
    await AppDataSource.destroy(); // Close DB connection
  });

  describe('POST /api/payments/initiate', () => {
    it('should allow a merchant to initiate a payment', async () => {
      const paymentData = {
        merchantId: alxStoreMerchant.id,
        amount: 100.50,
        currency: 'USD',
        method: PaymentMethod.CARD,
        customerEmail: 'customer@example.com',
        metadata: { item: 'book', quantity: 1 },
      };

      const res = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send(paymentData);

      expect(res.statusCode).toEqual(202);
      expect(res.body.status).toBe('success');
      expect(res.body.data.payment).toBeDefined();
      expect(res.body.data.payment.amount).toBe(paymentData.amount.toFixed(2));
      expect(res.body.data.payment.status).toBe(PaymentStatus.INITIATED);

      const dbPayment = await AppDataSource.getRepository(Payment).findOneBy({ id: res.body.data.payment.id });
      expect(dbPayment).toBeDefined();
      expect(dbPayment?.amount).toBe(paymentData.amount);
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          merchantId: alxStoreMerchant.id,
          amount: 100,
          currency: 'USD',
          // method missing
          customerEmail: 'customer@example.com',
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('method are required');
    });

    it('should return 401 for unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/payments/initiate')
        .send({});
      expect(res.statusCode).toEqual(401);
    });

    it('should return 403 for unauthorized users (e.g., regular user)', async () => {
      const paymentData = {
        merchantId: alxStoreMerchant.id,
        amount: 100.50,
        currency: 'USD',
        method: PaymentMethod.CARD,
        customerEmail: 'customer@example.com',
      };
      const res = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send(paymentData);
      expect(res.statusCode).toEqual(403);
    });
  });

  describe('POST /api/payments/process-webhook', () => {
    let initiatedPayment: Payment;

    beforeEach(async () => {
      initiatedPayment = AppDataSource.getRepository(Payment).create({
        merchant: alxStoreMerchant,
        amount: 50.00,
        currency: 'USD',
        method: PaymentMethod.CARD,
        customerEmail: 'test@customer.com',
        status: PaymentStatus.INITIATED,
        metadata: {},
      });
      await AppDataSource.getRepository(Payment).save(initiatedPayment);
      (axios.post as jest.Mock).mockResolvedValue({ status: 200, data: {} }); // Mock webhook axios call
    });

    it('should successfully process a payment to SUCCESS', async () => {
      const processData = {
        paymentId: initiatedPayment.id,
        externalId: 'ext_txn_123',
        status: PaymentStatus.SUCCESS,
        message: 'Payment approved',
      };

      const res = await request(app)
        .post('/api/payments/process-webhook')
        .send(processData); // No auth for webhook endpoints (security done via shared secret/IP allowlist)

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.payment.status).toBe(PaymentStatus.SUCCESS);

      const dbPayment = await AppDataSource.getRepository(Payment).findOneBy({ id: initiatedPayment.id });
      expect(dbPayment?.status).toBe(PaymentStatus.SUCCESS);
      expect(dbPayment?.externalId).toBe('ext_txn_123');

      const dbTransaction = await AppDataSource.getRepository(Transaction).findOne({ where: { payment: { id: initiatedPayment.id } } });
      expect(dbTransaction).toBeDefined();
      expect(dbTransaction?.status).toBe(TransactionStatus.COMPLETED);
      expect(dbTransaction?.type).toBe(TransactionType.CREDIT);

      const updatedMerchant = await AppDataSource.getRepository(Merchant).findOneBy({ id: alxStoreMerchant.id });
      expect(updatedMerchant?.balance).toBe(1000.00 + 50.00); // Check balance update

      const webhookEvent = await AppDataSource.getRepository(WebhookEvent).findOne({ where: { resourceId: initiatedPayment.id } });
      expect(webhookEvent).toBeDefined();
      expect(webhookEvent?.eventType).toBe(WebhookEventType.PAYMENT_SUCCESS);
      expect(webhookEvent?.status).toBe(WebhookEventStatus.PENDING); // Status starts as PENDING for async processing
    });

    it('should successfully process a payment to FAILED', async () => {
      const processData = {
        paymentId: initiatedPayment.id,
        externalId: 'ext_txn_456',
        status: PaymentStatus.FAILED,
        message: 'Insufficient funds',
      };

      const res = await request(app)
        .post('/api/payments/process-webhook')
        .send(processData);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.payment.status).toBe(PaymentStatus.FAILED);

      const dbPayment = await AppDataSource.getRepository(Payment).findOneBy({ id: initiatedPayment.id });
      expect(dbPayment?.status).toBe(PaymentStatus.FAILED);

      const dbTransaction = await AppDataSource.getRepository(Transaction).findOne({ where: { payment: { id: initiatedPayment.id } } });
      expect(dbTransaction).toBeDefined();
      expect(dbTransaction?.status).toBe(TransactionStatus.FAILED);

      const updatedMerchant = await AppDataSource.getRepository(Merchant).findOneBy({ id: alxStoreMerchant.id });
      expect(updatedMerchant?.balance).toBe(1000.00); // Balance should not change for failed payment
    });

    it('should return 400 if payment not found', async () => {
      const res = await request(app)
        .post('/api/payments/process-webhook')
        .send({ paymentId: 'non-existent-id', externalId: 'x', status: PaymentStatus.SUCCESS });
      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toContain('Payment not found');
    });
  });

  describe('GET /api/payments/:id', () => {
    let successfulPayment: Payment;
    let otherMerchant: Merchant;
    let otherMerchantUser: User;
    let otherMerchantToken: string;

    beforeEach(async () => {
      successfulPayment = AppDataSource.getRepository(Payment).create({
        merchant: alxStoreMerchant,
        amount: 250.00,
        currency: 'USD',
        method: PaymentMethod.BANK_TRANSFER,
        customerEmail: 'paid@example.com',
        status: PaymentStatus.SUCCESS,
        externalId: 'ext_paid_789',
        metadata: {},
      });
      await AppDataSource.getRepository(Payment).save(successfulPayment);

      const passwordHash = await bcrypt.hash('password123', config.hashSaltRounds);
      otherMerchantUser = AppDataSource.getRepository(User).create({
        email: 'other_merchant@alxpay.com',
        passwordHash,
        role: UserRole.MERCHANT,
        isEmailVerified: true,
      });
      await AppDataSource.getRepository(User).save(otherMerchantUser);
      otherMerchantToken = generateToken(otherMerchantUser);

      otherMerchant = AppDataSource.getRepository(Merchant).create({
        name: 'Another Store',
        businessAddress: '789 Other St',
        publicKey: 'other_pk',
        secretKey: 'other_sk',
        balance: 500.00,
        owner: otherMerchantUser,
      });
      await AppDataSource.getRepository(Merchant).save(otherMerchant);
    });

    it('should allow the owning merchant to get payment details', async () => {
      const res = await request(app)
        .get(`/api/payments/${successfulPayment.id}`)
        .set('Authorization', `Bearer ${merchantToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.payment.id).toBe(successfulPayment.id);
      expect(res.body.data.payment.merchant.id).toBe(alxStoreMerchant.id);
    });

    it('should allow an admin to get payment details', async () => {
      const res = await request(app)
        .get(`/api/payments/${successfulPayment.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.payment.id).toBe(successfulPayment.id);
    });

    it('should return 403 if a different merchant tries to get payment details', async () => {
      const res = await request(app)
        .get(`/api/payments/${successfulPayment.id}`)
        .set('Authorization', `Bearer ${otherMerchantToken}`);
      expect(res.statusCode).toEqual(403);
    });

    it('should return 403 if a regular user tries to get payment details', async () => {
      const res = await request(app)
        .get(`/api/payments/${successfulPayment.id}`)
        .set('Authorization', `Bearer ${regularUserToken}`);
      expect(res.statusCode).toEqual(403);
    });

    it('should return 404 if payment not found', async () => {
      const res = await request(app)
        .get('/api/payments/non-existent-id')
        .set('Authorization', `Bearer ${merchantToken}`);
      expect(res.statusCode).toEqual(404);
    });
  });

  describe('POST /api/payments/:id/refund', () => {
    let successfulPayment: Payment;
    let insufficientBalanceMerchant: Merchant;
    let insufficientBalanceUser: User;
    let insufficientBalanceToken: string;

    beforeEach(async () => {
      successfulPayment = AppDataSource.getRepository(Payment).create({
        merchant: alxStoreMerchant,
        amount: 250.00,
        currency: 'USD',
        method: PaymentMethod.CARD,
        customerEmail: 'refund_customer@example.com',
        status: PaymentStatus.SUCCESS,
        externalId: 'ext_paid_for_refund',
        metadata: {},
      });
      await AppDataSource.getRepository(Payment).save(successfulPayment);

      // Merchant with insufficient balance
      const passwordHash = await bcrypt.hash('password123', config.hashSaltRounds);
      insufficientBalanceUser = AppDataSource.getRepository(User).create({
        email: 'low_balance_merchant@alxpay.com',
        passwordHash,
        role: UserRole.MERCHANT,
        isEmailVerified: true,
      });
      await AppDataSource.getRepository(User).save(insufficientBalanceUser);
      insufficientBalanceToken = generateToken(insufficientBalanceUser);

      insufficientBalanceMerchant = AppDataSource.getRepository(Merchant).create({
        name: 'Low Balance Store',
        businessAddress: '123 Low St',
        publicKey: 'low_pk',
        secretKey: 'low_sk',
        balance: 10.00, // Very low balance
        owner: insufficientBalanceUser,
      });
      await AppDataSource.getRepository(Merchant).save(insufficientBalanceMerchant);
    });

    it('should successfully refund a payment', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ status: 200, data: {} }); // Mock webhook axios call

      const refundAmount = 50.00;
      const initialMerchantBalance = alxStoreMerchant.balance;

      const res = await request(app)
        .post(`/api/payments/${successfulPayment.id}/refund`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({ amount: refundAmount, merchantId: alxStoreMerchant.id }); // merchantId is used for cache invalidation

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.payment.status).toBe(PaymentStatus.REFUNDED);

      const dbPayment = await AppDataSource.getRepository(Payment).findOneBy({ id: successfulPayment.id });
      expect(dbPayment?.status).toBe(PaymentStatus.REFUNDED);

      const updatedMerchant = await AppDataSource.getRepository(Merchant).findOneBy({ id: alxStoreMerchant.id });
      expect(updatedMerchant?.balance).toBe(initialMerchantBalance - refundAmount);

      const dbTransaction = await AppDataSource.getRepository(Transaction).findOne({ where: { payment: { id: successfulPayment.id }, type: TransactionType.REFUND } });
      expect(dbTransaction).toBeDefined();
      expect(dbTransaction?.status).toBe(TransactionStatus.COMPLETED);
      expect(dbTransaction?.amount).toBe(refundAmount);

      const webhookEvent = await AppDataSource.getRepository(WebhookEvent).findOne({ where: { resourceId: successfulPayment.id, eventType: WebhookEventType.REFUND_SUCCESS } });
      expect(webhookEvent).toBeDefined();
      expect(webhookEvent?.status).toBe(WebhookEventStatus.PENDING);
    });

    it('should return 400 for invalid refund amount', async () => {
      const res = await request(app)
        .post(`/api/payments/${successfulPayment.id}/refund`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({ amount: 0 });
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Valid refund amount is required');

      const res2 = await request(app)
        .post(`/api/payments/${successfulPayment.id}/refund`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({ amount: 300.00 }); // More than original payment
      expect(res2.statusCode).toEqual(400);
      expect(res2.body.message).toContain('Invalid refund amount');
    });

    it('should return 400 if merchant has insufficient balance', async () => {
      const paymentToRefund = AppDataSource.getRepository(Payment).create({
        merchant: insufficientBalanceMerchant,
        amount: 20.00,
        currency: 'USD',
        method: PaymentMethod.CARD,
        customerEmail: 'lowbal@example.com',
        status: PaymentStatus.SUCCESS,
        externalId: 'ext_low_bal',
        metadata: {},
      });
      await AppDataSource.getRepository(Payment).save(paymentToRefund);

      const res = await request(app)
        .post(`/api/payments/${paymentToRefund.id}/refund`)
        .set('Authorization', `Bearer ${insufficientBalanceToken}`)
        .send({ amount: 15.00, merchantId: insufficientBalanceMerchant.id }); // Requesting 15, has 10 balance
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Insufficient merchant balance for refund');
    });

    it('should return 403 if a different merchant tries to refund', async () => {
      const res = await request(app)
        .post(`/api/payments/${successfulPayment.id}/refund`)
        .set('Authorization', `Bearer ${insufficientBalanceToken}`) // Different merchant
        .send({ amount: 50.00 });
      expect(res.statusCode).toEqual(403);
    });
  });
});