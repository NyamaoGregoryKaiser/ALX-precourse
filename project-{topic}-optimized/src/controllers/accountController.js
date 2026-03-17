const accountService = require('../services/accountService');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { USER_ROLES } = require('../utils/constants');

/**
 * Creates a new account for an authenticated user.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const createAccount = async (req, res, next) => {
  try {
    const userId = req.user.id; // Get user ID from authenticated request
    const newAccount = await accountService.createAccount(userId, req.body);
    res.status(201).json({
      message: 'Account created successfully',
      account: newAccount,
    });
  } catch (error) {
    logger.error('Error in accountController.createAccount:', error);
    next(error);
  }
};

/**
 * Retrieves an account by ID. Users can only access their own accounts. Admins can access any.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const getAccount = async (req, res, next) => {
  try {
    const accountId = req.params.id;
    const account = await accountService.getAccountById(accountId);

    // Authorization check: User can only view their own account
    if (req.user.role !== USER_ROLES.ADMIN && account.user_id !== req.user.id) {
      return next(new ApiError(403, 'Forbidden: You do not have access to this account.'));
    }

    res.status(200).json({ account });
  } catch (error) {
    logger.error(`Error in accountController.getAccount for ID ${req.params.id}:`, error);
    next(error);
  }
};

/**
 * Retrieves all accounts for the authenticated user.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const getMyAccounts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const accounts = await accountService.getAccountsByUserId(userId);
    res.status(200).json({ accounts });
  } catch (error) {
    logger.error(`Error in accountController.getMyAccounts for user ${req.user.id}:`, error);
    next(error);
  }
};

/**
 * Updates an account. Users can only update their own accounts (if applicable, limited fields). Admins can update any.
 * Note: Balance updates are specifically handled by the transaction service.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const updateAccount = async (req, res, next) => {
  try {
    const accountId = req.params.id;
    const account = await accountService.getAccountById(accountId); // Get account to check ownership

    // Authorization check
    if (req.user.role !== USER_ROLES.ADMIN && account.user_id !== req.user.id) {
      return next(new ApiError(403, 'Forbidden: You do not have permission to update this account.'));
    }

    const updatedAccount = await accountService.updateAccount(accountId, req.body);
    res.status(200).json({
      message: 'Account updated successfully',
      account: updatedAccount,
    });
  } catch (error) {
    logger.error(`Error in accountController.updateAccount for ID ${req.params.id}:`, error);
    next(error);
  }
};

/**
 * Deletes an account. Users can only delete their own accounts. Admins can delete any.
 * Requires careful consideration in a real payment system (e.g., preventing deletion of accounts with funds).
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const deleteAccount = async (req, res, next) => {
  try {
    const accountId = req.params.id;
    const account = await accountService.getAccountById(accountId);

    // Authorization check
    if (req.user.role !== USER_ROLES.ADMIN && account.user_id !== req.user.id) {
      return next(new ApiError(403, 'Forbidden: You do not have permission to delete this account.'));
    }

    const message = await accountService.deleteAccount(accountId);
    res.status(200).json({ message });
  } catch (error) {
    logger.error(`Error in accountController.deleteAccount for ID ${req.params.id}:`, error);
    next(error);
  }
};

module.exports = {
  createAccount,
  getAccount,
  getMyAccounts,
  updateAccount,
  deleteAccount,
};