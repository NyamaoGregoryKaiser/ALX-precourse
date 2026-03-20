const express = require('express');
const authController = require('../controllers/auth.controller');
const { validate, registerSchema, loginSchema } = require('../utils/validation');

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

module.exports = router;