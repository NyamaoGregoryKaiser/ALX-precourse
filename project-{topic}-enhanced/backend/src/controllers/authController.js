```javascript
const authService = require('../services/authService');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');
const config = require('../config');

// Helper to send JWT token in cookie and response
const sendTokenResponse = (user, statusCode, res, token) => {
  const cookieOptions = {
    expires: new Date(Date.now() + config.jwt.expiration.slice(0, -1) * 24 * 60 * 60 * 1000), // Convert '1h' to actual milliseconds for cookie expiry
    httpOnly: true, // Prevent client-side JS from accessing the cookie
    secure: config.env === 'production', // Only send over HTTPS in production
    sameSite: 'Lax', // Protect against CSRF, 'None' for cross-site with secure:true
  };

  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    token,
    user,
  });
};

const register = catchAsync(async (req, res, next) => {
  const { name, email, password, role } = req.body;
  const newUser = await authService.register(name, email, password, role);

  const { token, user } = await authService.login(email, password); // Log in the user immediately after registration

  sendTokenResponse(user, 201, res, token);
});

const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const { token, user } = await authService.login(email, password);

  sendTokenResponse(user, 200, res, token);
});

const logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000), // Expire in 10 seconds
    httpOnly: true,
  });
  logger.info('User logged out');
  res.status(200).json({ status: 'success', message: 'Logged out successfully' });
};

module.exports = {
  register,
  login,
  logout,
};
```