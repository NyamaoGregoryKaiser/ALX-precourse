const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, authorizeRoles } = require('../middleware/authJwt');
const validate = require('../middleware/validate');
const { userIdSchema, updateUserSchema, userQuerySchema } = require('../utils/validationSchemas');

// All user routes require authentication and admin role
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

// GET all users (paginated)
router.get('/',
  validate(userQuerySchema, 'query'),
  userController.getAllUsers,
);

// GET user by ID
router.get('/:id',
  validate(userIdSchema, 'params'),
  userController.getUserById,
);

// PUT update user by ID
router.put('/:id',
  validate(userIdSchema, 'params'),
  validate(updateUserSchema, 'body'),
  userController.updateUser,
);

// DELETE user by ID
router.delete('/:id',
  validate(userIdSchema, 'params'),
  userController.deleteUser,
);

module.exports = router;
```