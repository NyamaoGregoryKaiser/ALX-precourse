const express = require('express');
const transactionController = require('../controllers/transactionController');
const { authenticate, authorize } = require('../middleware/auth');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();

// Routes for transactions
router.post('/', authenticate, transactionController.createTransaction);
router.get('/:id', authenticate, transactionController.getTransaction);
router.get('/account/:accountId', authenticate, transactionController.getAccountTransactions);

// Admin or system-only route to update transaction status
router.patch('/:id/status', authenticate, authorize(USER_ROLES.ADMIN), transactionController.updateTransactionStatus);

module.exports = router;