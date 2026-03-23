```typescript
import { Request, Response, NextFunction } from 'express';
import { TransactionService } from './transaction.service';
import { catchAsync } from '../../utils/catchAsync';
import { createTransactionSchema, updateTransactionSchema, getTransactionsQuerySchema } from './transaction.validation';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { UserRole } from '../../database/entities/User';

export class TransactionController {
    private transactionService: TransactionService;

    constructor() {
        this.transactionService = new TransactionService();
    }

    public createTransaction = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        // Assume initiatorUserId comes from authenticated user
        const initiatorUserId = req.user?.id;
        if (!initiatorUserId) {
            return next(new Error('User ID not found in request.')); // Should not happen with auth middleware
        }

        const { error, value } = createTransactionSchema.validate(req.body);
        if (error) return next(error);

        const transaction = await this.transactionService.createTransaction({
            ...value,
            initiatorUserId,
        });

        res.status(201).json({
            status: 'success',
            data: transaction,
        });
    });

    public getTransactionById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        const transaction = await this.transactionService.getTransactionById(id);

        if (!transaction) {
            return res.status(404).json({ status: 'fail', message: 'Transaction not found.' });
        }

        res.status(200).json({
            status: 'success',
            data: transaction,
        });
    });

    public getTransactions = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const { error, value: filters } = getTransactionsQuerySchema.validate(req.query);
        if (error) return next(error);

        let finalFilters = filters;

        // If user is a merchant, restrict transactions to their merchantId
        if (req.user?.role === UserRole.MERCHANT) {
            // In a real system, you'd need a lookup from User.id to Merchant.id
            // For now, assume req.user.merchantId exists or is explicitly passed
            // For simplicity, let's assume a merchant user can only query their own transactions
            // and merchantId filter in query is ignored if they are not ADMIN
            const merchant = await this.transactionService['merchantRepository'].findByUserId(req.user.id);
            if (!merchant) {
                return next(new AppError('Merchant profile not found for this user.', 403));
            }
            finalFilters.merchantId = merchant.id;
        } else if (req.user?.role === UserRole.USER && finalFilters.merchantId) {
            // A regular user typically wouldn't filter by merchantId unless it's their own past transactions
            // For now, allow a user to see public transactions or transactions they initiated.
            // Complex authorization logic would go here.
        } else if (req.user?.role !== UserRole.ADMIN && finalFilters.merchantId && finalFilters.merchantId !== req.user?.merchantId) {
             // Example of strict merchantId check for non-admins
             // This assumes `req.user.merchantId` is populated if the user is a merchant
             return next(new AppError('You are not authorized to view transactions for this merchant.', 403));
        }


        const { transactions, total } = await this.transactionService.getTransactions(finalFilters);

        res.status(200).json({
            status: 'success',
            results: transactions.length,
            total,
            data: transactions,
        });
    });

    public updateTransactionStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        const { error, value } = updateTransactionSchema.validate(req.body);
        if (error) return next(error);

        const { status, reason } = value;
        const updatedTransaction = await this.transactionService.updateTransactionStatus(id, status, reason);

        res.status(200).json({
            status: 'success',
            data: updatedTransaction,
        });
    });
}
```