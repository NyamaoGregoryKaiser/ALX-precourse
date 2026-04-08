const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, authorizeRoles } = require('../middleware/authJwt');
const validate = require('../middleware/validate');
const { createProductSchema, updateProductSchema, productIdSchema, productQuerySchema } = require('../utils/validationSchemas');
const { cacheMiddleware, clearCache } = require('../middleware/cache');
const logger = require('../config/logger');

// Middleware to clear product cache after CUD operations
const clearProductCache = async (req, res, next) => {
  await clearCache('products:*'); // Clear all product-related cache entries
  next();
};

// GET all products (paginated, searchable, cached)
router.get('/',
  validate(productQuerySchema, 'query'),
  cacheMiddleware('products'), // Cache for 1 hour
  productController.getAllProducts,
);

// GET product by ID
router.get('/:id',
  validate(productIdSchema, 'params'),
  productController.getProductById,
);

// POST create product (requires authentication)
router.post('/',
  authenticateToken,
  validate(createProductSchema, 'body'),
  clearProductCache,
  productController.createProduct,
);

// PUT update product by ID (requires authentication, admin or owner)
router.put('/:id',
  authenticateToken,
  validate(productIdSchema, 'params'),
  validate(updateProductSchema, 'body'),
  clearProductCache,
  productController.updateProduct,
);

// DELETE product by ID (requires authentication, admin or owner)
router.delete('/:id',
  authenticateToken,
  validate(productIdSchema, 'params'),
  clearProductCache,
  productController.deleteProduct,
);

module.exports = router;
```