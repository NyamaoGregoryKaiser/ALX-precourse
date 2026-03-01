```javascript
// src/controllers/transaction.controller.js
const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { transactionService, idempotencyService, webhookService } = require('../services');
const { ApiError } = require('../utils/ApiError');
const logger = require('../utils/logger');
const { pick } = require('../utils/helpers');

const processTransaction = catchAsync(async (req, res) => {
    // ALX Principle: Idempotency
    // Ensures that an API call can be safely repeated without unintended side effects.
    const idempotencyKey = req.headers['x-idempotency-key'];
    const merchantId = req.user.merchantId; // Injected by apiKeyAuth middleware

    if (!idempotencyKey) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'X-Idempotency-Key header is required.');
    }

    const idempotentResponse = await idempotencyService.checkIdempotency(idempotencyKey, merchantId, req.method, req.originalUrl, req.body);
    if (idempotentResponse) {
        logger.info(`Idempotent request for key ${idempotencyKey} returned cached response.`);
        return res.status(idempotentResponse.statusCode).send(idempotentResponse.responseBody);
    }

    const transactionData = {
        ...req.body,
        merchantId,
        idempotencyKey, // Store the key with the transaction
    };

    // ALX Principle: Business Logic Encapsulation
    // The core transaction processing logic resides in the service layer.
    const transaction = await transactionService.processNewTransaction(transactionData);

    // After successful processing, save the response for idempotency
    await idempotencyService.saveIdempotencyResponse(idempotencyKey, merchantId, req.method, req.originalUrl, req.body, httpStatus.CREATED, transaction);

    // ALX Principle: Asynchronous Event Handling (Webhooks)
    // Decouple notification from core transaction processing using webhooks.
    // This could be an async job queue (e.g., BullMQ, RabbitMQ) in a real system.
    setImmediate(async () => {
        try {
            await webhookService.dispatchWebhook(merchantId, transaction.id, 'transaction.created', transaction);
        } catch (error) {
            logger.error(`Failed to dispatch webhook for transaction ${transaction.id}:`, error);
            // Handle webhook dispatch failures (e.g., retry mechanism)
        }
    });

    res.status(httpStatus.CREATED).send(transaction);
});

const captureTransaction = catchAsync(async (req, res) => {
    const idempotencyKey = req.headers['x-idempotency-key'];
    const merchantId = req.user.merchantId;

    if (!idempotencyKey) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'X-Idempotency-Key header is required.');
    }

    const idempotentResponse = await idempotencyService.checkIdempotency(idempotencyKey, merchantId, req.method, req.originalUrl, req.body);
    if (idempotentResponse) {
        logger.info(`Idempotent request for key ${idempotencyKey} returned cached response.`);
        return res.status(idempotentResponse.statusCode).send(idempotentResponse.responseBody);
    }

    const { transactionId } = req.params;
    const { amount } = req.body; // Optional partial capture

    const transaction = await transactionService.captureTransaction(transactionId, merchantId, amount);

    await idempotencyService.saveIdempotencyResponse(idempotencyKey, merchantId, req.method, req.originalUrl, req.body, httpStatus.OK, transaction);

    setImmediate(async () => {
        try {
            await webhookService.dispatchWebhook(merchantId, transaction.id, 'transaction.captured', transaction);
        } catch (error) {
            logger.error(`Failed to dispatch webhook for transaction ${transaction.id}:`, error);
        }
    });

    res.status(httpStatus.OK).send(transaction);
});

const refundTransaction = catchAsync(async (req, res) => {
    const idempotencyKey = req.headers['x-idempotency-key'];
    const merchantId = req.user.merchantId;

    if (!idempotencyKey) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'X-Idempotency-Key header is required.');
    }

    const idempotentResponse = await idempotencyService.checkIdempotency(idempotencyKey, merchantId, req.method, req.originalUrl, req.body);
    if (idempotentResponse) {
        logger.info(`Idempotent request for key ${idempotencyKey} returned cached response.`);
        return res.status(idempotentResponse.statusCode).send(idempotentResponse.responseBody);
    }

    const { transactionId } = req.params;
    const { amount } = req.body; // Optional partial refund

    const transaction = await transactionService.refundTransaction(transactionId, merchantId, amount);

    await idempotencyService.saveIdempotencyResponse(idempotencyKey, merchantId, req.method, req.originalUrl, req.body, httpStatus.OK, transaction);

    setImmediate(async () => {
        try {
            await webhookService.dispatchWebhook(merchantId, transaction.id, 'transaction.refunded', transaction);
        } catch (error) {
            logger.error(`Failed to dispatch webhook for transaction ${transaction.id}:`, error);
        }
    });

    res.status(httpStatus.OK).send(transaction);
});


const getTransaction = catchAsync(async (req, res) => {
    const { transactionId } = req.params;
    const merchantId = req.user.merchantId;

    const transaction = await transactionService.getTransactionByIdAndMerchant(transactionId, merchantId);
    if (!transaction) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found.');
    }
    res.status(httpStatus.OK).send(transaction);
});

const getTransactions = catchAsync(async (req, res) => {
    const merchantId = req.user.merchantId;
    const filter = { ...pick(req.query, ['status', 'currency']), merchantId };
    const options = pick(req.query, ['sortBy', 'limit', 'page']);

    const result = await transactionService.queryTransactions(filter, options);
    res.status(httpStatus.OK).send(result);
});

module.exports = {
    processTransaction,
    captureTransaction,
    refundTransaction,
    getTransaction,
    getTransactions,
};
```