import { Router } from 'express';
import { dataSourceController } from '../controllers/dataSourceController';

const router = Router();

router.post('/', dataSourceController.createDataSource);
router.get('/', dataSourceController.getAllDataSources);
router.get('/:id', dataSourceController.getDataSourceById);
router.put('/:id', dataSourceController.updateDataSource);
router.delete('/:id', dataSourceController.deleteDataSource);

// Endpoint to fetch and process data from a data source
router.post('/:id/data', dataSourceController.getData);

export default router;