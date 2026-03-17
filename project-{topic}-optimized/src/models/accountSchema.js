const Joi = require('joi');

const createAccountSchema = Joi.object({
  userId: Joi.string().uuid().required(), // Assuming UUIDs for user IDs
  currency: Joi.string().length(3).uppercase().default('USD'),
  balance: Joi.number().min(0).default(0),
});

const updateAccountSchema = Joi.object({
  currency: Joi.string().length(3).uppercase().optional(),
  // Balance should not be updated directly via API, only through transactions
}).min(1);

module.exports = {
  createAccountSchema,
  updateAccountSchema,
};