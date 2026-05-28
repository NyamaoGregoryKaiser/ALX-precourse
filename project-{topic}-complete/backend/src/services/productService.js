```javascript
const { Product, Category, Review } = require('../config/db');
const { AppError } = require('../utils/appError');
const logger = require('../utils/logger');
const { setCache, getCache, deleteCache } = require('../utils/cache');

const PRODUCTS_CACHE_KEY = 'all_products';

/**
 * Service for Product related business logic.
 */
class ProductService {
    /**
     * Fetches all products with optional filtering, sorting, and pagination.
     * Caches the result.
     * @param {Object} queryOptions - Options for filtering, sorting, pagination.
     * @returns {Array<Object>} List of products.
     */
    static async getAllProducts(queryOptions = {}) {
        const {
            page = 1,
            limit = 10,
            sort = 'createdAt',
            order = 'DESC',
            categoryId,
            search
        } = queryOptions;

        const offset = (page - 1) * limit;

        const where = {};
        if (categoryId) {
            where.categoryId = categoryId;
        }
        if (search) {
            where.name = {
                [Product.sequelize.Op.iLike]: `%${search}%`
            };
        }

        // Generate a unique cache key for these query options
        const cacheKey = `${PRODUCTS_CACHE_KEY}_${JSON.stringify(queryOptions)}`;
        const cachedProducts = getCache(cacheKey);
        if (cachedProducts) {
            logger.debug(`Serving products from cache: ${cacheKey}`);
            return cachedProducts;
        }

        const products = await Product.findAndCountAll({
            where,
            include: [{
                model: Category,
                as: 'category',
                attributes: ['id', 'name']
            }],
            order: [[sort, order]],
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10)
        });

        // Store in cache
        setCache(cacheKey, products);
        logger.debug(`Products fetched from DB and cached: ${cacheKey}`);
        return products;
    }

    /**
     * Fetches a single product by ID.
     * Caches the result.
     * @param {string} productId - ID of the product.
     * @returns {Object} Product object.
     */
    static async getProductById(productId) {
        const cacheKey = `product_${productId}`;
        const cachedProduct = getCache(cacheKey);
        if (cachedProduct) {
            logger.debug(`Serving product from cache: ${cacheKey}`);
            return cachedProduct;
        }

        const product = await Product.findByPk(productId, {
            include: [
                { model: Category, as: 'category', attributes: ['id', 'name'] },
                { model: Review, as: 'reviews', attributes: ['id', 'rating', 'comment', 'userId', 'createdAt'] }
            ]
        });

        if (!product) {
            throw new AppError('Product not found', 404);
        }

        setCache(cacheKey, product);
        logger.debug(`Product fetched from DB and cached: ${cacheKey}`);
        return product;
    }

    /**
     * Creates a new product (Admin only).
     * @param {Object} productData - Product data.
     * @returns {Object} Created product object.
     */
    static async createProduct(productData) {
        const { categoryId } = productData;
        const category = await Category.findByPk(categoryId);
        if (!category) {
            throw new AppError('Category not found.', 400);
        }
        const newProduct = await Product.create(productData);
        deleteCache(PRODUCTS_CACHE_KEY); // Invalidate all product listings cache
        logger.info(`Product created: ${newProduct.name}`);
        return newProduct;
    }

    /**
     * Updates an existing product (Admin only).
     * @param {string} productId - ID of the product to update.
     * @param {Object} updateData - Data to update.
     * @returns {Object} Updated product object.
     */
    static async updateProduct(productId, updateData) {
        const product = await Product.findByPk(productId);
        if (!product) {
            throw new AppError('Product not found', 404);
        }

        if (updateData.categoryId) {
            const category = await Category.findByPk(updateData.categoryId);
            if (!category) {
                throw new AppError('Category not found.', 400);
            }
        }

        await product.update(updateData);
        deleteCache(`product_${productId}`); // Invalidate specific product cache
        deleteCache(PRODUCTS_CACHE_KEY);     // Invalidate all product listings cache
        logger.info(`Product updated: ${product.name} (ID: ${productId})`);
        return product;
    }

    /**
     * Deletes a product (Admin only).
     * @param {string} productId - ID of the product to delete.
     */
    static async deleteProduct(productId) {
        const product = await Product.findByPk(productId);
        if (!product) {
            throw new AppError('Product not found', 404);
        }
        await product.destroy();
        deleteCache(`product_${productId}`);
        deleteCache(PRODUCTS_CACHE_KEY);
        logger.info(`Product deleted: ${productId}`);
    }

    // --- Category Services (could be in a separate CategoryService) ---
    /**
     * Fetches all categories.
     * @returns {Array<Object>} List of categories.
     */
    static async getAllCategories() {
        // Categories typically don't change often, can cache
        const cacheKey = 'all_categories';
        const cachedCategories = getCache(cacheKey);
        if (cachedCategories) {
            return cachedCategories;
        }

        const categories = await Category.findAll();
        setCache(cacheKey, categories);
        return categories;
    }

    /**
     * Creates a new category (Admin only).
     * @param {Object} categoryData - Category data.
     * @returns {Object} Created category object.
     */
    static async createCategory(categoryData) {
        const newCategory = await Category.create(categoryData);
        deleteCache('all_categories'); // Invalidate category cache
        logger.info(`Category created: ${newCategory.name}`);
        return newCategory;
    }
}

module.exports = ProductService;
```