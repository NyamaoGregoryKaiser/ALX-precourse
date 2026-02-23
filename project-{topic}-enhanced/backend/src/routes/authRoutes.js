```javascript
const express = require('express');
const authController = require('../controllers/authController');
const { validate, userSchemas } = require('../middlewares/validation');
const { authLimiter } = require('../middlewares/rateLimit');

const router = express.Router();

router.post('/register', authLimiter, validate(userSchemas.register), authController.register);
router.post('/login', authLimiter, validate(userSchemas.login), authController.login);
router.get('/logout', authController.logout); // Logout doesn't need rate limit usually

module.exports = router;
```