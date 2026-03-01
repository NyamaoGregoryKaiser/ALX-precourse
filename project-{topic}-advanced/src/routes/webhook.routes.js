```javascript
// src/routes/webhook.routes.js
const express = require('express');
const webhookController = require('../controllers/webhook.controller');
// No specific validation middleware here as webhooks often have custom payloads
// and validation (e.g., signature verification) happens in the controller itself.

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Webhooks
 *   description: Endpoints for receiving notifications from external payment gateways
 */

/**
 * @swagger
 * /webhooks/gateway-events:
 *   post:
 *     summary: Receive payment gateway events
 *     description: This endpoint is designed to receive event notifications from external payment gateways.
 *                  The system will verify the authenticity of the request (e.g., using signature headers)
 *                  and process the event to update transaction statuses.
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Generic webhook payload from an external payment gateway.
 *                          Structure varies by gateway.
 *             example:
 *               eventType: "payment_succeeded"
 *               data:
 *                 transactionId: "ext_tx_12345"
 *                 amount: 1000
 *                 currency: "USD"
 *                 status: "captured"
 *                 metadata:
 *                   ourRef: "our-transaction-uuid"
 *     responses:
 *       "200":
 *         description: Event received and acknowledged.
 *       "400":
 *         description: Bad Request (e.g., invalid payload, signature mismatch).
 *       "401":
 *         description: Unauthorized (e.g., missing or invalid signature).
 */
router.post('/gateway-events', webhookController.receiveGatewayEvent);

// Potentially more webhook endpoints for different gateways or event types
// router.post('/stripe', webhookController.receiveStripeEvent);
// router.post('/paypal', webhookController.receivePaypalEvent);

module.exports = router;
```