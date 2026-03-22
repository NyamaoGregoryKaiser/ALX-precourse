```javascript
const express = require('express');
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');
const { cacheProducts } = require('../middleware/cacheMiddleware');
const { validate } = require('../utils/validationSchemas');
const { createProductSchema, updateProductSchema } = require('../utils/validationSchemas');

const router = express.Router();

// Publicly accessible, but still requires auth for now as per requirements
router.get('/', authMiddleware.protect, cacheProducts, productController.getAllProducts);
router.get('/:id', authMiddleware.protect, cacheProducts, productController.getProductById);

// Admin-only routes
router.post(
    '/',
    authMiddleware.protect,
    authMiddleware.authorize('admin'),
    validate(createProductSchema),
    productController.createProduct
);
router.patch(
    '/:id',
    authMiddleware.protect,
    authMiddleware.authorize('admin'),
    validate(updateProductSchema),
    productController.updateProduct
);
router.delete(
    '/:id',
    authMiddleware.protect,
    authMiddleware.authorize('admin'),
    productController.deleteProduct
);

module.exports = router;
```