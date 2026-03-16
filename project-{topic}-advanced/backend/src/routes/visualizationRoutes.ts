import { Router } from 'express';
import { visualizationController } from '../controllers/visualizationController'; // Assume visualizationController exists

const router = Router();

router.post('/', visualizationController.createVisualization);
router.get('/:id', visualizationController.getVisualizationById);
router.get('/dashboard/:dashboardId', visualizationController.getAllVisualizationsForDashboard);
router.put('/:id', visualizationController.updateVisualization);
router.delete('/:id', visualizationController.deleteVisualization);

export default router;