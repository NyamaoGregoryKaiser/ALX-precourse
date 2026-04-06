```typescript
import { prisma } from '../../utils/prisma';
import { ApiError } from '../../utils/apiError';
import { TransactionService } from '../transactions/transaction.service';
import { PaymentStatus } from '@prisma/client';

export class PaymentService {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

  /**
   * Initiates an internal payment (transfer) between two accounts.
   * This orchestrates the transaction service and records the payment intent.
   * @param sourceAccountId The ID of the sender's account.
   * @param destinationAccountNumber The account number of the recipient's account.
   * @param amount The amount to transfer.
   * @param description A description for the payment.
   * @param idempotencyKey An optional key to prevent duplicate payment attempts.
   * @returns The created payment record and associated transaction.
   */
  async initiateInternalPayment(
    userId: string, // User initiating the payment for authorization checks
    sourceAccountId: string,
    destinationAccountNumber: string,
    amount: number,
    description: string,
    idempotencyKey?: string
  ) {
    // 1. Validate and authorize source account
    const sourceAccount = await prisma.account.findUnique({
      where: { id: sourceAccountId },
    });

    if (!sourceAccount) {
      throw new ApiError(404, 'Source account not found.');
    }
    if (sourceAccount.userId !== userId) {
      throw new ApiError(403, 'Unauthorized: Source account does not belong to the authenticated user.');
    }

    // 2. Find destination account by account number
    const destinationAccount = await prisma.account.findUnique({
      where: { accountNumber: destinationAccountNumber },
    });

    if (!destinationAccount) {
      throw new ApiError(404, 'Destination account not found with the provided account number.');
    }

    if (sourceAccount.id === destinationAccount.id) {
      throw new ApiError(400, 'Cannot make a payment to the same account.');
    }
    if (sourceAccount.currency !== destinationAccount.currency) {
      // In a real system, currency conversion would be handled here
      throw new ApiError(400, `Currency mismatch: Source (${sourceAccount.currency}) and Destination (${destinationAccount.currency}) must be the same.`);
    }

    // Check for idempotency on Payment level (if idempotentKey is provided)
    if (idempotencyKey) {
      const existingPayment = await prisma.payment.findFirst({
        where: { idempotencyKey, status: PaymentStatus.COMPLETED },
      });
      if (existingPayment) {
        throw new ApiError(409, 'Duplicate request: Payment with this idempotency key already processed.', { paymentId: existingPayment.id });
      }
    }

    let paymentStatus: PaymentStatus = PaymentStatus.PENDING;
    let transactionId: string | null = null;
    let transactionError: string | null = null;

    try {
      // 3. Process the transfer using the transaction service
      const transaction = await this.transactionService.processTransfer(
        sourceAccountId,
        destinationAccount.id,
        amount,
        description,
        idempotencyKey // Pass idempotency key to transaction service to ensure atomicity
      );

      transactionId = transaction.id;
      paymentStatus = PaymentStatus.COMPLETED;
    } catch (error: any) {
      paymentStatus = PaymentStatus.FAILED;
      transactionError = error.message || 'Transaction failed';
      throw error; // Re-throw the error after logging/status update
    } finally {
      // 4. Record the payment intent and outcome
      const payment = await prisma.payment.create({
        data: {
          sourceAccountId,
          destinationAccountId: destinationAccount.id,
          amount,
          currency: sourceAccount.currency,
          description,
          status: paymentStatus,
          idempotencyKey,
          transactionId, // Link to the actual transaction
          // externalPaymentId: null // For external payment gateways
        },
      });

      if (paymentStatus === PaymentStatus.FAILED) {
        throw new ApiError(500, `Payment processing failed: ${transactionError}`, { paymentId: payment.id });
      }

      return payment;
    }
  }

  /**
   * Retrieves payments initiated by a specific user.
   * @param userId The ID of the user.
   * @param limit Maximum number of payments to return.
   * @param offset Number of payments to skip.
   * @returns An array of payment objects.
   */
  async getUserPayments(userId: string, limit: number = 20, offset: number = 0) {
    const payments = await prisma.payment.findMany({
      where: {
        sourceAccount: { userId: userId }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        sourceAccount: { select: { id: true, accountNumber: true, currency: true } },
        destinationAccount: { select: { id: true, accountNumber: true, currency: true } },
        transaction: { select: { id: true, status: true, type: true } }
      }
    });
    return payments;
  }

  /**
   * Retrieves a single payment by its ID.
   * @param paymentId The ID of the payment.
   * @returns The payment object.
   */
  async getPaymentById(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        sourceAccount: { select: { id: true, accountNumber: true, currency: true, userId: true } },
        destinationAccount: { select: { id: true, accountNumber: true, currency: true, userId: true } },
        transaction: { select: { id: true, status: true, type: true } }
      }
    });
    if (!payment) {
      throw new ApiError(404, 'Payment not found');
    }
    return payment;
  }
}
```