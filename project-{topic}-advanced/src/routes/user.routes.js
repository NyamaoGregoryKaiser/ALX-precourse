```javascript
const express = require('express');
const userController = require('../controllers/user.controller');
const auth = require('../middleware/auth.middleware');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();

router
  .route('/')
  .post(auth(USER_ROLES.ADMIN), userController.createUser) // Admin can create users
  .get(auth(USER_ROLES.ADMIN), userController.getUsers); // Admin can get all users

router
  .route('/:userId')
  .get(auth(), userController.getUser) // User can get their own profile, Admin can get any user
  .patch(auth(), userController.updateUser) // User can update their own profile, Admin can update any
  .delete(auth(USER_ROLES.ADMIN), userController.deleteUser); // Admin can delete users

module.exports = router;
```