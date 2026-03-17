const express = require('express');
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();

// Routes for payments
router.post('/initiate', authenticate, paymentController.initiatePayment);
router.post('/:paymentId/capture', authenticate, authorize(USER_ROLES.ADMIN), paymentController.capturePayment); // Typically admin or webhook
router.post('/:paymentId/refund', authenticate, paymentController.refundPayment);
router.get('/:paymentId', authenticate, paymentController.getPaymentDetails);

module.exports = router;