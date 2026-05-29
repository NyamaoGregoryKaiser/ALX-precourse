```javascript
const express = require('express');
const userController = require('../controllers/userController');
const { auth } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { userValidation } = require('../utils/validation');
const { ROLES } = require('../config/constants');

const router = express.Router();

router
  .route('/')
  .post(auth(ROLES.ADMIN), validate(userValidation.createUser), userController.getUsers) // Admin can create users, though register handles self-creation
  .get(auth(ROLES.ADMIN), validate(userValidation.getUsers), userController.getUsers);

router
  .route('/:userId')
  .get(auth(ROLES.ADMIN, ROLES.USER), validate(userValidation.getUser), userController.getUser)
  .patch(auth(ROLES.ADMIN, ROLES.USER), validate(userValidation.updateUser), userController.updateUser)
  .delete(auth(ROLES.ADMIN), validate(userValidation.deleteUser), userController.deleteUser);

module.exports = router;
```