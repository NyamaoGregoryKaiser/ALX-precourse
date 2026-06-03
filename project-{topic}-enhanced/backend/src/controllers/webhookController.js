```javascript
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const db = require('../config/db');
const { generateWebhookSignature } = require('../services/webhookService'); // To verify signatures
const config = require('../config');

// Helper to verify incoming webhook signature
const verifyWebhookSignature = (payload, signature, secret) => {
  if (!signature) {
    logger.warn('Webhook received without signature.');
    return false;
  }
  const expectedSignature = generateWebhookSignature(payload, secret);
  // Use crypto.timingSafeEqual to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
};

// @desc    Receive and process incoming webhooks from external services (e.g., payment gateway)
// @route   POST /api/v1/webhooks/incoming/:source
// @access  Public (with signature verification)
exports.receiveWebhook = catchAsync(async (req, res, next) => {
  const { source } = req.params; // e.g., 'stripe', 'mock-gateway'
  const payload = req.body;
  const signature = req.headers['x-webhook-signature'] || req.headers['stripe-signature']; // Example headers
  const merchantId = req.headers['x-merchant-id']; // Optional: if gateway sends our merchant ID

  logger.info(`Incoming webhook from ${source}. Event: ${payload.event || 'N/A'}`);

  // 1. Verify webhook signature for authenticity and integrity
  // In a real system, you might have different secrets per source or per merchant.
  const webhookSecret = config.webhook.secret; // Or fetch merchant-specific secret if available

  if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
    logger.warn(`Invalid webhook signature from ${source}.`);
    return next(new AppError('Webhook signature verification failed.', 403, 'INVALID_WEBHOOK_SIGNATURE'));
  }

  // 2. Process the webhook payload based on event type
  switch (source) {
    case 'mock-gateway':
      await handleMockGatewayWebhook(payload, merchantId);
      break;
    // case 'stripe':
    //   await handleStripeWebhook(payload);
    //   break;
    default:
      logger.warn(`Unhandled webhook source: ${source}`);
      return next(new AppError(`Webhook source '${source}' is not supported.`, 400, 'UNSUPPORTED_WEBHOOK_SOURCE'));
  }

  res.status(200).json({ received: true, message: 'Webhook processed.' });
});

// --- Webhook Handlers ---
const handleMockGatewayWebhook = async (payload, merchantId) => {
  logger.info(`Processing mock-gateway webhook event: ${payload.event}`);

  // Example: Update transaction status based on gateway's final notification
  if (payload.event === 'charge.succeeded' || payload.event === 'charge.failed' ||
      payload.event === 'charge.refunded' || payload.event === 'charge.refund_failed') {

    const transactionId = payload.id; // Our internal transaction ID from webhook payload
    const newStatus = mapWebhookEventToStatus(payload.event);

    if (transactionId && newStatus) {
      await db('transactions')
        .where({ id: transactionId })
        .update({
          status: newStatus,
          updated_at: new Date(),
          // Store full payload in gateway_response or a dedicated webhook_event_log table
          gateway_response: JSON.stringify({ ...payload, webhookTimestamp: new Date().toISOString() }),
        });
      logger.info(`Transaction ${transactionId} status updated to ${newStatus} via webhook.`);
    } else {
      logger.warn(`Mock Gateway Webhook: Missing transaction ID or unhandled event for status update.`);
    }
  } else {
    logger.debug(`Mock Gateway Webhook: Event ${payload.event} received but not explicitly handled for status update.`);
  }

  // Log the incoming webhook for audit
  await db('webhook_logs').insert({
    id: uuidv4(),
    merchant_id: merchantId || null, // If gateway doesn't provide, infer or leave null
    event: payload.event || 'unknown',
    payload: JSON.stringify(payload),
    url: `/api/v1/webhooks/incoming/mock-gateway`,
    status: 'received',
    response: 'Processed by internal handler',
    created_at: new Date(),
  }).catch(err => logger.error('Failed to log incoming webhook:', err.message));
};

const mapWebhookEventToStatus = (event) => {
  switch (event) {
    case 'charge.succeeded': return 'completed';
    case 'charge.failed': return 'failed';
    case 'charge.refunded': return 'refunded';
    case 'charge.refund_failed': return 'failed'; // Refund attempts failed
    default: return null;
  }
};

// ... other webhook handler functions for different sources

// Example for managing outgoing webhook subscriptions (API exposed to merchants)
exports.createWebhookSubscription = catchAsync(async (req, res, next) => {
  const { id: userId, type: userType } = req.user;
  const { url, events } = req.body; // events: ['charge.succeeded', 'charge.failed']

  if (userType !== 'merchant' && userType !== 'admin') {
    return next(new AppError('Only merchants or admins can manage webhooks.', 403));
  }
  const merchant = await db('merchants').where({ user_id: userId }).first();
  if (!merchant) {
    return next(new AppError('Merchant not found.', 404));
  }

  await db('merchants').where({ id: merchant.id }).update({
    webhook_url: url,
    // webhook_events: JSON.stringify(events), // If you store allowed events per merchant
    updated_at: new Date(),
  });

  await cacheService.invalidatePrefix(`merchant:${merchant.id}`);
  res.status(200).json({ status: 'success', message: 'Webhook URL updated.' });
});

// Other CRUD operations for webhook subscriptions
```