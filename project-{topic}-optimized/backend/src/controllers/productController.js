const productService = require('../services/productService');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const logger = require('../config/logger');

exports.createProduct = async (req, res, next) => {
  try {
    const { name, description, price, stock } = req.body;
    const userId = req.user.id; // Get userId from authenticated user
    const product = await productService.createProduct({ name, description, price, stock, userId });
    logger.info(`Product created by user ${userId}: ${product.name}`);
    res.status(201).json(product);
  } catch (error) {
    logger.error(`Error creating product for user ${req.user.id}: ${error.message}`, { error });
    next(error);
  }
};

exports.getAllProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const { products, total } = await productService.getAllProducts(parseInt(page, 10), parseInt(limit, 10), search);
    logger.debug(`Retrieved ${products.length} products (page ${page}, limit ${limit})`);
    res.status(200).json({
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      products,
    });
  } catch (error) {
    logger.error(`Error getting all products: ${error.message}`, { error });
    next(error);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);
    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`);
    }
    logger.debug(`Retrieved product by ID: ${id}`);
    res.status(200).json(product);
  } catch (error) {
    logger.error(`Error getting product by ID ${req.params.id}: ${error.message}`, { error });
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const updatedProductData = req.body;

    const product = await productService.getProductById(id);
    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`);
    }

    // Authorization: Only admin or the product owner can update
    if (userRole !== 'admin' && product.userId !== userId) {
      throw new ForbiddenError('You do not have permission to update this product');
    }

    const updatedProduct = await productService.updateProduct(id, updatedProductData);
    logger.info(`Product ${id} updated by user ${userId}`);
    res.status(200).json(updatedProduct);
  } catch (error) {
    logger.error(`Error updating product ${req.params.id} by user ${req.user.id}: ${error.message}`, { error });
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const product = await productService.getProductById(id);
    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`);
    }

    // Authorization: Only admin or the product owner can delete
    if (userRole !== 'admin' && product.userId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this product');
    }

    await productService.deleteProduct(id);
    logger.info(`Product ${id} deleted by user ${userId}`);
    res.status(204).send(); // No content on successful deletion
  } catch (error) {
    logger.error(`Error deleting product ${req.params.id} by user ${req.user.id}: ${error.message}`, { error });
    next(error);
  }
};
```