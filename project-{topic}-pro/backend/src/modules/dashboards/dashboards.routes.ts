```typescript
import { Router } from 'express';
import { DashboardController } from './dashboards.controller';
import { protect, isOwner } from '../../middleware/auth';
import chartRoutes from '../charts/charts.routes';

const router = Router();
const dashboardController = new DashboardController();

router.use(protect); // All dashboard routes require authentication

router.post('/', dashboardController.createDashboard);
router.get('/', dashboardController.getDashboards);
router.get('/:id', isOwner, dashboardController.getDashboardById);
router.put('/:id', isOwner, dashboardController.updateDashboard);
router.delete('/:id', isOwner, dashboardController.deleteDashboard);

// Nested routes for charts belonging to a dashboard
router.use('/:dashboardId/charts', chartRoutes);

export default router;
```