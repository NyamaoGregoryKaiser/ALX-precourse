```javascript
const db = require('../database');
const { AppError } = require('../utils/appError');
const logger = require('../utils/logger');

class ProductService {
  /**
   * Fetches all products with optional filtering, pagination, and sorting.
   * @param {object} query - Query parameters (page, limit, search, category, minPrice, maxPrice, sortBy, order).
   * @returns {object} Paginated list of products and total count.
   */
  async getAllProducts(query) {
    const { page = 1, limit = 10, search, category, minPrice, maxPrice, sortBy, order } = query;

    const offset = (page - 1) * limit;
    const where = {};
    const orderOptions = [[sortBy, order]];

    if (search) {
      where[db.Sequelize.Op.or] = [
        { name: { [db.Sequelize.Op.iLike]: `%${search}%` } },
        { description: { [db.Sequelize.Op.iLike]: `%${search}%` } },
      ];
    }

    if (category) {
      where.category = { [db.Sequelize.Op.iLike]: `%${category}%` };
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[db.Sequelize.Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[db.Sequelize.Op.lte] = parseFloat(maxPrice);
    }

    const { count, rows: products } = await db.Product.findAndCountAll({
      where,
      limit,
      offset,
      order: orderOptions,
      include: [
        {
          model: db.User,
          as: 'owner',
          attributes: ['id', 'username', 'email'] // Only include necessary user details
        }
      ],
      paranoid: true, // Only retrieve non-deleted products
    });

    logger.info(`Fetched ${products.length} products for page ${page}.`);
    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      products,
    };
  }

  /**
   * Fetches a single product by its ID.
   * @param {string} id - Product ID.
   * @returns {object} The product object.
   * @throws {AppError} If product not found.
   */
  async getProductById(id) {
    const product = await db.Product.findByPk(id, {
      include: [
        {
          model: db.User,
          as: 'owner',
          attributes: ['id', 'username', 'email']
        }
      ],
      paranoid: true,
    });

    if (!product) {
      throw new AppError(`Product with ID ${id} not found.`, 404);
    }

    logger.info(`Fetched product with ID: ${id}`);
    return product;
  }

  /**
   * Creates a new product.
   * @param {object} productData - Product details.
   * @param {string} userId - ID of the user creating the product.
   * @returns {object} The newly created product.
   * @throws {AppError} If a product with the same name already exists.
   */
  async createProduct(productData, userId) {
    // Check if product with same name already exists (case-insensitive)
    const existingProduct = await db.Product.findOne({
      where: { name: { [db.Sequelize.Op.iLike]: productData.name } }
    });

    if (existingProduct) {
      throw new AppError(`Product with name '${productData.name}' already exists.`, 409);
    }

    const newProduct = await db.Product.create({ ...productData, userId });

    logger.info(`Product created: ${newProduct.name} by user ${userId}`);
    return newProduct;
  }

  /**
   * Updates an existing product.
   * @param {string} id - Product ID.
   * @param {object} updateData - Data to update.
   * @returns {object} The updated product.
   * @throws {AppError} If product not found or name conflict.
   */
  async updateProduct(id, updateData) {
    const product = await db.Product.findByPk(id, { paranoid: true });

    if (!product) {
      throw new AppError(`Product with ID ${id} not found.`, 404);
    }

    // If name is being updated, check for uniqueness
    if (updateData.name && updateData.name !== product.name) {
      const existingProduct = await db.Product.findOne({
        where: { name: { [db.Sequelize.Op.iLike]: updateData.name } }
      });
      if (existingProduct && existingProduct.id !== id) {
        throw new AppError(`Product with name '${updateData.name}' already exists.`, 409);
      }
    }

    Object.assign(product, updateData);
    await product.save();

    logger.info(`Product updated: ${product.name} (ID: ${id})`);
    return product;
  }

  /**
   * Deletes a product by its ID (soft delete).
   * @param {string} id - Product ID.
   * @returns {boolean} True if deletion was successful.
   * @throws {AppError} If product not found.
   */
  async deleteProduct(id) {
    const product = await db.Product.findByPk(id, { paranoid: true });

    if (!product) {
      throw new AppError(`Product with ID ${id} not found.`, 404);
    }

    await product.destroy(); // Soft delete

    logger.info(`Product soft-deleted: ${product.name} (ID: ${id})`);
    return true;
  }

  /**
   * Restores a soft-deleted product by its ID.
   * @param {string} id - Product ID.
   * @returns {object} The restored product.
   * @throws {AppError} If product not found or not deleted.
   */
  async restoreProduct(id) {
    // Find in both active and deleted records
    const product = await db.Product.findByPk(id, { paranoid: false });

    if (!product) {
      throw new AppError(`Product with ID ${id} not found.`, 404);
    }

    if (!product.deletedAt) {
      throw new AppError(`Product with ID ${id} is not soft-deleted.`, 400);
    }

    product.restore(); // Restore soft-deleted record
    logger.info(`Product restored: ${product.name} (ID: ${id})`);
    return product;
  }
}

module.exports = new ProductService();
```