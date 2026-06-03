```javascript
const express = require('express');
const transactionController = require('../controllers/transactionController');
const { protect, restrictTo } = require('../middleware/auth');
const { validate, Schemas } = require('../utils/validator');
const cacheMiddleware = require('../middleware/cache');

const router = express.Router();

// All transaction routes require authentication
router.use(protect);

router.post(
  '/',
  validate(Schemas.createTransaction),
  transactionController.createTransaction
);

router.post(
  '/:transactionId/refund',
  restrictTo('merchant', 'admin'), // Only merchants or admins can initiate refunds
  validate(Schemas.refundTransaction),
  transactionController.refundTransaction
);

router.get(
  '/:transactionId',
  cacheMiddleware('transaction'), // Cache single transaction for 1 hour
  transactionController.getTransaction
);

router.get(
  '/',
  cacheMiddleware('transactions_list', 300), // Cache list of transactions for 5 mins
  transactionController.getAllTransactions
);

module.exports = router;
```