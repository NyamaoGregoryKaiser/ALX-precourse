```typescript
import { Request, Response } from 'express';
import { TransactionService } from './transaction.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/apiError';
import { logger } from '../../utils/logger';
import { UserRole } from '@prisma/client';

const transactionService = new TransactionService();

export const getAccountTransactions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'User not authenticated');
  }
  const { accountId } = req.params;
  const { limit, offset } = req.query;

  // Verify the user owns the account (or is an admin)
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account || (account.userId !== req.user.id && req.user.role !== UserRole.ADMIN)) {
    throw new ApiError(403, 'Unauthorized to view transactions for this account');
  }

  const transactions = await transactionService.getTransactionsByAccountId(
    accountId,
    parseInt(limit as string) || 20,
    parseInt(offset as string) || 0
  );
  res.status(200).json(transactions);
});

export const getTransactionById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'User not authenticated');
  }
  const { id } = req.params;
  const transaction = await transactionService.getTransactionById(id);

  // Ensure the user is involved in this transaction (or is an admin)
  const isSource = transaction.sourceAccount?.userId === req.user.id;
  const isDestination = transaction.destinationAccount?.userId === req.user.id;

  if (!(isSource || isDestination) && req.user.role !== UserRole.ADMIN) {
    throw new ApiError(403, 'Unauthorized to view this transaction');
  }

  res.status(200).json(transaction);
});
```