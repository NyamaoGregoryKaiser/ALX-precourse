```typescript
import { Router } from 'express';
import * as dataSourceController from '../controllers/dataSource.controller';
import { protect, authorize, checkOwnership } from '../middleware/auth.middleware';
import { UserRole } from '../entities/User';
import { createDataSourceSchema, updateDataSourceSchema, validate } from '../utils/joiValidation';
import { AppDataSource } from '../dataSource';
import { DataSource } from '../entities/DataSource';
import multer from 'multer';

const router = Router();
const upload = multer({ dest: 'uploads/' }); // Temporary storage for CSV files

const dataSourceRepository = AppDataSource.getRepository(DataSource);

router.use(protect); // All data source routes require authentication

router.post(
  '/',
  authorize([UserRole.USER, UserRole.ADMIN]),
  validate(createDataSourceSchema, 'body'),
  dataSourceController.createDataSource
);
router.post(
  '/upload-csv',
  authorize([UserRole.USER, UserRole.ADMIN]),
  upload.single('file'), // 'file' is the field name for the uploaded file
  dataSourceController.uploadCsvDataSource
);
router.get(
  '/',
  authorize([UserRole.USER, UserRole.ADMIN]),
  dataSourceController.getAllDataSources
);
router.get(
  '/:id',
  authorize([UserRole.USER, UserRole.ADMIN]),
  (req, res, next) => checkOwnership(req, res, next, dataSourceRepository),
  dataSourceController.getDataSourceById
);
router.put(
  '/:id',
  authorize([UserRole.USER, UserRole.ADMIN]),
  (req, res, next) => checkOwnership(req, res, next, dataSourceRepository),
  validate(updateDataSourceSchema, 'body'),
  dataSourceController.updateDataSource
);
router.delete(
  '/:id',
  authorize([UserRole.USER, UserRole.ADMIN]),
  (req, res, next) => checkOwnership(req, res, next, dataSourceRepository),
  dataSourceController.deleteDataSource
);

// Route to get actual data from a data source
router.get(
  '/:id/data',
  authorize([UserRole.USER, UserRole.ADMIN]),
  (req, res, next) => checkOwnership(req, res, next, dataSourceRepository),
  dataSourceController.getDataSourceData
);

export default router;
```