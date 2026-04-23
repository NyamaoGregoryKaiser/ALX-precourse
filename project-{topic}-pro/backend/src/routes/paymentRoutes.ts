import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';
import { protect, authorize } from '../middlewares/authMiddleware';
import { UserRole } from '../entities/User';
import { cacheMiddleware, invalidateCache } from '../middlewares/cacheMiddleware';

const router = Router();
const paymentController = new PaymentController();

// Public endpoint for payment gateway callbacks (no auth needed for this specific action)
// In a real system, this would have strong security measures (e.g., HMAC signature verification)
router.post('/process-webhook', paymentController.processPaymentWebhook);

// Protected routes for merchants and admins
router.use(protect); // All routes below this require authentication

// Initiate a payment - could be called by a merchant's backend system
router.post(
  '/initiate',
  authorize(UserRole.MERCHANT, UserRole.ADMIN),
  paymentController.initiatePayment
);

// Get details of a single payment
router.get(
  '/:id',
  authorize(UserRole.MERCHANT, UserRole.ADMIN), // A merchant can see their own payments
  cacheMiddleware(60), // Cache for 60 seconds
  paymentController.getPayment
);

// Get all payments for a specific merchant
router.get(
  '/merchant/:merchantId',
  authorize(UserRole.MERCHANT, UserRole.ADMIN),
  cacheMiddleware(60), // Cache for 60 seconds
  paymentController.getMerchantPayments
);

// Refund a payment
router.post(
  '/:id/refund',
  authorize(UserRole.MERCHANT, UserRole.ADMIN),
  async (req, res, next) => {
    // Invalidate cache for the specific payment and potentially merchant payments
    await invalidateCache([`/api/payments/${req.params.id}`, `/api/payments/merchant/${req.body.merchantId}`]); // Assume merchantId is in body or fetched
    next();
  },
  paymentController.refundPayment
);


export default router;