```typescript
import { Router } from 'express';
import {
  createMetricDefinition,
  getMetricDefinitionsByService,
  getMetricDefinitionById,
  updateMetricDefinition,
  deleteMetricDefinition,
} from '../controllers/metricDefinition.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { CreateMetricDefinitionDto, UpdateMetricDefinitionDto } from '../controllers/dtos/metricDefinition.dto';
import { UserRole } from '../entities/User';

const router = Router();

router.use(protect); // All metric definition routes require authentication

router
  .route('/:serviceId')
  .post(
    authorize([UserRole.SERVICE_OWNER, UserRole.ADMIN]),
    validateRequest(CreateMetricDefinitionDto),
    createMetricDefinition
  )
  .get(authorize([UserRole.USER, UserRole.SERVICE_OWNER, UserRole.ADMIN]), getMetricDefinitionsByService);

router
  .route('/:serviceId/metrics/:id') // Note: serviceId is still used for context, but 'id' is for the specific metric
  .get(authorize([UserRole.USER, UserRole.SERVICE_OWNER, UserRole.ADMIN]), getMetricDefinitionById)
  .put(
    authorize([UserRole.SERVICE_OWNER, UserRole.ADMIN]),
    validateRequest(UpdateMetricDefinitionDto),
    updateMetricDefinition
  )
  .delete(authorize([UserRole.SERVICE_OWNER, UserRole.ADMIN]), deleteMetricDefinition);

export default router;
```