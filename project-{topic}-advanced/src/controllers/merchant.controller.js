```javascript
// src/controllers/merchant.controller.js
const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { merchantService } = require('../services');
const { pick } = require('../utils/helpers');

const createMerchant = catchAsync(async (req, res) => {
    // ALX Principle: Role-Based Access Control (RBAC)
    // The 'auth' middleware checks if the user has appropriate roles (e.g., 'admin').
    const merchant = await merchantService.createMerchant(req.body);
    res.status(httpStatus.CREATED).send(merchant);
});

const getMerchants = catchAsync(async (req, res) => {
    // ALX Principle: Pagination and Filtering
    // Efficiently retrieve data subsets based on query parameters.
    const filter = pick(req.query, ['name', 'email', 'businessCategory']);
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const result = await merchantService.queryMerchants(filter, options);
    res.send(result);
});

const getMerchant = catchAsync(async (req, res) => {
    const merchant = await merchantService.getMerchantById(req.params.merchantId);
    if (!merchant) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Merchant not found');
    }
    res.send(merchant);
});

const updateMerchant = catchAsync(async (req, res) => {
    // ALX Principle: Idempotency (conceptual here for updates)
    // While less critical for simple updates, complex operations might benefit from update idempotency.
    const merchant = await merchantService.updateMerchantById(req.params.merchantId, req.body);
    res.send(merchant);
});

const deleteMerchant = catchAsync(async (req, res) => {
    await merchantService.deleteMerchantById(req.params.merchantId);
    res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
    createMerchant,
    getMerchants,
    getMerchant,
    updateMerchant,
    deleteMerchant,
};
```