```javascript
import express from 'express';
import httpStatus from 'http-status';
import authService from '../services/authService.js';
import logger from '../config/logger.js';
import auth from '../middleware/auth.js';

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @description Register a new user
 * @access Public
 */
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(httpStatus.BAD_REQUEST).send({ message: 'Missing required fields: username, email, password' });
    }
    const { user, tokens } = await authService.register({ username, email, password });
    res.status(httpStatus.CREATED).send({ user, tokens });
  } catch (error) {
    logger.error('Registration error:', error.message);
    next(error);
  }
});

/**
 * @route POST /api/auth/login
 * @description Authenticate user and get tokens
 * @access Public
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(httpStatus.BAD_REQUEST).send({ message: 'Missing required fields: email, password' });
    }
    const { user, tokens } = await authService.login(email, password);
    res.status(httpStatus.OK).send({ user, tokens });
  } catch (error) {
    logger.error('Login error:', error.message);
    next(error);
  }
});

/**
 * @route POST /api/auth/refresh-token
 * @description Refresh authentication tokens
 * @access Public (requires refresh token)
 */
router.post('/refresh-token', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(httpStatus.BAD_REQUEST).send({ message: 'Missing refresh token' });
    }
    const { user, tokens } = await authService.refreshAuth(refreshToken);
    res.status(httpStatus.OK).send({ user, tokens });
  } catch (error) {
    logger.error('Refresh token error:', error.message);
    next(error);
  }
});

/**
 * @route POST /api/auth/logout
 * @description Log out user
 * @access Private
 */
router.post('/logout', auth, async (req, res, next) => {
  try {
    await authService.logout(req.user.id);
    res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    logger.error('Logout error:', error.message);
    next(error);
  }
});

export default router;
```