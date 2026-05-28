```javascript
const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const productRoutes = require('./productRoutes');
const cartRoutes = require('./cartRoutes');
const orderRoutes = require('./orderRoutes');
const { protect, authorize } = require('../middleware/authMiddleware'); // Import auth middleware

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', protect, userRoutes); // User profile routes require authentication
router.use('/products', productRoutes); // Products can be viewed without auth
router.use('/categories', productRoutes); // Categories handled by product controller/service
router.use('/cart', protect, cartRoutes); // Cart requires authentication
router.use('/orders', protect, orderRoutes); // Orders require authentication

// Admin routes (example)
router.use('/admin/users', protect, authorize('admin'), userRoutes); // Admin can manage all users
router.use('/admin/products', protect, authorize('admin'), productRoutes); // Admin can manage products
router.use('/admin/categories', protect, authorize('admin'), productRoutes); // Admin can manage categories
router.use('/admin/orders', protect, authorize('admin'), orderRoutes); // Admin can manage all orders

// Add API documentation route (Swagger/OpenAPI)
// This is a placeholder. You would typically use `swagger-jsdoc` and `swagger-ui-express`
// to generate and serve OpenAPI documentation based on JSDoc comments or a separate spec file.
// For example:
// const swaggerUi = require('swagger-ui-express');
// const swaggerSpec = require('../config/swagger'); // Your Swagger spec
// router.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

module.exports = router;
```