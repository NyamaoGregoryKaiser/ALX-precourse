```javascript
const logger = require('../utils/logger');
const { TRANSACTION_STATUS } = require('../utils/constants');

/**
 * Simulate processing a payment with an external gateway.
 * In a real application, this would involve HTTP requests to a payment provider's API (e.g., Stripe, PayPal).
 * @param {Object} paymentDetails
 * @param {string} paymentDetails.transactionId - Our internal transaction ID
 * @param {number} paymentDetails.amount
 * @param {string} paymentDetails.currency
 * @param {string} paymentDetails.description
 * @returns {Promise<Object>} - Mock response from the gateway
 */
const processPayment = async (paymentDetails) => {
  logger.info(`Simulating payment processing for internal transaction ${paymentDetails.transactionId}...`);

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simulate random success/failure or based on amount for testing
  const isSuccess = Math.random() > 0.1; // 90% success rate
  const gatewayRefId = `mock_gateway_ref_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

  let status = TRANSACTION_STATUS.PENDING; // Initial status, often gateway processes async
  let message = 'Payment initiated with gateway.';

  if (isSuccess) {
    // For simplicity, directly marking as success in mock.
    // In real scenarios, this often goes to 'processing' and then webhook confirms success.
    status = TRANSACTION_STATUS.SUCCESS;
    message = 'Payment processed successfully by mock gateway.';
    logger.info(`Mock Gateway: Payment for ${paymentDetails.transactionId} successful.`);
  } else {
    status = TRANSACTION_STATUS.FAILED;
    message = 'Payment failed at mock gateway.';
    logger.error(`Mock Gateway: Payment for ${paymentDetails.transactionId} failed.`);
  }

  return {
    gatewayRefId,
    status,
    message,
    // Include any other relevant data from a real gateway, like fees, etc.
  };
};

/**
 * Simulate webhook signature verification.
 * In a real scenario, this would decrypt/hash the payload with a shared secret.
 * @param {string} signature
 * @param {Object} payload
 * @returns {boolean}
 */
const verifyWebhookSignature = (signature, payload) => {
  // For mock, always return true. In production, implement HMAC verification.
  logger.debug('Simulating webhook signature verification (always true in mock).');
  return true;
};

module.exports = {
  processPayment,
  verifyWebhookSignature,
};
```