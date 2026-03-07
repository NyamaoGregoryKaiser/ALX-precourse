```typescript
import { Router } from 'express';
import {
  createDataset,
  getAllDatasets,
  getDatasetById,
  updateDataset,
  deleteDataset,
  getDatasetData
} from '../controllers/dataset.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';
import { UserRole } from '../database/entities/User';
import { validate, createDatasetSchema, updateDatasetSchema } from '../utils/validation.utils';
import { cacheMiddleware, clearCache } from '../middleware/cache.middleware';

const router = Router();

router.use(authenticateToken); // All dataset routes require authentication

router.route('/')
  .post(authorizeRoles(UserRole.USER, UserRole.ADMIN), validate(createDatasetSchema), clearCache, createDataset)
  .get(authorizeRoles(UserRole.USER, UserRole.ADMIN), cacheMiddleware, getAllDatasets);

router.route('/:id')
  .get(authorizeRoles(UserRole.USER, UserRole.ADMIN), cacheMiddleware, getDatasetById)
  .put(authorizeRoles(UserRole.USER, UserRole.ADMIN), validate(updateDatasetSchema), clearCache, updateDataset)
  .delete(authorizeRoles(UserRole.USER, UserRole.ADMIN), clearCache, deleteDataset);

router.get('/:id/data', authorizeRoles(UserRole.USER, UserRole.ADMIN), cacheMiddleware, getDatasetData);

export default router;
```