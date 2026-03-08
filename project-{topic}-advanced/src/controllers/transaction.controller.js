```javascript
const httpStatus = require('http-status-codes');
const transactionService = require('../services/transaction.service');
const paymentGatewayService = require('../services/paymentGateway.service');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');
const ApiError = require('../utils/apiError');

const initiateTransaction = catchAsync(async (req, res) => {
  const { sourceAccountId, destinationAccountId, amount, currency, description } = req.body;

  // Step 1: Create a pending transaction in our system
  const transaction = await transactionService.createPendingTransaction({
    userId: req.user.id,
    sourceAccountId,
    destinationAccountId,
    amount,
    currency,
    description,
  });

  // Step 2: Simulate interaction with an external payment gateway
  // In a real app, this would involve calling Stripe, PayPal, etc.
  // The gateway would return a payment intent ID or similar.
  const paymentGatewayResponse = await paymentGatewayService.processPayment({
    transactionId: transaction.id,
    amount,
    currency,
    description,
    // Add real payment details here: card_token, bank_account_details, etc.
  });

  // Step 3: Update our transaction based on gateway's initial response
  await transactionService.updateTransactionStatus(
    transaction.id,
    paymentGatewayResponse.status, // e.g., 'PROCESSING', 'FAILED', 'SUCCESS'
    paymentGatewayResponse.gatewayRefId // Store gateway's reference ID
  );

  // If the gateway immediately confirms success (rare for async), update again.
  // More often, we wait for a webhook.
  if (paymentGatewayResponse.status === 'SUCCESS') {
    await transactionService.completeTransaction(transaction.id, paymentGatewayResponse.gatewayRefId);
  }

  res.status(httpStatus.ACCEPTED).send({
    message: 'Transaction initiated successfully. Awaiting payment gateway confirmation.',
    transactionId: transaction.id,
    gatewayStatus: paymentGatewayResponse.status,
    gatewayRefId: paymentGatewayResponse.gatewayRefId,
  });
});

const getTransactions = catchAsync(async (req, res) => {
  let transactions;
  if (req.user.role === 'admin') {
    transactions = await transactionService.queryTransactions(); // Admin gets all transactions
  } else {
    transactions = await transactionService.getTransactionsByUserId(req.user.id); // User gets their own
  }
  res.send(transactions);
});

const getTransactionDetails = catchAsync(async (req, res) => {
  const transaction = await transactionService.getTransactionById(req.params.transactionId);

  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
  }

  // Ensure user can only view their own transactions unless admin
  if (req.user.role !== 'admin' && transaction.userId !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: You can only view your own transactions');
  }

  res.send(transaction);
});

const processTransaction = catchAsync(async (req, res) => {
  // This route is for admin to manually update or trigger internal processing.
  // e.g., for refunds, disputes, or manual settlement.
  const { status, remarks } = req.body; // status could be 'REFUNDED', 'COMPLETED', etc.
  const transaction = await transactionService.updateTransactionStatus(
    req.params.transactionId,
    status,
    null, // gatewayRefId generally not updated here
    remarks
  );
  res.send(transaction);
});

const handlePaymentGatewayWebhook = catchAsync(async (req, res) => {
  const { event, data } = req.body; // Example webhook structure
  logger.info(`Received webhook from payment gateway: ${event}`);

  // In a real system, you'd verify the webhook signature first!
  // const signature = req.headers['x-signature'];
  // if (!paymentGatewayService.verifyWebhookSignature(signature, req.body)) {
  //   throw new ApiError(httpStatus.FORBIDDEN, 'Invalid webhook signature');
  // }

  switch (event) {
    case 'payment_success':
      const { transactionId: ourTransactionId, gatewayRefId } = data; // Assuming gateway sends our transaction ID
      await transactionService.completeTransaction(ourTransactionId, gatewayRefId);
      logger.info(`Transaction ${ourTransactionId} marked as SUCCESS via webhook.`);
      break;
    case 'payment_failed':
      const { transactionId: failedTransactionId, reason } = data;
      await transactionService.failTransaction(failedTransactionId, reason);
      logger.info(`Transaction ${failedTransactionId} marked as FAILED via webhook: ${reason}`);
      break;
    // Add cases for refunds, disputes, etc.
    default:
      logger.warn(`Unhandled webhook event: ${event}`);
  }

  res.status(httpStatus.OK).send({ received: true });
});


module.exports = {
  initiateTransaction,
  getTransactions,
  getTransactionDetails,
  processTransaction,
  handlePaymentGatewayWebhook,
};
```