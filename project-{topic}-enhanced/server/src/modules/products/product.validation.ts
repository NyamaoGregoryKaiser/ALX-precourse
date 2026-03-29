import Joi from 'joi';

const createProduct = {
  body: Joi.object().keys({
    name: Joi.string().trim().min(3).max(100).required(),
    description: Joi.string().trim().max(1000).optional(),
    price: Joi.number().min(0).precision(2).required(),
    stock: Joi.number().integer().min(0).default(0).optional(),
  }),
};

const getProduct = {
  params: Joi.object().keys({
    productId: Joi.string().uuid().required(),
  }),
};

const updateProduct = {
  params: Joi.object().keys({
    productId: Joi.string().uuid().required(),
  }),
  body: Joi.object().keys({
    name: Joi.string().trim().min(3).max(100).optional(),
    description: Joi.string().trim().max(1000).optional(),
    price: Joi.number().min(0).precision(2).optional(),
    stock: Joi.number().integer().min(0).optional(),
  }).min(1), // At least one field must be provided for update
};

const deleteProduct = {
  params: Joi.object().keys({
    productId: Joi.string().uuid().required(),
  }),
};

export default {
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
};