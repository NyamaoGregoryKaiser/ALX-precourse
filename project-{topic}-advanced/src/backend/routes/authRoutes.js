```javascript
const express = require('express');
const authController = require('../controllers/authController');
const { validate } = require('../utils/validationSchemas');
const { registerSchema, loginSchema } = require('../utils/validationSchemas');

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

module.exports = router;
```