```javascript
const Joi = require('joi');

const createProductSchema = Joi.object({
  name: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Product name must be at least 3 characters long.',
    'string.max': 'Product name cannot exceed 100 characters.',
    'string.empty': 'Product name is required.',
    'any.required': 'Product name is required.',
  }),
  description: Joi.string().allow('').optional(),
  price: Joi.number().precision(2).min(0).required().messages({
    'number.base': 'Price must be a number.',
    'number.precision': 'Price must have at most 2 decimal places.',
    'number.min': 'Price cannot be negative.',
    'any.required': 'Price is required.',
  }),
  stock: Joi.number().integer().min(0).required().messages({
    'number.base': 'Stock must be an integer.',
    'number.integer': 'Stock must be an integer.',
    'number.min': 'Stock cannot be negative.',
    'any.required': 'Stock is required.',
  }),
  category: Joi.string().min(2).max(50).optional().allow(''),
  imageUrl: Joi.string().uri().optional().allow('').messages({
    'string.uri': 'Image URL must be a valid URL.',
  }),
});

const updateProductSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional().messages({
    'string.min': 'Product name must be at least 3 characters long.',
    'string.max': 'Product name cannot exceed 100 characters.',
  }),
  description: Joi.string().allow('').optional(),
  price: Joi.number().precision(2).min(0).optional().messages({
    'number.base': 'Price must be a number.',
    'number.precision': 'Price must have at most 2 decimal places.',
    'number.min': 'Price cannot be negative.',
  }),
  stock: Joi.number().integer().min(0).optional().messages({
    'number.base': 'Stock must be an integer.',
    'number.integer': 'Stock must be an integer.',
    'number.min': 'Stock cannot be negative.',
  }),
  category: Joi.string().min(2).max(50).optional().allow(''),
  imageUrl: Joi.string().uri().optional().allow('').messages({
    'string.uri': 'Image URL must be a valid URL.',
  }),
});

const productIdSchema = Joi.object({
  id: Joi.string().uuid({ version: '4' }).required().messages({
    'string.uuid': 'Product ID must be a valid UUID.',
    'any.required': 'Product ID is required.',
  }),
});

const listProductsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().allow('').optional(),
  category: Joi.string().allow('').optional(),
  minPrice: Joi.number().precision(2).min(0).optional(),
  maxPrice: Joi.number().precision(2).min(0).optional(),
  sortBy: Joi.string().valid('name', 'price', 'createdAt', 'updatedAt').default('createdAt'),
  order: Joi.string().valid('ASC', 'DESC').default('DESC'),
}).and('minPrice', 'maxPrice'); // Ensures minPrice and maxPrice are used together

module.exports = {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
  listProductsQuerySchema,
};
```