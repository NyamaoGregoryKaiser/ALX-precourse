```typescript
import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { createPayment, getUserPayments, getPaymentById } from './payment.controller';

const router = Router();

router.use(authenticate); // All routes below require authentication

router.post('/', createPayment);
router.get('/', getUserPayments);
router.get('/:id', getPaymentById);

export default router;
```