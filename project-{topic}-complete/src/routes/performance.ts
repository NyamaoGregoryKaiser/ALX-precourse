```typescript
import { Router, Request, Response } from 'express';
import { PerformanceData } from '../entity/PerformanceData'; // Example Entity
import { getRepository } from 'typeorm';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { metric, value } = req.body;
    const performanceData = new PerformanceData();
    performanceData.metric = metric;
    performanceData.value = value;
    const savedData = await getRepository(PerformanceData).save(performanceData);
    res.json(savedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add other CRUD operations here (GET, PUT, DELETE)


export { router as performanceRouter };
```