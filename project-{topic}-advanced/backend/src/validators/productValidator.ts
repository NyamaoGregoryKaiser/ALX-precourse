```typescript
import Joi from 'joi';

export const createProductSchema = Joi.object({
  name: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Product name must be at least 3 characters long.',
    'string.max': 'Product name cannot exceed 100 characters.',
    'string.empty': 'Product name is required.',
    'any.required': 'Product name is required.'
  }),
  description: Joi.string().min(10).required().messages({
    'string.min': 'Description must be at least 10 characters long.',
    'string.empty': 'Description is required.',
    'any.required': 'Description is required.'
  }),
  price: Joi.number().positive().precision(2).required().messages({
    'number.positive': 'Price must be a positive number.',
    'number.precision': 'Price must have at most 2 decimal places.',
    'any.required': 'Price is required.'
  }),
  stock: Joi.number().integer().min(0).required().messages({
    'number.integer': 'Stock must be an integer.',
    'number.min': 'Stock cannot be negative.',
    'any.required': 'Stock is required.'
  }),
  imageUrl: Joi.string().uri().required().messages({
    'string.uri': 'Image URL must be a valid URI.',
    'string.empty': 'Image URL is required.',
    'any.required': 'Image URL is required.'
  }),
  categoryId: Joi.string().uuid().required().messages({
    'string.guid': 'Category ID must be a valid UUID.',
    'string.empty': 'Category ID is required.',
    'any.required': 'Category ID is required.'
  }),
});

export const updateProductSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  description: Joi.string().min(10).optional(),
  price: Joi.number().positive().precision(2).optional(),
  stock: Joi.number().integer().min(0).optional(),
  imageUrl: Joi.string().uri().optional(),
  categoryId: Joi.string().uuid().optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update.'
});
```