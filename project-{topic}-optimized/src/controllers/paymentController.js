const paymentService = require('../services/paymentService');
const accountService = require('../services/accountService');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { USER_ROLES } = require('../utils/constants');

/**
 * Initiates a new payment.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const initiatePayment = async (req, res, next) => {
  try {
    const { sourceAccountId, destinationAccountId } = req.body;
    const { id: userId, role: userRole } = req.user;

    // Authorization: User must own the source account
    const sourceAccount = await accountService.getAccountById(sourceAccountId);
    if (userRole !== USER_ROLES.ADMIN && sourceAccount.user_id !== userId) {
      return next(new ApiError(403, 'Forbidden: You do not have access to debit from the source account.'));
    }

    // Optionally check if destination account belongs to the user or is public/partner
    // For this example, we'll allow payments to any valid destination account after existence check.
    // If destination account is internal, ensure it exists. `paymentService` already does this.

    const paymentResult = await paymentService.initiatePayment(req.body);
    res.status(201).json({
      message: 'Payment initiated successfully',
      payment: paymentResult,
    });
  } catch (error) {
    logger.error('Error in paymentController.initiatePayment:', error);
    next(error);
  }
};

/**
 * Captures a payment (if it was initiated as pending).
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const capturePayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    // Authorization: Typically, a capture webhook or admin action.
    // For simplicity, requiring admin role here.
    if (req.user.role !== USER_ROLES.ADMIN) {
      return next(new ApiError(403, 'Forbidden: Only administrators can capture payments.'));
    }

    const captureResult = await paymentService.capturePayment(paymentId);
    res.status(200).json({
      message: 'Payment captured successfully',
      payment: captureResult,
    });
  } catch (error) {
    logger.error(`Error in paymentController.capturePayment for ID ${req.params.paymentId}:`, error);
    next(error);
  }
};

/**
 * Refunds a payment.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const refundPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { id: userId, role: userRole } = req.user;

    // Authorization: User must own the account that made the original payment, or be an admin.
    const paymentDetails = await paymentService.getPaymentDetails(paymentId);
    const sourceAccount = await accountService.getAccountById(paymentDetails.sourceAccountId);

    if (userRole !== USER_ROLES.ADMIN && sourceAccount.user_id !== userId) {
      return next(new ApiError(403, 'Forbidden: You do not have permission to refund this payment.'));
    }

    const refundResult = await paymentService.refundPayment(paymentId, req.body);
    res.status(200).json({
      message: 'Payment refunded successfully',
      refundTransaction: refundResult,
    });
  } catch (error) {
    logger.error(`Error in paymentController.refundPayment for ID ${req.params.paymentId}:`, error);
    next(error);
  }
};

/**
 * Retrieves details of a specific payment.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const getPaymentDetails = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { id: userId, role: userRole } = req.user;

    const payment = await paymentService.getPaymentDetails(paymentId);

    // Authorization: User must be related to the source account or be an admin
    const sourceAccount = await accountService.getAccountById(payment.sourceAccountId);
    if (userRole !== USER_ROLES.ADMIN && sourceAccount.user_id !== userId) {
      return next(new ApiError(403, 'Forbidden: You do not have access to view details for this payment.'));
    }

    res.status(200).json({ payment });
  } catch (error) {
    logger.error(`Error in paymentController.getPaymentDetails for ID ${req.params.paymentId}:`, error);
    next(error);
  }
};

module.exports = {
  initiatePayment,
  capturePayment,
  refundPayment,
  getPaymentDetails,
};