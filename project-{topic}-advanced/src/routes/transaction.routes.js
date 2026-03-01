```javascript
// src/routes/transaction.routes.js
const express = require('express');
const transactionController = require('../controllers/transaction.controller');
const { validate } = require('../middlewares/validation');
const { transactionValidation } = require('../validation');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Merchant-facing transaction processing APIs (requires API Key)
 */

/**
 * @swagger
 * /transactions/process:
 *   post:
 *     summary: Process a new payment transaction
 *     description: Initiates a payment transaction for a merchant. Requires an API Key for authentication.
 *                  Supports idempotency via 'X-Idempotency-Key' header.
 *     tags: [Transactions]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: header
 *         name: X-Idempotency-Key
 *         schema:
 *           type: string
 *         required: true
 *         description: A unique key to prevent duplicate requests. Must be a UUID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - currency
 *               - paymentMethodType
 *               - customerId
 *               - description
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *                 example: 100.50
 *                 description: Amount in the smallest currency unit (e.g., cents)
 *               currency:
 *                 type: string
 *                 example: USD
 *                 description: 3-letter ISO currency code
 *               paymentMethodType:
 *                 type: string
 *                 enum: [card, bank_transfer, mobile_money]
 *                 example: card
 *               paymentMethodDetails:
 *                 type: object
 *                 description: Details specific to the payment method type (e.g., card token)
 *                 example:
 *                   token: tok_visa_4242
 *               customerId:
 *                 type: string
 *                 format: uuid
 *                 example: d290f1ee-6c54-4b01-90e6-d701748f0851
 *               description:
 *                 type: string
 *                 example: Order #12345
 *             example:
 *               amount: 2500
 *               currency: USD
 *               paymentMethodType: card
 *               paymentMethodDetails:
 *                 token: 'test_card_token_123'
 *               customerId: 'd290f1ee-6c54-4b01-90e6-d701748f0851'
 *               description: "Online purchase of Widget X"
 *     responses:
 *       "201":
 *         description: Transaction created and processing initiated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       "200":
 *         description: OK (Idempotent request returned previous response).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "409":
 *         description: Conflict - Idempotency key already used with different parameters.
 */
router.post('/process', validate(transactionValidation.processTransaction), transactionController.processTransaction);

/**
 * @swagger
 * /transactions/{transactionId}/capture:
 *   post:
 *     summary: Capture an authorized transaction
 *     description: Captures funds for a previously authorized transaction.
 *                  Requires an API Key for authentication.
 *     tags: [Transactions]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the transaction to capture.
 *       - in: header
 *         name: X-Idempotency-Key
 *         schema:
 *           type: string
 *         required: true
 *         description: A unique key to prevent duplicate requests.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *                 example: 95.00
 *                 description: Optional. Amount to capture. If not provided, full amount is captured.
 *     responses:
 *       "200":
 *         description: Transaction captured successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "409":
 *         description: Conflict - Transaction is not in a capturable state or idempotency key conflict.
 */
router.post('/:transactionId/capture', validate(transactionValidation.captureTransaction), transactionController.captureTransaction);

/**
 * @swagger
 * /transactions/{transactionId}/refund:
 *   post:
 *     summary: Refund a captured transaction
 *     description: Refunds funds for a previously captured transaction.
 *                  Requires an API Key for authentication.
 *     tags: [Transactions]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the transaction to refund.
 *       - in: header
 *         name: X-Idempotency-Key
 *         schema:
 *           type: string
 *         required: true
 *         description: A unique key to prevent duplicate requests.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *                 example: 50.00
 *                 description: Optional. Amount to refund. If not provided, full amount is refunded.
 *     responses:
 *       "200":
 *         description: Transaction refunded successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "409":
 *         description: Conflict - Transaction is not in a refundable state or idempotency key conflict.
 */
router.post('/:transactionId/refund', validate(transactionValidation.refundTransaction), transactionController.refundTransaction);

/**
 * @swagger
 * /transactions/{transactionId}:
 *   get:
 *     summary: Retrieve a single transaction by ID
 *     description: Retrieves details of a specific transaction for the merchant.
 *                  Requires an API Key for authentication.
 *     tags: [Transactions]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the transaction to retrieve.
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:transactionId', validate(transactionValidation.getTransaction), transactionController.getTransaction);

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: List all transactions for the authenticated merchant
 *     description: Retrieves a paginated list of all transactions for the merchant.
 *                  Requires an API Key for authentication.
 *     tags: [Transactions]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, authorized, captured, refunded, failed, disputed]
 *         description: Filter transactions by status.
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *         description: Filter transactions by currency.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of transactions to return.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 1
 *         description: Page number for pagination.
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *                 totalResults:
 *                   type: integer
 *                   example: 1
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', validate(transactionValidation.getTransactions), transactionController.getTransactions);


module.exports = router;
```