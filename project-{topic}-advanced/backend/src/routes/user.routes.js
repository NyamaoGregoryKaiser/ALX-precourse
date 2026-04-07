const express = require('express');
const userController = require('../controllers/user.controller');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const userValidation = require('../validators/user.validator');

const router = express.Router();

// Admin-only routes
router
  .route('/')
  .post(auth('admin'), validate(userValidation.createUser), userController.createUser)
  .get(auth('admin'), validate(userValidation.getUsers), userController.getUsers);

router
  .route('/:userId')
  .get(auth('admin'), validate(userValidation.getUser), userController.getUser)
  .patch(auth('admin'), validate(userValidation.updateUser), userController.updateUser)
  .delete(auth('admin'), validate(userValidation.deleteUser), userController.deleteUser);

module.exports = router;