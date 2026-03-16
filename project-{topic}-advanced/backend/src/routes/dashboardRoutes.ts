import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController'; // Assume dashboardController exists

const router = Router();

router.post('/', dashboardController.createDashboard);
router.get('/', dashboardController.getAllDashboards);
router.get('/:id', dashboardController.getDashboardById);
router.put('/:id', dashboardController.updateDashboard);
router.delete('/:id', dashboardController.deleteDashboard);

export default router;