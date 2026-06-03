```javascript
const express = require('express');
const paymentMethodController = require('../controllers/paymentMethodController');
const { protect, restrictTo } = require('../middleware/auth');
const { validate, Schemas } = require('../utils/validator');

const router = express.Router();

router.use(protect); // All payment method routes require authentication

router.route('/')
  .post(validate(Schemas.createPaymentMethod), paymentMethodController.createPaymentMethod)
  .get(paymentMethodController.getAllPaymentMethods);

router.route('/:id')
  .get(paymentMethodController.getPaymentMethodById)
  .patch(paymentMethodController.updatePaymentMethod) // e.g., set as default
  .delete(paymentMethodController.deletePaymentMethod); // soft delete

module.exports = router;
```