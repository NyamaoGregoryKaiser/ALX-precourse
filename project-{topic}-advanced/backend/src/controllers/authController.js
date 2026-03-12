const asyncHandler = require('../middleware/asyncHandler');
const authService = require('../services/authService');
const logger = require('../utils/logger');

const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    res.status(400);
    throw new Error('Please enter all fields');
  }

  const userData = await authService.registerUser(username, email, password);
  res.status(201).json(userData);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Please enter email and password');
  }

  const userData = await authService.loginUser(email, password);
  res.status(200).json(userData);
});

const getMe = asyncHandler(async (req, res) => {
  // req.user is set by the protect middleware
  const user = req.user;
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.status(200).json(user);
});

module.exports = {
  register,
  login,
  getMe,
};
```

### `backend/src/controllers/userController.js` (User Route Handlers)
```javascript