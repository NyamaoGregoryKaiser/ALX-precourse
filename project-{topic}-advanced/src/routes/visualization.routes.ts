```typescript
import { Router } from 'express';
import {
  createVisualization,
  getAllVisualizations,
  getVisualizationById,
  updateVisualization,
  deleteVisualization,
  getVisualizationData
} from '../controllers/visualization.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';
import { UserRole } from '../database/entities/User';
import { validate, createVisualizationSchema, updateVisualizationSchema } from '../utils/validation.utils';
import { cacheMiddleware, clearCache } from '../middleware/cache.middleware';

const router = Router();

router.use(authenticateToken); // All visualization routes require authentication

router.route('/')
  .post(authorizeRoles(UserRole.USER, UserRole.ADMIN), validate(createVisualizationSchema), clearCache, createVisualization)
  .get(authorizeRoles(UserRole.USER, UserRole.ADMIN), cacheMiddleware, getAllVisualizations);

router.route('/:id')
  .get(authorizeRoles(UserRole.USER, UserRole.ADMIN), cacheMiddleware, getVisualizationById)
  .put(authorizeRoles(UserRole.USER, UserRole.ADMIN), validate(updateVisualizationSchema), clearCache, updateVisualization)
  .delete(authorizeRoles(UserRole.USER, UserRole.ADMIN), clearCache, deleteVisualization);

router.get('/:id/data', authorizeRoles(UserRole.USER, UserRole.ADMIN), cacheMiddleware, getVisualizationData);

export default router;
```