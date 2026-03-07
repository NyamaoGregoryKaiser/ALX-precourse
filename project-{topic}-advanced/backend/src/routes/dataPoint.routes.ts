```typescript
import { Router } from 'express';
import { submitDataPoint, getMetricData } from '../controllers/dataPoint.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { SubmitDataPointDto, GetMetricDataQueryDto } from '../controllers/dtos/dataPoint.dto';
import { serviceAuth, protect, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../entities/User';

const router = Router();

// Route for services to submit data points (requires API key)
router.post('/submit', serviceAuth, validateRequest(SubmitDataPointDto), submitDataPoint);

// Route for users to retrieve metric data (requires user authentication)
router.get('/:serviceId', protect, authorize([UserRole.USER, UserRole.SERVICE_OWNER, UserRole.ADMIN]), validateRequest(GetMetricDataQueryDto), getMetricData);

export default router;
```