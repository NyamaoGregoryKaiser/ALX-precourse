```javascript
const ProductService = require('../services/productService');
const { AppError } = require('../utils/appError');
const logger = require('../utils/logger');

/**
 * Controller for product and category management.
 */
class ProductController {
    /**
     * Get all products with optional filters, sorting, and pagination.
     * GET /api/v1/products
     */
    static async getAllProducts(req, res, next) {
        try {
            const { page, limit, sort, order, categoryId, search } = req.query;
            const products = await ProductService.getAllProducts({
                page,
                limit,
                sort,
                order,
                categoryId,
                search
            });
            res.status(200).json({
                status: 'success',
                results: products.rows.length,
                total: products.count,
                page: parseInt(page || 1, 10),
                limit: parseInt(limit || 10, 10),
                data: { products: products.rows }
            });
        } catch (error) {
            logger.error(`Error getting all products: ${error.message}`);
            next(error);
        }
    }

    /**
     * Get a single product by ID.
     * GET /api/v1/products/:id
     */
    static async getProductById(req, res, next) {
        try {
            const product = await ProductService.getProductById(req.params.id);
            res.status(200).json({
                status: 'success',
                data: { product }
            });
        } catch (error) {
            logger.error(`Error getting product by ID ${req.params.id}: ${error.message}`);
            next(error);
        }
    }

    /**
     * Create a new product (Admin only).
     * POST /api/v1/products
     */
    static async createProduct(req, res, next) {
        try {
            const { name, description, price, imageUrl, stock, categoryId } = req.body;
            if (!name || !price || !stock || !categoryId) {
                return next(new AppError('Missing required fields: name, price, stock, categoryId.', 400));
            }
            const newProduct = await ProductService.createProduct({ name, description, price, imageUrl, stock, categoryId });
            res.status(201).json({
                status: 'success',
                message: 'Product created successfully.',
                data: { product: newProduct }
            });
        } catch (error) {
            logger.error(`Error creating product: ${error.message}`);
            next(error);
        }
    }

    /**
     * Update an existing product (Admin only).
     * PUT /api/v1/products/:id
     */
    static async updateProduct(req, res, next) {
        try {
            const updatedProduct = await ProductService.updateProduct(req.params.id, req.body);
            res.status(200).json({
                status: 'success',
                message: 'Product updated successfully.',
                data: { product: updatedProduct }
            });
        } catch (error) {
            logger.error(`Error updating product ID ${req.params.id}: ${error.message}`);
            next(error);
        }
    }

    /**
     * Delete a product (Admin only).
     * DELETE /api/v1/products/:id
     */
    static async deleteProduct(req, res, next) {
        try {
            await ProductService.deleteProduct(req.params.id);
            res.status(204).json({
                status: 'success',
                data: null
            });
        } catch (error) {
            logger.error(`Error deleting product ID ${req.params.id}: ${error.message}`);
            next(error);
        }
    }

    // --- Category Controllers (can be in a separate CategoryController) ---

    /**
     * Get all categories.
     * GET /api/v1/categories
     */
    static async getAllCategories(req, res, next) {
        try {
            const categories = await ProductService.getAllCategories();
            res.status(200).json({
                status: 'success',
                results: categories.length,
                data: { categories }
            });
        } catch (error) {
            logger.error(`Error getting all categories: ${error.message}`);
            next(error);
        }
    }

    /**
     * Create a new category (Admin only).
     * POST /api/v1/categories
     */
    static async createCategory(req, res, next) {
        try {
            const { name, description } = req.body;
            if (!name) {
                return next(new AppError('Missing required field: name.', 400));
            }
            const newCategory = await ProductService.createCategory({ name, description });
            res.status(201).json({
                status: 'success',
                message: 'Category created successfully.',
                data: { category: newCategory }
            });
        } catch (error) {
            logger.error(`Error creating category: ${error.message}`);
            next(error);
        }
    }
}

module.exports = ProductController;
```