```javascript
// src/controllers/webhook.controller.js
const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { transactionService } = require('../services');
const logger = require('../utils/logger');
const config = require('../config/config');

// In a real system, you'd verify the webhook signature here.
// E.g., for Stripe: stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
const verifyWebhookSignature = (req) => {
    // ALX Principle: Security - Authenticity and Integrity
    // Verify the source of the webhook to prevent spoofing and ensure data integrity.
    // This is a placeholder. Real implementation depends on the gateway.
    const signature = req.headers['x-gateway-signature'] || req.headers['stripe-signature'] || req.headers['x-hub-signature'];
    const payload = JSON.stringify(req.body); // Or req.rawBody if using a raw body parser

    if (!signature) {
        logger.warn('Webhook received without signature header.');
        return false;
    }

    // Example placeholder for signature verification logic
    // const expectedSignature = crypto.createHmac('sha256', config.gateway.webhookSecret)
    //                               .update(payload)
    //                               .digest('hex');
    // return signature === `sha256=${expectedSignature}`;

    logger.debug(`Webhook signature verification placeholder invoked. Signature: ${signature}`);
    return true; // DANGER: Always implement real signature verification in production!
};

const receiveGatewayEvent = catchAsync(async (req, res) => {
    // ALX Principle: Robust Error Handling and Graceful Degradation
    // Process events idempotently; handle unknown events gracefully.
    // Respond quickly to the gateway to prevent retries, then process asynchronously.

    if (!verifyWebhookSignature(req)) {
        logger.warn('Webhook signature verification failed.');
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid webhook signature.');
    }

    const { eventType, data } = req.body;
    const { transactionId: externalTransactionId, status: externalStatus, metadata } = data; // Assuming `ourRef` in metadata

    if (!externalTransactionId || !externalStatus || !metadata || !metadata.ourRef) {
        logger.error('Received malformed webhook event:', req.body);
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid webhook payload structure.');
    }

    const ourTransactionRef = metadata.ourRef; // Our internal transaction ID

    // ALX Principle: State Machine Management
    // Update the transaction status based on external events.
    switch (eventType) {
        case 'payment_succeeded':
            if (externalStatus === 'captured') {
                await transactionService.updateTransactionStatus(ourTransactionRef, 'captured', data);
                logger.info(`Transaction ${ourTransactionRef} updated to CAPTURED via webhook.`);
            } else if (externalStatus === 'authorized') {
                 await transactionService.updateTransactionStatus(ourTransactionRef, 'authorized', data);
                 logger.info(`Transaction ${ourTransactionRef} updated to AUTHORIZED via webhook.`);
            }
            break;
        case 'payment_failed':
            await transactionService.updateTransactionStatus(ourTransactionRef, 'failed', data);
            logger.info(`Transaction ${ourTransactionRef} updated to FAILED via webhook.`);
            break;
        case 'charge_refunded':
            await transactionService.updateTransactionStatus(ourTransactionRef, 'refunded', data);
            logger.info(`Transaction ${ourTransactionRef} updated to REFUNDED via webhook.`);
            break;
        case 'charge_disputed':
            await transactionService.updateTransactionStatus(ourTransactionRef, 'disputed', data);
            logger.info(`Transaction ${ourTransactionRef} updated to DISPUTED via webhook.`);
            break;
        // Add more event types as needed (e.g., charge.pending, payout.created, etc.)
        default:
            logger.warn(`Received unhandled webhook event type: ${eventType} for transaction ${ourTransactionRef}`);
            // Do not throw an error for unhandled events, just log and acknowledge.
            break;
    }

    res.status(httpStatus.OK).send({ received: true, eventType });
});

module.exports = {
    receiveGatewayEvent,
};
```