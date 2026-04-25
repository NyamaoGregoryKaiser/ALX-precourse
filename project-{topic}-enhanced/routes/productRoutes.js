```javascript
const express = require('express');
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeMiddleware = require('../middleware/authorizeMiddleware');
const cacheMiddleware = require('../middleware/cacheMiddleware');

const router = express.Router();

// Publicly accessible routes, potentially cached
// cacheMiddleware('products', 60) will cache /products GET requests for 60 seconds
router.get('/', cacheMiddleware('products', 60), productController.getAllProducts);
router.get('/:id', cacheMiddleware('product', 300), productController.getProductById);

// Routes requiring authentication and specific roles for modifications
// All routes below this line require authentication
router.use(authMiddleware.authenticate);

// Only admins can create, update, or delete products
router.post('/', authorizeMiddleware.authorize('admin'), productController.createProduct);
router.put('/:id', authorizeMiddleware.authorize('admin'), productController.updateProduct);
router.delete('/:id', authorizeMiddleware.authorize('admin'), productController.deleteProduct);

module.exports = router;
```