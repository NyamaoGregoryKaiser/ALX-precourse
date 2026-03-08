```javascript
const httpStatus = require('http-status-codes');
const authService = require('../services/auth.service');
const userService = require('../services/user.service');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');
const ApiError = require('../utils/apiError');

const register = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  const tokens = await authService.generateAuthTokens(user);
  res.status(httpStatus.CREATED).send({ user, tokens });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await authService.generateAuthTokens(user);
  res.send({ user, tokens });
});

const logout = catchAsync(async (req, res) => {
  // In a real system, you'd invalidate refresh tokens
  // For simplicity, this is a placeholder. JWTs are stateless.
  logger.info('User attempting to logout (JWTs are stateless, but refresh token invalidation would go here).');
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  // Implement refresh token logic if used. This would involve a refresh token stored in DB.
  throw new ApiError(httpStatus.NOT_IMPLEMENTED, 'Refresh token endpoint not fully implemented in this example.');
});

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
};
```