```javascript
const Joi = require('joi');
const { ACCOUNT_TYPE } = require('../utils/constants');

const createAccount = Joi.object().keys({
  name: Joi.string().required().min(3).max(100),
  type: Joi.string().valid(...Object.values(ACCOUNT_TYPE)).required(),
  currency: Joi.string().length(3).uppercase().required(), // e.g., USD, EUR
  balance: Joi.number().min(0).default(0),
});

const updateAccount = Joi.object().keys({
  name: Joi.string().min(3).max(100),
  // Type and currency are usually immutable after creation
  // balance: Joi.number().min(0), // Balance updates via deposit/withdraw, not direct patch
}).min(1); // At least one field must be provided for update

const depositWithdraw = Joi.object().keys({
  amount: Joi.number().positive().required(),
});

module.exports = {
  createAccount,
  updateAccount,
  depositWithdraw,
};
```