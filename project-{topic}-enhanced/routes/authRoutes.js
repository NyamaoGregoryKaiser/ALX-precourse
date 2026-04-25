```javascript
const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
// Logout typically invalidates the refresh token (if stored server-side) or makes it unusable.
// This route is protected to ensure only authenticated users can trigger a logout (of their own token).
router.post('/logout', authMiddleware.authenticate, authController.logout);

router.get('/profile', authMiddleware.authenticate, authController.getProfile);

module.exports = router;
```