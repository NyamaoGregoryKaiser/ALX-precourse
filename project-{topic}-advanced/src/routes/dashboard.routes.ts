```typescript
import { Router } from 'express';
import {
  createDashboard,
  getAllDashboards,
  getDashboardById,
  updateDashboard,
  deleteDashboard,
  addVisualizationToDashboard,
  removeVisualizationFromDashboard
} from '../controllers/dashboard.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';
import { UserRole } from '../database/entities/User';
import { validate, createDashboardSchema, updateDashboardSchema } from '../utils/validation.utils';
import { cacheMiddleware, clearCache } from '../middleware/cache.middleware';

const router = Router();

router.use(authenticateToken); // All dashboard routes require authentication

router.route('/')
  .post(authorizeRoles(UserRole.USER, UserRole.ADMIN), validate(createDashboardSchema), clearCache, createDashboard)
  .get(authorizeRoles(UserRole.USER, UserRole.ADMIN), cacheMiddleware, getAllDashboards);

router.route('/:id')
  .get(authorizeRoles(UserRole.USER, UserRole.ADMIN), cacheMiddleware, getDashboardById)
  .put(authorizeRoles(UserRole.USER, UserRole.ADMIN), validate(updateDashboardSchema), clearCache, updateDashboard)
  .delete(authorizeRoles(UserRole.USER, UserRole.ADMIN), clearCache, deleteDashboard);

router.post('/:id/visualizations', authorizeRoles(UserRole.USER, UserRole.ADMIN), clearCache, addVisualizationToDashboard);
router.delete('/:id/visualizations/:visualizationId', authorizeRoles(UserRole.USER, UserRole.ADMIN), clearCache, removeVisualizationFromDashboard);

export default router;
```