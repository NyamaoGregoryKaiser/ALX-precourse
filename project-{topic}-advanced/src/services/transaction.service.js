```javascript
const httpStatus = require('http-status-codes');
const { sequelize, Transaction, Account } = require('../../models');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');
const { TRANSACTION_STATUS, TRANSACTION_TYPE } = require('../utils/constants');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a pending transaction
 * @param {Object} transactionBody
 * @returns {Promise<Transaction>}
 */
const createPendingTransaction = async ({ userId, sourceAccountId, destinationAccountId, amount, currency, description }) => {
  if (amount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction amount must be positive');
  }

  const transaction = await sequelize.transaction(async (t) => {
    const sourceAccount = await Account.findByPk(sourceAccountId, { transaction: t, lock: true });
    if (!sourceAccount || sourceAccount.userId !== userId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid source account or unauthorized');
    }
    if (sourceAccount.balance < amount) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient funds in source account');
    }

    // Deduct from source account immediately to reserve funds
    sourceAccount.balance -= amount;
    await sourceAccount.save({ transaction: t });

    const newTransaction = await Transaction.create({
      id: uuidv4(),
      userId,
      sourceAccountId,
      destinationAccountId,
      amount,
      currency,
      description,
      status: TRANSACTION_STATUS.PENDING,
      type: TRANSACTION_TYPE.PAYMENT, // Could be 'DEPOSIT', 'WITHDRAWAL' etc.
    }, { transaction: t });

    logger.info(`Pending transaction ${newTransaction.id} created for user ${userId}. Source account ${sourceAccountId} debited ${amount}.`);
    return newTransaction;
  });

  return transaction;
};

/**
 * Update transaction status
 * @param {string} transactionId
 * @param {string} status
 * @param {string} [gatewayRefId]
 * @param {string} [remarks]
 * @returns {Promise<Transaction>}
 */
const updateTransactionStatus = async (transactionId, status, gatewayRefId = null, remarks = null) => {
  const transaction = await Transaction.findByPk(transactionId);
  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
  }

  transaction.status = status;
  if (gatewayRefId) {
    transaction.gatewayRefId = gatewayRefId;
  }
  if (remarks) {
    transaction.remarks = remarks;
  }
  await transaction.save();
  logger.info(`Transaction ${transactionId} status updated to ${status}.`);
  return transaction;
};

/**
 * Complete a transaction (e.g., after successful gateway callback)
 * @param {string} transactionId
 * @param {string} gatewayRefId
 * @returns {Promise<Transaction>}
 */
const completeTransaction = async (transactionId, gatewayRefId) => {
  const completedTransaction = await sequelize.transaction(async (t) => {
    const transaction = await Transaction.findByPk(transactionId, { transaction: t, lock: true });
    if (!transaction) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
    }
    if (transaction.status !== TRANSACTION_STATUS.PENDING) {
      // Idempotency: prevent double processing if webhook is sent multiple times
      logger.warn(`Transaction ${transactionId} is not pending, current status: ${transaction.status}. Skipping completion.`);
      return transaction;
    }

    // Credit destination account
    const destinationAccount = await Account.findByPk(transaction.destinationAccountId, { transaction: t, lock: true });
    if (!destinationAccount) {
      // This should ideally not happen if accounts are created correctly.
      // Or, if external destination, then it's outside our system.
      logger.error(`Destination account ${transaction.destinationAccountId} not found for transaction ${transaction.id}`);
      // In a real system, you might revert the source debit or trigger manual review.
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Destination account not found');
    }

    destinationAccount.balance += transaction.amount;
    await destinationAccount.save({ transaction: t });

    transaction.status = TRANSACTION_STATUS.COMPLETED;
    transaction.gatewayRefId = gatewayRefId;
    transaction.completedAt = new Date();
    await transaction.save({ transaction: t });

    logger.info(`Transaction ${transactionId} completed. Destination account ${destinationAccount.id} credited ${transaction.amount}.`);
    return transaction;
  });

  return completedTransaction;
};

/**
 * Fail a transaction (e.g., after failed gateway callback)
 * @param {string} transactionId
 * @param {string} reason
 * @returns {Promise<Transaction>}
 */
const failTransaction = async (transactionId, reason) => {
  const failedTransaction = await sequelize.transaction(async (t) => {
    const transaction = await Transaction.findByPk(transactionId, { transaction: t, lock: true });
    if (!transaction) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
    }
    if (transaction.status !== TRANSACTION_STATUS.PENDING) {
      logger.warn(`Transaction ${transactionId} is not pending, current status: ${transaction.status}. Skipping failure processing.`);
      return transaction;
    }

    // Revert deduction from source account
    const sourceAccount = await Account.findByPk(transaction.sourceAccountId, { transaction: t, lock: true });
    if (sourceAccount) {
      sourceAccount.balance += transaction.amount;
      await sourceAccount.save({ transaction: t });
      logger.info(`Funds of ${transaction.amount} reverted to source account ${sourceAccount.id} for failed transaction ${transactionId}.`);
    } else {
      logger.error(`Source account ${transaction.sourceAccountId} not found for failed transaction ${transactionId}. Manual intervention needed.`);
    }

    transaction.status = TRANSACTION_STATUS.FAILED;
    transaction.remarks = reason;
    transaction.completedAt = new Date(); // Mark as completed (failed) at this time
    await transaction.save({ transaction: t });

    logger.info(`Transaction ${transactionId} marked as FAILED. Reason: ${reason}.`);
    return transaction;
  });

  return failedTransaction;
};


/**
 * Get transactions by user ID
 * @param {string} userId
 * @returns {Promise<Transaction[]>}
 */
const getTransactionsByUserId = async (userId) => {
  return Transaction.findAll({ where: { userId } });
};

/**
 * Get all transactions (for admin)
 * @returns {Promise<Transaction[]>}
 */
const queryTransactions = async () => {
  // Implement pagination, filtering, and sorting for a real app
  return Transaction.findAll();
};

/**
 * Get transaction by ID
 * @param {string} transactionId
 * @returns {Promise<Transaction>}
 */
const getTransactionById = async (transactionId) => {
  return Transaction.findByPk(transactionId);
};

module.exports = {
  createPendingTransaction,
  updateTransactionStatus,
  completeTransaction,
  failTransaction,
  getTransactionsByUserId,
  queryTransactions,
  getTransactionById,
};
```