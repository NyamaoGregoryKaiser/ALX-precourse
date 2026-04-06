```typescript
import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/users/user.routes';
import accountRoutes from '../modules/accounts/account.routes';
import transactionRoutes from '../modules/transactions/transaction.routes';
import paymentRoutes from '../modules/payments/payment.routes';
import webhookRoutes from '../modules/webhooks/webhook.routes';

const router = Router();

// Define API routes for different modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/accounts', accountRoutes);
router.use('/transactions', transactionRoutes);
router.use('/payments', paymentRoutes);
router.use('/webhooks', webhookRoutes); // Placeholder

export default router;
```