const transactionService = require('../services/transactionService');
const { catchAsync } = require('../../../utils/catchAsync');
const AppError = require('../../../utils/appError');
const transactionValidation = require('../../../utils/validators/transactionValidator');

exports.createTransaction = catchAsync(async (req, res, next) => {
  const { error } = transactionValidation.createTransactionSchema.validate(req.body);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }

  const { customerId, paymentMethodId, amount, currency, type, description } = req.body;
  const transaction = await transactionService.createTransaction(
    customerId,
    paymentMethodId,
    amount,
    currency,
    type,
    description
  );

  res.status(201).json({
    status: 'success',
    data: { transaction },
  });
});

exports.getTransactions = catchAsync(async (req, res, next) => {
  const { customerId, status, type, limit, offset } = req.query;
  const transactions = await transactionService.getAllTransactions({
    customerId,
    status,
    type,
    limit: parseInt(limit) || 10,
    offset: parseInt(offset) || 0,
  });

  res.status(200).json({
    status: 'success',
    results: transactions.length,
    data: { transactions },
  });
});

exports.getTransactionById = catchAsync(async (req, res, next) => {
  const transaction = await transactionService.getTransactionById(req.params.id);

  if (!transaction) {
    return next(new AppError('No transaction found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { transaction },
  });
});

exports.updateTransactionStatus = catchAsync(async (req, res, next) => {
  const { error } = transactionValidation.updateTransactionStatusSchema.validate(req.body);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }

  const { status, remarks } = req.body;
  const updatedTransaction = await transactionService.updateTransactionStatus(
    req.params.id,
    status,
    remarks
  );

  if (!updatedTransaction) {
    return next(new AppError('No transaction found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { transaction: updatedTransaction },
  });
});

exports.deleteTransaction = catchAsync(async (req, res, next) => {
  const deleted = await transactionService.deleteTransaction(req.params.id);

  if (!deleted) {
    return next(new AppError('No transaction found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});