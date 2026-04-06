```typescript
import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/apiError';
import { createPaymentSchema } from './payment.validation';
import { logger } from '../../utils/logger';

const paymentService = new PaymentService();

export const createPayment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { error, value } = createPaymentSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const { sourceAccountId, destinationAccountNumber, amount, description, idempotencyKey } = value;

  // Generate idempotency key if not provided by client
  const finalIdempotencyKey = idempotencyKey || `${req.user.id}-${Date.now()}`; // Basic unique ID

  const payment = await paymentService.initiateInternalPayment(
    req.user.id,
    sourceAccountId,
    destinationAccountNumber,
    amount,
    description || 'Internal transfer',
    finalIdempotencyKey
  );

  logger.info(`Payment ${payment.id} initiated by user ${req.user.id} from ${sourceAccountId} to ${destinationAccountNumber}`);
  res.status(201).json({
    message: 'Payment initiated successfully',
    payment,
  });
});

export const getUserPayments = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'User not authenticated');
  }
  const { limit, offset } = req.query;
  const payments = await paymentService.getUserPayments(
    req.user.id,
    parseInt(limit as string) || 20,
    parseInt(offset as string) || 0
  );
  res.status(200).json(payments);
});

export const getPaymentById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'User not authenticated');
  }
  const { id } = req.params;
  const payment = await paymentService.getPaymentById(id);

  // Ensure the user is the initiator or receiver (or an admin)
  const isInitiator = payment.sourceAccount?.userId === req.user.id;
  const isReceiver = payment.destinationAccount?.userId === req.user.id;

  if (!(isInitiator || isReceiver)) {
    throw new ApiError(403, 'Unauthorized to view this payment');
  }

  res.status(200).json(payment);
});
```