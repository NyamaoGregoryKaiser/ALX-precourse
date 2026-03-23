```typescript
import { Transaction } from '../database/entities/Transaction';
import { logger } from './logger.service';

interface PaymentResult {
    success: boolean;
    externalId?: string;
    errorMessage?: string;
    // Potentially more details like fees, payment method info etc.
}

/**
 * A mock service to simulate interaction with an external payment gateway.
 * In a real application, this would involve HTTP requests to a provider like Stripe, PayPal, etc.
 */
export class PaymentGatewayService {
    /**
     * Simulates processing a payment through an external gateway.
     * @param transaction The internal transaction object.
     * @returns A promise resolving to a PaymentResult indicating success or failure.
     */
    public async processPayment(transaction: Transaction): Promise<PaymentResult> {
        logger.info(`Mock Payment Gateway: Processing payment for Transaction ID: ${transaction.id}, Amount: ${transaction.amount} ${transaction.currency}`);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 200)); // 200ms to 1.2s delay

        // Simulate random success/failure
        const isSuccess = Math.random() > 0.1; // 90% success rate

        if (isSuccess) {
            const externalId = `ext_txn_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
            logger.info(`Mock Payment Gateway: Payment successful. External ID: ${externalId}`);
            return {
                success: true,
                externalId: externalId,
            };
        } else {
            const errors = [
                'Insufficient funds',
                'Payment method declined',
                'Fraud detected',
                'Gateway timeout',
                'Invalid card details'
            ];
            const errorMessage = errors[Math.floor(Math.random() * errors.length)];
            logger.warn(`Mock Payment Gateway: Payment failed - ${errorMessage}`);
            return {
                success: false,
                errorMessage: errorMessage,
            };
        }
    }

    /**
     * Simulates processing a refund through an external gateway.
     * @param transaction The internal transaction object to refund.
     * @returns A promise resolving to a PaymentResult indicating success or failure.
     */
    public async processRefund(transaction: Transaction): Promise<PaymentResult> {
        logger.info(`Mock Payment Gateway: Processing refund for Transaction ID: ${transaction.id}, External ID: ${transaction.externalTransactionId}`);

        if (!transaction.externalTransactionId) {
            return { success: false, errorMessage: 'No external transaction ID found for refund.' };
        }

        await new Promise(resolve => setTimeout(resolve, Math.random() * 800 + 100)); // Simulate delay

        const isSuccess = Math.random() > 0.05; // 95% success rate for refunds

        if (isSuccess) {
            logger.info(`Mock Payment Gateway: Refund successful for External ID: ${transaction.externalTransactionId}`);
            // In a real system, a refund might generate a new external_refund_id
            return { success: true };
        } else {
            const errorMessage = 'Refund processing failed by external gateway.';
            logger.warn(`Mock Payment Gateway: Refund failed for External ID: ${transaction.externalTransactionId} - ${errorMessage}`);
            return { success: false, errorMessage: errorMessage };
        }
    }

    // Other methods like voidPayment, capturePayment, getPaymentStatus, etc.
}
```