const httpStatus = require('http-status');
const authService = require('../../services/authService');
const catchAsync = require('../../utils/catchAsync');

const register = catchAsync(async (req, res) => {
  const user = await authService.registerUser(req.body.username, req.body.email, req.body.password);
  const tokens = authService.generateAuthTokens(user.id);
  res.status(httpStatus.CREATED).send({ user: { id: user.id, username: user.username, email: user.email }, tokens });
});

const login = catchAsync(async (req, res) => {
  const user = await authService.loginUser(req.body.username, req.body.password);
  const tokens = authService.generateAuthTokens(user.id);
  res.send({ user: { id: user.id, username: user.username, email: user.email }, tokens });
});

const logout = catchAsync(async (req, res) => {
  // In a stateless JWT system, logout is often client-side (deleting the token).
  // If tokens were blacklisted on the server, this is where that logic would go.
  // For now, simply confirming receipt.
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  register,
  login,
  logout,
};