```javascript
// src/services/idempotency.service.js
const { IdempotencyKey } = require('../models');
const crypto = require('crypto');
const httpStatus = require('http-status');
const { ApiError } = require('../utils/ApiError');
const logger = require('../utils/logger');

// Helper to hash request body for comparison
const hashRequestBody = (body) => {
    // ALX Principle: Hashing for Data Integrity Check
    // Create a consistent hash of the request body to ensure identical requests.
    return crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
};

const checkIdempotency = async (idempotencyKey, merchantId, method, path, requestBody) => {
    const existingKey = await IdempotencyKey.findOne({
        where: {
            key: idempotencyKey,
            merchantId: merchantId,
        },
    });

    if (existingKey) {
        const currentRequestBodyHash = hashRequestBody(requestBody);
        if (existingKey.requestHash !== currentRequestBodyHash) {
            // ALX Principle: Conflict Resolution
            // If the key exists but the request body differs, it's a conflict.
            // This prevents using the same key for different operations.
            logger.warn(`Idempotency conflict for key ${idempotencyKey}: request body hash mismatch.`);
            throw new ApiError(httpStatus.CONFLICT, 'Idempotency key already used with different parameters.');
        }
        // If the key exists and request hash matches, return the stored response
        logger.info(`Idempotency key ${idempotencyKey} matched, returning cached response.`);
        return {
            statusCode: existingKey.responseStatusCode,
            responseBody: existingKey.responseBody,
        };
    }
    return null; // No existing key found
};

const saveIdempotencyResponse = async (idempotencyKey, merchantId, method, path, requestBody, statusCode, responseBody) => {
    const requestHash = hashRequestBody(requestBody);
    await IdempotencyKey.create({
        key: idempotencyKey,
        merchantId: merchantId,
        requestHash: requestHash,
        requestMethod: method,
        requestPath: path,
        requestBody: requestBody, // Store original request body for debugging
        responseStatusCode: statusCode,
        responseBody: responseBody,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expire after 24 hours
    });
    logger.info(`Idempotency response for key ${idempotencyKey} saved.`);
};

module.exports = {
    checkIdempotency,
    saveIdempotencyResponse,
};
```