```javascript
const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middlewares/validatorMiddleware');
const { registerSchema, loginSchema, refreshSchema } = require('../validators/authValidator');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', validate({ body: registerSchema }), authController.register);
router.post('/login', validate({ body: loginSchema }), authController.login);
router.post('/refresh-token', validate({ body: refreshSchema }), authController.refreshToken);

// Protected routes
router.post('/logout', protect, authController.logout); // Requires a valid access token to initiate logout

module.exports = router;
```