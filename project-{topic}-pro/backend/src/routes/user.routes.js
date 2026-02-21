const express = require('express');
const userController = require('../controllers/user.controller');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

router.get('/me', userController.getCurrentUser);

// Admin-only routes (optional, if you want specific admin functionalities)
router.use(restrictTo('admin')); // Only admin can access routes below this line

router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUser);
// No update/delete for general users by design for /users/:id to simplify,
// but an admin could have these. User updates own profile via /me.

module.exports = router;