```javascript
const transactionService = require('../services/transactionService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

const createTransaction = catchAsync(async (req, res, next) => {
  const { id: userId, type: userType } = req.user;
  // Users (customers) can initiate transactions for any merchant.
  // Merchants cannot create transactions for themselves as a payer in this context.
  if (userType !== 'user' && userType !== 'admin') {
    return next(new AppError('Only customers or admins can initiate charges.', 403, 'UNAUTHORIZED_ACTION'));
  }

  const transactionData = {
    userId, // The user initiating the payment
    ...req.body, // Contains merchantId, amount, currency, description, payment method details
  };

  const transaction = await transactionService.createTransaction(transactionData);
  res.status(201).json({
    status: 'success',
    data: {
      transaction,
    },
  });
});

const refundTransaction = catchAsync(async (req, res, next) => {
  const { id: userId, type: userType } = req.user;
  const { transactionId } = req.params;

  // Only admins or merchants (who own the original transaction's merchant) can issue refunds
  if (userType !== 'merchant' && userType !== 'admin') {
    return next(new AppError('Only merchants or admins can issue refunds.', 403, 'UNAUTHORIZED_ACTION'));
  }

  const refundData = {
    userId, // User performing the refund (e.g., merchant admin)
    transactionId,
    amount: req.body.amount,
    reason: req.body.reason,
  };

  const refund = await transactionService.refundTransaction(refundData);
  res.status(200).json({
    status: 'success',
    data: {
      refund,
    },
  });
});

const getTransaction = catchAsync(async (req, res, next) => {
  const { id: userId, type: userType } = req.user;
  const { transactionId } = req.params;

  const transaction = await transactionService.getTransactionById(transactionId, userId, userType);

  res.status(200).json({
    status: 'success',
    data: {
      transaction,
    },
  });
});

const getAllTransactions = catchAsync(async (req, res, next) => {
  const { id: userId, type: userType } = req.user;
  const filters = req.query; // status, type, merchantId, userId, etc.

  const transactions = await transactionService.getTransactions(userId, userType, filters);

  res.status(200).json({
    status: 'success',
    results: transactions.length,
    data: {
      transactions,
    },
  });
});

module.exports = {
  createTransaction,
  refundTransaction,
  getTransaction,
  getAllTransactions,
};
```