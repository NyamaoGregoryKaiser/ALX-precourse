const { Transaction, Customer, PaymentMethod } = require('../../../db/models');
const { generateUniqueId } = require('../../../utils/helpers');
const webhookService = require('../../webhooks/services/webhookService');
const logger = require('../../../middleware/logger');

class TransactionService {
  async createTransaction(customerId, paymentMethodId, amount, currency, type, description) {
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const paymentMethod = await PaymentMethod.findOne({
      where: { id: paymentMethodId, customerId: customer.id, isActive: true },
    });
    if (!paymentMethod) {
      throw new Error('Payment method not found or inactive for this customer');
    }

    const transaction = await Transaction.create({
      id: generateUniqueId('txn'),
      customerId,
      paymentMethodId,
      amount,
      currency,
      type, // 'debit' or 'credit'
      status: 'pending', // initial status
      description,
      metadata: {},
    });

    // Simulate payment processing delay and status update
    setTimeout(async () => {
      try {
        const newStatus = Math.random() > 0.8 ? 'failed' : 'completed'; // Simulate success/failure
        const updatedTransaction = await transaction.update({
          status: newStatus,
          processedAt: new Date(),
        });
        logger.info(`Transaction ${transaction.id} status updated to ${newStatus}`);
        // Dispatch webhook event
        await webhookService.dispatchWebhookEvent(
          'transaction.status_updated',
          updatedTransaction.toJSON()
        );
      } catch (err) {
        logger.error(`Error updating transaction status for ${transaction.id}:`, err);
        await transaction.update({ status: 'failed', processedAt: new Date() });
      }
    }, Math.random() * 5000 + 1000); // 1-6 seconds delay

    return transaction;
  }

  async getAllTransactions({ customerId, status, type, limit, offset }) {
    const where = {};
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (type) where.type = type;

    return Transaction.findAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        { model: Customer, attributes: ['id', 'name', 'email'] },
        { model: PaymentMethod, attributes: ['id', 'type', 'details'] },
      ],
    });
  }

  async getTransactionById(id) {
    return Transaction.findByPk(id, {
      include: [
        { model: Customer, attributes: ['id', 'name', 'email'] },
        { model: PaymentMethod, attributes: ['id', 'type', 'details'] },
      ],
    });
  }

  async updateTransactionStatus(id, newStatus, remarks) {
    const transaction = await Transaction.findByPk(id);
    if (!transaction) return null;

    const validStatuses = ['pending', 'completed', 'failed', 'refunded', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid transaction status: ${newStatus}`);
    }

    // Only allow status updates if not already in a final state
    if (['completed', 'failed', 'refunded', 'cancelled'].includes(transaction.status)) {
      throw new Error(`Transaction is already in a final state (${transaction.status}) and cannot be updated.`);
    }

    const updatedTransaction = await transaction.update({
      status: newStatus,
      remarks: remarks || transaction.remarks,
      processedAt: new Date(),
    });

    // Dispatch webhook event
    await webhookService.dispatchWebhookEvent(
      'transaction.status_updated',
      updatedTransaction.toJSON()
    );

    return updatedTransaction;
  }

  async deleteTransaction(id) {
    const transaction = await Transaction.findByPk(id);
    if (!transaction) return false;

    await transaction.destroy();
    return true;
  }
}

module.exports = new TransactionService();