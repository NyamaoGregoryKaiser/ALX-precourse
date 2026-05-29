```javascript
const express = require('express');
const orderController = require('../controllers/orderController');
const { auth } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { orderValidation } = require('../utils/validation');
const { ROLES } = require('../config/constants');

const router = express.Router();

router
  .route('/')
  .post(auth(), validate(orderValidation.createOrder), orderController.createOrder)
  .get(auth(ROLES.ADMIN, ROLES.USER), validate(orderValidation.getOrders), orderController.getOrders);

router
  .route('/:orderId')
  .get(auth(ROLES.ADMIN, ROLES.USER), validate(orderValidation.getOrder), orderController.getOrder);

router
  .route('/:orderId/status')
  .patch(auth(ROLES.ADMIN), validate(orderValidation.updateOrderStatus), orderController.updateOrderStatus);

router
  .route('/:orderId/payment-status')
  .patch(auth(ROLES.ADMIN), validate(orderValidation.updateOrderPaymentStatus), orderController.updateOrderPaymentStatus);

router
  .route('/:orderId/cancel')
  .patch(auth(ROLES.ADMIN, ROLES.USER), validate(orderValidation.cancelOrder), orderController.cancelOrder);


module.exports = router;
```