```javascript
const httpStatus = require('http-status');
const { Product, Category } = require('../models');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const { DEFAULT_PAGE_SIZE } = require('../config/constants');

/**
 * Create a product
 * @param {Object} productBody
 * @returns {Promise<Product>}
 */
const createProduct = async (productBody) => {
  const product = await Product.create(productBody);
  logger.info(`Product created: ${product.name}`);
  return product;
};

/**
 * Query for products
 * @param {Object} filter - Filter options (e.g., { categoryId: 'uuid', name: 'search_term' })
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryProducts = async (filter, options) => {
  const { limit = DEFAULT_PAGE_SIZE, page = 1, sortBy, populate } = options;
  const offset = (page - 1) * limit;

  const order = [];
  if (sortBy) {
    const [field, sortOrder] = sortBy.split(':');
    order.push([field, sortOrder.toUpperCase()]);
  } else {
    order.push(['createdAt', 'DESC']); // Default sort
  }

  const include = [];
  if (populate && populate.includes('category')) {
    include.push({
      model: Category,
      as: 'category',
      attributes: ['id', 'name'],
    });
  }

  // Build dynamic where clause for filtering
  const where = {};
  if (filter.name) {
    where.name = { [require('sequelize').Op.iLike]: `%${filter.name}%` }; // Case-insensitive search
  }
  if (filter.categoryId) {
    where.categoryId = filter.categoryId;
  }
  if (filter.minPrice) {
    where.price = { ...where.price, [require('sequelize').Op.gte]: filter.minPrice };
  }
  if (filter.maxPrice) {
    where.price = { ...where.price, [require('sequelize').Op.lte]: filter.maxPrice };
  }
  // Add more filters as needed

  const products = await Product.findAndCountAll({
    where,
    limit,
    offset,
    order,
    include,
  });

  return {
    results: products.rows,
    totalResults: products.count,
    page,
    limit,
    totalPages: Math.ceil(products.count / limit),
  };
};

/**
 * Get product by ID
 * @param {UUID} id
 * @returns {Promise<Product>}
 */
const getProductById = async (id) => {
  return Product.findByPk(id, {
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
  });
};

/**
 * Update product by ID
 * @param {UUID} productId
 * @param {Object} updateBody
 * @returns {Promise<Product>}
 */
const updateProductById = async (productId, updateBody) => {
  const product = await getProductById(productId);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }

  Object.assign(product, updateBody);
  await product.save();
  logger.info(`Product ID ${productId} updated.`);
  return product;
};

/**
 * Delete product by ID
 * @param {UUID} productId
 * @returns {Promise<Product>}
 */
const deleteProductById = async (productId) => {
  const product = await getProductById(productId);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  await product.destroy();
  logger.info(`Product ID ${productId} deleted.`);
  return product;
};

/**
 * Get all categories
 * @returns {Promise<Array<Category>>}
 */
const getAllCategories = async () => {
  return Category.findAll({ order: [['name', 'ASC']] });
};

/**
 * Create a new category
 * @param {Object} categoryBody
 * @returns {Promise<Category>}
 */
const createCategory = async (categoryBody) => {
  if (await Category.findOne({ where: { name: categoryBody.name } })) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Category name already exists');
  }
  const category = await Category.create(categoryBody);
  logger.info(`Category created: ${category.name}`);
  return category;
};

/**
 * Get category by ID
 * @param {UUID} categoryId
 * @returns {Promise<Category>}
 */
const getCategoryById = async (categoryId) => {
  return Category.findByPk(categoryId);
};

/**
 * Update category by ID
 * @param {UUID} categoryId
 * @param {Object} updateBody
 * @returns {Promise<Category>}
 */
const updateCategoryById = async (categoryId, updateBody) => {
  const category = await getCategoryById(categoryId);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }
  if (updateBody.name && (await Category.findOne({ where: { name: updateBody.name, id: { [require('sequelize').Op.ne]: categoryId } } }))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Category name already exists');
  }

  Object.assign(category, updateBody);
  await category.save();
  logger.info(`Category ID ${categoryId} updated.`);
  return category;
};

/**
 * Delete category by ID
 * @param {UUID} categoryId
 * @returns {Promise<Category>}
 */
const deleteCategoryById = async (categoryId) => {
  const category = await getCategoryById(categoryId);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }
  // Before deleting, consider re-assigning products or preventing deletion if products exist
  // For now, CASCADE delete or SET NULL in Product model handles related products.
  await category.destroy();
  logger.info(`Category ID ${categoryId} deleted.`);
  return category;
};


module.exports = {
  createProduct,
  queryProducts,
  getProductById,
  updateProductById,
  deleteProductById,
  getAllCategories,
  createCategory,
  getCategoryById,
  updateCategoryById,
  deleteCategoryById,
};
```