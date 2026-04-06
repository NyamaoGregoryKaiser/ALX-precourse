```typescript
import Joi from 'joi';

export const createPaymentSchema = Joi.object({
  sourceAccountId: Joi.string().uuid().required().messages({
    'string.empty': 'Source account ID is required',
    'string.guid': 'Source account ID must be a valid UUID',
    'any.required': 'Source account ID is required',
  }),
  destinationAccountNumber: Joi.string().required().messages({ // Using account number for destination for realism
    'string.empty': 'Destination account number is required',
    'any.required': 'Destination account number is required',
  }),
  amount: Joi.number().positive().precision(2).required().messages({
    'number.base': 'Amount must be a number',
    'number.positive': 'Amount must be a positive number',
    'number.precision': 'Amount must have at most 2 decimal places',
    'any.required': 'Amount is required',
  }),
  description: Joi.string().max(255).optional(),
  idempotencyKey: Joi.string().uuid().optional().messages({
    'string.guid': 'Idempotency key must be a valid UUID',
  }),
});
```