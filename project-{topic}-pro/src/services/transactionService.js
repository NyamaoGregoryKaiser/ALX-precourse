const { knex } = require('../utils/db'); // For transaction management
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const PaymentGatewayService = require('./paymentGatewayService');
const logger = require('../utils/logger');
const { clearCache } = require('../middleware/caching');

// Define Joi schemas for validation
const Joi = require('joi');

const initiateTransactionSchema = Joi.object({
  accountId: Joi.string().uuid().required(),
  amount: Joi.number().positive().min(0.01).required(),
  currency: Joi.string().valid('USD', 'EUR', 'NGN').required(),
  type: Joi.string().valid('credit', 'debit').required(),
  description: Joi.string().max(500).optional(),
  // For external payment initiation (e.g., card token, payment method ID)
  paymentMethodId: Joi.string().optional(),
});

class TransactionService {
  /**
   * Fetches all transactions for a specific account.
   * @param {string} accountId - ID of the account.
   * @param {string} userId - ID of the user (for authorization).
   * @returns {Promise<Transaction[]>}
   */
  static async getAccountTransactions(accountId, userId) {
    try {
      const account = await Account.query().findOne({ id: accountId, userId });
      if (!account) {
        throw new Error('Account not found or unauthorized.');
      }
      return await Transaction.query().where({ accountId }).orderBy('createdAt', 'desc');
    } catch (error) {
      logger.error(`Error fetching transactions for account ${accountId}:`, error);
      throw new Error('Failed to retrieve transactions.');
    }
  }

  /**
   * Fetches a single transaction by ID.
   * @param {string} transactionId - ID of the transaction.
   * @param {string} userId - ID of the user (for authorization).
   * @returns {Promise<Transaction|null>}
   */
  static async getTransactionById(transactionId, userId) {
    try {
      const transaction = await Transaction.query().findById(transactionId).withGraphFetched('account');
      if (!transaction || transaction.userId !== userId) {
        throw new Error('Transaction not found or unauthorized.');
      }
      return transaction;
    } catch (error) {
      logger.error(`Error fetching transaction ${transactionId}:`, error);
      throw new Error('Failed to retrieve transaction.');
    }
  }

  /**
   * Initiates a new transaction (debit or credit).
   * Handles internal balance updates and potentially external payment gateway calls.
   *
   * @param {string} userId - ID of the user initiating the transaction.
   * @param {object} transactionData - Transaction details.
   *   `accountId`, `amount`, `currency`, `type`, `description`, `paymentMethodId` (for debit external)
   * @returns {Promise<Transaction>} - The created transaction object.
   */
  static async initiateTransaction(userId, transactionData) {
    const { error } = initiateTransactionSchema.validate(transactionData);
    if (error) {
      throw new Error(`Validation Error: ${error.details[0].message}`);
    }

    const { accountId, amount, currency, type, description, paymentMethodId } = transactionData;

    return await knex.transaction(async trx => {
      // 1. Fetch and lock the account for update
      const account = await Account.query(trx)
        .where({ id: accountId, userId })
        .forUpdate() // Pessimistic lock
        .first();

      if (!account) {
        throw new Error('Account not found or unauthorized.');
      }
      if (account.status !== 'active') {
        throw new Error(`Account ${account.accountNumber} is not active.`);
      }
      if (account.currency !== currency) {
        throw new Error('Transaction currency does not match account currency.');
      }

      let newBalance = account.balance;
      let transactionStatus = 'pending';
      let externalReference = null;

      // 2. Handle different transaction types
      if (type === 'debit') {
        if (newBalance < amount) {
          throw new Error('Insufficient funds.');
        }

        // If an external payment method is provided, attempt external charge
        if (paymentMethodId) {
          logger.info(`Attempting external debit for user ${userId}, amount ${amount}`);
          try {
            // In a real system, 'paymentMethodId' would be a token from frontend
            // or a saved payment method ID, not raw card details.
            // Using the static mockCharge for simplicity
            const gatewayResponse = await PaymentGatewayService.mockCharge({
              amount,
              currency,
              customerEmail: (await account.$relatedQuery('user', trx)).email,
              description: description || 'Payment for service',
              paymentMethodId, // This would typically be a token
            });

            externalReference = gatewayResponse.gatewayTransactionId;

            if (gatewayResponse.status === 'success') {
              newBalance -= amount;
              transactionStatus = 'completed';
              logger.info(`External debit completed for account ${accountId}. New balance: ${newBalance}`);
            } else {
              transactionStatus = 'failed';
              logger.warn(`External debit failed for account ${accountId}. Gateway message: ${gatewayResponse.message}`);
              throw new Error(`Payment gateway failed: ${gatewayResponse.message}`);
            }
          } catch (gatewayError) {
            transactionStatus = 'failed';
            logger.error(`Failed to process external debit for account ${accountId}:`, gatewayError.message);
            throw new Error(`External payment failed: ${gatewayError.message}`);
          }
        } else {
          // Internal debit (e.g., transfer to another internal account, or for fees)
          newBalance -= amount;
          transactionStatus = 'completed';
          logger.info(`Internal debit completed for account ${accountId}. New balance: ${newBalance}`);
        }
      } else if (type === 'credit') {
        // For credit, if it's coming from an external source (e.g., top-up)
        // you would typically first verify the external payment.
        // For simplicity, we assume an internal credit or already verified external credit.
        newBalance += amount;
        transactionStatus = 'completed';
        logger.info(`Credit completed for account ${accountId}. New balance: ${newBalance}`);
      } else {
        throw new Error('Invalid transaction type.');
      }

      // 3. Update account balance
      await account.$query(trx).patch({ balance: newBalance });

      // 4. Create transaction record
      const newTransaction = await Transaction.query(trx).insert({
        userId,
        accountId,
        amount,
        currency,
        type,
        status: transactionStatus,
        description,
        externalReference,
      });

      // Clear cache for accounts and transactions related to this user/account
      await clearCache(`/api/accounts/${accountId}/transactions`);
      await clearCache(`/api/users/${userId}/accounts`);

      logger.info(`Transaction ${newTransaction.id} processed for account ${accountId}. Status: ${transactionStatus}`);
      return newTransaction;
    }); // End of transaction
  }

  /**
   * Refunds a transaction. Requires the original transaction to be completed and debit.
   * @param {string} transactionId - The ID of the original transaction to refund.
   * @param {string} userId - ID of the user (for authorization).
   * @param {number} refundAmount - The amount to refund.
   * @returns {Promise<Transaction>} - The new refund transaction record.
   */
  static async refundTransaction(transactionId, userId, refundAmount) {
    if (refundAmount <= 0) {
      throw new Error('Refund amount must be positive.');
    }

    return await knex.transaction(async trx => {
      const originalTransaction = await Transaction.query(trx)
        .where({ id: transactionId, userId })
        .forUpdate()
        .first();

      if (!originalTransaction) {
        throw new Error('Original transaction not found or unauthorized.');
      }
      if (originalTransaction.status !== 'completed' || originalTransaction.type !== 'debit') {
        throw new Error('Only completed debit transactions can be refunded.');
      }
      if (refundAmount > originalTransaction.amount) {
        throw new Error('Refund amount exceeds original transaction amount.');
      }

      const account = await Account.query(trx)
        .findById(originalTransaction.accountId)
        .forUpdate();

      if (!account || account.userId !== userId) {
        throw new Error('Account associated with transaction not found or unauthorized.');
      }

      let refundStatus = 'pending';
      let externalRefundRef = null;

      // Attempt external refund if original transaction had an external reference
      if (originalTransaction.externalReference) {
        logger.info(`Attempting external refund for transaction ${originalTransaction.id} via gateway.`);
        try {
          const gatewayResponse = await PaymentGatewayService.mockRefund(originalTransaction.externalReference, refundAmount);
          externalRefundRef = gatewayResponse.refundId;
          if (gatewayResponse.status === 'success') {
            refundStatus = 'completed';
            logger.info(`External refund completed for transaction ${originalTransaction.id}.`);
          } else {
            refundStatus = 'failed';
            logger.warn(`External refund failed for transaction ${originalTransaction.id}. Gateway message: ${gatewayResponse.message}`);
            throw new Error(`Payment gateway refund failed: ${gatewayResponse.message}`);
          }
        } catch (gatewayError) {
          refundStatus = 'failed';
          logger.error(`Failed to process external refund for transaction ${originalTransaction.id}:`, gatewayError.message);
          throw new Error(`External refund failed: ${gatewayError.message}`);
        }
      } else {
        // Internal refund
        refundStatus = 'completed';
        logger.info(`Internal refund completed for transaction ${originalTransaction.id}.`);
      }

      if (refundStatus === 'completed') {
        // Credit the account balance
        const newBalance = account.balance + refundAmount;
        await account.$query(trx).patch({ balance: newBalance });

        // Mark original transaction as refunded (or partially refunded)
        await originalTransaction.$query(trx).patch({
          status: refundAmount === originalTransaction.amount ? 'refunded' : 'partially_refunded',
          // You might add a `refundedAmount` field to the original transaction
        });

        // Create a new transaction record for the refund
        const refundTransaction = await Transaction.query(trx).insert({
          userId: originalTransaction.userId,
          accountId: originalTransaction.accountId,
          amount: refundAmount,
          currency: originalTransaction.currency,
          type: 'credit', // A refund is a credit to the user's account
          status: 'completed',
          description: `Refund for transaction ${originalTransaction.reference}`,
          metadata: { originalTransactionId: originalTransaction.id, externalRefundRef },
        });

        // Clear cache
        await clearCache(`/api/accounts/${account.id}/transactions`);
        await clearCache(`/api/users/${userId}/accounts`);

        logger.info(`Refund transaction ${refundTransaction.id} created.`);
        return refundTransaction;
      } else {
        // If refund failed, still create a record, but with failed status
        const failedRefundTransaction = await Transaction.query(trx).insert({
          userId: originalTransaction.userId,
          accountId: originalTransaction.accountId,
          amount: refundAmount,
          currency: originalTransaction.currency,
          type: 'credit', // Attempted credit
          status: 'failed',
          description: `Refund attempt for transaction ${originalTransaction.reference} failed.`,
          metadata: { originalTransactionId: originalTransaction.id, externalRefundRef },
        });
        throw new Error('Refund could not be completed.');
      }
    });
  }

  /**
   * Handles webhook notifications from payment gateways to update transaction status.
   * This is critical for asynchronously confirming external payments.
   *
   * @param {object} webhookPayload - The payload received from the payment gateway.
   * @returns {Promise<Transaction|null>} - The updated transaction.
   */
  static async handleWebhook(webhookPayload) {
    const { event, data } = webhookPayload; // Assuming a structure
    logger.info('Received webhook event:', event, 'data:', data);

    // Example for a 'payment_successful' event
    if (event === 'payment_successful' && data?.externalReference) {
      return await knex.transaction(async trx => {
        // Find the transaction by its external reference (from our initial call)
        const transaction = await Transaction.query(trx)
          .where({ externalReference: data.externalReference, status: 'pending' })
          .forUpdate()
          .first();

        if (!transaction) {
          logger.warn(`Webhook: Pending transaction with external reference ${data.externalReference} not found.`);
          return null; // Or handle as duplicate/already processed
        }

        // Verify with payment gateway (optional, but good for security and robustness)
        // const gatewayVerification = await PaymentGatewayService.verifyTransaction(data.externalReference);
        // if (gatewayVerification.status !== 'success') {
        //   logger.warn(`Webhook: Gateway verification for ${data.externalReference} failed.`);
        //   throw new Error('Gateway verification failed.');
        // }

        // Update transaction status
        const updatedTransaction = await transaction.$query(trx).patchAndFetch({
          status: 'completed',
          updatedAt: new Date().toISOString(),
          metadata: { ...transaction.metadata, webhookData: data },
        });

        // Update account balance if it was a pending debit that just completed
        const account = await Account.query(trx).findById(updatedTransaction.accountId).forUpdate();
        if (updatedTransaction.type === 'debit' && account) {
          // This path might be for transactions where the balance wasn't immediately deducted
          // e.g., for async authorizations. For simple flow, balance already updated.
          // This part needs careful logic based on *when* balance is adjusted.
          // If balance was already adjusted during `initiateTransaction`, then no change here.
          // If balance was put on 'hold' or 'pending deduction', then this confirms deduction.
          logger.warn(`Webhook: Balance adjustment for completed pending debit transaction ${updatedTransaction.id} needs review.`);
          // Example: if balance was only 'held', now finalize deduction.
          // Or if it was a credit, then add to balance here.
        } else if (updatedTransaction.type === 'credit' && account && updatedTransaction.amount > 0) {
            // For credit operations, this is where the balance adjustment most often occurs
            // after external confirmation.
            const newBalance = account.balance + updatedTransaction.amount;
            await account.$query(trx).patch({ balance: newBalance });
            logger.info(`Webhook: Account ${account.id} credited with ${updatedTransaction.amount}. New balance: ${newBalance}`);
        }


        // Clear cache
        await clearCache(`/api/accounts/${account.id}/transactions`);
        await clearCache(`/api/users/${account.userId}/accounts`);

        logger.info(`Webhook: Transaction ${updatedTransaction.id} status updated to completed.`);
        return updatedTransaction;
      });
    }
    // Handle other events like 'payment_failed', 'refund_successful', etc.
    logger.warn(`Webhook: Unhandled event type or missing data: ${event}`);
    return null;
  }
}

module.exports = TransactionService;