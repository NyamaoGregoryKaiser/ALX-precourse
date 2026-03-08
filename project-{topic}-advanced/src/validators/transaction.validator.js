```javascript
const Joi = require('joi');

const initiateTransaction = Joi.object().keys({
  sourceAccountId: Joi.string().uuid().required(),
  destinationAccountId: Joi.string().uuid().required(),
  amount: Joi.number().positive().precision(2).required(), // E.g., 100.00
  currency: Joi.string().length(3).uppercase().required(), // e.g., USD, EUR
  description: Joi.string().max(255).allow(''),
});

module.exports = {
  initiateTransaction,
};
```