```javascript
const express = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const authValidation = require('../validators/auth.validator');

const router = express.Router();

router.post('/register', validate(authValidation.register), authController.register);
router.post('/login', validate(authValidation.login), authController.login);
router.post('/logout', authController.logout); // Implement logout if using refresh tokens
router.post('/refresh-tokens', authController.refreshTokens); // Requires refresh token logic

module.exports = router;
```