```javascript
// src/routes/merchant.routes.js
const express = require('express');
const merchantController = require('../controllers/merchant.controller');
const { validate } = require('../middlewares/validation');
const { merchantValidation } = require('../validation');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Merchants
 *   description: Merchant management for internal users
 */

/**
 * @swagger
 * /merchants:
 *   post:
 *     summary: Create a new merchant
 *     description: Only internal authenticated users with 'admin' role can create merchants.
 *     tags: [Merchants]
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
 *               - email
 *               - businessCategory
 *             properties:
 *               name:
 *                 type: string
 *                 example: My Online Shop
 *               email:
 *                 type: string
 *                 format: email
 *                 example: merchant@example.com
 *               businessCategory:
 *                 type: string
 *                 example: E-commerce
 *             example:
 *               name: Global Retailers
 *               email: support@globalretailers.com
 *               businessCategory: Retail
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Merchant'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/', validate(merchantValidation.createMerchant), merchantController.createMerchant);

/**
 * @swagger
 * /merchants:
 *   get:
 *     summary: Get all merchants
 *     description: Only internal authenticated users can retrieve all merchants.
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Merchant name
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Merchant email
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of merchants
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
 *                     $ref: '#/components/schemas/Merchant'
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
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', validate(merchantValidation.getMerchants), merchantController.getMerchants);

/**
 * @swagger
 * /merchants/{merchantId}:
 *   get:
 *     summary: Get a merchant by ID
 *     description: Only internal authenticated users can retrieve a merchant by ID.
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Merchant'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:merchantId', validate(merchantValidation.getMerchant), merchantController.getMerchant);

/**
 * @swagger
 * /merchants/{merchantId}:
 *   patch:
 *     summary: Update a merchant
 *     description: Only internal authenticated users with 'admin' role can update merchants.
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated Shop Name
 *               email:
 *                 type: string
 *                 format: email
 *                 example: updated.merchant@example.com
 *               businessCategory:
 *                 type: string
 *                 example: Software
 *             example:
 *               name: Global Tech Solutions
 *               email: sales@globaltech.com
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Merchant'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:merchantId', validate(merchantValidation.updateMerchant), merchantController.updateMerchant);

/**
 * @swagger
 * /merchants/{merchantId}:
 *   delete:
 *     summary: Delete a merchant
 *     description: Only internal authenticated users with 'admin' role can delete merchants.
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *     responses:
 *       "204":
 *         description: No content
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:merchantId', validate(merchantValidation.deleteMerchant), merchantController.deleteMerchant);

module.exports = router;
```