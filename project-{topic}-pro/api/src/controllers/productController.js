```javascript
const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { productService } = require('../services');
const ApiError = require('../utils/ApiError');
const pick = require('../utils/pick');
const { CACHE_TTL_MEDIUM } = require('../config/constants');
const { setCache } = require('../utils/cache');

/**
 * Create a new product (Admin only)
 */
const createProduct = catchAsync(async (req, res) => {
  const product = await productService.createProduct(req.body);
  // Invalidate product list cache or specific product cache if needed
  // clearCache('/products'); // Example of clearing cache
  res.status(httpStatus.CREATED).send(product);
});

/**
 * Get all products with filters and pagination
 */
const getProducts = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'categoryId', 'minPrice', 'maxPrice', 'availability']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);

  const result = await productService.queryProducts(filter, options);

  // Cache the response for subsequent identical requests
  const cacheKey = req.originalUrl;
  await setCache(cacheKey, result, CACHE_TTL_MEDIUM);

  res.send(result);
});

/**
 * Get product by ID
 */
const getProduct = catchAsync(async (req, res) => {
  const product = await productService.getProductById(req.params.productId);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  await setCache(req.originalUrl, product, CACHE_TTL_MEDIUM); // Cache individual product
  res.send(product);
});

/**
 * Update product by ID (Admin only)
 */
const updateProduct = catchAsync(async (req, res) => {
  const product = await productService.updateProductById(req.params.productId, req.body);
  // Clear cache for this specific product and product listings
  // clearCache(`/products/${req.params.productId}`);
  // clearCache('/products');
  res.send(product);
});

/**
 * Delete product by ID (Admin only)
 */
const deleteProduct = catchAsync(async (req, res) => {
  await productService.deleteProductById(req.params.productId);
  // Clear cache
  // clearCache(`/products/${req.params.productId}`);
  // clearCache('/products');
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * Get all categories
 */
const getCategories = catchAsync(async (req, res) => {
  const categories = await productService.getAllCategories();
  await setCache(req.originalUrl, categories, CACHE_TTL_LONG); // Cache categories as they change less frequently
  res.send(categories);
});

/**
 * Create a new category (Admin only)
 */
const createCategory = catchAsync(async (req, res) => {
  const category = await productService.createCategory(req.body);
  // clearCache('/categories');
  res.status(httpStatus.CREATED).send(category);
});

/**
 * Get category by ID
 */
const getCategory = catchAsync(async (req, res) => {
  const category = await productService.getCategoryById(req.params.categoryId);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }
  await setCache(req.originalUrl, category, CACHE_TTL_MEDIUM);
  res.send(category);
});

/**
 * Update category by ID (Admin only)
 */
const updateCategory = catchAsync(async (req, res) => {
  const category = await productService.updateCategoryById(req.params.categoryId, req.body);
  // clearCache(`/categories/${req.params.categoryId}`);
  // clearCache('/categories');
  res.send(category);
});

/**
 * Delete category by ID (Admin only)
 */
const deleteCategory = catchAsync(async (req, res) => {
  await productService.deleteCategoryById(req.params.categoryId);
  // clearCache(`/categories/${req.params.categoryId}`);
  // clearCache('/categories');
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
  getCategory,
  updateCategory,
  deleteCategory,
};
```