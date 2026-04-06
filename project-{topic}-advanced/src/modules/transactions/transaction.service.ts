```typescript
import { prisma } from '../../utils/prisma';
import { ApiError } from '../../utils/apiError';
import { TransactionType, TransactionStatus } from '@prisma/client';

export class TransactionService {
  /**
   * Retrieves transactions for a given account.
   * @param accountId The ID of the account.
   * @param limit Maximum number of transactions to return.
   * @param offset Number of transactions to skip.
   * @returns An array of transaction objects.
   */
  async getTransactionsByAccountId(accountId: string, limit: number = 20, offset: number = 0) {
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { sourceAccountId: accountId },
          { destinationAccountId: accountId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        sourceAccount: {
          select: { id: true, accountNumber: true, currency: true }
        },
        destinationAccount: {
          select: { id: true, accountNumber: true, currency: true }
        }
      }
    });
    return transactions;
  }

  /**
   * Retrieves a single transaction by its ID.
   * @param transactionId The ID of the transaction.
   * @returns The transaction object.
   */
  async getTransactionById(transactionId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        sourceAccount: {
          select: { id: true, accountNumber: true, currency: true, userId: true }
        },
        destinationAccount: {
          select: { id: true, accountNumber: true, currency: true, userId: true }
        }
      }
    });
    if (!transaction) {
      throw new ApiError(404, 'Transaction not found');
    }
    return transaction;
  }

  /**
   * Processes a new transaction (internal transfer).
   * This method ensures atomicity using Prisma's transaction capabilities.
   * @param sourceAccountId The ID of the debit account.
   * @param destinationAccountId The ID of the credit account.
   * @param amount The amount to transfer.
   * @param description A description for the transaction.
   * @param idempotencyKey An optional key to prevent duplicate transactions.
   * @returns The created transaction object.
   */
  async processTransfer(sourceAccountId: string, destinationAccountId: string, amount: number, description: string, idempotencyKey?: string) {
    if (sourceAccountId === destinationAccountId) {
      throw new ApiError(400, 'Cannot transfer to the same account');
    }
    if (amount <= 0) {
      throw new ApiError(400, 'Transfer amount must be positive');
    }

    // Check for existing transaction with idempotency key
    if (idempotencyKey) {
      const existingTransaction = await prisma.transaction.findFirst({
        where: { idempotencyKey, status: TransactionStatus.COMPLETED },
      });
      if (existingTransaction) {
        throw new ApiError(409, 'Duplicate request: Transaction with this idempotency key already processed', { transactionId: existingTransaction.id });
      }
    }

    return prisma.$transaction(async (tx) => {
      // 1. Lock and retrieve accounts (using `forUpdate` in raw SQL or careful `findUniqueOrThrow` with `select` to minimize data if not updating all)
      // Prisma's `update` operation implicitly locks rows.
      // We retrieve accounts first to check balance and currency.
      const sourceAccount = await tx.account.findUnique({
        where: { id: sourceAccountId },
      });
      const destinationAccount = await tx.account.findUnique({
        where: { id: destinationAccountId },
      });

      if (!sourceAccount) {
        throw new ApiError(404, 'Source account not found');
      }
      if (!destinationAccount) {
        throw new ApiError(404, 'Destination account not found');
      }
      if (sourceAccount.currency !== destinationAccount.currency) {
        throw new ApiError(400, 'Currency mismatch between accounts');
      }
      if (sourceAccount.balance < amount) {
        throw new ApiError(400, 'Insufficient balance in source account');
      }

      // 2. Debit source account
      const updatedSourceAccount = await tx.account.update({
        where: { id: sourceAccountId },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      // 3. Credit destination account
      const updatedDestinationAccount = await tx.account.update({
        where: { id: destinationAccountId },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      // 4. Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          sourceAccountId,
          destinationAccountId,
          amount,
          currency: sourceAccount.currency,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.COMPLETED,
          description,
          idempotencyKey,
          // You might add a reference to a Payment entity here if applicable
        },
      });

      return transaction;
    });
  }
}
```