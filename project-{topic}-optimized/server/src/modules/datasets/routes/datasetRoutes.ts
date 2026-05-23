import { Router } from 'express';
import * as datasetController from '../controllers/datasetController';
import upload from '../../../utils/fileUpload';

const router = Router();

router.get('/', datasetController.getAllDatasets);
router.get('/:id', datasetController.getDatasetById);
router.post('/', upload.single('file'), datasetController.createDataset); // 'file' is the field name for the uploaded file
router.put('/:id', datasetController.updateDataset);
router.delete('/:id', datasetController.deleteDataset);

export default router;
```