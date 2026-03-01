```javascript
// src/middlewares/apiKeyAuth.js
const httpStatus = require('http-status');
const { ApiError } = require('../utils/ApiError');
const { merchantService } = require('../services');
const logger = require('../utils/logger');

const apiKeyAuth = async (req, res, next) => {
    // ALX Principle: API Key Authentication
    // Authenticate external merchant requests using a secure API key.
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;

    if (!apiKey) {
        return next(new ApiError(httpStatus.UNAUTHORIZED, 'API Key is required.'));
    }

    try {
        const merchant = await merchantService.getMerchantByApiKey(apiKey);

        if (!merchant || !merchant.isActive) {
            logger.warn(`Failed API Key authentication attempt: ${apiKey}`);
            return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or inactive API Key.'));
        }

        // Attach merchant details to the request for downstream use
        req.user = {
            id: merchant.id,
            merchantId: merchant.id, // Consistent naming for user/merchant identification
            name: merchant.name,
            email: merchant.email,
            role: 'merchant', // Define a 'merchant' role for this context
        };
        logger.info(`API Key authenticated for merchant: ${merchant.name} (${merchant.id})`);
        next();
    } catch (error) {
        logger.error('Error during API Key authentication:', error);
        return next(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Authentication failed due to an internal error.'));
    }
};

module.exports = {
    apiKeyAuth,
};
```