```javascript
const httpStatus = require('http-status-codes');
const { sequelize, Transaction, Account } = require('../../models');
const transactionService = require('../../src/services/transaction.service');
const ApiError = require('../../src/utils/apiError');
const { TRANSACTION_STATUS, TRANSACTION_TYPE, ACCOUNT_TYPE } = require('../../src/utils/constants');

// Mock Sequelize and models
jest.mock('../../models', () => ({
  sequelize: {
    transaction: jest.fn((callback) => callback({ commit: jest.fn(), rollback: jest.fn() })),
    // Mock for transaction.service.test.js:
    // sequelize.transaction is called and expects a callback.
    // The callback receives a transaction object (t).
    // We provide a mock t object with commit and rollback methods.
  },
  Transaction: {
    create: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
  },
  Account: {
    findByPk: jest.fn(),
    update: jest.fn(),
  },
}));

describe('Transaction Service', () => {
  let mockUserId, mockSourceAccountId, mockDestinationAccountId;
  let mockSourceAccount, mockDestinationAccount, mockTransaction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserId = 'user-id-123';
    mockSourceAccountId = 'source-account-id-456';
    mockDestinationAccountId = 'dest-account-id-789';

    mockSourceAccount = {
      id: mockSourceAccountId,
      userId: mockUserId,
      balance: 1000.00,
      currency: 'USD',
      type: ACCOUNT_TYPE.CHECKING,
      save: jest.fn(),
    };

    mockDestinationAccount = {
      id: mockDestinationAccountId,
      userId: 'other-user-id-000', // Destination can be another user's account
      balance: 500.00,
      currency: 'USD',
      type: ACCOUNT_TYPE.CHECKING,
      save: jest.fn(),
    };

    mockTransaction = {
      id: 'transaction-id-abc',
      userId: mockUserId,
      sourceAccountId: mockSourceAccountId,
      destinationAccountId: mockDestinationAccountId,
      amount: 100.00,
      currency: 'USD',
      description: 'Test payment',
      status: TRANSACTION_STATUS.PENDING,
      type: TRANSACTION_TYPE.PAYMENT,
      gatewayRefId: null,
      remarks: null,
      completedAt: null,
      save: jest.fn(),
    };

    // Configure sequelize.transaction to immediately call its callback
    sequelize.transaction.mockImplementation(async (callback) => {
      const t = { commit: jest.fn(), rollback: jest.fn(), lock: true }; // Mock transaction object
      try {
        const result = await callback(t);
        t.commit();
        return result;
      } catch (error) {
        t.rollback();
        throw error;
      }
    });

    Account.findByPk.mockImplementation((id) => {
      if (id === mockSourceAccountId) return Promise.resolve(mockSourceAccount);
      if (id === mockDestinationAccountId) return Promise.resolve(mockDestinationAccount);
      return Promise.resolve(null);
    });
    Transaction.findByPk.mockResolvedValue(mockTransaction);
    Transaction.create.mockResolvedValue(mockTransaction);
  });

  describe('createPendingTransaction', () => {
    test('should create a pending transaction and debit source account', async () => {
      const transactionBody = {
        userId: mockUserId,
        sourceAccountId: mockSourceAccountId,
        destinationAccountId: mockDestinationAccountId,
        amount: 100.00,
        currency: 'USD',
        description: 'Test payment',
      };

      const result = await transactionService.createPendingTransaction(transactionBody);

      expect(Account.findByPk).toHaveBeenCalledWith(mockSourceAccountId, expect.any(Object));
      expect(mockSourceAccount.balance).toBe(900.00); // 1000 - 100
      expect(mockSourceAccount.save).toHaveBeenCalled();
      expect(Transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          sourceAccountId: mockSourceAccountId,
          destinationAccountId: mockDestinationAccountId,
          amount: 100.00,
          status: TRANSACTION_STATUS.PENDING,
        }),
        expect.any(Object)
      );
      expect(result).toEqual(mockTransaction);
    });

    test('should throw ApiError if amount is not positive', async () => {
      const transactionBody = {
        userId: mockUserId,
        sourceAccountId: mockSourceAccountId,
        destinationAccountId: mockDestinationAccountId,
        amount: 0,
        currency: 'USD',
        description: 'Test payment',
      };

      await expect(transactionService.createPendingTransaction(transactionBody))
        .rejects.toThrow(new ApiError(httpStatus.BAD_REQUEST, 'Transaction amount must be positive'));
    });

    test('should throw ApiError if source account not found or unauthorized', async () => {
      Account.findByPk.mockResolvedValueOnce(null); // Mock source account not found
      const transactionBody = {
        userId: mockUserId,
        sourceAccountId: 'non-existent-account',
        destinationAccountId: mockDestinationAccountId,
        amount: 100.00,
        currency: 'USD',
        description: 'Test payment',
      };

      await expect(transactionService.createPendingTransaction(transactionBody))
        .rejects.toThrow(new ApiError(httpStatus.BAD_REQUEST, 'Invalid source account or unauthorized'));
    });

    test('should throw ApiError if insufficient funds', async () => {
      mockSourceAccount.balance = 50.00; // Set balance lower than amount
      const transactionBody = {
        userId: mockUserId,
        sourceAccountId: mockSourceAccountId,
        destinationAccountId: mockDestinationAccountId,
        amount: 100.00,
        currency: 'USD',
        description: 'Test payment',
      };

      await expect(transactionService.createPendingTransaction(transactionBody))
        .rejects.toThrow(new ApiError(httpStatus.BAD_REQUEST, 'Insufficient funds in source account'));
    });
  });

  describe('updateTransactionStatus', () => {
    test('should update transaction status', async () => {
      const updatedTransaction = { ...mockTransaction, status: TRANSACTION_STATUS.PROCESSING, save: jest.fn() };
      Transaction.findByPk.mockResolvedValueOnce(updatedTransaction);

      const result = await transactionService.updateTransactionStatus(
        mockTransaction.id,
        TRANSACTION_STATUS.PROCESSING,
        'gateway_ref_123'
      );

      expect(updatedTransaction.status).toBe(TRANSACTION_STATUS.PROCESSING);
      expect(updatedTransaction.gatewayRefId).toBe('gateway_ref_123');
      expect(updatedTransaction.save).toHaveBeenCalled();
      expect(result).toEqual(updatedTransaction);
    });

    test('should throw ApiError if transaction not found', async () => {
      Transaction.findByPk.mockResolvedValueOnce(null);

      await expect(transactionService.updateTransactionStatus('non-existent-id', TRANSACTION_STATUS.COMPLETED))
        .rejects.toThrow(new ApiError(httpStatus.NOT_FOUND, 'Transaction not found'));
    });
  });

  describe('completeTransaction', () => {
    test('should complete a pending transaction and credit destination account', async () => {
      mockTransaction.status = TRANSACTION_STATUS.PENDING; // Ensure it's pending initially

      const result = await transactionService.completeTransaction(mockTransaction.id, 'gateway_ref_xyz');

      expect(Transaction.findByPk).toHaveBeenCalledWith(mockTransaction.id, expect.any(Object));
      expect(Account.findByPk).toHaveBeenCalledWith(mockDestinationAccountId, expect.any(Object));
      expect(mockDestinationAccount.balance).toBe(600.00); // 500 + 100
      expect(mockDestinationAccount.save).toHaveBeenCalled();
      expect(mockTransaction.status).toBe(TRANSACTION_STATUS.COMPLETED);
      expect(mockTransaction.gatewayRefId).toBe('gateway_ref_xyz');
      expect(mockTransaction.completedAt).toBeInstanceOf(Date);
      expect(mockTransaction.save).toHaveBeenCalled();
      expect(result).toEqual(mockTransaction);
    });

    test('should return existing transaction if not pending (idempotency)', async () => {
      mockTransaction.status = TRANSACTION_STATUS.COMPLETED; // Already completed

      const result = await transactionService.completeTransaction(mockTransaction.id, 'gateway_ref_xyz');

      expect(Account.findByPk).not.toHaveBeenCalledWith(mockDestinationAccountId, expect.any(Object)); // No credit
      expect(mockTransaction.save).not.toHaveBeenCalled(); // No save
      expect(result).toEqual(mockTransaction); // Returns original
    });

    test('should throw ApiError if transaction not found', async () => {
      Transaction.findByPk.mockResolvedValueOnce(null);

      await expect(transactionService.completeTransaction('non-existent-id', 'gateway_ref_xyz'))
        .rejects.toThrow(new ApiError(httpStatus.NOT_FOUND, 'Transaction not found'));
    });

    test('should throw ApiError if destination account not found', async () => {
      Account.findByPk.mockResolvedValueOnce(mockSourceAccount); // For source
      Account.findByPk.mockResolvedValueOnce(null); // For destination
      mockTransaction.status = TRANSACTION_STATUS.PENDING;

      await expect(transactionService.completeTransaction(mockTransaction.id, 'gateway_ref_xyz'))
        .rejects.toThrow(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Destination account not found'));
    });
  });

  describe('failTransaction', () => {
    test('should fail a pending transaction and revert source account debit', async () => {
      mockTransaction.status = TRANSACTION_STATUS.PENDING;
      mockSourceAccount.balance = 900.00; // Simulate initial debit

      const result = await transactionService.failTransaction(mockTransaction.id, 'Insufficient funds at gateway');

      expect(Transaction.findByPk).toHaveBeenCalledWith(mockTransaction.id, expect.any(Object));
      expect(Account.findByPk).toHaveBeenCalledWith(mockSourceAccountId, expect.any(Object));
      expect(mockSourceAccount.balance).toBe(1000.00); // 900 + 100 (reverted)
      expect(mockSourceAccount.save).toHaveBeenCalled();
      expect(mockTransaction.status).toBe(TRANSACTION_STATUS.FAILED);
      expect(mockTransaction.remarks).toBe('Insufficient funds at gateway');
      expect(mockTransaction.completedAt).toBeInstanceOf(Date);
      expect(mockTransaction.save).toHaveBeenCalled();
      expect(result).toEqual(mockTransaction);
    });

    test('should return existing transaction if not pending (idempotency)', async () => {
      mockTransaction.status = TRANSACTION_STATUS.FAILED; // Already failed

      const result = await transactionService.failTransaction(mockTransaction.id, 'Some reason');

      expect(Account.findByPk).not.toHaveBeenCalledWith(mockSourceAccountId, expect.any(Object)); // No revert
      expect(mockTransaction.save).not.toHaveBeenCalled(); // No save
      expect(result).toEqual(mockTransaction); // Returns original
    });

    test('should throw ApiError if transaction not found', async () => {
      Transaction.findByPk.mockResolvedValueOnce(null);

      await expect(transactionService.failTransaction('non-existent-id', 'Reason'))
        .rejects.toThrow(new ApiError(httpStatus.NOT_FOUND, 'Transaction not found'));
    });
  });

  describe('getTransactionsByUserId', () => {
    test('should return transactions for a given user', async () => {
      Transaction.findAll.mockResolvedValueOnce([mockTransaction]);
      const result = await transactionService.getTransactionsByUserId(mockUserId);
      expect(Transaction.findAll).toHaveBeenCalledWith({ where: { userId: mockUserId } });
      expect(result).toEqual([mockTransaction]);
    });
  });

  describe('queryTransactions', () => {
    test('should return all transactions (admin view)', async () => {
      Transaction.findAll.mockResolvedValueOnce([mockTransaction, { ...mockTransaction, id: 'trx2' }]);
      const result = await transactionService.queryTransactions();
      expect(Transaction.findAll).toHaveBeenCalledWith();
      expect(result).toHaveLength(2);
    });
  });

  describe('getTransactionById', () => {
    test('should return a transaction by its ID', async () => {
      Transaction.findByPk.mockResolvedValueOnce(mockTransaction);
      const result = await transactionService.getTransactionById(mockTransaction.id);
      expect(Transaction.findByPk).toHaveBeenCalledWith(mockTransaction.id);
      expect(result).toEqual(mockTransaction);
    });

    test('should return null if transaction not found', async () => {
      Transaction.findByPk.mockResolvedValueOnce(null);
      const result = await transactionService.getTransactionById('non-existent-id');
      expect(result).toBeNull();
    });
  });
});
```