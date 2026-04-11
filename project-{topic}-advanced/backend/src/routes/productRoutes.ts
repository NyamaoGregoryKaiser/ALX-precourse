```typescript
import { Router } from 'express';
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  createCategory,
  getAllCategories
} from '../controllers/productController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = Router();

// Product routes
router.route('/')
  .get(getAllProducts) // Publicly accessible, cached
  .post(protect, authorize('ADMIN'), createProduct); // Admin only

router.route('/:id')
  .get(getProductById) // Publicly accessible, cached
  .patch(protect, authorize('ADMIN'), updateProduct) // Admin only
  .delete(protect, authorize('ADMIN'), deleteProduct); // Admin only

// Category routes
router.route('/categories')
  .get(getAllCategories) // Publicly accessible, cached
  .post(protect, authorize('ADMIN'), createCategory); // Admin only

export default router;
```