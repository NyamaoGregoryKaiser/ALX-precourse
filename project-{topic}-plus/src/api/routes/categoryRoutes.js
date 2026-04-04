```javascript
const express = require('express');
const categoryController = require('../controllers/categoryController');
const protect = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validationMiddleware');
const cacheMiddleware = require('../middlewares/cacheMiddleware');
const Joi = require('joi');

const router = express.Router();

// Joi schemas for request validation
const categoryIdSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
});

const createCategorySchema = Joi.object({
  body: Joi.object({
    name: Joi.string().min(1).max(50).required(),
  }),
});

const updateCategorySchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    name: Joi.string().min(1).max(50).required(),
  }),
});

const querySchema = Joi.object({
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().default('-createdAt'), // e.g., 'name', '-createdAt'
    name: Joi.string(), // Filter by category name
  }).unknown(true), // Allow other query parameters that APIFeatures might handle
});

router.use(protect); // All routes after this middleware require authentication

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Task category management
 */

/**
 * @swagger
 * /api/v1/categories:
 *   post:
 *     summary: Create a new task category for the authenticated user
 *     tags: [Categories]
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
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 description: The name of the category.
 *                 example: Work Tasks
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     category:
 *                       $ref: '#/components/schemas/Category'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', validate(createCategorySchema), cacheMiddleware.clear(['cache:*:categories:*', 'cache:*:tasks:*']), categoryController.createCategory);

/**
 * @swagger
 * /api/v1/categories:
 *   get:
 *     summary: Get all task categories for the authenticated user
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of categories per page.
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort order (e.g., 'name', '-createdAt').
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by category name (case-insensitive partial match).
 *     responses:
 *       200:
 *         description: List of categories retrieved successfully
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
 *                   description: Number of categories returned in this response.
 *                 total:
 *                   type: integer
 *                   description: Total number of categories available.
 *                 data:
 *                   type: object
 *                   properties:
 *                     categories:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Category'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', validate(querySchema), cacheMiddleware(), categoryController.getAllCategories);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   get:
 *     summary: Get a specific task category by ID for the authenticated user
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the category to retrieve.
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     category:
 *                       $ref: '#/components/schemas/Category'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:id', validate(categoryIdSchema), cacheMiddleware(), categoryController.getCategoryById);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   patch:
 *     summary: Update a task category for the authenticated user
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the category to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 description: The new name for the category.
 *                 example: Home Chores
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     category:
 *                       $ref: '#/components/schemas/Category'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch('/:id', validate(updateCategorySchema), cacheMiddleware.clear(['cache:*:categories:*', 'cache:*:tasks:*']), categoryController.updateCategory);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   delete:
 *     summary: Delete a task category for the authenticated user
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the category to delete.
 *     responses:
 *       204:
 *         description: Category deleted successfully (No Content). Tasks previously associated with this category will have their categoryId set to null.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/:id', validate(categoryIdSchema), cacheMiddleware.clear(['cache:*:categories:*', 'cache:*:tasks:*']), categoryController.deleteCategory);

module.exports = router;
```