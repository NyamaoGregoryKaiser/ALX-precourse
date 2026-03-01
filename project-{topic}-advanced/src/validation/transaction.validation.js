```javascript
// src/validation/transaction.validation.js
const Joi = require('joi');
const { uuid } = require('./custom.validation');

const processTransaction = {
    headers: Joi.object({
        'x-idempotency-key': Joi.string().custom(uuid).required().description('A unique key to prevent duplicate requests.'),
    }).options({ allowUnknown: true }), // Allow other headers

    body: Joi.object().keys({
        amount: Joi.number().integer().min(1).required().description('Amount in the smallest currency unit (e.g., cents).'),
        currency: Joi.string().length(3).uppercase().required().description('3-letter ISO currency code (e.g., USD, EUR).'),
        paymentMethodType: Joi.string().valid('card', 'bank_transfer', 'mobile_money', 'wallet').required().description('Type of payment method.'),
        paymentMethodDetails: Joi.object().required().description('Details specific to the payment method (e.g., card token, bank account details).'),
        customerId: Joi.string().custom(uuid).description('Optional customer identifier.'),
        description: Joi.string().max(255).description('Description for the transaction.'),
    }),
};

const captureTransaction = {
    headers: Joi.object({
        'x-idempotency-key': Joi.string().custom(uuid).required().description('A unique key to prevent duplicate requests.'),
    }).options({ allowUnknown: true }),

    params: Joi.object().keys({
        transactionId: Joi.string().custom(uuid).required().description('ID of the transaction to capture.'),
    }),
    body: Joi.object().keys({
        amount: Joi.number().integer().min(1).optional().description('Optional. Amount to capture. If not provided, full amount is captured.'),
    }),
};

const refundTransaction = {
    headers: Joi.object({
        'x-idempotency-key': Joi.string().custom(uuid).required().description('A unique key to prevent duplicate requests.'),
    }).options({ allowUnknown: true }),

    params: Joi.object().keys({
        transactionId: Joi.string().custom(uuid).required().description('ID of the transaction to refund.'),
    }),
    body: Joi.object().keys({
        amount: Joi.number().integer().min(1).optional().description('Optional. Amount to refund. If not provided, full amount is refunded.'),
    }),
};

const getTransaction = {
    params: Joi.object().keys({
        transactionId: Joi.string().custom(uuid).required().description('ID of the transaction to retrieve.'),
    }),
};

const getTransactions = {
    query: Joi.object().keys({
        status: Joi.string().valid(
            'pending',
            'authorized',
            'captured',
            'partially_captured',
            'refunded',
            'partially_refunded',
            'failed',
            'voided',
            'disputed'
        ),
        currency: Joi.string().length(3).uppercase(),
        sortBy: Joi.string().description('Sort by field:order (e.g., createdAt:desc, amount:asc)'),
        limit: Joi.number().integer().min(1).default(10),
        page: Joi.number().integer().min(1).default(1),
    }),
};

module.exports = {
    processTransaction,
    captureTransaction,
    refundTransaction,
    getTransaction,
    getTransactions,
};
```