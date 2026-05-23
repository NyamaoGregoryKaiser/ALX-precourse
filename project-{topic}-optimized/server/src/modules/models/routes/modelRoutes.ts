import { Router } from 'express';
import * as modelController from '../controllers/modelController';

const router = Router();

router.get('/', modelController.getAllModels);
router.get('/:id', modelController.getModelById);
router.post('/', modelController.createModel);
router.put('/:id', modelController.updateModel);
router.delete('/:id', modelController.deleteModel);

export default router;
```