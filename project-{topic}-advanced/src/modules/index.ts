```typescript
import { Router } from 'express';
import authRoutes from './auth/auth.routes';
import userRoutes from './users/user.routes';
import categoryRoutes from './categories/category.routes';
import taskRoutes from './tasks/task.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes); // User profile routes are under /api/v1/users/me
router.use('/categories', categoryRoutes);
router.use('/tasks', taskRoutes);

export default router;
```

---

### 2. Database Layer

**Database:** PostgreSQL
**ORM:** Prisma