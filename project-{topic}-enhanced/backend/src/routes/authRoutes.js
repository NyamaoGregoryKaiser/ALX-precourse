```javascript
const express = require('express');
const authController = require('../controllers/authController');
const { validate, Schemas } = require('../utils/validator');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, validate(Schemas.register), authController.register);
router.post('/login', authLimiter, validate(Schemas.login), authController.login);
router.get('/logout', authController.logout); // Could be POST for better practice

module.exports = router;
```