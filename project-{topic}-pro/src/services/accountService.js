const Account = require('../models/Account');
const User = require('../models/User');
const logger = require('../utils/logger');

class AccountService {
  /**
   * Fetches all accounts for a specific user.
   * @param {string} userId - ID of the user.
   * @returns {Promise<Account[]>}
   */
  static async getUserAccounts(userId) {
    try {
      return await Account.query().where({ userId });
    } catch (error) {
      logger.error(`Error fetching accounts for user ${userId}:`, error);
      throw new Error('Failed to retrieve user accounts.');
    }
  }

  /**
   * Fetches a single account by ID, ensuring it belongs to the user.
   * @param {string} accountId - ID of the account.
   * @param {string} userId - ID of the user.
   * @returns {Promise<Account|null>}
   */
  static async getAccountById(accountId, userId) {
    try {
      return await Account.query().findOne({ id: accountId, userId });
    } catch (error) {
      logger.error(`Error fetching account ${accountId} for user ${userId}:`, error);
      throw new Error('Failed to retrieve account.');
    }
  }

  /**
   * Creates a new account for a user.
   * @param {string} userId - ID of the user.
   * @param {object} accountData - Account details (e.g., currency, optional initialBalance).
   * @returns {Promise<Account>}
   */
  static async createAccount(userId, accountData) {
    try {
      const user = await User.query().findById(userId);
      if (!user) {
        throw new Error('User not found.');
      }

      const newAccount = await Account.query().insert({
        userId,
        accountNumber: `ACC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        balance: accountData.initialBalance || 0,
        currency: accountData.currency || 'NGN',
        status: 'active',
      });
      logger.info(`New account created for user ${userId}: ${newAccount.accountNumber}`);
      return newAccount;
    } catch (error) {
      logger.error(`Error creating account for user ${userId}:`, error);
      throw new Error(error.message || 'Failed to create account.');
    }
  }

  /**
   * Updates an existing account's status.
   * @param {string} accountId - ID of the account.
   * @param {string} userId - ID of the user (for authorization).
   * @param {object} updateData - Data to update (e.g., status).
   * @returns {Promise<Account|null>}
   */
  static async updateAccount(accountId, userId, updateData) {
    try {
      const account = await Account.query().findOne({ id: accountId, userId });
      if (!account) {
        throw new Error('Account not found or unauthorized.');
      }

      const updatedAccount = await Account.query().patchAndFetchById(accountId, updateData);
      logger.info(`Account ${accountId} updated by user ${userId}.`);
      return updatedAccount;
    } catch (error) {
      logger.error(`Error updating account ${accountId} for user ${userId}:`, error);
      throw new Error(error.message || 'Failed to update account.');
    }
  }
}

module.exports = AccountService;