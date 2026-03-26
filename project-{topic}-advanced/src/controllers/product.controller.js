```javascript
const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const productService = require('../services/product.service');
const logger = require('../utils/logger');

/**
 * Creates a new product. Only accessible by admins.
 */
const createProduct = catchAsync(async (req, res) => {
  const product = await productService.createProduct(req.body);
  logger.info(`Admin (ID: ${req.user.id}) created new product: ${product.name} (ID: ${product.id})`);
  res.status(httpStatus.CREATED).send(product);
});

/**
 * Retrieves multiple products with pagination and filtering. Accessible by all authenticated users.
 */
const getProducts = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await productService.queryProducts(filter, options);
  logger.debug(`User (ID: ${req.user.id}) fetched products with filter: ${JSON.stringify(filter)}`);
  res.send(result);
});

/**
 * Retrieves a single product by ID. Accessible by all authenticated users.
 */
const getProduct = catchAsync(async (req, res) => {
  const product = await productService.getProductById(req.params.productId);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  logger.debug(`User (ID: ${req.user.id}) fetched product with ID: ${product.id}`);
  res.send(product);
});

/**
 * Updates a product by ID. Only accessible by admins.
 */
const updateProduct = catchAsync(async (req, res) => {
  const product = await productService.updateProductById(req.params.productId, req.body);
  logger.info(`Admin (ID: ${req.user.id}) updated product with ID: ${product.id}`);
  res.send(product);
});

/**
 * Deletes a product by ID. Only accessible by admins.
 */
const deleteProduct = catchAsync(async (req, res) => {
  await productService.deleteProductById(req.params.productId);
  logger.info(`Admin (ID: ${req.user.id}) deleted product with ID: ${req.params.productId}`);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
};
```