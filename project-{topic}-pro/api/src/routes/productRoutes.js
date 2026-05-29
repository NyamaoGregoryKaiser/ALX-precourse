```javascript
const express = require('express');
const productController = require('../controllers/productController');
const { auth } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { productValidation, categoryValidation } = require('../utils/validation');
const { ROLES } = require('../config/constants');
const cacheMiddleware = require('../middleware/cacheMiddleware');
const { CACHE_TTL_MEDIUM } = require('../config/constants');

const router = express.Router();

// Product routes
router
  .route('/')
  .post(auth(ROLES.ADMIN), validate(productValidation.createProduct), productController.createProduct)
  .get(cacheMiddleware(CACHE_TTL_MEDIUM), validate(productValidation.getProducts), productController.getProducts);

router
  .route('/:productId')
  .get(cacheMiddleware(CACHE_TTL_MEDIUM), validate(productValidation.getProduct), productController.getProduct)
  .patch(auth(ROLES.ADMIN), validate(productValidation.updateProduct), productController.updateProduct)
  .delete(auth(ROLES.ADMIN), validate(productValidation.deleteProduct), productController.deleteProduct);

// Category routes
router
  .route('/categories')
  .post(auth(ROLES.ADMIN), validate(categoryValidation.createCategory), productController.createCategory)
  .get(cacheMiddleware(CACHE_TTL_MEDIUM), productController.getCategories); // Caching categories

router
  .route('/categories/:categoryId')
  .get(cacheMiddleware(CACHE_TTL_MEDIUM), validate(categoryValidation.getCategory), productController.getCategory)
  .patch(auth(ROLES.ADMIN), validate(categoryValidation.updateCategory), productController.updateCategory)
  .delete(auth(ROLES.ADMIN), validate(categoryValidation.deleteCategory), productController.deleteCategory);

module.exports = router;
```