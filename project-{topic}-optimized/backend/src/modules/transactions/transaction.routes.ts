```typescript
import { Router } from 'express';
import { TransactionController } from './transaction.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { UserRole } from '../../database/entities/User';

const router = Router();
const transactionController = new TransactionController();

// All transaction routes require authentication
router.use(authenticate);

// Create transaction (typically by a USER making a payment, or an ADMIN)
router.post(
    '/',
    authorize([UserRole.USER, UserRole.MERCHANT, UserRole.ADMIN]), // Merchants can also create transactions, e.g., for refunds or manual adjustments
    transactionController.createTransaction
);

// Get all transactions (ADMIN can see all, MERCHANT can see theirs, USER can see theirs)
router.get(
    '/',
    authorize([UserRole.USER, UserRole.MERCHANT, UserRole.ADMIN]),
    transactionController.getTransactions
);

// Get a single transaction by ID
router.get(
    '/:id',
    authorize([UserRole.USER, UserRole.MERCHANT, UserRole.ADMIN]),
    transactionController.getTransactionById
);

// Update transaction status (primarily for ADMIN or possibly MERCHANT for specific statuses like refund)
router.patch(
    '/:id/status',
    authorize([UserRole.MERCHANT, UserRole.ADMIN]),
    transactionController.updateTransactionStatus
);

export default router;
```