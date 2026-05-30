const express = require('express');
const TransactionController = require('../controllers/transactionController');
const auth = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/caching');

const router = express.Router();

// Public webhook route (must verify signature in controller)
router.post('/webhook', TransactionController.handleWebhook);

// All other transaction routes are protected
router.use(auth());

router.get('/account/:accountId', cacheMiddleware(10), TransactionController.getAccountTransactions);
router.post('/initiate', TransactionController.initiateTransaction);
router.get('/:id', cacheMiddleware(10), TransactionController.getTransactionById);
router.post('/:id/refund', TransactionController.refundTransaction);

module.exports = router;