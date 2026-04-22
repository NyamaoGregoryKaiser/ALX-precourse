```typescript
import { Router } from 'express';
import { DataSourceController } from './data-sources.controller';
import { protect, isOwner } from '../../middleware/auth';

const router = Router();
const dataSourceController = new DataSourceController();

router.use(protect); // All data source routes require authentication

router.post('/', dataSourceController.createDataSource);
router.get('/', dataSourceController.getDataSources);
router.get('/:id', isOwner, dataSourceController.getDataSourceById);
router.put('/:id', isOwner, dataSourceController.updateDataSource);
router.delete('/:id', isOwner, dataSourceController.deleteDataSource);

export default router;
```