import { AppDataSource } from '../../ormconfig';
import { Payment, PaymentStatus, PaymentMethod } from '../entities/Payment';
import { Transaction, TransactionType, TransactionStatus } from '../entities/Transaction';
import { Merchant } from '../entities/Merchant';
import { PaymentRepository } from '../repositories/PaymentRepository';
import { AppError } from '../middlewares/errorHandler';
import logger from '../utils/logger';
import { WebhookEvent, WebhookEventType, WebhookEventStatus } from '../entities/WebhookEvent';
import { Repository } from 'typeorm';

export class PaymentService {
  private paymentRepository: PaymentRepository;
  private transactionRepository: Repository<Transaction>;
  private merchantRepository: Repository<Merchant>;
  private webhookEventRepository: Repository<WebhookEvent>;

  constructor() {
    this.paymentRepository = new PaymentRepository();
    this.transactionRepository = AppDataSource.getRepository(Transaction);
    this.merchantRepository = AppDataSource.getRepository(Merchant);
    this.webhookEventRepository = AppDataSource.getRepository(WebhookEvent);
  }

  async initiatePayment(
    merchantId: string,
    amount: number,
    currency: string,
    method: PaymentMethod,
    customerEmail: string,
    metadata: object = {}
  ): Promise<Payment> {
    const merchant = await this.merchantRepository.findOne({ where: { id: merchantId } });
    if (!merchant) {
      throw new AppError('Merchant not found', 404);
    }
    if (amount <= 0) {
      throw new AppError('Payment amount must be positive', 400);
    }

    // In a real system, you'd generate a unique reference and perhaps call an external gateway
    const payment = await this.paymentRepository.create({
      merchant,
      amount,
      currency,
      method,
      customerEmail,
      status: PaymentStatus.INITIATED,
      metadata: { ...metadata, reference: `ALXPAY-${Date.now()}-${Math.random().toString(36).substring(2, 10)}` },
    });

    logger.info(`Payment initiated: ${payment.id} for merchant ${merchant.name}, amount ${amount} ${currency}`);
    return payment;
  }

  async processPayment(paymentId: string, transactionDetails: { externalId: string; status: PaymentStatus; message?: string }): Promise<Payment> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payment = await queryRunner.manager.findOne(Payment, { where: { id: paymentId }, relations: ['merchant'] });

      if (!payment) {
        throw new AppError('Payment not found', 404);
      }
      if (payment.status !== PaymentStatus.INITIATED && payment.status !== PaymentStatus.PENDING) {
        throw new AppError(`Payment already processed or in final state: ${payment.status}`, 400);
      }

      payment.externalId = transactionDetails.externalId;
      payment.status = transactionDetails.status;

      await queryRunner.manager.save(payment);

      // Create a transaction record
      const transaction = queryRunner.manager.create(Transaction, {
        payment: payment,
        amount: payment.amount,
        currency: payment.currency,
        type: TransactionType.CREDIT, // Credit to merchant (after deducting fees)
        status: transactionDetails.status === PaymentStatus.SUCCESS ? TransactionStatus.COMPLETED : TransactionStatus.FAILED,
        description: `Payment ${payment.id} via ${payment.method}. Gateway: ${transactionDetails.externalId}`,
      });
      await queryRunner.manager.save(transaction);

      // Update merchant balance if successful
      if (payment.status === PaymentStatus.SUCCESS) {
        const merchant = payment.merchant;
        merchant.balance += payment.amount; // Simplified: no fees deducted yet
        await queryRunner.manager.save(merchant);

        // Schedule webhook event
        await queryRunner.manager.create(WebhookEvent, {
          eventType: WebhookEventType.PAYMENT_SUCCESS,
          resourceId: payment.id,
          payload: {
            paymentId: payment.id,
            merchantId: merchant.id,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            customerEmail: payment.customerEmail,
            metadata: payment.metadata,
          },
          webhookUrl: 'http://localhost:3001/webhooks', // Example, should come from Merchant entity
          merchantId: merchant.id,
          status: WebhookEventStatus.PENDING,
        });
      } else if (payment.status === PaymentStatus.FAILED) {
        // Schedule webhook event for failure
        await queryRunner.manager.create(WebhookEvent, {
          eventType: WebhookEventType.PAYMENT_FAILED,
          resourceId: payment.id,
          payload: {
            paymentId: payment.id,
            merchantId: payment.merchant.id,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            customerEmail: payment.customerEmail,
            metadata: payment.metadata,
            errorMessage: transactionDetails.message,
          },
          webhookUrl: 'http://localhost:3001/webhooks', // Example, should come from Merchant entity
          merchantId: payment.merchant.id,
          status: WebhookEventStatus.PENDING,
        });
      }

      await queryRunner.commitTransaction();
      logger.info(`Payment processed: ${payment.id} with status ${payment.status}`);
      return payment;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error(`Error processing payment ${paymentId}:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getPaymentDetails(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new AppError('Payment not found', 404);
    }
    return payment;
  }

  async getMerchantPayments(merchantId: string): Promise<Payment[]> {
    return this.paymentRepository.findByMerchantId(merchantId);
  }

  async refundPayment(paymentId: string, refundAmount: number, userId: string): Promise<Payment> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payment = await queryRunner.manager.findOne(Payment, { where: { id: paymentId }, relations: ['merchant'] });

      if (!payment) {
        throw new AppError('Payment not found', 404);
      }
      if (payment.status !== PaymentStatus.SUCCESS) {
        throw new AppError('Only successful payments can be refunded', 400);
      }
      if (refundAmount <= 0 || refundAmount > payment.amount) {
        throw new AppError('Invalid refund amount', 400);
      }

      const merchant = payment.merchant;
      if (merchant.balance < refundAmount) {
        throw new AppError('Insufficient merchant balance for refund', 400);
      }

      // Perform refund (mock external call)
      // const refundResult = await this.externalGateway.initiateRefund(payment.externalId, refundAmount);
      // if (!refundResult.success) {
      //   throw new AppError('External refund failed', 500);
      // }

      // Update payment status
      payment.status = PaymentStatus.REFUNDED; // For full refund
      // For partial refunds, you'd likely create a new payment record or store partial refund amount
      await queryRunner.manager.save(payment);

      // Debit merchant balance
      merchant.balance -= refundAmount;
      await queryRunner.manager.save(merchant);

      // Create transaction record for refund
      const refundTransaction = queryRunner.manager.create(Transaction, {
        payment: payment,
        amount: refundAmount,
        currency: payment.currency,
        type: TransactionType.REFUND,
        status: TransactionStatus.COMPLETED,
        description: `Refund for payment ${payment.id} initiated by user ${userId}`,
        destinationAccount: null, // This would be the customer's account in a real system
      });
      await queryRunner.manager.save(refundTransaction);

      // Schedule webhook event
      await queryRunner.manager.create(WebhookEvent, {
        eventType: WebhookEventType.REFUND_SUCCESS,
        resourceId: payment.id,
        payload: {
          paymentId: payment.id,
          merchantId: merchant.id,
          refundAmount,
          currency: payment.currency,
          status: payment.status,
          customerEmail: payment.customerEmail,
          originalPaymentMetadata: payment.metadata,
        },
        webhookUrl: 'http://localhost:3001/webhooks', // Example
        merchantId: merchant.id,
        status: WebhookEventStatus.PENDING,
      });

      await queryRunner.commitTransaction();
      logger.info(`Refund processed for payment ${payment.id}, amount ${refundAmount}`);
      return payment;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error(`Error refunding payment ${paymentId}:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}