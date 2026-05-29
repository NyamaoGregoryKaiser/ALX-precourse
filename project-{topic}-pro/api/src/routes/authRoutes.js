```javascript
const express = require('express');
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimitMiddleware');
const validate = require('../middleware/validate');
const { userValidation } = require('../utils/validation');
const { refreshAuth } = require('../middleware/authMiddleware'); // For refreshing tokens

const router = express.Router();

router.post('/register', authLimiter, validate(userValidation.register), authController.register);
router.post('/login', authLimiter, validate(userValidation.login), authController.login);
router.post('/logout', authController.logout); // Logout doesn't need validation for body, access token is in header
router.post('/refresh-tokens', refreshAuth, authController.refreshTokens); // Requires refresh token in body or header

// TODO: Add routes for forgot password, reset password, verify email.

module.exports = router;
```