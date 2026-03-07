```typescript
import { Router } from 'express';
import { getGlobalDashboardSummary, getServiceDashboard } from '../controllers/dashboard.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../entities/User';
import { validateRequest } from '../middleware/validation.middleware';
import { GetServiceDashboardQueryDto } from '../controllers/dtos/dashboard.dto';

const router = Router();

router.use(protect, authorize([UserRole.USER, UserRole.SERVICE_OWNER, UserRole.ADMIN])); // All dashboard routes require authenticated user access

router.get('/summary', getGlobalDashboardSummary);
router.get('/:id', validateRequest(GetServiceDashboardQueryDto), getServiceDashboard); // :id is serviceId

export default router;
```