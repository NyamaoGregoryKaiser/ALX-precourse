const Joi = require('joi');
const { PAYMENT_METHODS } = require('../utils/constants');

const initiatePaymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).uppercase().required(),
  sourceAccountId: Joi.string().uuid().required(), // The account from which money is debited
  destinationAccountId: Joi.string().uuid().required(), // The account to which money is credited
  paymentMethod: Joi.string().valid(...Object.values(PAYMENT_METHODS)).required(),
  description: Joi.string().allow('').optional(),
  // For idempotency: a unique key from the client to prevent duplicate charges
  idempotencyKey: Joi.string().guid({ version: ['uuidv4'] }).required(),
});

const capturePaymentSchema = Joi.object({
  paymentId: Joi.string().uuid().required(),
});

const refundPaymentSchema = Joi.object({
  paymentId: Joi.string().uuid().required(),
  amount: Joi.number().positive().optional(), // Partial refund possible
  description: Joi.string().allow('').optional(),
});

module.exports = {
  initiatePaymentSchema,
  capturePaymentSchema,
  refundPaymentSchema,
};