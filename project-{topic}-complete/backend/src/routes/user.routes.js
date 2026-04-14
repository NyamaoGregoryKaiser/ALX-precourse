```javascript
const express = require('express');
const userController = require('../controllers/user.controller');
const { verifyToken, authorize } = require('../middleware/auth.middleware');
const { cacheMiddleware } = require('../middleware/cache.middleware');

const router = express.Router();

router.use(verifyToken); // All user routes require authentication

router
    .route('/')
    .get(authorize('admin'), cacheMiddleware(300), userController.getUsers); // Only admin can get all users

router
    .route('/:userId')
    .get(userController.getUser) // User can get their own info, admin can get any
    .patch(userController.updateUser) // User can update their own info, admin can update any
    .delete(authorize('admin'), userController.deleteUser); // Only admin can delete users

module.exports = router;
```