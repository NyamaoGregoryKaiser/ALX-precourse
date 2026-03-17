```javascript
const express = require('express');
const productController = require('../controllers/productController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validatorMiddleware');
const {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
  listProductsQuerySchema
} = require('../validators/productValidator');

const router = express.Router();

// Publicly accessible product routes (read-only)
router.get('/', validate({ query: listProductsQuerySchema }), productController.getAllProducts);
router.get('/:id', validate({ params: productIdSchema }), productController.getProductById);

// Authenticated and authorized routes
// Admin or 'user' role can create/update their own products, but for simplicity, let's allow 'user' to create
router.post(
  '/',
  protect,
  authorize('admin', 'user'), // Both admins and regular users can create products
  validate({ body: createProductSchema }),
  productController.createProduct
);

// Admins can update any product, regular users can update their own products (logic in controller/service)
router.put(
  '/:id',
  protect,
  authorize('admin', 'user'),
  validate({ params: productIdSchema, body: updateProductSchema }),
  productController.updateProduct
);

// Only admins can delete/restore products
router.delete(
  '/:id',
  protect,
  authorize('admin'),
  validate({ params: productIdSchema }),
  productController.deleteProduct
);

router.post(
  '/:id/restore',
  protect,
  authorize('admin'),
  validate({ params: productIdSchema }),
  productController.restoreProduct
);

module.exports = router;
```