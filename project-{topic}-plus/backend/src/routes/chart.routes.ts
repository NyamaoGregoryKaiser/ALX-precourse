```typescript
import { Router } from 'express';
import * as chartController from '../controllers/chart.controller';
import { protect, authorize, checkOwnership } from '../middleware/auth.middleware';
import { UserRole } from '../entities/User';
import { createChartSchema, updateChartSchema, validate } from '../utils/joiValidation';
import { AppDataSource } from '../dataSource';
import { Chart } from '../entities/Chart';

const router = Router();
const chartRepository = AppDataSource.getRepository(Chart);

router.use(protect); // All chart routes require authentication

router.post(
  '/',
  authorize([UserRole.USER, UserRole.ADMIN]),
  validate(createChartSchema, 'body'),
  chartController.createChart
);
router.get(
  '/',
  authorize([UserRole.USER, UserRole.ADMIN]),
  chartController.getAllCharts
);
router.get(
  '/:id',
  authorize([UserRole.USER, UserRole.ADMIN]),
  (req, res, next) => checkOwnership(req, res, next, chartRepository),
  chartController.getChartById
);
router.put(
  '/:id',
  authorize([UserRole.USER, UserRole.ADMIN]),
  (req, res, next) => checkOwnership(req, res, next, chartRepository),
  validate(updateChartSchema, 'body'),
  chartController.updateChart
);
router.delete(
  '/:id',
  authorize([UserRole.USER, UserRole.ADMIN]),
  (req, res, next) => checkOwnership(req, res, next, chartRepository),
  chartController.deleteChart
);

// Route to get processed data for a specific chart
router.get(
  '/:id/data',
  authorize([UserRole.USER, UserRole.ADMIN]),
  (req, res, next) => checkOwnership(req, res, next, chartRepository),
  chartController.getChartData
);

export default router;
```