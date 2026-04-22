```typescript
import { Router } from 'express';
import { ChartController } from './charts.controller';
import { protect, isOwner } from '../../middleware/auth';
import { AppDataSource } from '../../database/data-source';
import { Dashboard } from '../../database/entities/Dashboard';

const router = Router({ mergeParams: true }); // `mergeParams: true` to access parent route params like :dashboardId
const chartController = new ChartController();

router.use(protect); // All chart routes require authentication

// Custom middleware to check dashboard ownership before chart operations
const checkDashboardOwnership = async (req: Request, res: Response, next: NextFunction) => {
    const { dashboardId } = req.params;
    if (!dashboardId || !req.userId) {
        return res.status(400).json({ message: 'Dashboard ID and User ID are required.' });
    }

    try {
        const dashboard = await AppDataSource.getRepository(Dashboard).findOne({
            where: { id: dashboardId, userId: req.userId }
        });
        if (!dashboard) {
            return res.status(404).json({ message: 'Dashboard not found or unauthorized.' });
        }
        next();
    } catch (error) {
        logger.error(`Error checking dashboard ownership for ${dashboardId}:`, error);
        res.status(500).json({ message: 'Server error during ownership check.' });
    }
};

router.post('/', checkDashboardOwnership, chartController.createChart);
router.get('/', checkDashboardOwnership, chartController.getChartsByDashboardId);
router.get('/:id', isOwner, chartController.getChartById); // `isOwner` here checks chart ownership
router.put('/:id', isOwner, chartController.updateChart);
router.delete('/:id', isOwner, chartController.deleteChart);

// Route to get actual data for a chart
router.get('/:id/data', isOwner, chartController.getChartData);

export default router;
```