```typescript
import { Router } from 'express';
import {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
  regenerateApiKey,
} from '../controllers/service.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { CreateServiceDto, UpdateServiceDto } from '../controllers/dtos/service.dto';
import { UserRole } from '../entities/User';

const router = Router();

// All service routes require authentication
router.use(protect);

router
  .route('/')
  .post(authorize([UserRole.USER, UserRole.SERVICE_OWNER, UserRole.ADMIN]), validateRequest(CreateServiceDto), createService)
  .get(authorize([UserRole.USER, UserRole.SERVICE_OWNER, UserRole.ADMIN]), getServices);

router
  .route('/:id')
  .get(authorize([UserRole.USER, UserRole.SERVICE_OWNER, UserRole.ADMIN]), getServiceById)
  .put(authorize([UserRole.SERVICE_OWNER, UserRole.ADMIN]), validateRequest(UpdateServiceDto), updateService)
  .delete(authorize([UserRole.SERVICE_OWNER, UserRole.ADMIN]), deleteService);

router.post('/:id/regenerate-api-key', authorize([UserRole.SERVICE_OWNER, UserRole.ADMIN]), regenerateApiKey);

export default router;
```