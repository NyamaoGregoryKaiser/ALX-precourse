```javascript
const express = require('express');
const ProductController = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes (view products)
router.route('/')
    .get(ProductController.getAllProducts);

router.route('/:id')
    .get(ProductController.getProductById);

// Admin routes (create, update, delete products)
router.route('/')
    .post(protect, authorize('admin'), ProductController.createProduct);

router.route('/:id')
    .put(protect, authorize('admin'), ProductController.updateProduct)
    .delete(protect, authorize('admin'), ProductController.deleteProduct);

// Category routes (can be public for viewing, admin for creation)
router.route('/categories')
    .get(ProductController.getAllCategories)
    .post(protect, authorize('admin'), ProductController.createCategory);

module.exports = router;
```