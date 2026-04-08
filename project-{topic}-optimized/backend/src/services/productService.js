const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Product = require('../models/Product')(sequelize, require('sequelize'));
const User = require('../models/User')(sequelize, require('sequelize'));
const { NotFoundError, APIError } = require('../utils/errors');
const logger = require('../config/logger');

exports.createProduct = async (productData) => {
  try {
    const product = await Product.create(productData);
    // Fetch with user association for full response
    const createdProduct = await Product.findByPk(product.id, {
      include: [{ model: User, as: 'User', attributes: ['id', 'username', 'email', 'role'] }],
    });
    return createdProduct;
  } catch (error) {
    logger.error(`Error creating product: ${error.message}`, { productData, error });
    throw new APIError('Failed to create product', 500);
  }
};

exports.getAllProducts = async (page, limit, search) => {
  try {
    const offset = (page - 1) * limit;
    const whereClause = {};

    if (search) {
      whereClause.name = {
        [Op.iLike]: `%${search}%`, // Case-insensitive search
      };
    }

    const { count, rows } = await Product.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'User', attributes: ['id', 'username', 'email', 'role'] }],
    });
    return { products: rows, total: count };
  } catch (error) {
    logger.error(`Error getting all products: ${error.message}`, { page, limit, search, error });
    throw new APIError('Failed to retrieve products', 500);
  }
};

exports.getProductById = async (id) => {
  try {
    const product = await Product.findByPk(id, {
      include: [{ model: User, as: 'User', attributes: ['id', 'username', 'email', 'role'] }],
    });
    return product;
  } catch (error) {
    logger.error(`Error getting product by ID ${id}: ${error.message}`, { error });
    throw new APIError(`Failed to retrieve product with ID ${id}`, 500);
  }
};

exports.updateProduct = async (id, updatedProductData) => {
  try {
    const product = await Product.findByPk(id);
    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`);
    }

    await product.update(updatedProductData);
    // Fetch the updated product with associations for the response
    const updatedProduct = await Product.findByPk(id, {
      include: [{ model: User, as: 'User', attributes: ['id', 'username', 'email', 'role'] }],
    });
    return updatedProduct;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    logger.error(`Error updating product ${id}: ${error.message}`, { updatedProductData, error });
    throw new APIError(`Failed to update product with ID ${id}`, 500);
  }
};

exports.deleteProduct = async (id) => {
  try {
    const product = await Product.findByPk(id);
    if (!product) {
      return false; // Indicate not found
    }
    await product.destroy();
    return true; // Indicate successful deletion
  } catch (error) {
    logger.error(`Error deleting product ${id}: ${error.message}`, { error });
    throw new APIError(`Failed to delete product with ID ${id}`, 500);
  }
};
```