```typescript
import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { getAccountTransactions, getTransactionById } from './transaction.controller';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate); // All routes below require authentication

router.get('/account/:accountId', authorize([UserRole.ADMIN, UserRole.USER]), getAccountTransactions);
router.get('/:id', authorize([UserRole.ADMIN, UserRole.USER]), getTransactionById);

export default router;
```