```javascript
const express = require('express');
const OrderController = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// User order routes (require authentication)
router.route('/')
    .post(protect, OrderController.createOrder) // Create new order from cart
    .get(protect, OrderController.getUserOrders); // Get all orders for authenticated user

router.route('/:id')
    .get(protect, OrderController.getOrderById); // Get specific order for authenticated user

router.route('/:id/pay')
    .post(protect, OrderController.processPayment); // Process payment for an order

// Admin order routes (require admin authorization)
router.route('/:id/status')
    .patch(protect, authorize('admin'), OrderController.updateOrderStatus); // Update order status

module.exports = router;
```