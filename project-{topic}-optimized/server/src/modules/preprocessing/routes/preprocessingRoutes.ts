import { Router } from 'express';
import * as preprocessingController from '../controllers/preprocessingController';
import upload from '../../../utils/fileUpload'; // Using the same file upload utility

const router = Router();

// Endpoint for data transformation
// Expects a single CSV file and transformation parameters
router.post('/transform', upload.single('file'), preprocessingController.transformData);

export default router;
```