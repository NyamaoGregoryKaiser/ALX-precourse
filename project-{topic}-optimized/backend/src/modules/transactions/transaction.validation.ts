```typescript
import Joi from 'joi';
import { TransactionType } from '../../database/entities/Transaction';

export const createTransactionSchema = Joi.object({
    merchantId: Joi.string().uuid().required(),
    amount: Joi.number().positive().precision(2).required(),
    currency: Joi.string().length(3).uppercase().default('USD'),
    type: Joi.string().valid(...Object.values(TransactionType)).default(TransactionType.PAYMENT),
    description: Joi.string().max(255).optional(),
    metadata: Joi.object().optional(), // For additional flexible data
});

export const updateTransactionSchema = Joi.object({
    status: Joi.string().valid('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED').optional(),
    metadata: Joi.object().optional(),
});

export const getTransactionsQuerySchema = Joi.object({
    status: Joi.string().valid('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED').optional(),
    type: Joi.string().valid(...Object.values(TransactionType)).optional(),
    merchantId: Joi.string().uuid().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
});
```