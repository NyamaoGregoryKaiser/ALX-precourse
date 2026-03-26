```javascript
const httpStatus = require('http-status');
const { Product } = require('../models');
const ApiError = require('../utils/ApiError');
const { Op } = require('sequelize');

/**
 * Create a product
 * @param {object} productBody
 * @returns {Promise<Product>}
 */
const createProduct = async (productBody) => {
  // Check if product with the same name already exists
  const existingProduct = await Product.findOne({ where: { name: productBody.name } });
  if (existingProduct) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Product with this name already exists');
  }
  return Product.create(productBody);
};

/**
 * Query for products with pagination, sorting, and filtering.
 * @param {object} filter - Filter options (e.g., { name: 'Laptop' })
 * @param {object} options - Pagination and sorting options (e.g., { sortBy: 'price:desc', limit: 10, page: 1 })
 * @returns {Promise<QueryResult>}
 */
const queryProducts = async (filter, options) => {
  const { sortBy, limit = 10, page = 1 } = options;
  const offset = (page - 1) * limit;

  const where = {};
  if (filter.name) {
    where.name = { [Op.iLike]: `%${filter.name}%` }; // Case-insensitive search
  }

  const order = [];
  if (sortBy) {
    const parts = sortBy.split(',');
    parts.forEach((part) => {
      const [key, direction] = part.split(':');
      if (key && direction) {
        order.push([key, direction.toUpperCase()]);
      }
    });
  } else {
    order.push(['createdAt', 'DESC']); // Default sort
  }

  const { count, rows } = await Product.findAndCountAll({
    where,
    order,
    limit,
    offset,
  });

  return {
    results: rows,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    totalPages: Math.ceil(count / limit),
    totalResults: count,
  };
};

/**
 * Get product by ID
 * @param {number} id
 * @returns {Promise<Product>}
 */
const getProductById = async (id) => {
  return Product.findByPk(id);
};

/**
 * Update product by ID
 * @param {number} productId
 * @param {object} updateBody
 * @returns {Promise<Product>}
 */
const updateProductById = async (productId, updateBody) => {
  const product = await getProductById(productId);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }

  if (updateBody.name && updateBody.name !== product.name) {
    const existingProduct = await Product.findOne({ where: { name: updateBody.name, id: { [Op.ne]: productId } } });
    if (existingProduct) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Product with this name already exists');
    }
  }

  Object.assign(product, updateBody);
  await product.save();
  return product;
};

/**
 * Delete product by ID
 * @param {number} productId
 * @returns {Promise<Product>}
 */
const deleteProductById = async (productId) => {
  const product = await getProductById(productId);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  await product.destroy();
  return product;
};

module.exports = {
  createProduct,
  queryProducts,
  getProductById,
  updateProductById,
  deleteProductById,
};
```