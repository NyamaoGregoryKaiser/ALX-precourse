const express = require('express');
const authController = require('../controllers/authController');
const authValidator = require('../validators/authValidator');
const apiLimiter = require('../../middlewares/rateLimitMiddleware');

const router = express.Router();

router.post('/register', apiLimiter, authValidator.validateRegister, authController.register);
router.post('/login', apiLimiter, authValidator.validateLogin, authController.login);
router.post('/logout', authController.logout); // Logout usually doesn't need rate limiting as it destroys client-side token

module.exports = router;