```typescript
import { Router } from 'express';
import {
  createDataSource,
  getAllDataSources,
  getDataSourceById,
  updateDataSource,
  deleteDataSource,
  testDataSourceConnection
} from '../controllers/dataSource.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';
import { UserRole } from '../database/entities/User';
import { validate, createDataSourceSchema, updateDataSourceSchema } from '../utils/validation.utils';
import { cacheMiddleware, clearCache } from '../middleware/cache.middleware';

const router = Router();

router.use(authenticateToken); // All data source routes require authentication

router.route('/')
  .post(authorizeRoles(UserRole.USER, UserRole.ADMIN), validate(createDataSourceSchema), clearCache, createDataSource)
  .get(authorizeRoles(UserRole.USER, UserRole.ADMIN), cacheMiddleware, getAllDataSources);

router.route('/:id')
  .get(authorizeRoles(UserRole.USER, UserRole.ADMIN), cacheMiddleware, getDataSourceById)
  .put(authorizeRoles(UserRole.USER, UserRole.ADMIN), validate(updateDataSourceSchema), clearCache, updateDataSource)
  .delete(authorizeRoles(UserRole.USER, UserRole.ADMIN), clearCache, deleteDataSource);

router.get('/:id/test-connection', authorizeRoles(UserRole.USER, UserRole.ADMIN), testDataSourceConnection);

export default router;
```