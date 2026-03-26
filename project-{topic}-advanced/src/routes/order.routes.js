```javascript
const express = require('express');
const orderController = require('../controllers/order.controller');
const { auth, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const Joi = require('joi');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management and retrieval
 */

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order
 *     description: Authenticated users can create orders. Admins can create orders for any user.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: (Optional for users, defaults to current user; required for admins creating orders for others)
 *                 example: 1
 *               productId:
 *                 type: integer
 *                 example: 1
 *               quantity:
 *                 type: integer
 *                 example: 1
 *             example:
 *               productId: 1
 *               quantity: 2
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       "400":
 *         $ref: '#/components/schemas/Error'
 *       "401":
 *         $ref: '#/components/schemas/Error'
 *
 *   get:
 *     summary: Get all orders
 *     description: Admins can retrieve all orders. Users can only retrieve their own orders.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, cancelled]
 *         description: Filter by order status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort by query param (e.g., createdAt:desc,totalPrice:asc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of orders
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
 *                     $ref: '#/components/schemas/Order'
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
 *       "403":
 *         $ref: '#/components/schemas/Error'
 */
router
  .route('/')
  .post(
    auth,
    validate({
      body: Joi.object().keys({
        userId: Joi.number().integer().optional(), // Optional, defaults to req.user.id
        productId: Joi.number().integer().required(),
        quantity: Joi.number().integer().min(1).required(),
      }),
    }),
    orderController.createOrder
  )
  .get(
    auth,
    validate({
      query: Joi.object().keys({
        status: Joi.string().valid('pending', 'completed', 'cancelled'),
        sortBy: Joi.string(),
        limit: Joi.number().integer(),
        page: Joi.number().integer(),
      }),
    }),
    orderController.getOrders
  );

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get a single order
 *     description: Admins can retrieve any order. Users can only retrieve their own orders.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       "401":
 *         $ref: '#/components/schemas/Error'
 *       "403":
 *         $ref: '#/components/schemas/Error'
 *       "404":
 *         $ref: '#/components/schemas/Error'
 *
 *   patch:
 *     summary: Update an order
 *     description: Only admins can update orders (e.g., status, quantity). Users can only update their own order status to 'cancelled'.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *                 example: 3
 *               status:
 *                 type: string
 *                 enum: [pending, completed, cancelled]
 *                 example: "completed"
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
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
 *     summary: Delete an order
 *     description: Only admins can delete orders.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order id
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
  .route('/:orderId')
  .get(
    auth,
    validate({
      params: Joi.object().keys({
        orderId: Joi.number().integer().required(),
      }),
    }),
    orderController.getOrder
  )
  .patch(
    auth,
    validate({
      params: Joi.object().keys({
        orderId: Joi.number().integer().required(),
      }),
      body: Joi.object().keys({
        quantity: Joi.number().integer().min(1),
        status: Joi.string().valid('pending', 'completed', 'cancelled'),
      }).min(1),
    }),
    orderController.updateOrder
  )
  .delete(
    auth,
    authorize(['admin']),
    validate({
      params: Joi.object().keys({
        orderId: Joi.number().integer().required(),
      }),
    }),
    orderController.deleteOrder
  );

module.exports = router;
```