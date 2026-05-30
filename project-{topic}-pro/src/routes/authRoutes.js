const express = require('express');
const AuthController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authRateLimiter, AuthController.register);
router.post('/login', authRateLimiter, AuthController.login);
router.get('/profile', auth(), AuthController.getProfile); // Protected route

module.exports = router;