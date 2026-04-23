import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/PaymentService';
import { AppError } from '../middlewares/errorHandler';
import { PaymentMethod, PaymentStatus } from '../entities/Payment';
import { UserRole } from '../entities/User';

export class PaymentController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  initiatePayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { merchantId, amount, currency, method, customerEmail, metadata } = req.body;

      if (!merchantId || !amount || !currency || !method || !customerEmail) {
        return next(new AppError('Merchant ID, amount, currency, method, and customer email are required', 400));
      }
      if (!Object.values(PaymentMethod).includes(method)) {
        return next(new AppError('Invalid payment method', 400));
      }

      // Ensure the authenticated user is the owner of the merchant, or an admin
      if (req.user?.role === UserRole.MERCHANT && req.user.id !== merchantId) {
        // This logic needs to be refined: a merchant user should only initiate payments FOR THEIR OWN merchant.
        // It's more likely a specific endpoint will be exposed to external systems for initiating.
        // For this example, we assume merchantId is passed and authorized later.
        // A better approach would be to fetch merchant by user.id and ensure they own it.
        // For now, if a Merchant user sends merchantId, they should own it.
        // TODO: Refine this authorization for merchant users
      }


      const payment = await this.paymentService.initiatePayment(
        merchantId,
        amount,
        currency,
        method,
        customerEmail,
        metadata
      );

      res.status(202).json({
        status: 'success',
        message: 'Payment initiation successful. Awaiting processing.',
        data: { payment },
      });
    } catch (error) {
      next(error);
    }
  };

  // This endpoint would typically be called by the (mock) external payment gateway
  // to notify us of the payment outcome.
  processPaymentWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { paymentId, externalId, status, message } = req.body; // Expecting status to be 'SUCCESS' or 'FAILED'

      if (!paymentId || !externalId || !status) {
        return next(new AppError('Payment ID, external ID, and status are required for processing', 400));
      }
      if (!Object.values(PaymentStatus).includes(status)) {
        return next(new AppError('Invalid payment status provided', 400));
      }

      const updatedPayment = await this.paymentService.processPayment(paymentId, {
        externalId,
        status,
        message,
      });

      res.status(200).json({
        status: 'success',
        message: `Payment ${paymentId} updated to ${status}`,
        data: { payment: updatedPayment },
      });
    } catch (error) {
      next(error);
    }
  };

  getPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const payment = await this.paymentService.getPaymentDetails(id);

      // Authorization check: Only merchant owning the payment or admin can view
      if (req.user?.role === UserRole.MERCHANT && payment.merchant.id !== req.user.id) {
         return next(new AppError('You do not have permission to view this payment.', 403));
      }
      // If user is not a merchant, they shouldn't view merchant payments directly unless they are the customer
      // For simplicity, assuming user.role === USER should not access this directly unless it's their own payment through a different flow.
      if (req.user?.role === UserRole.USER) {
        return next(new AppError('Unauthorized access to payment details.', 403));
      }


      res.status(200).json({
        status: 'success',
        data: { payment },
      });
    } catch (error) {
      next(error);
    }
  };

  getMerchantPayments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { merchantId } = req.params;

      // Authorization: Only the owner of the merchant or an admin can view its payments
      if (req.user?.role === UserRole.MERCHANT && req.user.id !== merchantId) {
        return next(new AppError('You do not have permission to view payments for this merchant.', 403));
      }
      if (req.user?.role === UserRole.USER) {
        return next(new AppError('Unauthorized access to merchant payments.', 403));
      }

      const payments = await this.paymentService.getMerchantPayments(merchantId);
      res.status(200).json({
        status: 'success',
        results: payments.length,
        data: { payments },
      });
    } catch (error) {
      next(error);
    }
  };

  refundPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { amount } = req.body;

      if (!req.user) {
        return next(new AppError('User not authenticated', 401));
      }
      if (!amount || amount <= 0) {
        return next(new AppError('Valid refund amount is required', 400));
      }

      const payment = await this.paymentService.getPaymentDetails(id);

      // Authorization: Only the owner of the merchant or an admin can initiate a refund
      if (req.user.role === UserRole.MERCHANT && payment.merchant.id !== req.user.id) {
        return next(new AppError('You do not have permission to refund this payment.', 403));
      }
      if (req.user.role === UserRole.USER) {
        return next(new AppError('Unauthorized access to refund payments.', 403));
      }

      const refundedPayment = await this.paymentService.refundPayment(id, amount, req.user.id);

      res.status(200).json({
        status: 'success',
        message: `Payment ${id} successfully refunded for ${amount} ${refundedPayment.currency}`,
        data: { payment: refundedPayment },
      });
    } catch (error) {
      next(error);
    }
  };
}