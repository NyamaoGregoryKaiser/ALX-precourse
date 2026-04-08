const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../utils/validationSchemas');
const limiter = require('../middleware/rateLimit');

// Apply rate limiting to auth routes to prevent brute-force attacks
router.post('/register', limiter, validate(registerSchema, 'body'), authController.register);
router.post('/login', limiter, validate(loginSchema, 'body'), authController.login);
router.post('/refresh-token', limiter, authController.refreshToken); // Placeholder

module.exports = router;
```