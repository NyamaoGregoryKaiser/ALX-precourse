const express = require('express');
const transactionController = require('./controllers/transactionController');
const { protect, authorize } = require('../../middleware/auth');

const router = express.Router();

router.use(protect); // All transaction routes require authentication

router
  .route('/')
  .post(authorize(['customer', 'admin']), transactionController.createTransaction) // A customer can create a transaction
  .get(authorize(['admin', 'customer']), transactionController.getTransactions); // Admins can get all, customers can get their own

router
  .route('/:id')
  .get(authorize(['admin', 'customer']), transactionController.getTransactionById)
  .patch(authorize(['admin']), transactionController.updateTransactionStatus) // Only admin can update status
  .delete(authorize(['admin']), transactionController.deleteTransaction);

module.exports = router;