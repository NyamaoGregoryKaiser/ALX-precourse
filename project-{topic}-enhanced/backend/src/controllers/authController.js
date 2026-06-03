```javascript
const authService = require('../services/authService');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');

const sendTokenResponse = (user, token, statusCode, res) => {
  // Options for cookie (optional, can just send token in body)
  const cookieOptions = {
    expires: new Date(Date.now() + require('../config').jwt.expirationTime.match(/\d+/)[0] * 24 * 60 * 60 * 1000), // Convert '1d' to ms
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    sameSite: 'strict',
  };

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

const register = catchAsync(async (req, res, next) => {
  const { user, token } = await authService.registerUser(req.body);
  sendTokenResponse(user, token, 201, res);
});

const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const { user, token } = await authService.loginUser(email, password);
  sendTokenResponse(user, token, 200, res);
});

const logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000), // Expire in 10 seconds
    httpOnly: true,
  });
  res.status(200).json({ status: 'success', message: 'Logged out successfully' });
};

module.exports = {
  register,
  login,
  logout,
};
```