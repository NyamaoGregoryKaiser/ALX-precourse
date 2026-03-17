const knex = require('knex');
const knexConfig = require('../db/knexfile');
const config = require('../config');
const { ApiError } = require('../middleware/errorHandler');
const { validateSchema, generateUUID } = require('../utils/helpers');
const { createAccountSchema } = require('../models/accountSchema');
const logger = require('../utils/logger');
const { deleteCache, setCache, getCache } = require('../utils/cache');
const { ERROR_MESSAGES } = require('../utils/constants');

const db = knex(knexConfig[config.env]);
const ACCOUNT_CACHE_PREFIX = 'account:';

/**
 * Creates a new account for a user.
 * @param {string} userId - The ID of the user.
 * @param {object} accountData - Account data (currency, initial balance).
 * @returns {object} - New account object.
 * @throws {ApiError} If user not found or validation fails.
 */
const createAccount = async (userId, accountData) => {
  const validatedData = validateSchema(createAccountSchema, { ...accountData, userId });

  const userExists = await db('users').where({ id: userId }).first();
  if (!userExists) {
    throw new ApiError(404, ERROR_MESSAGES.USER_NOT_FOUND);
  }

  // Ensure unique account per user per currency (optional, but good practice)
  const existingAccount = await db('accounts').where({ user_id: userId, currency: validatedData.currency }).first();
  if (existingAccount) {
    throw new ApiError(409, `Account with currency ${validatedData.currency} already exists for this user.`);
  }

  try {
    const [newAccount] = await db('accounts').insert({
      id: generateUUID(), // Generate UUID for account ID
      user_id: userId,
      currency: validatedData.currency,
      balance: validatedData.balance,
    }).returning(['id', 'user_id', 'currency', 'balance', 'created_at']);

    logger.info(`Account created for user ${userId}: ${newAccount.id}`);
    await setCache(`${ACCOUNT_CACHE_PREFIX}${newAccount.id}`, newAccount);
    return newAccount;
  } catch (error) {
    logger.error(`Error creating account for user ${userId}:`, error);
    throw new ApiError(500, 'Failed to create account.');
  }
};

/**
 * Retrieves an account by its ID.
 * @param {string} accountId - The ID of the account.
 * @returns {object} - Account object.
 * @throws {ApiError} If account not found.
 */
const getAccountById = async (accountId) => {
  const cacheKey = `${ACCOUNT_CACHE_PREFIX}${accountId}`;
  let account = await getCache(cacheKey);

  if (account) {
    logger.debug(`Account ${accountId} fetched from cache.`);
    return account;
  }

  account = await db('accounts')
    .select('id', 'user_id', 'currency', 'balance', 'created_at', 'updated_at')
    .where({ id: accountId })
    .first();

  if (!account) {
    throw new ApiError(404, ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
  }

  await setCache(cacheKey, account);
  logger.info(`Account ${accountId} fetched from DB and cached.`);
  return account;
};

/**
 * Retrieves all accounts for a specific user.
 * @param {string} userId - The ID of the user.
 * @returns {Array<object>} - Array of account objects.
 */
const getAccountsByUserId = async (userId) => {
  const accounts = await db('accounts')
    .select('id', 'user_id', 'currency', 'balance', 'created_at', 'updated_at')
    .where({ user_id: userId });
  return accounts;
};

/**
 * Updates an account (e.g., currency, though direct balance update is discouraged).
 * This service method is primarily for administrative updates, not balance changes from transactions.
 * @param {string} accountId - The ID of the account to update.
 * @param {object} updateData - Data to update (e.g., currency).
 * @returns {object} - Updated account object.
 * @throws {ApiError} If account not found or validation fails.
 */
const updateAccount = async (accountId, updateData) => {
  // We'll use a specific schema if needed, but for now, rely on base validation
  // It's crucial that balance updates are NOT done directly via this route,
  // but through the transaction service.
  if (updateData.balance !== undefined) {
    throw new ApiError(400, 'Direct balance update is not allowed. Use transactions for balance changes.');
  }

  const existingAccount = await db('accounts').where({ id: accountId }).first();
  if (!existingAccount) {
    throw new ApiError(404, ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
  }

  try {
    const [updatedAccount] = await db('accounts')
      .where({ id: accountId })
      .update({ ...updateData, updated_at: db.fn.now() })
      .returning(['id', 'user_id', 'currency', 'balance', 'created_at', 'updated_at']);

    await deleteCache(`${ACCOUNT_CACHE_PREFIX}${accountId}`); // Invalidate cache
    logger.info(`Account ${accountId} updated and cache invalidated.`);
    return updatedAccount;
  } catch (error) {
    logger.error(`Error updating account ${accountId}:`, error);
    throw new ApiError(500, 'Failed to update account.');
  }
};

/**
 * Deletes an account.
 * @param {string} accountId - The ID of the account to delete.
 * @returns {string} - Success message.
 * @throws {ApiError} If account not found.
 */
const deleteAccount = async (accountId) => {
  const existingAccount = await db('accounts').where({ id: accountId }).first();
  if (!existingAccount) {
    throw new ApiError(404, ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
  }

  // In a real system, prevent deletion if account has positive balance or pending transactions.
  if (existingAccount.balance > 0) {
    throw new ApiError(400, 'Cannot delete an account with a positive balance. Please withdraw funds first.');
  }
  // Check for pending transactions linked to this account
  const pendingTransactions = await db('transactions')
    .where({ account_id: accountId, status: 'pending' })
    .first();
  if (pendingTransactions) {
    throw new ApiError(400, 'Cannot delete account with pending transactions.');
  }

  try {
    await db('accounts').where({ id: accountId }).del();
    await deleteCache(`${ACCOUNT_CACHE_PREFIX}${accountId}`); // Invalidate cache
    logger.info(`Account ${accountId} deleted. Cache invalidated.`);
    return 'Account deleted successfully.';
  } catch (error) {
    logger.error(`Error deleting account ${accountId}:`, error);
    throw new ApiError(500, 'Failed to delete account.');
  }
};

module.exports = {
  createAccount,
  getAccountById,
  getAccountsByUserId,
  updateAccount,
  deleteAccount,
};