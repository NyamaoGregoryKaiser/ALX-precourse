```javascript
const db = require('../config/db');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const paymentGatewayService = require('./paymentGatewayService');
const webhookService = require('./webhookService');
const { encrypt, decrypt } = require('../utils/crypt'); // For local storage of *mock* card data
const { v4: uuidv4 } = require('uuid');
const _ = require('lodash'); // For deep cloning, etc.

const createTransaction = async ({
  userId,
  merchantId,
  amount,
  currency,
  description,
  paymentMethodId,
  cardNumber,
  expiryMonth,
  expiryYear,
  cvv,
  cardHolderName,
}) => {
  let transaction;
  let paymentMethodData;
  let cardDetailsForGateway = {};
  let transactionStatus = 'pending';
  let gatewayTransactionId = null;
  let errorMessage = null;

  try {
    // 1. Validate merchant and user relationship (e.g., if user is merchant admin, etc.)
    const merchant = await db('merchants').where({ id: merchantId }).first();
    if (!merchant) {
      throw new AppError('Merchant not found.', 404, 'MERCHANT_NOT_FOUND');
    }

    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }
    // Additional authorization checks could go here, e.g., if this user is allowed to pay this merchant.

    // 2. Determine payment method details
    if (paymentMethodId) {
      paymentMethodData = await db('payment_methods')
        .where({ id: paymentMethodId, user_id: userId })
        .first();

      if (!paymentMethodData || paymentMethodData.status !== 'active') {
        throw new AppError('Payment method not found or inactive.', 404, 'PAYMENT_METHOD_INVALID');
      }

      // Decrypt card data for gateway (NOTE: In real system, this is a token)
      cardDetailsForGateway = {
        cardNumber: decrypt(paymentMethodData.card_number),
        expiryMonth: decrypt(paymentMethodData.expiry_month),
        expiryYear: decrypt(paymentMethodData.expiry_year),
        cvv: 'XXX', // CVV is NEVER stored. User provides it on each transaction.
        cardHolderName: paymentMethodData.card_holder_name,
      };
      // For this mock, we assume CVV is part of the initial `createTransaction` input
      if (!cvv) throw new AppError('CVV is required for saved card payments.', 400, 'CVV_REQUIRED');
      cardDetailsForGateway.cvv = cvv;

    } else {
      // Direct card input (no saved payment method)
      cardDetailsForGateway = {
        cardNumber,
        expiryMonth,
        expiryYear,
        cvv,
        cardHolderName,
      };
    }

    // Basic data sanitization (remove raw card details after extraction for gateway)
    const sanitizedCardDetails = _.omit(cardDetailsForGateway, ['cardNumber', 'cvv']);
    const transactionId = uuidv4();

    // Start a database transaction to ensure atomicity
    await db.transaction(async trx => {
      // 3. Record transaction in our DB (initial status: pending)
      transaction = {
        id: transactionId,
        user_id: userId,
        merchant_id: merchantId,
        payment_method_id: paymentMethodId || null,
        amount,
        currency,
        description,
        status: 'pending', // Initial status
        type: 'charge',
        gateway_response: null,
        created_at: new Date(),
        updated_at: new Date(),
        // Store sanitized card data metadata for auditing, NOT actual card numbers
        card_last_four: cardDetailsForGateway.cardNumber.slice(-4),
        card_brand: 'Visa', // In real system, deduce this from card number
        card_holder_name: cardDetailsForGateway.cardHolderName,
      };

      await trx('transactions').insert(transaction);

      // 4. Call external Payment Gateway
      const gatewayResult = await paymentGatewayService.processPayment({
        amount,
        currency,
        ...cardDetailsForGateway, // Pass actual card details to gateway
        transactionRef: transaction.id,
      });

      // 5. Update transaction status based on gateway response
      gatewayTransactionId = gatewayResult.gatewayTransactionId;
      transactionStatus = gatewayResult.status === 'approved' ? 'completed' : 'failed';

      await trx('transactions')
        .where({ id: transaction.id })
        .update({
          status: transactionStatus,
          gateway_transaction_id: gatewayTransactionId,
          gateway_response: JSON.stringify(gatewayResult.metadata), // Store full response
          updated_at: new Date(),
        });

      transaction = { ...transaction, ...gatewayResult, status: transactionStatus };
    });

  } catch (error) {
    transactionStatus = 'failed';
    errorMessage = error.message;
    logger.error(`Transaction failed for user ${userId}, merchant ${merchantId}:`, error.message);
    // If a transaction was partially created in DB before error, update its status to failed
    if (transaction && transaction.id) {
      await db('transactions')
        .where({ id: transaction.id })
        .update({ status: 'failed', gateway_response: JSON.stringify({ error: errorMessage }), updated_at: new Date() })
        .catch(dbErr => logger.error('Failed to update transaction status to failed:', dbErr.message));
    }
    throw error; // Re-throw for global error handler
  } finally {
    // 6. Send webhook notification (asynchronous, fire-and-forget)
    if (merchant && merchant.webhook_url) {
      const webhookPayload = {
        id: transaction ? transaction.id : uuidv4(), // If transaction not created, use a new ID
        status: transactionStatus,
        event: transactionStatus === 'completed' ? 'charge.succeeded' : 'charge.failed',
        amount: amount,
        currency: currency,
        merchant_id: merchantId,
        user_id: userId,
        description: description,
        gateway_transaction_id: gatewayTransactionId,
        error_message: errorMessage,
        timestamp: new Date().toISOString(),
      };
      webhookService.sendWebhook(merchant.webhook_url, webhookPayload, merchant.id)
        .catch(err => logger.error(`Failed to send webhook for transaction ${webhookPayload.id}:`, err.message));
    }
  }

  return transaction;
};

const refundTransaction = async ({
  userId, // User initiating refund, typically an admin or merchant
  transactionId,
  amount = null, // Optional, for partial refunds
  reason = 'Customer request',
}) => {
  let originalTransaction;
  let refundTransactionRecord;
  let refundStatus = 'pending';
  let gatewayRefundId = null;
  let errorMessage = null;

  try {
    // 1. Retrieve original transaction
    originalTransaction = await db('transactions')
      .where({ id: transactionId, status: 'completed', type: 'charge' })
      .first();

    if (!originalTransaction) {
      throw new AppError('Completed transaction not found or not eligible for refund.', 404, 'TRANSACTION_NOT_FOUND');
    }

    // 2. Authorization check: ensure user has permission to refund this transaction
    // For example, if userId is a merchant admin, check if originalTransaction.merchant_id matches their merchant_id
    const user = await db('users').where({ id: userId }).first();
    if (!user || (user.type === 'merchant' && user.merchant_id !== originalTransaction.merchant_id) && user.type !== 'admin') {
      throw new AppError('You do not have permission to refund this transaction.', 403, 'UNAUTHORIZED_REFUND');
    }

    const gatewayTransactionId = originalTransaction.gateway_transaction_id;
    if (!gatewayTransactionId) {
      throw new AppError('Transaction has no gateway ID; cannot refund via gateway.', 400, 'NO_GATEWAY_ID');
    }

    // 3. Determine refund amount
    const refundAmount = amount || originalTransaction.amount;
    if (refundAmount <= 0 || refundAmount > originalTransaction.amount) {
      throw new AppError('Invalid refund amount.', 400, 'INVALID_REFUND_AMOUNT');
    }
    // Check if this refund + previous refunds exceed original amount
    const totalRefunded = await db('transactions')
      .where({ parent_transaction_id: originalTransaction.id, type: 'refund', status: 'completed' })
      .sum('amount as total_refunded')
      .first();
    const alreadyRefunded = parseFloat(totalRefunded.total_refunded || 0);

    if ((alreadyRefunded + refundAmount) > originalTransaction.amount) {
      throw new AppError('Refund amount exceeds remaining refundable amount.', 400, 'REFUND_AMOUNT_EXCEEDS_ORIGINAL');
    }

    const refundId = uuidv4();

    await db.transaction(async trx => {
      // 4. Record refund transaction in our DB (initial status: pending)
      refundTransactionRecord = {
        id: refundId,
        user_id: userId, // User who initiated the refund
        merchant_id: originalTransaction.merchant_id,
        parent_transaction_id: originalTransaction.id, // Link to original transaction
        amount: refundAmount,
        currency: originalTransaction.currency,
        description: `Refund for original transaction ${originalTransaction.id}. Reason: ${reason}`,
        status: 'pending',
        type: 'refund',
        gateway_response: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      await trx('transactions').insert(refundTransactionRecord);

      // 5. Call external Payment Gateway for refund
      const gatewayResult = await paymentGatewayService.refundPayment({
        gatewayTransactionId,
        amount: refundAmount,
        currency: originalTransaction.currency,
        reason,
        refundRef: refundTransactionRecord.id,
      });

      // 6. Update refund transaction status based on gateway response
      gatewayRefundId = gatewayResult.gatewayRefundId;
      refundStatus = gatewayResult.status === 'refunded' ? 'completed' : 'failed';

      await trx('transactions')
        .where({ id: refundTransactionRecord.id })
        .update({
          status: refundStatus,
          gateway_transaction_id: gatewayRefundId, // Gateway's refund ID
          gateway_response: JSON.stringify(gatewayResult.metadata),
          updated_at: new Date(),
        });

      refundTransactionRecord = { ...refundTransactionRecord, ...gatewayResult, status: refundStatus };
    });

  } catch (error) {
    refundStatus = 'failed';
    errorMessage = error.message;
    logger.error(`Refund failed for transaction ${transactionId}:`, error.message);
    if (refundTransactionRecord && refundTransactionRecord.id) {
      await db('transactions')
        .where({ id: refundTransactionRecord.id })
        .update({ status: 'failed', gateway_response: JSON.stringify({ error: errorMessage }), updated_at: new Date() })
        .catch(dbErr => logger.error('Failed to update refund transaction status to failed:', dbErr.message));
    }
    throw error;
  } finally {
    // 7. Send webhook notification
    if (originalTransaction) {
      const merchant = await db('merchants').where({ id: originalTransaction.merchant_id }).first();
      if (merchant && merchant.webhook_url) {
        const webhookPayload = {
          id: refundTransactionRecord ? refundTransactionRecord.id : uuidv4(),
          original_transaction_id: originalTransaction.id,
          status: refundStatus,
          event: refundStatus === 'completed' ? 'charge.refunded' : 'charge.refund_failed',
          amount: amount,
          currency: originalTransaction.currency,
          merchant_id: originalTransaction.merchant_id,
          user_id: originalTransaction.user_id, // User who made original payment
          gateway_refund_id: gatewayRefundId,
          error_message: errorMessage,
          timestamp: new Date().toISOString(),
        };
        webhookService.sendWebhook(merchant.webhook_url, webhookPayload, merchant.id)
          .catch(err => logger.error(`Failed to send webhook for refund ${webhookPayload.id}:`, err.message));
      }
    }
  }

  return refundTransactionRecord;
};


// Other transaction-related services
const getTransactionById = async (transactionId, userId, userType) => {
  let query = db('transactions')
    .select(
      'transactions.*',
      'users.name as user_name',
      'merchants.name as merchant_name'
    )
    .leftJoin('users', 'transactions.user_id', 'users.id')
    .leftJoin('merchants', 'transactions.merchant_id', 'merchants.id')
    .where('transactions.id', transactionId);

  if (userType === 'user') {
    query = query.where('transactions.user_id', userId);
  } else if (userType === 'merchant') {
    const merchant = await db('merchants').where({ user_id: userId }).first();
    if (!merchant) throw new AppError('Merchant account not found for this user.', 404);
    query = query.where('transactions.merchant_id', merchant.id);
  } else if (userType !== 'admin') {
    throw new AppError('Unauthorized access to transactions.', 403);
  }

  const transaction = await query.first();

  if (!transaction) {
    throw new AppError('Transaction not found.', 404, 'TRANSACTION_NOT_FOUND');
  }
  return transaction;
};

const getTransactions = async (userId, userType, filters = {}) => {
  let query = db('transactions')
    .select(
      'transactions.id',
      'transactions.amount',
      'transactions.currency',
      'transactions.status',
      'transactions.type',
      'transactions.description',
      'transactions.created_at',
      'users.name as user_name',
      'merchants.name as merchant_name'
    )
    .leftJoin('users', 'transactions.user_id', 'users.id')
    .leftJoin('merchants', 'transactions.merchant_id', 'merchants.id');

  if (userType === 'user') {
    query = query.where('transactions.user_id', userId);
  } else if (userType === 'merchant') {
    const merchant = await db('merchants').where({ user_id: userId }).first();
    if (!merchant) throw new AppError('Merchant account not found for this user.', 404);
    query = query.where('transactions.merchant_id', merchant.id);
  } else if (userType !== 'admin') {
    throw new AppError('Unauthorized access to transactions.', 403);
  }

  // Apply filters
  if (filters.status) query = query.where('transactions.status', filters.status);
  if (filters.type) query = query.where('transactions.type', filters.type);
  if (filters.merchantId) query = query.where('transactions.merchant_id', filters.merchantId);
  if (filters.userId) query = query.where('transactions.user_id', filters.userId);
  if (filters.startDate) query = query.where('transactions.created_at', '>=', filters.startDate);
  if (filters.endDate) query = query.where('transactions.created_at', '<=', filters.endDate);

  // Add pagination and sorting
  const page = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 20;
  const offset = (page - 1) * limit;
  const sortBy = filters.sortBy || 'created_at';
  const sortOrder = filters.sortOrder || 'desc';

  query = query.orderBy(`transactions.${sortBy}`, sortOrder).limit(limit).offset(offset);

  return query;
};


module.exports = {
  createTransaction,
  refundTransaction,
  getTransactionById,
  getTransactions,
};
```