```javascript
const { StatusCodes } = require('http-status-codes');
const Product = require('../models/Product');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const productCache = require('../middleware/cacheMiddleware').productCache;

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management operations
 */

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter products by name
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter products by category
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Filter products by minimum price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Filter products by maximum price
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, price, createdAt]
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *         default: ASC
 *         description: Sort order
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         default: 10
 *         description: Number of products per page
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 results:
 *                   type: integer
 *                   example: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       401:
 *         $ref: '#/components/schemas/Error'
 */
exports.getAllProducts = catchAsync(async (req, res) => {
    const { name, category, minPrice, maxPrice, sortBy, order, page = 1, limit = 10 } = req.query;
    const queryOptions = { where: {} };

    // Filtering
    if (name) queryOptions.where.name = { [Product.sequelize.Op.iLike]: `%${name}%` };
    if (category) queryOptions.where.category = category;
    if (minPrice) queryOptions.where.price = { [Product.sequelize.Op.gte]: parseFloat(minPrice) };
    if (maxPrice) {
        queryOptions.where.price = {
            ...queryOptions.where.price,
            [Product.sequelize.Op.lte]: parseFloat(maxPrice),
        };
    }

    // Sorting
    const validSortFields = ['name', 'price', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = ['ASC', 'DESC'].includes(order?.toUpperCase()) ? order.toUpperCase() : 'DESC';
    queryOptions.order = [[sortField, sortOrder]];

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    queryOptions.limit = parseInt(limit);
    queryOptions.offset = offset;

    const products = await Product.findAndCountAll(queryOptions);

    res.status(StatusCodes.OK).json({
        status: 'success',
        results: products.rows.length,
        total: products.count,
        page: parseInt(page),
        limit: parseInt(limit),
        data: products.rows,
    });
});

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the product to retrieve
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
exports.getProductById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const product = await Product.findByPk(id);

    if (!product) {
        return next(new AppError('Product not found with that ID', StatusCodes.NOT_FOUND));
    }

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: product,
    });
});

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a new product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - price
 *               - quantity
 *             properties:
 *               name:
 *                 type: string
 *                 example: Smartphone X
 *               description:
 *                 type: string
 *                 example: A powerful smartphone with an amazing camera.
 *               price:
 *                 type: number
 *                 format: float
 *                 example: 799.99
 *               quantity:
 *                 type: integer
 *                 example: 100
 *               category:
 *                 type: string
 *                 example: Electronics
 *               imageUrl:
 *                 type: string
 *                 format: url
 *                 example: https://example.com/smartphone.jpg
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - only administrators can create products
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
exports.createProduct = catchAsync(async (req, res, next) => {
    // Clear cache for products after creation
    productCache.del('all_products');

    const newProduct = await Product.create(req.body);

    res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: newProduct,
    });
});

/**
 * @swagger
 * /products/{id}:
 *   patch:
 *     summary: Update an existing product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the product to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Smartphone X Pro
 *               price:
 *                 type: number
 *                 format: float
 *                 example: 849.99
 *               quantity:
 *                 type: integer
 *                 example: 95
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - only administrators can update products
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
exports.updateProduct = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const [updatedRowsCount, updatedProducts] = await Product.update(req.body, {
        where: { id },
        returning: true, // Return the updated object
    });

    if (updatedRowsCount === 0) {
        return next(new AppError('Product not found with that ID', StatusCodes.NOT_FOUND));
    }

    // Clear cache for specific product and all products
    productCache.del(`product_${id}`);
    productCache.del('all_products');

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: updatedProducts[0],
    });
});

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete a product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the product to delete
 *     responses:
 *       204:
 *         description: Product deleted successfully (No Content)
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - only administrators can delete products
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
exports.deleteProduct = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const deletedRowCount = await Product.destroy({ where: { id } });

    if (deletedRowCount === 0) {
        return next(new AppError('Product not found with that ID', StatusCodes.NOT_FOUND));
    }

    // Clear cache for specific product and all products
    productCache.del(`product_${id}`);
    productCache.del('all_products');

    res.status(StatusCodes.NO_CONTENT).json({
        status: 'success',
        data: null,
    });
});
```