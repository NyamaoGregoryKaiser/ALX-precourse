const transactionService = require('../services/transactionService');
const accountService = require('../services/accountService'); // To check account ownership
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { USER_ROLES } = require('../utils/constants');

/**
 * Creates a new transaction. Users can only create transactions on their own accounts.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const createTransaction = async (req, res, next) => {
  try {
    const { accountId } = req.body;
    const { id: userId, role: userRole } = req.user;

    // Authorization: User must own the account for which transaction is created
    const account = await accountService.getAccountById(accountId);
    if (userRole !== USER_ROLES.ADMIN && account.user_id !== userId) {
      return next(new ApiError(403, 'Forbidden: You do not have access to create transactions for this account.'));
    }

    // Wrap in a database transaction to ensure atomicity
    const newTransaction = await db.transaction(async (trx) => {
      return await transactionService.processNewTransaction(req.body, trx);
    });

    res.status(201).json({
      message: 'Transaction processed successfully',
      transaction: newTransaction,
    });
  } catch (error) {
    logger.error('Error in transactionController.createTransaction:', error);
    next(error);
  }
};

/**
 * Retrieves a transaction by ID. Users can only view transactions on their own accounts. Admins can view any.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const getTransaction = async (req, res, next) => {
  try {
    const transactionId = req.params.id;
    const { id: userId, role: userRole } = req.user;

    const transaction = await transactionService.getTransactionById(transactionId);
    if (!transaction) {
      return next(new ApiError(404, 'Transaction not found.'));
    }

    // Authorization: User must own the account associated with the transaction
    const account = await accountService.getAccountById(transaction.account_id);
    if (userRole !== USER_ROLES.ADMIN && account.user_id !== userId) {
      return next(new ApiError(403, 'Forbidden: You do not have access to view this transaction.'));
    }

    res.status(200).json({ transaction });
  } catch (error) {
    logger.error(`Error in transactionController.getTransaction for ID ${req.params.id}:`, error);
    next(error);
  }
};

/**
 * Retrieves all transactions for a specific account. Users can only view transactions on their own accounts.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const getAccountTransactions = async (req, res, next) => {
  try {
    const accountId = req.params.accountId;
    const { id: userId, role: userRole } = req.user;

    // Authorization: User must own the account
    const account = await accountService.getAccountById(accountId);
    if (userRole !== USER_ROLES.ADMIN && account.user_id !== userId) {
      return next(new ApiError(403, 'Forbidden: You do not have access to view transactions for this account.'));
    }

    const transactions = await transactionService.getTransactionsByAccountId(accountId);
    res.status(200).json({ transactions });
  } catch (error) {
    logger.error(`Error in transactionController.getAccountTransactions for account ID ${req.params.accountId}:`, error);
    next(error);
  }
};

/**
 * Updates the status of a transaction (e.g., from PENDING to COMPLETED/FAILED/VOIDED).
 * This is typically an administrative or system-driven action.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const updateTransactionStatus = async (req, res, next) => {
  try {
    const transactionId = req.params.id;
    const { status, description } = req.body; // Expecting `status` field

    // Authorization: Only admin can update transaction status directly (or a dedicated webhook handler)
    if (req.user.role !== USER_ROLES.ADMIN) {
      return next(new ApiError(403, 'Forbidden: Only administrators can update transaction status.'));
    }

    const updatedTransaction = await transactionService.updateTransactionStatus(transactionId, status, description);
    res.status(200).json({
      message: 'Transaction status updated successfully',
      transaction: updatedTransaction,
    });
  } catch (error) {
    logger.error(`Error in transactionController.updateTransactionStatus for ID ${req.params.id}:`, error);
    next(error);
  }
};


module.exports = {
  createTransaction,
  getTransaction,
  getAccountTransactions,
  updateTransactionStatus,
};