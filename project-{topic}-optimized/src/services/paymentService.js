const knex = require('knex');
const knexConfig = require('../db/knexfile');
const config = require('../config');
const { ApiError } = require('../middleware/errorHandler');
const { validateSchema, generateUUID, formatAmount } = require('../utils/helpers');
const { initiatePaymentSchema, capturePaymentSchema, refundPaymentSchema } = require('../models/paymentSchema');
const { TRANSACTION_TYPES, TRANSACTION_STATUSES, PAYMENT_METHODS, ERROR_MESSAGES } = require('../utils/constants');
const transactionService = require('./transactionService'); // Utilize transaction service
const accountService = require('./accountService');
const logger = require('../utils/logger');

const db = knex(knexConfig[config.env]);

/**
 * Initiates a payment. This involves creating a PENDING debit transaction on the source account.
 * This function also handles idempotency to prevent duplicate payments.
 * @param {object} paymentData - Payment details (amount, currency, sourceAccountId, destinationAccountId, paymentMethod, idempotencyKey).
 * @returns {object} - The created payment transaction.
 * @throws {ApiError} For insufficient funds, invalid accounts, or duplicate idempotency keys.
 */
const initiatePayment = async (paymentData) => {
  const validatedData = validateSchema(initiatePaymentSchema, paymentData);
  const { amount, currency, sourceAccountId, destinationAccountId, paymentMethod, description, idempotencyKey } = validatedData;

  if (sourceAccountId === destinationAccountId) {
    throw new ApiError(400, 'Source and destination accounts cannot be the same for a payment.');
  }

  // Ensure amount is positive
  if (amount <= 0) {
    throw new ApiError(400, ERROR_MESSAGES.INVALID_AMOUNT);
  }

  const formattedAmount = formatAmount(amount);

  // Use a database transaction for atomicity across multiple operations
  const paymentTransaction = await db.transaction(async (trx) => {
    // 1. Check for idempotency: Prevent duplicate payment requests
    const existingPayment = await trx('transactions')
      .where({ reference_id: idempotencyKey, type: TRANSACTION_TYPES.DEBIT })
      .first();

    if (existingPayment) {
      logger.warn(`Idempotency key ${idempotencyKey} already used for a payment. Returning existing transaction.`);
      // Return the existing transaction if it was already processed successfully
      if (existingPayment.status === TRANSACTION_STATUSES.COMPLETED || existingPayment.status === TRANSACTION_STATUSES.PENDING) {
        return existingPayment;
      } else {
        // If the previous attempt failed, allow a retry (optional, depending on business logic)
        // For simplicity, we'll return an error here.
        throw new ApiError(409, ERROR_MESSAGES.IDEMPOTENCY_KEY_USED + ' (Previous attempt failed, please generate a new key)');
      }
    }

    // 2. Validate source and destination accounts
    const sourceAccount = await trx('accounts')
      .where({ id: sourceAccountId, currency })
      .forUpdate() // Lock source account for update
      .first();

    if (!sourceAccount) {
      throw new ApiError(404, `Source account ${sourceAccountId} not found or invalid currency.`);
    }

    // No need to lock destination account immediately if it's external or credited later.
    // However, if it's an internal account and we want to ensure its existence, check now.
    const destinationAccount = await trx('accounts')
      .where({ id: destinationAccountId, currency })
      .first();

    if (!destinationAccount) {
      throw new ApiError(404, `Destination account ${destinationAccountId} not found or invalid currency.`);
    }

    // 3. Create a PENDING debit transaction on the source account
    // This is a "hold" or "pre-authorization" logic. Actual debit occurs on capture.
    // For simplicity here, `processNewTransaction` will directly debit and set to COMPLETED.
    // In a real system, initiate would create a PENDING transaction, and balance is only affected on CAPTURE.
    // Let's adjust `processNewTransaction` to handle PENDING better.
    // For this simplified version, initiatePayment will create a DEBIT transaction that immediately completes if funds are available.
    // A more advanced system would use two phases: Authorize (create PENDING debit), then Capture (complete debit, create credit).
    // Let's simulate a 'pending' state here for educational value for a two-phase flow.

    // To simulate 2-phase: create a pending debit and update later.
    // For current `processNewTransaction`, a debit directly completes.
    // We will create a DEBIT transaction and explicitly set its status to PENDING first,
    // and then only update account balance upon 'capture'.
    // This requires a slight modification to `transactionService.processNewTransaction` or a new specialized function.

    // Let's create the transaction directly here for payment as pending
    // and only update account balance when it is 'captured'.
    // For now, `processNewTransaction` immediately completes, so we will use it as-is,
    // assuming initiate = capture for simplicity in this comprehensive example,
    // but the concept of a PENDING initial state for payment is crucial.
    // A more robust implementation would:
    // 1. Create a `DEBIT` transaction with status `PENDING`.
    // 2. On capture, update `DEBIT` to `COMPLETED` and create a `CREDIT` transaction.

    // For the sake of this example, `initiatePayment` will simulate an immediate debit and credit for internal transfers.
    // If it were an external payment, only the debit from `sourceAccountId` would happen initially.
    // Let's make `initiatePayment` more like an internal transfer for demonstration.

    // If implementing "pre-authorization" or two-phase commit:
    // First, try to "hold" funds (create a PENDING DEBIT transaction).
    // Then, if hold is successful, proceed. On capture, convert PENDING to COMPLETED, and issue CREDIT.

    // Simplified approach for this project:
    // If sourceAccountId and destinationAccountId are both internal, we'll perform both debit and credit immediately.
    // If destination is external (simulated), we'll only perform the debit.
    let debitTransaction, creditTransaction;

    // Debit from source account
    debitTransaction = await transactionService.processNewTransaction({
      accountId: sourceAccountId,
      type: TRANSACTION_TYPES.DEBIT,
      amount: formattedAmount,
      currency,
      description: description || `Payment from ${sourceAccountId} to ${destinationAccountId} via ${paymentMethod}`,
      referenceId: idempotencyKey, // Use idempotency key as reference for both debit and credit
    }, trx);

    // Credit to destination account
    creditTransaction = await transactionService.processNewTransaction({
      accountId: destinationAccountId,
      type: TRANSACTION_TYPES.CREDIT,
      amount: formattedAmount,
      currency,
      description: description || `Payment to ${destinationAccountId} from ${sourceAccountId} via ${paymentMethod}`,
      referenceId: idempotencyKey,
    }, trx);

    logger.info(`Payment initiated with idempotency key ${idempotencyKey}. Debit transaction: ${debitTransaction.id}, Credit transaction: ${creditTransaction.id}`);
    return {
      paymentId: debitTransaction.id, // Use debit transaction ID as the overall payment ID
      idempotencyKey,
      sourceTransaction: debitTransaction,
      destinationTransaction: creditTransaction,
      status: TRANSACTION_STATUSES.COMPLETED, // Immediately completed for internal transfers
      // In a real system, this would typically return PENDING and require a separate capture step
    };
  });

  return paymentTransaction;
};

/**
 * Captures a previously initiated payment (if it was pending).
 * In this simplified model, `initiatePayment` often immediately completes.
 * This function is more relevant if `initiatePayment` truly created a PENDING transaction.
 * @param {string} paymentId - The ID of the payment (which corresponds to the debit transaction ID).
 * @returns {object} - The captured payment details.
 */
const capturePayment = async (paymentId) => {
  validateSchema(capturePaymentSchema, { paymentId });

  // Use a database transaction for atomicity
  const capturedPayment = await db.transaction(async (trx) => {
    const debitTransaction = await trx('transactions')
      .where({ id: paymentId, type: TRANSACTION_TYPES.DEBIT })
      .first();

    if (!debitTransaction) {
      throw new ApiError(404, ERROR_MESSAGES.PAYMENT_NOT_FOUND);
    }

    if (debitTransaction.status === TRANSACTION_STATUSES.COMPLETED) {
      throw new ApiError(400, ERROR_MESSAGES.PAYMENT_ALREADY_CAPTURED);
    }

    if (debitTransaction.status !== TRANSACTION_STATUSES.PENDING) {
      throw new ApiError(400, ERROR_MESSAGES.PAYMENT_NOT_PENDING);
    }

    // Here, if `initiatePayment` created a PENDING debit, we would now complete it.
    // Since our `processNewTransaction` immediately completes the debit,
    // this capture function would primarily handle the credit to the destination.

    // For a fully two-phase capture:
    // 1. Update debit transaction status from PENDING to COMPLETED.
    // 2. Create the corresponding CREDIT transaction for the destination account.

    // Let's assume we are retrofitting this for a 2-phase system:
    const updatedDebit = await transactionService.updateTransactionStatus(
      debitTransaction.id,
      TRANSACTION_STATUSES.COMPLETED,
      'Payment captured: debit completed',
      trx
    );

    // Find the corresponding credit transaction by reference_id (idempotency key) and type
    // This assumes the credit transaction was NOT created in `initiatePayment` but will be created now.
    // Or, if it was created as PENDING, it would be updated now.
    // For our simplified model, the credit was already created and completed.
    // This makes the `capturePayment` endpoint less critical unless actual PENDING state is introduced.

    // Example if credit was NOT created by initiatePayment and is done now:
    // const creditTransaction = await transactionService.processNewTransaction({
    //   accountId: debitTransaction.destination_account_id, // assuming destination_account_id stored on debit transaction
    //   type: TRANSACTION_TYPES.CREDIT,
    //   amount: debitTransaction.amount,
    //   currency: debitTransaction.currency,
    //   description: `Payment credit from ${debitTransaction.account_id}`,
    //   referenceId: debitTransaction.reference_id,
    // }, trx);

    // For this example, if the debit is PENDING, we assume the credit would also be pending or not exist.
    // We need to fetch the original payment reference (idempotency key) to link the credit part.
    // For simplicity, let's assume `initiatePayment` generates a "payment" record
    // that holds both debit and credit transaction IDs, and status.
    // Or, simpler: just manage the debit transaction state.

    // Given `processNewTransaction` immediately sets to COMPLETED, this `capturePayment` function
    // would mainly be for external payment gateways where a webhook confirms capture.
    // For internal transfers, it's less direct.

    logger.info(`Payment ${paymentId} captured.`);
    return {
      paymentId: updatedDebit.id,
      status: updatedDebit.status,
      // Add more details from related credit transaction if available
    };
  });

  return capturedPayment;
};

/**
 * Refunds a previously completed payment.
 * Creates a new REFUND transaction (a credit) to the original source account.
 * @param {string} paymentId - The ID of the original payment (debit transaction ID).
 * @param {object} refundData - Refund details (amount, description).
 * @returns {object} - The created refund transaction.
 * @throws {ApiError} If payment not found, already refunded, or invalid amount.
 */
const refundPayment = async (paymentId, refundData) => {
  const validatedData = validateSchema(refundPaymentSchema, { ...refundData, paymentId });
  const { amount: refundAmount, description } = validatedData;

  const refundResult = await db.transaction(async (trx) => {
    // 1. Find the original debit transaction for the payment
    const originalDebit = await trx('transactions')
      .where({ id: paymentId, type: TRANSACTION_TYPES.DEBIT, status: TRANSACTION_STATUSES.COMPLETED })
      .first();

    if (!originalDebit) {
      throw new ApiError(404, ERROR_MESSAGES.PAYMENT_NOT_FOUND + ' or not in a completed state for refund.');
    }

    // 2. Check if already fully refunded
    const existingRefunds = await trx('transactions')
      .where({ reference_id: originalDebit.id, type: TRANSACTION_TYPES.REFUND, status: TRANSACTION_STATUSES.COMPLETED })
      .sum('amount as totalRefunded')
      .first();

    const totalRefunded = existingRefunds ? formatAmount(parseFloat(existingRefunds.totalRefunded || 0)) : 0;
    const availableForRefund = formatAmount(originalDebit.amount - totalRefunded);

    if (availableForRefund <= 0) {
      throw new ApiError(400, ERROR_MESSAGES.PAYMENT_ALREADY_REFUNDED + ' (or fully refunded).');
    }

    const amountToRefund = refundAmount ? formatAmount(refundAmount) : availableForRefund;

    if (amountToRefund <= 0 || amountToRefund > availableForRefund) {
      throw new ApiError(400, `Invalid refund amount. Available for refund: ${availableForRefund}. Requested: ${amountToRefund}.`);
    }

    // 3. Create a new REFUND transaction (which is a CREDIT to the original source account)
    const refundTransaction = await transactionService.processNewTransaction({
      accountId: originalDebit.account_id, // Refund goes back to the original debiting account
      type: TRANSACTION_TYPES.REFUND,
      amount: amountToRefund,
      currency: originalDebit.currency,
      description: description || `Refund for payment ${originalDebit.id}`,
      referenceId: originalDebit.id, // Link to the original debit transaction
    }, trx);

    // 4. Update the original debit transaction status to REVERSED if fully refunded, or partially for partial refunds
    // For simplicity, we will just create the refund transaction.
    // More complex logic might involve tracking partial refunds on the original transaction.

    logger.info(`Refund initiated for payment ${originalDebit.id}. Refund transaction: ${refundTransaction.id}`);
    return refundTransaction;
  });

  return refundResult;
};

/**
 * Retrieves payment details based on a paymentId (debit transaction ID).
 * @param {string} paymentId - The ID of the payment (debit transaction ID).
 * @returns {object} - Payment details including associated transactions.
 * @throws {ApiError} If payment not found.
 */
const getPaymentDetails = async (paymentId) => {
  const debitTransaction = await db('transactions')
    .where({ id: paymentId, type: TRANSACTION_TYPES.DEBIT })
    .first();

  if (!debitTransaction) {
    throw new ApiError(404, ERROR_MESSAGES.PAYMENT_NOT_FOUND);
  }

  // Find corresponding credit transaction and any refunds using the reference_id
  const relatedTransactions = await db('transactions')
    .where((builder) => {
      builder.where({ reference_id: debitTransaction.reference_id })
             .orWhere({ id: debitTransaction.reference_id }); // Also check if this debit was a refund itself
    })
    .orderBy('created_at', 'asc');

  return {
    paymentId: debitTransaction.id,
    status: debitTransaction.status,
    amount: debitTransaction.amount,
    currency: debitTransaction.currency,
    sourceAccountId: debitTransaction.account_id,
    createdAt: debitTransaction.created_at,
    updatedAt: debitTransaction.updated_at,
    description: debitTransaction.description,
    idempotencyKey: debitTransaction.reference_id,
    allRelatedTransactions: relatedTransactions,
  };
};

module.exports = {
  initiatePayment,
  capturePayment,
  refundPayment,
  getPaymentDetails,
};