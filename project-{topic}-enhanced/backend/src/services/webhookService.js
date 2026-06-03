```javascript
const db = require('../config/db');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');

// In a real system, webhooks would be queue-based (e.g., RabbitMQ, SQS)
// to ensure reliable delivery and retries without blocking the main thread.
// This is a simplified "fire and forget" for demonstration.

const generateWebhookSignature = (payload, secret) => {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
};

const sendWebhook = async (url, payload, merchantId) => {
  try {
    const webhookSecret = config.webhook.secret; // Use a global or merchant-specific secret
    const signature = generateWebhookSignature(payload, webhookSecret);

    await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Merchant-ID': merchantId,
      },
      timeout: 5000, // 5 second timeout for webhooks
    });
    logger.info(`Webhook sent successfully to ${url} for merchant ${merchantId}. Event: ${payload.event}`);

    // Log webhook attempt for auditing
    await db('webhook_logs').insert({
      id: require('uuid').v4(),
      merchant_id: merchantId,
      event: payload.event,
      payload: JSON.stringify(payload),
      url: url,
      status: 'sent',
      response: 'Acknowledged by external service',
      created_at: new Date(),
    });

  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    logger.error(`Failed to send webhook to ${url} for merchant ${merchantId}. Event: ${payload.event}. Error: ${errorMessage}`);

    // Log failed webhook attempt
    await db('webhook_logs').insert({
      id: require('uuid').v4(),
      merchant_id: merchantId,
      event: payload.event,
      payload: JSON.stringify(payload),
      url: url,
      status: 'failed',
      response: errorMessage,
      created_at: new Date(),
    }).catch(dbErr => logger.error('Failed to log webhook error:', dbErr.message));

    // In a real system: add to a retry queue
    throw new AppError(`Webhook delivery failed: ${errorMessage}`, 500, 'WEBHOOK_DELIVERY_FAILED');
  }
};

module.exports = {
  sendWebhook,
  generateWebhookSignature, // Exported for webhook verification by consuming services
};
```