```javascript
const express = require('express');
const CartController = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All cart routes require authentication
router.route('/')
    .get(protect, CartController.getUserCart)
    .post(protect, CartController.addItemToCart)
    .delete(protect, CartController.clearCart); // Clear entire cart

router.route('/:productId')
    .patch(protect, CartController.updateCartItemQuantity) // Update quantity
    .delete(protect, CartController.removeCartItem); // Remove single item

module.exports = router;
```