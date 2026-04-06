```typescript
import { Request, Response } from 'express';
import { AccountService } from './account.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/apiError';
import { logger } from '../../utils/logger';

const accountService = new AccountService();

export const getUserAccounts = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'User not authenticated');
  }
  const accounts = await accountService.getAccountsByUserId(req.user.id);
  res.status(200).json(accounts);
});

export const getAccountById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'User not authenticated');
  }
  const { id } = req.params;
  const account = await accountService.getAccountById(id);

  // Ensure the user owns this account
  if (account.userId !== req.user.id) {
    throw new ApiError(403, 'Unauthorized to access this account');
  }

  res.status(200).json(account);
});

export const createAccount = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'User not authenticated');
  }
  const { currency } = req.body;
  if (!currency) {
    throw new ApiError(400, 'Currency is required');
  }

  const newAccount = await accountService.createAccount(req.user.id, currency);
  logger.info(`New account ${newAccount.id} created for user ${req.user.id} with currency ${currency}`);
  res.status(201).json(newAccount);
});
```