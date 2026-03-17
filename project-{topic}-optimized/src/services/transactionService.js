const knex = require('knex');
const knexConfig = require('../db/knexfile');
const config = require('../config');
const { ApiError } = require('../middleware/errorHandler');
const { validateSchema, generateUUID, formatAmount } = require('../utils/helpers');
const { createTransactionSchema, updateTransactionSchema } = require('../models/transactionSchema');
const logger = require('../utils/logger');
const { deleteCache, setCache, getCache } = require('../utils/cache');
const { TRANSACTION_TYPES, TRANSACTION_STATUSES, ERROR_MESSAGES } = require('../utils/constants');

const db = knex(knexConfig[config.env]);
const TRANSACTION_CACHE_PREFIX = 'transaction:';

/**
 * Processes a new transaction (debit or credit) and updates account balances.
 * This is the core algorithmic logic for financial transactions.
 * It uses a database transaction to ensure atomicity (all or nothing).
 *
 * @param {object} transactionData - Transaction details (accountId, type, amount, currency, description).
 * @param {object} [trx=db] - Knex transaction object for atomicity. Allows this function to be part of a larger transaction.
 * @returns {object} - The newly created transaction object.
 * @throws {ApiError} For insufficient funds, invalid account, or other processing errors.
 */
const processNewTransaction = async (transactionData, trx = db) => {
  const validatedData = validateSchema(createTransactionSchema, transactionData);
  const { accountId, type, amount, currency, description, referenceId } = validatedData;

  if (amount <= 0) {
    throw new ApiError(400, ERROR_MESSAGES.INVALID_AMOUNT);
  }

  // Ensure amount is formatted correctly
  const formattedAmount = formatAmount(amount);

  // 1. Fetch account (within the transaction for isolation)
  const account = await trx('accounts')
    .where({ id: accountId, currency })
    .forUpdate() // Lock the row for update (prevents race conditions)
    .first();

  if (!account) {
    throw new ApiError(404, ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
  }

  let newBalance = account.balance;
  let transactionStatus = TRANSACTION_STATUSES.PENDING; // Start as pending, capture/complete later

  // 2. Determine balance change based on transaction type
  switch (type) {
    case TRANSACTION_TYPES.DEBIT:
      if (account.balance < formattedAmount) {
        // If debit fails due to insufficient funds, mark transaction as FAILED
        transactionStatus = TRANSACTION_STATUSES.FAILED;
        logger.warn(`Transaction failed for account ${accountId}: Insufficient funds for debit of ${formattedAmount}`);
        throw new ApiError(400, ERROR_MESSAGES.INSUFFICIENT_FUNDS);
      }
      newBalance = formatAmount(account.balance - formattedAmount);
      break;
    case TRANSACTION_TYPES.CREDIT:
    case TRANSACTION_TYPES.REFUND: // Refunds are credits to the original account
      newBalance = formatAmount(account.balance + formattedAmount);
      break;
    case TRANSACTION_TYPES.FEE:
      // Fees are debits, but could be handled differently (e.g., from a separate fees account)
      if (account.balance < formattedAmount) {
        transactionStatus = TRANSACTION_STATUSES.FAILED;
        logger.warn(`Transaction failed for account ${accountId}: Insufficient funds for fee of ${formattedAmount}`);
        throw new ApiError(400, ERROR_MESSAGES.INSUFFICIENT_FUNDS);
      }
      newBalance = formatAmount(account.balance - formattedAmount);
      break;
    default:
      throw new ApiError(400, `Invalid transaction type: ${type}`);
  }

  // 3. Create the transaction record
  const [newTransaction] = await trx('transactions').insert({
    id: generateUUID(),
    account_id: accountId,
    type,
    amount: formattedAmount,
    currency,
    status: transactionStatus, // Initial status
    description,
    reference_id: referenceId || null,
  }).returning('*');

  // If initial transaction status is not FAILED, proceed to update balance
  if (transactionStatus !== TRANSACTION_STATUSES.FAILED) {
    // 4. Update account balance
    await trx('accounts')
      .where({ id: accountId })
      .update({ balance: newBalance, updated_at: db.fn.now() });

    // Update the transaction status to COMPLETED if it's a direct debit/credit
    // For payment flows, it might remain PENDING until capture.
    if (type === TRANSACTION_TYPES.CREDIT || type === TRANSACTION_TYPES.DEBIT || type === TRANSACTION_TYPES.REFUND) {
      newTransaction.status = TRANSACTION_STATUSES.COMPLETED;
      await trx('transactions')
        .where({ id: newTransaction.id })
        .update({ status: TRANSACTION_STATUSES.COMPLETED, updated_at: db.fn.now() });
    }
    logger.info(`Transaction ${newTransaction.id} processed for account ${accountId}. New balance: ${newBalance}`);
  }

  // Invalidate account cache after successful update
  await deleteCache(`account:${accountId}`);
  await setCache(`${TRANSACTION_CACHE_PREFIX}${newTransaction.id}`, newTransaction);

  return newTransaction;
};

/**
 * Retrieves a transaction by its ID.
 * @param {string} transactionId - The ID of the transaction.
 * @returns {object} - Transaction object.
 * @throws {ApiError} If transaction not found.
 */
const getTransactionById = async (transactionId) => {
  const cacheKey = `${TRANSACTION_CACHE_PREFIX}${transactionId}`;
  let transaction = await getCache(cacheKey);

  if (transaction) {
    logger.debug(`Transaction ${transactionId} fetched from cache.`);
    return transaction;
  }

  transaction = await db('transactions')
    .where({ id: transactionId })
    .first();

  if (!transaction) {
    throw new ApiError(404, ERROR_MESSAGES.TRANSACTION_NOT_FOUND);
  }

  await setCache(cacheKey, transaction);
  logger.info(`Transaction ${transactionId} fetched from DB and cached.`);
  return transaction;
};

/**
 * Retrieves all transactions for a specific account.
 * @param {string} accountId - The ID of the account.
 * @returns {Array<object>} - Array of transaction objects.
 */
const getTransactionsByAccountId = async (accountId) => {
  const transactions = await db('transactions')
    .where({ account_id: accountId })
    .orderBy('created_at', 'desc');
  return transactions;
};

/**
 * Updates the status of an existing transaction.
 * This function should be used carefully, primarily for changing PENDING transactions to COMPLETED, FAILED, or VOIDED.
 * @param {string} transactionId - The ID of the transaction to update.
 * @param {object} updateData - Data to update (e.g., status, description).
 * @param {object} [trx=db] - Knex transaction object.
 * @returns {object} - Updated transaction object.
 * @throws {ApiError} If transaction not found, invalid status transition, or other errors.
 */
const updateTransactionStatus = async (transactionId, newStatus, description = null, trx = db) => {
  if (!Object.values(TRANSACTION_STATUSES).includes(newStatus)) {
    throw new ApiError(400, 'Invalid new transaction status.');
  }

  const transaction = await trx('transactions').where({ id: transactionId }).first();

  if (!transaction) {
    throw new ApiError(404, ERROR_MESSAGES.TRANSACTION_NOT_FOUND);
  }

  // --- Transaction Status Transition Logic (ALX focus on algorithms/logic) ---
  // This is a critical piece of business logic to prevent invalid state changes.
  const currentStatus = transaction.status;

  if (currentStatus === newStatus) {
    logger.warn(`Attempted to update transaction ${transactionId} to same status: ${newStatus}`);
    return transaction; // No actual change, return existing
  }

  const validTransitions = {
    [TRANSACTION_STATUSES.PENDING]: [TRANSACTION_STATUSES.COMPLETED, TRANSACTION_STATUSES.FAILED, TRANSACTION_STATUSES.VOIDED],
    [TRANSACTION_STATUSES.COMPLETED]: [TRANSACTION_STATUSES.REVERSED], // e.g., for refunds or chargebacks
    [TRANSACTION_STATUSES.FAILED]: [],
    [TRANSACTION_STATUSES.REVERSED]: [],
    [TRANSACTION_STATUSES.VOIDED]: [],
  };

  if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(newStatus)) {
    throw new ApiError(400, ERROR_MESSAGES.INVALID_TRANSACTION_STATUS + ` Cannot change from ${currentStatus} to ${newStatus}.`);
  }

  // If status is changing from PENDING to FAILED or VOIDED, we might need to reverse any temporary balance holds.
  // In our current `processNewTransaction`, a debit only happens on success, so no reversal needed for balance here.
  // However, if we implement pre-authorization/holds, this would be the place to release them.

  const [updatedTransaction] = await trx('transactions')
    .where({ id: transactionId })
    .update({
      status: newStatus,
      description: description || transaction.description,
      updated_at: db.fn.now(),
    })
    .returning('*');

  await deleteCache(`${TRANSACTION_CACHE_PREFIX}${transactionId}`); // Invalidate cache
  logger.info(`Transaction ${transactionId} status updated from ${currentStatus} to ${newStatus}.`);
  return updatedTransaction;
};

module.exports = {
  processNewTransaction,
  getTransactionById,
  getTransactionsByAccountId,
  updateTransactionStatus,
};