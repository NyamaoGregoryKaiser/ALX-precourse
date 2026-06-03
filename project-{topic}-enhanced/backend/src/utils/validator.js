```javascript
const Joi = require('joi');
const AppError = require('./appError');

const validate = (schema) => (req, res, next) => {
  const options = {
    abortEarly: false, // include all errors
    allowUnknown: true, // allow unknown keys that will be ignored
    stripUnknown: true, // remove unknown keys from the validated data
  };

  const { error, value } = schema.validate(req.body, options);

  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return next(new AppError(errorMessage, 400, 'VALIDATION_FAILED'));
  }

  req.body = value; // Replace with validated and stripped body
  next();
};

const Schemas = {
  // Authentication Schemas
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    name: Joi.string().min(3).required(),
    type: Joi.string().valid('user', 'merchant').default('user'),
  }),
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  // User Schemas
  updateUser: Joi.object({
    name: Joi.string().min(3),
    email: Joi.string().email(),
    password: Joi.string().min(8),
  }),

  // Merchant Schemas
  createMerchant: Joi.object({
    name: Joi.string().min(3).required(),
    description: Joi.string().allow(''),
    webhookUrl: Joi.string().uri().optional().allow(''),
  }),
  updateMerchant: Joi.object({
    name: Joi.string().min(3),
    description: Joi.string().allow(''),
    webhookUrl: Joi.string().uri().optional().allow(''),
  }),

  // Payment Method Schemas (Simplified)
  createPaymentMethod: Joi.object({
    type: Joi.string().valid('card').required(), // Extend for 'bank_account' etc.
    cardHolderName: Joi.string().required(),
    cardNumber: Joi.string().creditCard().required(), // Joi validates basic card format
    expiryMonth: Joi.number().integer().min(1).max(12).required(),
    expiryYear: Joi.number().integer().min(new Date().getFullYear()).required(),
    cvv: Joi.string().length(3).pattern(/^[0-9]+$/).required(), // Basic CVV validation
    isDefault: Joi.boolean().default(false),
  }),

  // Transaction Schemas
  createTransaction: Joi.object({
    amount: Joi.number().min(0.01).required(),
    currency: Joi.string().length(3).uppercase().required(), // e.g., USD, EUR
    description: Joi.string().optional().allow(''),
    merchantId: Joi.string().uuid().required(), // Merchant to pay
    paymentMethodId: Joi.string().uuid().optional(), // If using saved method
    // If not using saved method, card details passed directly
    cardHolderName: Joi.string().when('paymentMethodId', {
      is: Joi.exist(),
      then: Joi.forbidden(),
      otherwise: Joi.string().required(),
    }),
    cardNumber: Joi.string().creditCard().when('paymentMethodId', {
      is: Joi.exist(),
      then: Joi.forbidden(),
      otherwise: Joi.string().required(),
    }),
    expiryMonth: Joi.number().integer().min(1).max(12).when('paymentMethodId', {
      is: Joi.exist(),
      then: Joi.forbidden(),
      otherwise: Joi.number().integer().required(),
    }),
    expiryYear: Joi.number().integer().min(new Date().getFullYear()).when('paymentMethodId', {
      is: Joi.exist(),
      then: Joi.forbidden(),
      otherwise: Joi.number().integer().required(),
    }),
    cvv: Joi.string().length(3).pattern(/^[0-9]+$/).when('paymentMethodId', {
      is: Joi.exist(),
      then: Joi.forbidden(),
      otherwise: Joi.string().required(),
    }),
  }).xor('paymentMethodId', 'cardNumber'), // Either paymentMethodId OR card details

  refundTransaction: Joi.object({
    amount: Joi.number().min(0.01).optional(), // Can refund partial or full
    reason: Joi.string().optional().allow(''),
  }),
};

module.exports = {
  validate,
  Schemas,
};
```