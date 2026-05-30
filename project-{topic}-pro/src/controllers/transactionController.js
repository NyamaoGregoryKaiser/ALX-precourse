const TransactionService = require('../services/transactionService');
const logger = require('../utils/logger');
const Joi = require('joi');

const initiateTransactionBodySchema = Joi.object({
  accountId: Joi.string().uuid().required(),
  amount: Joi.number().positive().min(0.01).required(),
  currency: Joi.string().valid('USD', 'EUR', 'NGN').required(),
  type: Joi.string().valid('credit', 'debit').required(),
  description: Joi.string().max(500).optional(),
  paymentMethodId: Joi.string().optional(), // For debit transactions requiring external gateway
});

const refundTransactionBodySchema = Joi.object({
  amount: Joi.number().positive().min(0.01).required(),
});

class TransactionController {
  static async getAccountTransactions(req, res, next) {
    try {
      const { accountId } = req.params;
      const transactions = await TransactionService.getAccountTransactions(accountId, req.user.id);
      res.status(200).json({
        message: 'Account transactions retrieved successfully',
        transactions,
      });
    } catch (error) {
      logger.error(`Error getting transactions for account ${req.params.accountId}:`, error.message);
      next({ statusCode: 500, message: error.message });
    }
  }

  static async getTransactionById(req, res, next) {
    try {
      const { id } = req.params;
      const transaction = await TransactionService.getTransactionById(id, req.user.id);

      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found or unauthorized.' });
      }

      res.status(200).json({
        message: 'Transaction retrieved successfully',
        transaction,
      });
    } catch (error) {
      logger.error(`Error getting transaction ${req.params.id}:`, error.message);
      next({ statusCode: 500, message: error.message });
    }
  }

  static async initiateTransaction(req, res, next) {
    try {
      const { error } = initiateTransactionBodySchema.validate(req.body);
      if (error) {
        return next({ statusCode: 400, message: error.details[0].message });
      }

      const newTransaction = await TransactionService.initiateTransaction(req.user.id, req.body);
      res.status(201).json({
        message: 'Transaction initiated successfully',
        transaction: newTransaction,
      });
    } catch (error) {
      logger.error('Error initiating transaction:', error.message);
      next({ statusCode: 400, message: error.message });
    }
  }

  static async refundTransaction(req, res, next) {
    try {
      const { id } = req.params; // ID of the original transaction
      const { error } = refundTransactionBodySchema.validate(req.body);
      if (error) {
        return next({ statusCode: 400, message: error.details[0].message });
      }
      const { amount } = req.body;

      const refundTransaction = await TransactionService.refundTransaction(id, req.user.id, amount);
      res.status(201).json({
        message: 'Refund processed successfully',
        refundTransaction,
      });
    } catch (error) {
      logger.error(`Error processing refund for transaction ${req.params.id}:`, error.message);
      next({ statusCode: 400, message: error.message });
    }
  }

  static async handleWebhook(req, res, next) {
    // In a real system, you'd verify the webhook signature
    // to ensure it's from the legitimate payment gateway.
    logger.info('Webhook received:', req.body);
    try {
      await TransactionService.handleWebhook(req.body);
      res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
      logger.error('Error processing webhook:', error.message);
      // Return 200 even on processing error, so gateway doesn't retry
      // but log the error for investigation.
      res.status(200).json({ message: 'Webhook received, but internal processing failed.', error: error.message });
    }
  }
}

module.exports = TransactionController;