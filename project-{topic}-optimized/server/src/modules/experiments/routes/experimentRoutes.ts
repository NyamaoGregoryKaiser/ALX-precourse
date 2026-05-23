import { Router } from 'express';
import * as experimentController from '../controllers/experimentController';

const router = Router();

router.get('/', experimentController.getAllExperiments);
router.get('/:id', experimentController.getExperimentById);
router.post('/', experimentController.createExperiment);
router.put('/:id', experimentController.updateExperiment);
router.delete('/:id', experimentController.deleteExperiment);

export default router;
```