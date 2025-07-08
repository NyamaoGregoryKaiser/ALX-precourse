```typescript
import express, { Request, Response, Router } from 'express';
//import {Product} from '../models/product'; //Needs model definition

export const router: Router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  // Implement product retrieval logic
  res.json([]); // Replace with actual product data.
});

router.post('/', async (req: Request, res: Response) => {
    //Implement product creation logic
    res.status(201).json({message: "Product created"})
});

router.put('/:id', (req: Request, res: Response) => {
  // Implement product update logic
  res.send('Update Product');
});

router.delete('/:id', (req: Request, res: Response) => {
  // Implement product deletion logic
  res.send('Delete Product');
});

```