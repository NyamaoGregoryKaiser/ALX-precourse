```javascript
const config = require('../config');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const axios = require('axios'); // For making HTTP requests to external gateway

// This is a MOCK service simulating interaction with an external payment gateway.
// In a real system, you'd integrate with Stripe, PayPal, Square, etc.
// This mock assumes a simple API for processing payments.

const MOCK_GATEWAY_URL = config.mockGateway.url;
const MOCK_GATEWAY_API_KEY = config.mockGateway.apiKey;

const processPayment = async ({
  amount,
  currency,
  cardNumber,
  expiryMonth,
  expiryYear,
  cvv,
  cardHolderName,
  transactionRef, // Our internal transaction ID
}) => {
  logger.info(`[MockGateway] Processing payment for ref: ${transactionRef}, amount: ${amount} ${currency}`);

  try {
    // Simulate API call to an external payment gateway
    // In a real integration, you'd use the gateway's SDK or direct API.
    const response = await axios.post(`${MOCK_GATEWAY_URL}/charge`, {
      apiKey: MOCK_GATEWAY_API_KEY,
      amount,
      currency,
      card: {
        number: cardNumber,
        exp_month: expiryMonth,
        exp_year: expiryYear,
        cvc: cvv,
        name: cardHolderName,
      },
      merchant_transaction_ref: transactionRef,
      // ... other required fields by the real gateway
    });

    const gatewayResponse = response.data;
    logger.info(`[MockGateway] Response for ${transactionRef}:`, gatewayResponse);

    if (gatewayResponse.status === 'success') {
      return {
        status: 'approved',
        gatewayTransactionId: gatewayResponse.gatewayTransactionId,
        message: gatewayResponse.message || 'Payment approved by gateway.',
        metadata: gatewayResponse, // Store full gateway response for auditing
      };
    } else {
      throw new AppError(
        gatewayResponse.message || 'Payment declined by gateway.',
        400,
        gatewayResponse.code || 'GATEWAY_DECLINED'
      );
    }
  } catch (error) {
    logger.error(`[MockGateway] Error processing payment for ref ${transactionRef}:`, error.message);
    if (error.response && error.response.data) {
      // Error from mock gateway API
      const gatewayError = error.response.data;
      throw new AppError(
        gatewayError.message || `Gateway error: ${error.message}`,
        error.response.status || 500,
        gatewayError.code || 'GATEWAY_ERROR'
      );
    }
    // Network error or other unexpected error
    throw new AppError(`Failed to connect to payment gateway: ${error.message}`, 500, 'GATEWAY_CONNECTION_ERROR');
  }
};

const refundPayment = async ({
  gatewayTransactionId,
  amount,
  currency,
  reason,
  refundRef, // Our internal refund ID
}) => {
  logger.info(`[MockGateway] Processing refund for gateway ID: ${gatewayTransactionId}, amount: ${amount} ${currency}`);

  try {
    const response = await axios.post(`${MOCK_GATEWAY_URL}/refund`, {
      apiKey: MOCK_GATEWAY_API_KEY,
      gatewayTransactionId,
      amount,
      currency,
      reason,
      merchant_refund_ref: refundRef,
      // ... other required fields
    });

    const gatewayResponse = response.data;
    logger.info(`[MockGateway] Refund Response for ${gatewayTransactionId}:`, gatewayResponse);

    if (gatewayResponse.status === 'success') {
      return {
        status: 'refunded',
        gatewayRefundId: gatewayResponse.gatewayRefundId,
        message: gatewayResponse.message || 'Refund processed by gateway.',
        metadata: gatewayResponse,
      };
    } else {
      throw new AppError(
        gatewayResponse.message || 'Refund failed by gateway.',
        400,
        gatewayResponse.code || 'GATEWAY_REFUND_FAILED'
      );
    }
  } catch (error) {
    logger.error(`[MockGateway] Error processing refund for gateway ID ${gatewayTransactionId}:`, error.message);
    if (error.response && error.response.data) {
      const gatewayError = error.response.data;
      throw new AppError(
        gatewayError.message || `Gateway refund error: ${error.message}`,
        error.response.status || 500,
        gatewayError.code || 'GATEWAY_REFUND_ERROR'
      );
    }
    throw new AppError(`Failed to connect to payment gateway for refund: ${error.message}`, 500, 'GATEWAY_CONNECTION_ERROR');
  }
};

module.exports = {
  processPayment,
  refundPayment,
};
```