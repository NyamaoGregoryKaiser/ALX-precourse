```javascript
// src/services/merchant.service.js
const httpStatus = require('http-status');
const { Merchant } = require('../models');
const { ApiError } = require('../utils/ApiError');
const crypto = require('crypto');
const config = require('../config/config');

const generateApiKey = () => {
    // ALX Principle: Cryptographic Security
    // Generate secure, random API keys.
    // A real system would also involve secret key hashing/storage and rotation.
    return crypto.randomBytes(32).toString('hex'); // 64 character hex string
};

const createMerchant = async (merchantBody) => {
    if (await Merchant.isEmailTaken(merchantBody.email)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
    }
    const apiKey = generateApiKey(); // Generate initial API key
    // In a production setup, store a hashed API key and return the plain key only once.
    // For this example, we'll return the plain key for simplicity.
    const merchant = await Merchant.create({ ...merchantBody, apiKey });
    return merchant;
};

const queryMerchants = async (filter, options) => {
    const merchants = await Merchant.paginate(filter, options);
    return merchants;
};

const getMerchantById = async (id) => {
    return Merchant.findByPk(id);
};

const getMerchantByApiKey = async (apiKey) => {
    // ALX Principle: Secure API Key Comparison
    // Use constant-time comparison to prevent timing attacks.
    const merchants = await Merchant.findAll(); // Retrieve all for comparison (simplified)
    for (const merchant of merchants) {
        if (crypto.timingSafeEqual(Buffer.from(merchant.apiKey), Buffer.from(apiKey))) {
            return merchant;
        }
    }
    return null;
};


const updateMerchantById = async (merchantId, updateBody) => {
    const merchant = await getMerchantById(merchantId);
    if (!merchant) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Merchant not found');
    }
    if (updateBody.email && (await Merchant.isEmailTaken(updateBody.email, merchantId))) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
    }
    Object.assign(merchant, updateBody);
    await merchant.save();
    return merchant;
};

const deleteMerchantById = async (merchantId) => {
    const merchant = await getMerchantById(merchantId);
    if (!merchant) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Merchant not found');
    }
    await merchant.destroy();
};

module.exports = {
    createMerchant,
    queryMerchants,
    getMerchantById,
    getMerchantByApiKey,
    updateMerchantById,
    deleteMerchantById,
    generateApiKey, // Exposed for potential API key rotation
};
```