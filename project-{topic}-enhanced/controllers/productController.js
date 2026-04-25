```javascript
const Joi = require('joi');
const productService = require('../services/productService');
const { AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

const productIdSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const createProductSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(500).optional(),
  price: Joi.number().positive().precision(2).required(),
  stock: Joi.number().integer().min(0).default(0),
});

const updateProductSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  description: Joi.string().min(10).max(500).optional(),
  price: Joi.number().positive().precision(2).optional(),
  stock: Joi.number().integer().min(0).optional(),
}).min(1); // At least one field must be present for update

exports.getAllProducts = async (req, res, next) => {
  try {
    const products = await productService.findAllProducts();
    logger.info('Fetched all products.');
    res.status(200).json({
      status: 'success',
      results: products.length,
      data: {
        products,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const { error } = productIdSchema.validate(req.params);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const product = await productService.findProductById(req.params.id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }
    logger.info(`Fetched product with ID: ${req.params.id}`);
    res.status(200).json({
      status: 'success',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const { error, value } = createProductSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const product = await productService.createProduct(value);
    logger.info(`Created new product with ID: ${product.id}`);
    res.status(201).json({
      status: 'success',
      message: 'Product created successfully',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { error: idError } = productIdSchema.validate(req.params);
    if (idError) {
      throw new AppError(idError.details[0].message, 400);
    }

    const { error: bodyError, value } = updateProductSchema.validate(req.body);
    if (bodyError) {
      throw new AppError(bodyError.details[0].message, 400);
    }

    const updatedProduct = await productService.updateProduct(req.params.id, value);
    if (!updatedProduct) {
      throw new AppError('Product not found', 404);
    }
    logger.info(`Updated product with ID: ${req.params.id}`);
    res.status(200).json({
      status: 'success',
      message: 'Product updated successfully',
      data: { product: updatedProduct },
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const { error } = productIdSchema.validate(req.params);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const deleted = await productService.deleteProduct(req.params.id);
    if (!deleted) {
      throw new AppError('Product not found', 404);
    }
    logger.info(`Deleted product with ID: ${req.params.id}`);
    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
```