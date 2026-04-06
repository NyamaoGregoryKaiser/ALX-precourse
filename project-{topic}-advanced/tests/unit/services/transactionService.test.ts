```typescript
import { TransactionService } from '../../../src/modules/transactions/transaction.service';
import { prisma } from '../../../src/utils/prisma';
import { ApiError } from '../../../src/utils/apiError';
import { Account, TransactionType, TransactionStatus, UserRole } from '@prisma/client';

describe('TransactionService', () => {
  let transactionService: TransactionService;
  let account1: Account;
  let account2: Account;
  let account3Eur: Account; // For currency mismatch test

  beforeAll(() => {
    transactionService = new TransactionService();
  });

  beforeEach(async () => {
    // Clear the database and re-seed for each test for isolation
    await prisma.$transaction([
      prisma.payment.deleteMany(),
      prisma.transaction.deleteMany(),
      prisma.account.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    const user1 = await prisma.user.create({
      data: {
        id: 'user1-id',
        email: 'user1@example.com',
        password: 'hashedpassword',
        firstName: 'User', lastName: 'One', role: UserRole.USER,
      },
    });
    const user2 = await prisma.user.create({
      data: {
        id: 'user2-id',
        email: 'user2@example.com',
        password: 'hashedpassword',
        firstName: 'User', lastName: 'Two', role: UserRole.USER,
      },
    });

    account1 = await prisma.account.create({
      data: {
        userId: user1.id,
        accountNumber: 'ACCT123456',
        balance: 1000.00,
        currency: 'USD',
      },
    });
    account2 = await prisma.account.create({
      data: {
        userId: user2.id,
        accountNumber: 'ACCT789012',
        balance: 500.00,
        currency: 'USD',
      },
    });
    account3Eur = await prisma.account.create({
      data: {
        userId: user1.id,
        accountNumber: 'ACCT333333',
        balance: 200.00,
        currency: 'EUR',
      },
    });
  });

  describe('processTransfer', () => {
    it('should successfully transfer money between two accounts', async () => {
      const amount = 100.00;
      const description = 'Test transfer';

      const transaction = await transactionService.processTransfer(
        account1.id,
        account2.id,
        amount,
        description
      );

      expect(transaction).toBeDefined();
      expect(transaction.amount.toNumber()).toBe(amount);
      expect(transaction.status).toBe(TransactionStatus.COMPLETED);

      const updatedAccount1 = await prisma.account.findUnique({ where: { id: account1.id } });
      const updatedAccount2 = await prisma.account.findUnique({ where: { id: account2.id } });

      expect(updatedAccount1?.balance.toNumber()).toBe(account1.balance.toNumber() - amount);
      expect(updatedAccount2?.balance.toNumber()).toBe(account2.balance.toNumber() + amount);
    });

    it('should throw ApiError for insufficient balance', async () => {
      const amount = 2000.00; // More than account1's balance
      await expect(
        transactionService.processTransfer(account1.id, account2.id, amount, 'Insufficient funds')
      ).rejects.toThrow(ApiError);
      await expect(
        transactionService.processTransfer(account1.id, account2.id, amount, 'Insufficient funds')
      ).rejects.toHaveProperty('statusCode', 400);
    });

    it('should throw ApiError for currency mismatch', async () => {
      const amount = 50.00;
      await expect(
        transactionService.processTransfer(account1.id, account3Eur.id, amount, 'Currency mismatch')
      ).rejects.toThrow(ApiError);
      await expect(
        transactionService.processTransfer(account1.id, account3Eur.id, amount, 'Currency mismatch')
      ).rejects.toHaveProperty('statusCode', 400);
    });

    it('should throw ApiError for transfer to same account', async () => {
      const amount = 50.00;
      await expect(
        transactionService.processTransfer(account1.id, account1.id, amount, 'Same account transfer')
      ).rejects.toThrow(ApiError);
      await expect(
        transactionService.processTransfer(account1.id, account1.id, amount, 'Same account transfer')
      ).rejects.toHaveProperty('statusCode', 400);
    });

    it('should use idempotency key to prevent duplicate transactions', async () => {
      const amount = 10.00;
      const description = 'Idempotent transfer';
      const idempotencyKey = 'unique-key-123';

      // First successful transfer
      const firstTransaction = await transactionService.processTransfer(
        account1.id,
        account2.id,
        amount,
        description,
        idempotencyKey
      );
      expect(firstTransaction).toBeDefined();
      expect(firstTransaction.idempotencyKey).toBe(idempotencyKey);

      // Attempt the same transfer again with the same idempotency key
      await expect(
        transactionService.processTransfer(account1.id, account2.id, amount, description, idempotencyKey)
      ).rejects.toThrow(ApiError);
      await expect(
        transactionService.processTransfer(account1.id, account2.id, amount, description, idempotencyKey)
      ).rejects.toHaveProperty('statusCode', 409); // Conflict status for duplicate

      // Ensure balances are only updated once
      const finalAccount1 = await prisma.account.findUnique({ where: { id: account1.id } });
      const finalAccount2 = await prisma.account.findUnique({ where: { id: account2.id } });
      expect(finalAccount1?.balance.toNumber()).toBe(account1.balance.toNumber() - amount);
      expect(finalAccount2?.balance.toNumber()).toBe(account2.balance.toNumber() + amount);
    });
  });

  describe('getTransactionsByAccountId', () => {
    it('should return transactions for a given account', async () => {
      // Create some transactions
      await transactionService.processTransfer(account1.id, account2.id, 10, 'Tx1');
      await transactionService.processTransfer(account2.id, account1.id, 5, 'Tx2');

      const transactions = await transactionService.getTransactionsByAccountId(account1.id);
      expect(transactions.length).toBe(2); // One as source, one as destination
      expect(transactions[0].description).toBe('Tx2'); // Most recent first
    });

    it('should apply limit and offset correctly', async () => {
      // Create 5 transactions from account1
      for (let i = 0; i < 5; i++) {
        await transactionService.processTransfer(account1.id, account2.id, 1 + i, `Tx${i}`);
      }

      const transactions = await transactionService.getTransactionsByAccountId(account1.id, 2, 1);
      expect(transactions.length).toBe(2);
      expect(transactions[0].description).toBe('Tx3'); // Skip first one, get next two
    });
  });

  describe('getTransactionById', () => {
    it('should return a transaction if found', async () => {
      const transaction = await transactionService.processTransfer(account1.id, account2.id, 50, 'Find me');
      const foundTransaction = await transactionService.getTransactionById(transaction.id);

      expect(foundTransaction).toBeDefined();
      expect(foundTransaction.description).toBe('Find me');
    });

    it('should throw ApiError if transaction not found', async () => {
      await expect(transactionService.getTransactionById('non-existent-tx-id')).rejects.toThrow(ApiError);
      await expect(transactionService.getTransactionById('non-existent-tx-id')).rejects.toHaveProperty('statusCode', 404);
    });
  });
});
```