const Joi = require('joi');
const { TRANSACTION_TYPES, TRANSACTION_STATUSES } = require('../utils/constants');

const createTransactionSchema = Joi.object({
  accountId: Joi.string().uuid().required(),
  type: Joi.string().valid(...Object.values(TRANSACTION_TYPES)).required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).uppercase().required(),
  description: Joi.string().allow('').optional(),
  referenceId: Joi.string().uuid().optional(), // For idempotency or linking external payments
});

const updateTransactionSchema = Joi.object({
  status: Joi.string().valid(...Object.values(TRANSACTION_STATUSES)).optional(),
  description: Joi.string().allow('').optional(),
  // Other fields like amount, type, accountId should generally not be updated
}).min(1);

module.exports = {
  createTransactionSchema,
  updateTransactionSchema,
};