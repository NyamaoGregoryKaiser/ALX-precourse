```javascript
const express = require('express');
const router = express.Router();
const {createUser, getUserById, updateUser, deleteUser} = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', createUser);
router.get('/:id', authMiddleware, getUserById);
router.put('/:id', authMiddleware, updateUser);
router.delete('/:id', authMiddleware, deleteUser);

module.exports = router;
```