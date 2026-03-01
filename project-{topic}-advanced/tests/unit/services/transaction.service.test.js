```javascript
// tests/unit/services/transaction.service.test.js
const { transactionService } = require('../../../src/services');
const { Transaction, Merchant, IdempotencyKey } = require('../../../src/models'); // Need models for mocking
const { ApiError } = require('../../../src/utils/ApiError');
const httpStatus = require('http-status');
const { faker } = require('@faker-js/faker');

// Mock external payment gateway for isolated testing
jest.mock('../../../src/services/transaction.service', () => {
    const originalModule = jest.requireActual('../../../src/services/transaction.service');
    return {
        ...originalModule,
        simulatePaymentGateway: {
            authorize: jest.fn(),
            capture: jest.fn(),
            refund: jest.fn(),
        },
    };
});

const mockSimulatePaymentGateway = transactionService.simulatePaymentGateway; // Access the mocked module

// ALX Principle: Unit Testing - Isolating Business Logic
// Test transaction flows by mocking external dependencies like the payment gateway and database interactions.

describe('Transaction Service', () => {
    // Mock data for a consistent testing environment
    const merchantId = faker.string.uuid();
    const mockTransactionData = {
        merchantId,
        amount: 1000, // 10.00 USD
        currency: 'USD',
        paymentMethodType: 'card',
        paymentMethodDetails: { token: 'tok_visa_success' },
        customerId: faker.string.uuid(),
        description: 'Test purchase',
        idempotencyKey: faker.string.uuid(),
    };

    const mockTransactionInstance = {
        id: faker.string.uuid(),
        merchantId,
        amount: 1000,
        currency: 'USD',
        status: 'pending',
        paymentMethodType: 'card',
        gatewayReferenceId: null,
        gatewayResponse: {},
        amountCaptured: 0,
        amountRefunded: 0,
        metadata: {},
        save: jest.fn().mockResolvedValue(true), // Mock the save method
        toJSON: jest.fn(function() { return { ...this, id: this.id } })
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset mock gateway behavior
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

        // Mock Sequelize methods
        Transaction.sequelize = { transaction: jest.fn(async (callback) => callback({})) }; // Mock transaction
        Transaction.create = jest.fn().mockResolvedValue(mockTransactionInstance);
        Transaction.findOne = jest.fn().mockResolvedValue(mockTransactionInstance);
        Transaction.paginate = jest.fn().mockResolvedValue({ results: [], page: 1, limit: 10, totalPages: 1, totalResults: 0 });
        Transaction.findByPk = jest.fn().mockResolvedValue(mockTransactionInstance);
    });

    describe('processNewTransaction', () => {
        test('should successfully process a new transaction and return authorized status', async () => {
            const result = await transactionService.processNewTransaction(mockTransactionData);

            expect(Transaction.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    merchantId: mockTransactionData.merchantId,
                    amount: mockTransactionData.amount,
                    currency: mockTransactionData.currency,
                    status: 'pending',
                    idempotencyKey: mockTransactionData.idempotencyKey,
                }),
                expect.anything() // Expect sequelize transaction options
            );
            expect(mockSimulatePaymentGateway.authorize).toHaveBeenCalledWith(
                mockTransactionData.amount,
                mockTransactionData.currency,
                mockTransactionData.paymentMethodDetails,
                expect.objectContaining({ merchantId: mockTransactionData.merchantId })
            );
            expect(mockTransactionInstance.save).toHaveBeenCalled();
            expect(result.status).toBe('authorized');
            expect(result.gatewayReferenceId).toBeDefined();
        });

        test('should set transaction status to failed if gateway authorization fails', async () => {
            const gatewayErrorMessage = 'Gateway auth failed';
            mockSimulatePaymentGateway.authorize.mockRejectedValue(new Error(gatewayErrorMessage));

            await expect(transactionService.processNewTransaction(mockTransactionData))
                .rejects.toThrow(new ApiError(httpStatus.BAD_REQUEST, `Payment processing failed: ${gatewayErrorMessage}`));

            expect(mockTransactionInstance.save).toHaveBeenCalled(); // Should save with 'failed' status
            expect(mockTransactionInstance.status).toBe('failed');
            expect(mockTransactionInstance.failureReason).toBe(gatewayErrorMessage);
        });
    });

    describe('captureTransaction', () => {
        test('should successfully capture an authorized transaction', async () => {
            mockTransactionInstance.status = 'authorized';
            mockTransactionInstance.gatewayReferenceId = 'gw_auth_123';
            Transaction.findOne.mockResolvedValue(mockTransactionInstance);

            const result = await transactionService.captureTransaction(mockTransactionInstance.id, merchantId, 500);

            expect(Transaction.findOne).toHaveBeenCalledWith({
                where: { id: mockTransactionInstance.id, merchantId },
            });
            expect(mockSimulatePaymentGateway.capture).toHaveBeenCalledWith(
                'gw_auth_123',
                500,
                expect.objectContaining({ merchantId })
            );
            expect(mockTransactionInstance.save).toHaveBeenCalled();
            expect(result.status).toBe('captured');
            expect(result.amountCaptured).toBe(500);
        });

        test('should throw error if transaction not found', async () => {
            Transaction.findOne.mockResolvedValue(null);

            await expect(transactionService.captureTransaction(faker.string.uuid(), merchantId, 500))
                .rejects.toThrow(new ApiError(httpStatus.NOT_FOUND, 'Transaction not found for this merchant.'));
        });

        test('should throw error if transaction is not in authorized status', async () => {
            mockTransactionInstance.status = 'pending';
            Transaction.findOne.mockResolvedValue(mockTransactionInstance);

            await expect(transactionService.captureTransaction(mockTransactionInstance.id, merchantId, 500))
                .rejects.toThrow(new ApiError(httpStatus.BAD_REQUEST, `Transaction must be in 'authorized' status to be captured. Current status: pending`));
        });
    });

    describe('refundTransaction', () => {
        test('should successfully refund a captured transaction', async () => {
            mockTransactionInstance.status = 'captured';
            mockTransactionInstance.amountCaptured = 1000;
            mockTransactionInstance.amountRefunded = 0;
            mockTransactionInstance.gatewayReferenceId = 'gw_cap_123';
            Transaction.findOne.mockResolvedValue(mockTransactionInstance);

            const result = await transactionService.refundTransaction(mockTransactionInstance.id, merchantId, 1000);

            expect(Transaction.findOne).toHaveBeenCalledWith({
                where: { id: mockTransactionInstance.id, merchantId },
            });
            expect(mockSimulatePaymentGateway.refund).toHaveBeenCalledWith(
                'gw_cap_123',
                1000,
                expect.objectContaining({ merchantId })
            );
            expect(mockTransactionInstance.save).toHaveBeenCalled();
            expect(result.status).toBe('refunded');
            expect(result.amountRefunded).toBe(1000);
        });

        test('should throw error if transaction not found', async () => {
            Transaction.findOne.mockResolvedValue(null);

            await expect(transactionService.refundTransaction(faker.string.uuid(), merchantId, 500))
                .rejects.toThrow(new ApiError(httpStatus.NOT_FOUND, 'Transaction not found for this merchant.'));
        });

        test('should throw error if transaction is not in captured status', async () => {
            mockTransactionInstance.status = 'authorized';
            Transaction.findOne.mockResolvedValue(mockTransactionInstance);

            await expect(transactionService.refundTransaction(mockTransactionInstance.id, merchantId, 500))
                .rejects.toThrow(new ApiError(httpStatus.BAD_REQUEST, `Transaction must be in 'captured' status to be refunded. Current status: authorized`));
        });

        test('should set status to partially_refunded if partial refund', async () => {
            mockTransactionInstance.status = 'captured';
            mockTransactionInstance.amountCaptured = 1000;
            mockTransactionInstance.amountRefunded = 0;
            mockTransactionInstance.gatewayReferenceId = 'gw_cap_123';
            Transaction.findOne.mockResolvedValue(mockTransactionInstance);

            const result = await transactionService.refundTransaction(mockTransactionInstance.id, merchantId, 500);
            expect(result.status).toBe('partially_refunded');
            expect(result.amountRefunded).toBe(500);
        });
    });

    describe('getTransactionByIdAndMerchant', () => {
        test('should return transaction if found and belongs to merchant', async () => {
            Transaction.findOne.mockResolvedValue(mockTransactionInstance);
            const result = await transactionService.getTransactionByIdAndMerchant(mockTransactionInstance.id, merchantId);
            expect(result).toEqual(mockTransactionInstance);
            expect(Transaction.findOne).toHaveBeenCalledWith({
                where: { id: mockTransactionInstance.id, merchantId },
                include: expect.anything(),
            });
        });

        test('should return null if transaction not found or not belonging to merchant', async () => {
            Transaction.findOne.mockResolvedValue(null);
            const result = await transactionService.getTransactionByIdAndMerchant(faker.string.uuid(), merchantId);
            expect(result).toBeNull();
        });
    });

    describe('queryTransactions', () => {
        test('should return paginated transactions', async () => {
            const mockPaginatedResult = {
                results: [mockTransactionInstance],
                page: 1,
                limit: 10,
                totalPages: 1,
                totalResults: 1,
            };
            Transaction.paginate.mockResolvedValue(mockPaginatedResult);

            const filter = { merchantId, status: 'authorized' };
            const options = { limit: 10, page: 1, sortBy: 'createdAt:desc' };
            const result = await transactionService.queryTransactions(filter, options);

            expect(Transaction.paginate).toHaveBeenCalledWith(filter, options);
            expect(result).toEqual(mockPaginatedResult);
        });
    });

    describe('updateTransactionStatus', () => {
        test('should update transaction status if valid transition', async () => {
            mockTransactionInstance.status = 'pending';
            mockTransactionInstance.save.mockClear(); // Clear previous saves
            Transaction.findByPk.mockResolvedValue(mockTransactionInstance);

            const updatedTransaction = await transactionService.updateTransactionStatus(
                mockTransactionInstance.id,
                'authorized',
                { newGatewayData: true }
            );

            expect(Transaction.findByPk).toHaveBeenCalledWith(mockTransactionInstance.id);
            expect(updatedTransaction.status).toBe('authorized');
            expect(updatedTransaction.gatewayResponse).toEqual(expect.objectContaining({ newGatewayData: true }));
            expect(mockTransactionInstance.save).toHaveBeenCalled();
        });

        test('should warn and not throw error for invalid status transition via webhook (graceful handling)', async () => {
            // Mock logger to check if warning is logged
            const logger = require('../../../src/utils/logger');
            logger.warn = jest.fn();

            mockTransactionInstance.status = 'failed'; // Invalid transition from failed to captured
            mockTransactionInstance.save.mockClear();
            Transaction.findByPk.mockResolvedValue(mockTransactionInstance);

            const updatedTransaction = await transactionService.updateTransactionStatus(
                mockTransactionInstance.id,
                'captured',
                {}
            );

            expect(updatedTransaction.status).toBe('captured'); // Status is updated by default, but a warning is logged
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining(`Invalid state transition for transaction ${mockTransactionInstance.id}: from failed to captured`)
            );
            expect(mockTransactionInstance.save).toHaveBeenCalled(); // Should still save the status change
        });

        test('should return null if transaction does not exist', async () => {
            Transaction.findByPk.mockResolvedValue(null);
            const result = await transactionService.updateTransactionStatus(faker.string.uuid(), 'captured', {});
            expect(result).toBeNull();
        });
    });
});
```