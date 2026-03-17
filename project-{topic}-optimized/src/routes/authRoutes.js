const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Public routes for authentication
router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;