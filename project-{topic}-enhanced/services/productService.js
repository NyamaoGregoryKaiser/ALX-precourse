```javascript
const { Product } = require('../db/models');
const { AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

const ALL_PRODUCTS_CACHE_KEY = 'all_products';

exports.findAllProducts = async () => {
  try {
    const cachedProducts = await cache.get(ALL_PRODUCTS_CACHE_KEY);
    if (cachedProducts) {
      logger.debug('Fetching all products from cache.');
      return JSON.parse(cachedProducts);
    }

    const products = await Product.findAll();
    await cache.set(ALL_PRODUCTS_CACHE_KEY, JSON.stringify(products), 300); // Cache for 5 minutes
    logger.debug('Fetched all products from DB and cached.');
    return products;
  } catch (error) {
    logger.error(`Error finding all products: ${error.message}`, error);
    throw new AppError('Could not retrieve products.', 500);
  }
};

exports.findProductById = async (id) => {
  try {
    // A more specific cache for individual products could also be implemented
    // const cachedProduct = await cache.get(`product:${id}`);
    // if (cachedProduct) return JSON.parse(cachedProduct);

    const product = await Product.findByPk(id);
    // if (product) await cache.set(`product:${id}`, JSON.stringify(product), 60);
    return product;
  } catch (error) {
    logger.error(`Error finding product by ID ${id}: ${error.message}`, error);
    throw new AppError('Could not retrieve product.', 500);
  }
};

exports.createProduct = async (productData) => {
  try {
    const existingProduct = await Product.findOne({ where: { name: productData.name } });
    if (existingProduct) {
      throw new AppError('Product with that name already exists.', 409);
    }
    const product = await Product.create(productData);
    await cache.del(ALL_PRODUCTS_CACHE_KEY); // Invalidate cache for all products
    // Also invalidate specific product cache if it exists: await cache.del(`product:${product.id}`);
    return product;
  } catch (error) {
    logger.error(`Error creating product: ${error.message}`, error);
    throw error;
  }
};

exports.updateProduct = async (id, updateData) => {
  try {
    const product = await Product.findByPk(id);
    if (!product) {
      return null;
    }
    const updatedProduct = await product.update(updateData);
    await cache.del(ALL_PRODUCTS_CACHE_KEY); // Invalidate cache for all products
    // Invalidate specific product cache: await cache.del(`product:${id}`);
    return updatedProduct;
  } catch (error) {
    logger.error(`Error updating product ID ${id}: ${error.message}`, error);
    throw error;
  }
};

exports.deleteProduct = async (id) => {
  try {
    const deletedCount = await Product.destroy({ where: { id } });
    if (deletedCount === 0) {
      return false; // Product not found
    }
    await cache.del(ALL_PRODUCTS_CACHE_KEY); // Invalidate cache for all products
    // Invalidate specific product cache: await cache.del(`product:${id}`);
    return true;
  } catch (error) {
    logger.error(`Error deleting product ID ${id}: ${error.message}`, error);
    throw new AppError('Could not delete product.', 500);
  }
};
```