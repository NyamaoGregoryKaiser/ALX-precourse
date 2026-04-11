```typescript
import { Router } from 'express';
import authRoutes from './authRoutes';
import productRoutes from './productRoutes';
import userRoutes from './userRoutes';
import cartRoutes from './cartRoutes';
// import orderRoutes from './orderRoutes'; // Future expansion

const router = Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/users', userRoutes);
router.use('/cart', cartRoutes);
// router.use('/orders', orderRoutes); // Add order routes when implemented

export default router;
```

---

## 4. Core Application (Frontend)

The frontend is a React application built with TypeScript and styled using Tailwind CSS. It focuses on modular components, context-based state management, and clear API interaction.