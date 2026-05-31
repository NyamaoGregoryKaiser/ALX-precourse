// This file aggregates all routes from different modules
import { Router } from 'express';
import authRoutes from './auth/auth.routes';
import userRoutes from './users/user.routes';
import projectRoutes from './projects/project.routes';
import taskRoutes from './tasks/task.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);

export default router;
```