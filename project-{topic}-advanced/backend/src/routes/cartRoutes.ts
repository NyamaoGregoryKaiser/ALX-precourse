```typescript
import { Router } from 'express';
import {
  getCart,
  addItemToCart,
  updateItemInCart,
  removeItemFromCart,
  clearUserCart
} from '../controllers/cartController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// All cart routes require authentication
router.use(protect);

router.get('/', getCart);
router.post('/', addItemToCart); // Add new item or update quantity of existing
router.patch('/:cartItemId', updateItemInCart); // Update quantity of specific item
router.delete('/:cartItemId', removeItemFromCart); // Remove specific item
router.delete('/', clearUserCart); // Clear the entire cart

export default router;
```