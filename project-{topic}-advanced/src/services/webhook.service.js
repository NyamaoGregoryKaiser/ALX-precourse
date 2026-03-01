```javascript
// src/services/webhook.service.js
const httpStatus = require('http-status');
const { WebhookConfig, WebhookEvent } = require('../models');
const logger = require('../utils/logger');
const axios = require('axios');
const crypto = require('crypto');

const generateWebhookSignature = (payload, secret) => {
    // ALX Principle: Cryptographic Security for Webhooks
    // Sign webhook payloads to allow recipients to verify authenticity and integrity.
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
};

const dispatchWebhook = async (merchantId, transactionId, eventType, data) => {
    // ALX Principle: Asynchronous Processing & Retries
    // Webhook dispatch should ideally be an async, retryable job.
    // For this example, it's simulated as immediate.
    const webhookConfigs = await WebhookConfig.findAll({ where: { merchantId } });

    if (webhookConfigs.length === 0) {
        logger.info(`No webhook configurations found for merchant ${merchantId}. Skipping dispatch.`);
        return;
    }

    const eventPayload = {
        eventId: crypto.randomBytes(16).toString('hex'), // Unique ID for this webhook event
        eventType: eventType,
        timestamp: new Date().toISOString(),
        data: {
            transactionId: transactionId,
            ...data.toJSON(), // Convert Sequelize instance to plain object
        },
    };

    for (const config of webhookConfigs) {
        const { url, secret, id: configId } = config;
        let success = false;
        let responseStatus = null;
        let responseBody = null;
        let errorMessage = null;

        try {
            const signature = generateWebhookSignature(eventPayload, secret);
            const headers = {
                'Content-Type': 'application/json',
                'X-Signature': signature, // Custom signature header
                'User-Agent': 'PaymentProcessor-Webhook-Dispatcher/1.0',
            };

            logger.info(`Attempting to dispatch webhook for merchant ${merchantId} to ${url} for event ${eventType}`);
            const response = await axios.post(url, eventPayload, { headers });
            success = true;
            responseStatus = response.status;
            responseBody = response.data;
            logger.info(`Webhook successfully dispatched to ${url} for merchant ${merchantId}. Status: ${responseStatus}`);
        } catch (error) {
            errorMessage = error.message;
            if (error.response) {
                responseStatus = error.response.status;
                responseBody = error.response.data;
            }
            logger.error(`Failed to dispatch webhook to ${url} for merchant ${merchantId}: ${errorMessage}`);
            // In a real system, queue this for retry.
        } finally {
            // Log the webhook event for auditing
            await WebhookEvent.create({
                webhookConfigId: configId,
                eventType: eventType,
                payload: eventPayload,
                responseStatusCode: responseStatus,
                responseBody: responseBody,
                success: success,
                errorMessage: errorMessage,
                attemptCount: 1, // For retries, increment this
            });
        }
    }
};

module.exports = {
    dispatchWebhook,
    generateWebhookSignature,
};
```