```javascript
const httpStatus = require('http-status-codes');
const { Account } = require('../../models');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Create an account for a user
 * @param {Object} accountBody
 * @returns {Promise<Account>}
 */
const createAccount = async (accountBody) => {
  const account = await Account.create({
    ...accountBody,
    id: uuidv4(), // Generate UUID for account ID
    balance: accountBody.balance || 0,
  });
  logger.info(`Account created for user ${account.userId}: ${account.id}`);
  return account;
};

/**
 * Get all accounts for a specific user
 * @param {string} userId
 * @returns {Promise<Account[]>}
 */
const getAccountsByUserId = async (userId) => {
  return Account.findAll({ where: { userId } });
};

/**
 * Get an account by its ID
 * @param {string} accountId
 * @returns {Promise<Account>}
 */
const getAccountById = async (accountId) => {
  return Account.findByPk(accountId);
};

/**
 * Update an account
 * @param {string} accountId
 * @param {string} userId
 * @param {Object} updateBody
 * @returns {Promise<Account>}
 */
const updateAccount = async (accountId, userId, updateBody) => {
  const account = await getAccountById(accountId);
  if (!account || account.userId !== userId) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Account not found or access denied');
  }
  Object.assign(account, updateBody);
  await account.save();
  logger.info(`Account ${accountId} updated by user ${userId}`);
  return account;
};

/**
 * Delete an account
 * @param {string} accountId
 * @param {string} userId
 * @returns {Promise<void>}
 */
const deleteAccount = async (accountId, userId) => {
  const account = await getAccountById(accountId);
  if (!account || account.userId !== userId) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Account not found or access denied');
  }
  if (account.balance !== 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Account must have a zero balance to be deleted');
  }
  await account.destroy();
  logger.info(`Account ${accountId} deleted by user ${userId}`);
};

/**
 * Deposit funds into an account
 * @param {string} accountId
 * @param {string} userId
 * @param {number} amount
 * @returns {Promise<Account>}
 */
const depositToAccount = async (accountId, userId, amount) => {
  const account = await getAccountById(accountId);
  if (!account || account.userId !== userId) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Account not found or access denied');
  }
  if (amount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Deposit amount must be positive');
  }

  account.balance += amount;
  await account.save();
  logger.info(`Deposited ${amount} into account ${accountId} (user ${userId}). New balance: ${account.balance}`);
  return account;
};

/**
 * Withdraw funds from an account
 * @param {string} accountId
 * @param {string} userId
 * @param {number} amount
 * @returns {Promise<Account>}
 */
const withdrawFromAccount = async (accountId, userId, amount) => {
  const account = await getAccountById(accountId);
  if (!account || account.userId !== userId) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Account not found or access denied');
  }
  if (amount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Withdrawal amount must be positive');
  }
  if (account.balance < amount) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient funds');
  }

  account.balance -= amount;
  await account.save();
  logger.info(`Withdrew ${amount} from account ${accountId} (user ${userId}). New balance: ${account.balance}`);
  return account;
};


module.exports = {
  createAccount,
  getAccountsByUserId,
  getAccountById,
  updateAccount,
  deleteAccount,
  depositToAccount,
  withdrawFromAccount,
};
```