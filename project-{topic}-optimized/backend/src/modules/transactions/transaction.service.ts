```typescript
import { AppError } from '../../utils/appError';
import { Transaction, TransactionStatus, TransactionType } from '../../database/entities/Transaction';
import { TransactionRepository } from './transaction.repository';
import { MerchantRepository } from '../merchants/merchant.repository';
import { PaymentGatewayService } from '../../services/paymentGateway.service';
import { logger } from '../../services/logger.service';
import { QueryRunner } from 'typeorm';
import { AppDataSource } from '../../database/data-source';

interface CreateTransactionPayload {
    initiatorUserId: string; // The user making the payment/initiating transaction
    merchantId: string;
    amount: number;
    currency?: string;
    type?: TransactionType;
    description?: string;
    metadata?: Record<string, any>;
}

interface GetTransactionsFilters {
    status?: TransactionStatus;
    type?: TransactionType;
    merchantId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}

export class TransactionService {
    private transactionRepository: TransactionRepository;
    private merchantRepository: MerchantRepository;
    private paymentGatewayService: PaymentGatewayService;

    constructor() {
        this.transactionRepository = new TransactionRepository();
        this.merchantRepository = new MerchantRepository();
        this.paymentGatewayService = new PaymentGatewayService();
    }

    public async createTransaction(payload: CreateTransactionPayload): Promise<Transaction> {
        const { initiatorUserId, merchantId, amount, currency, type, description, metadata } = payload;

        const merchant = await this.merchantRepository.findById(merchantId);
        if (!merchant) {
            throw new AppError('Merchant not found.', 404);
        }

        // Start a database transaction for atomicity
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Record the transaction as PENDING in our system
            const newTransaction = await this.transactionRepository.create(
                {
                    initiatorUserId,
                    merchant,
                    amount,
                    currency: currency || 'USD',
                    type: type || TransactionType.PAYMENT,
                    status: TransactionStatus.PENDING,
                    description,
                    metadata,
                },
                queryRunner
            );

            // 2. Simulate interaction with an external payment gateway
            logger.info(`Processing transaction ${newTransaction.id} with external gateway...`);
            const paymentResult = await this.paymentGatewayService.processPayment(newTransaction);

            if (paymentResult.success) {
                // 3. Update transaction status to COMPLETED
                await this.transactionRepository.update(
                    newTransaction.id,
                    {
                        status: TransactionStatus.COMPLETED,
                        externalTransactionId: paymentResult.externalId,
                        processedAt: new Date(),
                    },
                    queryRunner
                );
                logger.info(`Transaction ${newTransaction.id} completed successfully.`);
            } else {
                // 3. Update transaction status to FAILED
                await this.transactionRepository.update(
                    newTransaction.id,
                    {
                        status: TransactionStatus.FAILED,
                        failureReason: paymentResult.errorMessage,
                        processedAt: new Date(),
                    },
                    queryRunner
                );
                logger.warn(`Transaction ${newTransaction.id} failed: ${paymentResult.errorMessage}`);
                throw new AppError(`Payment failed: ${paymentResult.errorMessage}`, 400);
            }

            await queryRunner.commitTransaction();
            // Fetch the updated transaction to return
            return await this.transactionRepository.findById(newTransaction.id);

        } catch (error) {
            await queryRunner.rollbackTransaction();
            logger.error(`Error creating or processing transaction: ${error.message}`, error);
            if (error instanceof AppError) {
                throw error; // Re-throw custom errors
            }
            throw new AppError('Could not process transaction due to an internal error.', 500);
        } finally {
            await queryRunner.release();
        }
    }

    public async getTransactionById(id: string): Promise<Transaction | null> {
        return await this.transactionRepository.findById(id);
    }

    public async getTransactions(filters: GetTransactionsFilters): Promise<{ transactions: Transaction[], total: number }> {
        const { transactions, total } = await this.transactionRepository.findAndCount(filters);
        return { transactions, total };
    }

    public async updateTransactionStatus(transactionId: string, status: TransactionStatus, reason?: string): Promise<Transaction> {
        const transaction = await this.transactionRepository.findById(transactionId);
        if (!transaction) {
            throw new AppError('Transaction not found.', 404);
        }

        if (transaction.status === status) {
            return transaction; // No change needed
        }

        // Example: Logic for refunding a transaction
        if (status === TransactionStatus.REFUNDED) {
            if (transaction.status !== TransactionStatus.COMPLETED) {
                throw new AppError('Only completed transactions can be refunded.', 400);
            }
            // Simulate refund with external gateway
            logger.info(`Initiating refund for transaction ${transaction.id}...`);
            const refundResult = await this.paymentGatewayService.processRefund(transaction);
            if (!refundResult.success) {
                throw new AppError(`Refund failed: ${refundResult.errorMessage}`, 400);
            }
            logger.info(`Transaction ${transaction.id} refunded successfully.`);
        }

        const updatedTransaction = await this.transactionRepository.update(transactionId, {
            status: status,
            failureReason: status === TransactionStatus.FAILED ? reason : null,
            processedAt: status !== TransactionStatus.PENDING ? new Date() : undefined,
        });
        logger.info(`Transaction ${transactionId} status updated to ${status}.`);
        return updatedTransaction;
    }

    public async getMerchantTransactions(merchantId: string, filters: GetTransactionsFilters): Promise<{ transactions: Transaction[], total: number }> {
        const merchant = await this.merchantRepository.findById(merchantId);
        if (!merchant) {
            throw new AppError('Merchant not found.', 404);
        }
        return await this.transactionRepository.findAndCount({ ...filters, merchantId });
    }
}
```