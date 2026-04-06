```typescript
import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { getUserAccounts, getAccountById, createAccount } from './account.controller';

const router = Router();

router.use(authenticate); // All routes below require authentication

router.get('/', getUserAccounts);
router.get('/:id', getAccountById);
router.post('/', createAccount);

export default router;
```