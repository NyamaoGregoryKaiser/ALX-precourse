```javascript
const express = require('express');
const transactionController = require('../controllers/transaction.controller');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const transactionValidation = require('../validators/transaction.validator');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();

router
  .route('/')
  .post(auth(), validate(transactionValidation.initiateTransaction), transactionController.initiateTransaction)
  .get(auth(), transactionController.getTransactions); // User gets their transactions, Admin gets all

router
  .route('/:transactionId')
  .get(auth(), transactionController.getTransactionDetails);

// Admin-only route for processing/managing transactions (e.g., refunds)
router.patch('/:transactionId/process', auth(USER_ROLES.ADMIN), transactionController.processTransaction); // For internal status updates

// Webhook endpoint for external payment gateway callbacks (no auth needed, rely on secret)
router.post('/webhook/payment-gateway', transactionController.handlePaymentGatewayWebhook);

module.exports = router;
```