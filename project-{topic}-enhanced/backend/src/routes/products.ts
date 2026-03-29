```typescript
import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';
import { invalidateProductCacheMiddleware } from '../utils/cache';

const router = Router();
const productController = new ProductController();

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management operations
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
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
 *             type: object
 *             required:
 *               - name
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the product
 *               description:
 *                 type: string
 *                 description: Description of the product (optional)
 *               price:
 *                 type: number
 *                 format: float
 *                 description: Price of the product
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Missing name or price
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Product with this name already exists
 *       500:
 *         description: Failed to create product
 */
router.route('/')
  .get(authenticateToken, productController.getAllProducts)
  .post(authenticateToken, invalidateProductCacheMiddleware, productController.createProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a product by ID
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
 *         description: ID of the product to retrieve
 *     responses:
 *       200:
 *         description: Product data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 *   put:
 *     summary: Update a product by ID (Admin or owner)
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
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *                 format: float
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not admin or not owner)
 *       404:
 *         description: Product not found
 *       409:
 *         description: Product with updated name already exists
 *       500:
 *         description: Failed to update product
 *   delete:
 *     summary: Delete a product by ID (Admin or owner)
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
 *         description: Product deleted successfully (No Content)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not admin or not owner)
 *       404:
 *         description: Product not found
 *       500:
 *         description: Failed to delete product
 */
router.route('/:id')
  .get(authenticateToken, productController.getProductById)
  .put(authenticateToken, invalidateProductCacheMiddleware, productController.updateProduct)
  .delete(authenticateToken, invalidateProductCacheMiddleware, productController.deleteProduct);

export default router;
```