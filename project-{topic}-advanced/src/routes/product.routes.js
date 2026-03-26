```javascript
const express = require('express');
const productController = require('../controllers/product.controller');
const { auth, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const Joi = require('joi');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management and retrieval
 */

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a product
 *     description: Only admins can create products.
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
 *               - price
 *               - stock
 *             properties:
 *               name:
 *                 type: string
 *                 example: "New Gadget"
 *               description:
 *                 type: string
 *                 example: "A revolutionary new gadget."
 *               price:
 *                 type: number
 *                 format: float
 *                 example: 99.99
 *               stock:
 *                 type: integer
 *                 example: 100
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       "400":
 *         $ref: '#/components/schemas/Error'
 *       "401":
 *         $ref: '#/components/schemas/Error'
 *       "403":
 *         $ref: '#/components/schemas/Error'
 *
 *   get:
 *     summary: Get all products
 *     description: All authenticated users can retrieve products.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Product name
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort by query param (e.g., name:asc,price:desc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of products
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *                 totalResults:
 *                   type: integer
 *                   example: 1
 *       "401":
 *         $ref: '#/components/schemas/Error'
 */
router
  .route('/')
  .post(
    auth,
    authorize(['admin']),
    validate({
      body: Joi.object().keys({
        name: Joi.string().required().trim(),
        description: Joi.string().optional().allow(''),
        price: Joi.number().required().min(0),
        stock: Joi.number().integer().required().min(0),
      }),
    }),
    productController.createProduct
  )
  .get(
    auth,
    validate({
      query: Joi.object().keys({
        name: Joi.string(),
        sortBy: Joi.string(),
        limit: Joi.number().integer(),
        page: Joi.number().integer(),
      }),
    }),
    productController.getProducts
  );

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get a product
 *     description: All authenticated users can retrieve product details.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       "401":
 *         $ref: '#/components/schemas/Error'
 *       "404":
 *         $ref: '#/components/schemas/Error'
 *
 *   patch:
 *     summary: Update a product
 *     description: Only admins can update products.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *                 format: float
 *               stock:
 *                 type: integer
 *             example:
 *               name: "Updated Gadget Pro"
 *               price: 109.99
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       "400":
 *         $ref: '#/components/schemas/Error'
 *       "401":
 *         $ref: '#/components/schemas/Error'
 *       "403":
 *         $ref: '#/components/schemas/Error'
 *       "404":
 *         $ref: '#/components/schemas/Error'
 *
 *   delete:
 *     summary: Delete a product
 *     description: Only admins can delete products.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product id
 *     responses:
 *       "204":
 *         description: No Content
 *       "401":
 *         $ref: '#/components/schemas/Error'
 *       "403":
 *         $ref: '#/components/schemas/Error'
 *       "404":
 *         $ref: '#/components/schemas/Error'
 */
router
  .route('/:productId')
  .get(
    auth,
    validate({
      params: Joi.object().keys({
        productId: Joi.number().integer().required(),
      }),
    }),
    productController.getProduct
  )
  .patch(
    auth,
    authorize(['admin']),
    validate({
      params: Joi.object().keys({
        productId: Joi.number().integer().required(),
      }),
      body: Joi.object().keys({
        name: Joi.string().trim(),
        description: Joi.string().optional().allow(''),
        price: Joi.number().min(0),
        stock: Joi.number().integer().min(0),
      }).min(1),
    }),
    productController.updateProduct
  )
  .delete(
    auth,
    authorize(['admin']),
    validate({
      params: Joi.object().keys({
        productId: Joi.number().integer().required(),
      }),
    }),
    productController.deleteProduct
  );

module.exports = router;
```