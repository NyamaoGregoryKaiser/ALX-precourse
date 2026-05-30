const AccountService = require('../services/accountService');
const logger = require('../utils/logger');
const Joi = require('joi');

const createAccountSchema = Joi.object({
  currency: Joi.string().valid('USD', 'EUR', 'NGN').default('NGN'),
  initialBalance: Joi.number().positive().min(0).default(0),
});

const updateAccountSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive', 'suspended'),
});

class AccountController {
  static async getUserAccounts(req, res, next) {
    try {
      const accounts = await AccountService.getUserAccounts(req.user.id);
      res.status(200).json({
        message: 'User accounts retrieved successfully',
        accounts,
      });
    } catch (error) {
      logger.error('Error getting user accounts:', error.message);
      next({ statusCode: 500, message: error.message });
    }
  }

  static async getAccountById(req, res, next) {
    try {
      const { id } = req.params;
      const account = await AccountService.getAccountById(id, req.user.id);

      if (!account) {
        return res.status(404).json({ message: 'Account not found or unauthorized.' });
      }

      res.status(200).json({
        message: 'Account retrieved successfully',
        account,
      });
    } catch (error) {
      logger.error(`Error getting account ${req.params.id}:`, error.message);
      next({ statusCode: 500, message: error.message });
    }
  }

  static async createAccount(req, res, next) {
    try {
      const { error } = createAccountSchema.validate(req.body);
      if (error) {
        return next({ statusCode: 400, message: error.details[0].message });
      }

      const newAccount = await AccountService.createAccount(req.user.id, req.body);
      res.status(201).json({
        message: 'Account created successfully',
        account: newAccount,
      });
    } catch (error) {
      logger.error('Error creating account:', error.message);
      next({ statusCode: 400, message: error.message });
    }
  }

  static async updateAccount(req, res, next) {
    try {
      const { id } = req.params;
      const { error } = updateAccountSchema.validate(req.body);
      if (error) {
        return next({ statusCode: 400, message: error.details[0].message });
      }

      const updatedAccount = await AccountService.updateAccount(id, req.user.id, req.body);
      res.status(200).json({
        message: 'Account updated successfully',
        account: updatedAccount,
      });
    } catch (error) {
      logger.error(`Error updating account ${req.params.id}:`, error.message);
      next({ statusCode: 400, message: error.message });
    }
  }
}

module.exports = AccountController;