```javascript
// tests/integration/transaction.test.js
const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const { sequelize } = require('../../src/database');
const { User, Merchant, Transaction, IdempotencyKey } = require('../../src/models');
const { faker } = require('@faker-js/faker');
const { generateApiKey } = require('../../src/services/merchant.service');

// Mock external payment gateway for integration tests
// This ensures that the integration tests don't make real external calls
jest.mock('../../src/services/transaction.service', () => {
    const originalModule = jest.requireActual('../../src/services/transaction.service');
    return {
        ...originalModule,
        simulatePaymentGateway: {
            authorize: jest.fn(),
            capture: jest.fn(),
            refund: jest.fn(),
        },
    };
});
const mockSimulatePaymentGateway = require('../../src/services/transaction.service').simulatePaymentGateway;

// ALX Principle: Integration Testing
// Test the entire flow from API endpoint to database, including authentication and business logic.

describe('Transaction routes (Merchant API Key Auth)', () => {
    let merchant, merchantApiKey;

    beforeEach(async () => {
        await sequelize.sync({ force: true }); // Clear and re-create tables

        // Create a test merchant and get their API key
        merchantApiKey = generateApiKey();
        merchant = await Merchant.create({
            id: faker.string.uuid(),
            name: 'API Test Merchant',
            email: 'api.test@merchant.com',
            businessCategory: 'E-commerce',
            apiKey: merchantApiKey,
            isActive: true,
        });

        // Reset mock gateway behavior for each test
        mockSimulatePaymentGateway.authorize.mockResolvedValue({
            status: 'authorized',
            gatewayReferenceId: `gw_auth_${faker.string.uuid()}`,
            message: 'Payment authorized successfully.',
            metadata: {},
        });
        mockSimulatePaymentGateway.capture.mockResolvedValue({
            status: 'captured',
            gatewayReferenceId: `gw_cap_${faker.string.uuid()}`,
            message: 'Funds captured successfully.',
            metadata: {},
        });
        mockSimulatePaymentGateway.refund.mockResolvedValue({
            status: 'refunded',
            gatewayReferenceId: `gw_ref_${faker.string.uuid()}`,
            message: 'Funds refunded successfully.',
            metadata: {},
        });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    describe('POST /api/v1/transactions/process', () => {
        let transactionPayload;
        let idempotencyKey;

        beforeEach(() => {
            transactionPayload = {
                amount: 2500, // $25.00
                currency: 'USD',
                paymentMethodType: 'card',
                paymentMethodDetails: { token: 'tok_visa_success' },
                customerId: faker.string.uuid(),
                description: 'Test purchase for integration test',
            };
            idempotencyKey = faker.string.uuid();
        });

        test('should return 201 and create a transaction if API Key is valid', async () => {
            const res = await request(app)
                .post('/api/v1/transactions/process')
                .set('X-Api-Key', merchantApiKey)
                .set('X-Idempotency-Key', idempotencyKey)
                .send(transactionPayload)
                .expect(httpStatus.CREATED);

            expect(res.body).toHaveProperty('id');
            expect(res.body.merchantId).toBe(merchant.id);
            expect(res.body.amount).toBe(transactionPayload.amount);
            expect(res.body.currency).toBe(transactionPayload.currency);
            expect(res.body.status).toBe('authorized'); // From mock gateway
            expect(res.body.gatewayReferenceId).toBeDefined();

            const dbTransaction = await Transaction.findByPk(res.body.id);
            expect(dbTransaction).toBeDefined();
            expect(dbTransaction.idempotencyKey).toBe(idempotencyKey);

            const dbIdempotencyKey = await IdempotencyKey.findOne({ where: { key: idempotencyKey, merchantId: merchant.id } });
            expect(dbIdempotencyKey).toBeDefined();
            expect(dbIdempotencyKey.responseStatusCode).toBe(httpStatus.CREATED);
        });

        test('should return 200 for a subsequent identical request with the same idempotency key', async () => {
            await request(app)
                .post('/api/v1/transactions/process')
                .set('X-Api-Key', merchantApiKey)
                .set('X-Idempotency-Key', idempotencyKey)
                .send(transactionPayload)
                .expect(httpStatus.CREATED); // First request creates

            const res = await request(app)
                .post('/api/v1/transactions/process')
                .set('X-Api-Key', merchantApiKey)
                .set('X-Idempotency-Key', idempotencyKey)
                .send(transactionPayload)
                .expect(httpStatus.OK); // Second request returns cached response

            expect(res.body).toHaveProperty('id'); // Should be the same transaction ID as the first
            expect(res.body.amount).toBe(transactionPayload.amount);

            // Ensure gateway was only called once
            expect(mockSimulatePaymentGateway.authorize).toHaveBeenCalledTimes(1);
        });

        test('should return 409 for a subsequent request with same idempotency key but different payload', async () => {
            await request(app)
                .post('/api/v1/transactions/process')
                .set('X-Api-Key', merchantApiKey)
                .set('X-Idempotency-Key', idempotencyKey)
                .send(transactionPayload)
                .expect(httpStatus.CREATED);

            const changedPayload = { ...transactionPayload, amount: 3000 }; // Different amount

            const res = await request(app)
                .post('/api/v1/transactions/process')
                .set('X-Api-Key', merchantApiKey)
                .set('X-Idempotency-Key', idempotencyKey)
                .send(changedPayload)
                .expect(httpStatus.CONFLICT);

            expect(res.body.message).toBe('Idempotency key already used with different parameters.');
            expect(mockSimulatePaymentGateway.authorize).toHaveBeenCalledTimes(1);
        });

        test('should return 401 if API Key is missing', async () => {
            await request(app)
                .post('/api/v1/transactions/process')
                .set('X-Idempotency-Key', idempotencyKey)
                .send(transactionPayload)
                .expect(httpStatus.UNAUTHORIZED);
        });

        test('should return 401 if API Key is invalid', async () => {
            await request(app)
                .post('/api/v1/transactions/process')
                .set('X-Api-Key', 'invalid_api_key')
                .set('X-Idempotency-Key', idempotencyKey)
                .send(transactionPayload)
                .expect(httpStatus.UNAUTHORIZED);
        });

        test('should return 400 if X-Idempotency-Key header is missing', async () => {
            const res = await request(app)
                .post('/api/v1/transactions/process')
                .set('X-Api-Key', merchantApiKey)
                .send(transactionPayload)
                .expect(httpStatus.BAD_REQUEST);

            expect(res.body.message).toBe('X-Idempotency-Key header is required.');
        });
    });

    describe('POST /api/v1/transactions/:transactionId/capture', () => {
        let authorizedTransaction;
        let captureIdempotencyKey;

        beforeEach(async () => {
            // First create an authorized transaction
            const initialRes = await request(app)
                .post('/api/v1/transactions/process')
                .set('X-Api-Key', merchantApiKey)
                .set('X-Idempotency-Key', faker.string.uuid())
                .send({
                    amount: 5000,
                    currency: 'USD',
                    paymentMethodType: 'card',
                    paymentMethodDetails: { token: 'tok_authorize_only' },
                    description: 'Transaction for capture test',
                })
                .expect(httpStatus.CREATED);
            authorizedTransaction = initialRes.body;
            captureIdempotencyKey = faker.string.uuid();
            expect(authorizedTransaction.status).toBe('authorized');
        });

        test('should return 200 and update status to captured', async () => {
            const res = await request(app)
                .post(`/api/v1/transactions/${authorizedTransaction.id}/capture`)
                .set('X-Api-Key', merchantApiKey)
                .set('X-Idempotency-Key', captureIdempotencyKey)
                .send({ amount: 5000 })
                .expect(httpStatus.OK);

            expect(res.body.id).toBe(authorizedTransaction.id);
            expect(res.body.status).toBe('captured');
            expect(res.body.amountCaptured).toBe(5000);

            const dbTransaction = await Transaction.findByPk(authorizedTransaction.id);
            expect(dbTransaction.status).toBe('captured');
            expect(dbTransaction.amountCaptured).toBe(5000);
            expect(mockSimulatePaymentGateway.capture).toHaveBeenCalledTimes(1);
        });

        test('should return 400 if transaction is not in authorized state', async () => {
            // Manually change transaction status to failed
            await Transaction.update({ status: 'failed' }, { where: { id: authorizedTransaction.id } });

            await request(app)
                .post(`/api/v1/transactions/${authorizedTransaction.id}/capture`)
                .set('X-Api-Key', merchantApiKey)
                .set('X-Idempotency-Key', captureIdempotencyKey)
                .send({ amount: 5000 })
                .expect(httpStatus.BAD_REQUEST);
        });

        test('should return 400 if capture amount exceeds authorized amount', async () => {
            await request(app)
                .post(`/api/v1/transactions/${authorizedTransaction.id}/capture`)
                .set('X-Api-Key', merchantApiKey)
                .set('X-Idempotency-Key', captureIdempotencyKey)
                .send({ amount: 6000 }) // More than 5000 authorized
                .expect(httpStatus.BAD_REQUEST);
        });
    });

    describe('POST /api/v1/transactions/:transactionId/refund', () => {
        let capturedTransaction;
        let refundIdempotencyKey;

        beforeEach(async () => {
            // First create a captured transaction
            mockSimulatePaymentGateway.authorize.mockResolvedValueOnce({
                status: 'authorized',
                gatewayReferenceId: `gw_auth_${faker.string.uuid()}`,
                message: 'Payment authorized successfully.',
                metadata: {},
            });
            const authRes = await request(app)
                .post('/api/v1/transactions/process')
                .set('X-Api-Key', merchantApiKey)
                .set('X-Idempotency-Key', faker.string.uuid())
                .send({
                    amount: 7500,
                    currency: 'USD',
                    paymentMethodType: 'card',
                    paymentMethodDetails: { token: 'tok_process_only' },
                    description: 'Transaction for refund test',
                })
                .expect(httpStatus.CREATED);
            let transactionId = authRes.body.id;

            mockSimulatePaymentGateway.capture.mockResolvedValueOnce({
                status: 'captured',
                gatewayReferenceId: `gw_cap_${faker.string.uuid()}`,
                message: 'Funds captured successfully.',
                metadata: {},
            });
            const captureRes = await request(app)
                .post(`/api/v1/transactions/${transactionId}/capture`)
                .set('X-Api-Key', merchantApiKey)
                .set('X-Idempotency-Key', faker.string.uuid())
                .send({ amount: 7500 })
                .expect(httpStatus.OK);
            capturedTransaction = captureRes.body;
            refundIdempotencyKey = faker.string.uuid();
            expect(capturedTransaction.status).toBe('captured');
            expect(capturedTransaction.amountCaptured).toBe(7500);
        });

        test('should return 200 and update status to refunded for full refund', async () => {
            const res = await request(app)
                .post(`/api/v1/transactions/${capturedTransaction.id}/refund`)
                .set('X-Api-Key', merchantApiKey)
                .set('X-Idempotency-Key', refundIdempotencyKey)
                .send({ amount: 7500 })
                .expect(httpStatus.OK);

            expect(res.body.id).toBe(capturedTransaction.id);
            expect(res.body.status).toBe('refunded');
            expect(res.body.amountRefunded).toBe(7500);

            const dbTransaction = await Transaction.findByPk(capturedTransaction.id);
            expect(dbTransaction.status).toBe('refunded');
            expect(dbTransaction.amountRefunded).toBe(7500);
            expect(mockSimulatePaymentGateway.refund).toHaveBeenCalledTimes(1);
        });

        test('should return 200 and update status to partially_refunded for partial refund', async () => {
            const res = await request(app)
                .post(`/api/v1/transactions/${capturedTransaction.id}/refund`)
                .set('X-Api-Key', merchantApiKey)
                .set('X-Idempotency-Key', refundIdempotencyKey)
                .send({ amount: 2500 }) // Partial refund
                .expect(httpStatus.OK);

            expect(res.body.id).toBe(capturedTransaction.id);
            expect(res.body.status).toBe('partially_refunded');
            expect(res.body.amountRefunded).toBe(2500);

            const dbTransaction = await Transaction.findByPk(capturedTransaction.id);
            expect(dbTransaction.status).toBe('partially_refunded');
            expect(dbTransaction.amountRefunded).toBe(2500);
        });

        test('should return 400 if refund amount exceeds captured amount', async () => {
            await request(app)
                .post(`/api/v1/transactions/${capturedTransaction.id}/refund`)
                .set('X-Api-Key', merchantApiKey)
                .set('X-Idempotency-Key', refundIdempotencyKey)
                .send({ amount: 8000 }) // More than 7500 captured
                .expect(httpStatus.BAD_REQUEST);
        });
    });

    describe('GET /api/v1/transactions/:transactionId', () => {
        let transaction;

        beforeEach(async () => {
            const processRes = await request(app)
                .post('/api/v1/transactions/process')
                .set('X-Api-Key', merchantApiKey)
                .set('X-Idempotency-Key', faker.string.uuid())
                .send({
                    amount: 1200, currency: 'EUR', paymentMethodType: 'card',
                    paymentMethodDetails: { token: 'tok_success' }, description: 'Single transaction fetch'
                })
                .expect(httpStatus.CREATED);
            transaction = processRes.body;
        });

        test('should return 200 and the transaction details if API Key is valid and transaction belongs to merchant', async () => {
            const res = await request(app)
                .get(`/api/v1/transactions/${transaction.id}`)
                .set('X-Api-Key', merchantApiKey)
                .expect(httpStatus.OK);

            expect(res.body.id).toBe(transaction.id);
            expect(res.body.merchantId).toBe(merchant.id);
            expect(res.body.amount).toBe(transaction.amount);
        });

        test('should return 404 if transaction not found', async () => {
            const nonExistentId = faker.string.uuid();
            await request(app)
                .get(`/api/v1/transactions/${nonExistentId}`)
                .set('X-Api-Key', merchantApiKey)
                .expect(httpStatus.NOT_FOUND);
        });

        test('should return 404 if transaction belongs to another merchant', async () => {
            const anotherMerchantApiKey = generateApiKey();
            await Merchant.create({
                id: faker.string.uuid(),
                name: 'Another Merchant',
                email: 'another@merchant.com',
                businessCategory: 'Services',
                apiKey: anotherMerchantApiKey,
                isActive: true,
            });

            await request(app)
                .get(`/api/v1/transactions/${transaction.id}`)
                .set('X-Api-Key', anotherMerchantApiKey)
                .expect(httpStatus.NOT_FOUND); // Should be 404, not 403, as from perspective of wrong merchant it doesn't exist
        });
    });

    describe('GET /api/v1/transactions', () => {
        let transactions;

        beforeEach(async () => {
            transactions = [];
            for (let i = 0; i < 5; i++) {
                const processRes = await request(app)
                    .post('/api/v1/transactions/process')
                    .set('X-Api-Key', merchantApiKey)
                    .set('X-Idempotency-Key', faker.string.uuid())
                    .send({
                        amount: 1000 + i * 100,
                        currency: 'USD',
                        paymentMethodType: 'card',
                        paymentMethodDetails: { token: 'tok_success' },
                        description: `Transaction ${i + 1}`,
                    })
                    .expect(httpStatus.CREATED);
                transactions.push(processRes.body);
            }
        });

        test('should return 200 and a list of transactions for the merchant', async () => {
            const res = await request(app)
                .get('/api/v1/transactions')
                .set('X-Api-Key', merchantApiKey)
                .expect(httpStatus.OK);

            expect(res.body).toHaveProperty('results');
            expect(res.body.results).toHaveLength(5);
            expect(res.body.results[0].merchantId).toBe(merchant.id);
        });

        test('should filter transactions by status', async () => {
            // All seeded transactions are 'authorized' by default mock
            const res = await request(app)
                .get('/api/v1/transactions?status=authorized')
                .set('X-Api-Key', merchantApiKey)
                .expect(httpStatus.OK);

            expect(res.body.results).toHaveLength(5);
            expect(res.body.results[0].status).toBe('authorized');

            // Test a status that doesn't exist
            const resFailed = await request(app)
                .get('/api/v1/transactions?status=failed')
                .set('X-Api-Key', merchantApiKey)
                .expect(httpStatus.OK);
            expect(resFailed.body.results).toHaveLength(0);
        });

        test('should paginate and limit results', async () => {
            const res = await request(app)
                .get('/api/v1/transactions?limit=2&page=1')
                .set('X-Api-Key', merchantApiKey)
                .expect(httpStatus.OK);

            expect(res.body.results).toHaveLength(2);
            expect(res.body.page).toBe(1);
            expect(res.body.limit).toBe(2);
            expect(res.body.totalResults).toBe(5);
        });
    });
});
```