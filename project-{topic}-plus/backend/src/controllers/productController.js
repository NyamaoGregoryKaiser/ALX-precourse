```javascript
const productService = require('../services/productService');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/appError');
const cacheMiddleware = require('../middlewares/cacheMiddleware');
const redisClient = require('../utils/redisClient');
const logger = require('../utils/logger');

class ProductController {
  /**
   * @swagger
   * /products:
   *   get:
   *     summary: Get all products
   *     tags: [Products]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Number of items per page
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search by product name or description
   *       - in: query
   *         name: category
   *         schema:
   *           type: string
   *         description: Filter by product category
   *       - in: query
   *         name: minPrice
   *         schema:
   *           type: number
   *         description: Minimum price for filtering
   *       - in: query
   *         name: maxPrice
   *         schema:
   *           type: number
   *         description: Maximum price for filtering
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [name, price, createdAt, updatedAt]
   *           default: createdAt
   *         description: Field to sort by
   *       - in: query
   *         name: order
   *         schema:
   *           type: string
   *           enum: [ASC, DESC]
   *           default: DESC
   *         description: Sort order
   *     responses:
   *       200:
   *         description: List of products retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Products retrieved successfully."
   *                 data:
   *                   type: object
   *                   properties:
   *                     totalItems:
   *                       type: integer
   *                     totalPages:
   *                       type: integer
   *                     currentPage:
   *                       type: integer
   *                     products:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/Product'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  getAllProducts = [
    cacheMiddleware('products'), // Apply caching middleware
    asyncHandler(async (req, res) => {
      const productsData = await productService.getAllProducts(req.query);

      res.status(200).json({
        success: true,
        message: 'Products retrieved successfully.',
        data: productsData,
      });
    })
  ];

  /**
   * @swagger
   * /products/{id}:
   *   get:
   *     summary: Get a product by ID
   *     tags: [Products]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: string
   *           format: uuid
   *         required: true
   *         description: ID of the product to retrieve
   *     responses:
   *       200:
   *         description: Product retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Product retrieved successfully."
   *                 data:
   *                   $ref: '#/components/schemas/Product'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  getProductById = [
    cacheMiddleware('product'),
    asyncHandler(async (req, res) => {
      const product = await productService.getProductById(req.params.id);

      res.status(200).json({
        success: true,
        message: 'Product retrieved successfully.',
        data: product,
      });
    })
  ];

  /**
   * @swagger
   * /products:
   *   post:
   *     summary: Create a new product
   *     tags: [Products]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ProductInput'
   *     responses:
   *       201:
   *         description: Product created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Product created successfully."
   *                 data:
   *                   $ref: '#/components/schemas/Product'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       409:
   *         $ref: '#/components/responses/Conflict'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  createProduct = asyncHandler(async (req, res) => {
    const newProduct = await productService.createProduct(req.body, req.user.id);
    if (redisClient.isReady) {
      await redisClient.del('products:*'); // Invalidate products cache on creation
      logger.info('Invalidated products cache.');
    }
    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: newProduct,
    });
  });

  /**
   * @swagger
   * /products/{id}:
   *   put:
   *     summary: Update a product by ID
   *     tags: [Products]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: string
   *           format: uuid
   *         required: true
   *         description: ID of the product to update
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ProductInput'
   *     responses:
   *       200:
   *         description: Product updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Product updated successfully."
   *                 data:
   *                   $ref: '#/components/schemas/Product'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       409:
   *         $ref: '#/components/responses/Conflict'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  updateProduct = asyncHandler(async (req, res) => {
    const updatedProduct = await productService.updateProduct(req.params.id, req.body);
    if (redisClient.isReady) {
      await redisClient.del(`product:${req.originalUrl}`); // Invalidate specific product cache
      await redisClient.del('products:*'); // Invalidate all products cache
      logger.info(`Invalidated cache for product ID: ${req.params.id} and all products.`);
    }
    res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      data: updatedProduct,
    });
  });

  /**
   * @swagger
   * /products/{id}:
   *   delete:
   *     summary: Delete a product by ID (soft delete)
   *     tags: [Products]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: string
   *           format: uuid
   *         required: true
   *         description: ID of the product to delete
   *     responses:
   *       204:
   *         description: Product soft-deleted successfully (No Content)
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  deleteProduct = asyncHandler(async (req, res) => {
    await productService.deleteProduct(req.params.id);
    if (redisClient.isReady) {
      await redisClient.del(`product:${req.originalUrl}`);
      await redisClient.del('products:*');
      logger.info(`Invalidated cache for product ID: ${req.params.id} and all products.`);
    }
    res.status(204).send(); // No content for successful deletion
  });

  /**
   * @swagger
   * /products/{id}/restore:
   *   post:
   *     summary: Restore a soft-deleted product by ID
   *     tags: [Products]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: string
   *           format: uuid
   *         required: true
   *         description: ID of the product to restore
   *     responses:
   *       200:
   *         description: Product restored successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Product restored successfully."
   *                 data:
   *                   $ref: '#/components/schemas/Product'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  restoreProduct = asyncHandler(async (req, res) => {
    const restoredProduct = await productService.restoreProduct(req.params.id);
    if (redisClient.isReady) {
      await redisClient.del('products:*'); // Invalidate all products cache
      logger.info(`Invalidated products cache after restoring product ID: ${req.params.id}`);
    }
    res.status(200).json({
      success: true,
      message: 'Product restored successfully.',
      data: restoredProduct,
    });
  });
}

module.exports = new ProductController();
```