import authService from './auth.service.js';
import catchAsync from '../utils/catchAsync.js';

const register = catchAsync(async (req, res) => {
  const user = await authService.registerUser(req.body);
  res.status(201).json({
    status: 'success',
    data: user,
  });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.loginUser(email, password);
  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const refreshTokens = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshTokens(refreshToken);
  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const logout = catchAsync(async (req, res) => {
  const { refreshToken } = req.body; // Expect refresh token in body for logout
  await authService.logoutUser(refreshToken);
  res.status(204).send(); // No content for successful logout
});

export default {
  register,
  login,
  refreshTokens,
  logout,
};
```

```javascript