import Joi from 'joi';

export const createProductSchema = Joi.object({
  name: Joi.string().trim().min(3).max(255).required(),
  description: Joi.string().trim().min(10).max(1000).required(),
  price: Joi.number().min(0.01).precision(2).required(),
  stock: Joi.number().integer().min(0).required(),
  categoryId: Joi.string().uuid().required(),
  imageUrl: Joi.string().uri().optional().allow(null, ''),
}).options({ stripUnknown: true }); // Remove unknown properties

export const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(3).max(255).optional(),
  description: Joi.string().trim().min(10).max(1000).optional(),
  price: Joi.number().min(0.01).precision(2).optional(),
  stock: Joi.number().integer().min(0).optional(),
  categoryId: Joi.string().uuid().optional(),
  imageUrl: Joi.string().uri().optional().allow(null, ''),
}).options({ stripUnknown: true });