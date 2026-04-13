const authService = require('../services/authService');
const { isValidEmail, isValidPassword } = require('../utils/validation');
const { logger } = require('../config/logger');

/**
 * @desc Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
exports.register = async (req, res, next) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email' });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({
      message: 'Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, a number, and a special character.',
    });
  }

  try {
    const existingUser = await authService.getUserById(email); // In authService, find by email not ID
    const existingUserByEmail = await authService.getUserByEmail(email); // Fix: need a getUserByEmail method

    if (existingUserByEmail) { // Corrected check
      return res.status(409).json({ message: 'User with that email already exists' });
    }

    const { user, token } = await authService.registerUser(username, email, password);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    logger.error('Registration error:', error);
    next(error); // Pass to error handling middleware
  }
};

/**
 * @desc Authenticate user & get token
 * @route POST /api/auth/login
 * @access Public
 */
exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  try {
    const { user, token } = await authService.loginUser(email, password);

    res.status(200).json({
      message: 'Logged in successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    logger.error('Login error:', error);
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ message: error.message });
    }
    next(error);
  }
};

/**
 * @desc Get current user profile
 * @route GET /api/auth/profile
 * @access Private
 */
exports.getProfile = async (req, res, next) => {
  try {
    // req.user is populated by authMiddleware
    const user = await authService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ user });
  } catch (error) {
    logger.error('Get profile error:', error);
    next(error);
  }
};

// Add getUserByEmail to authService (correction for register function)
Object.assign(authService, {
  getUserByEmail: async (email) => {
    return await prisma.user.findUnique({
      where: { email },
      select: { id: true, username: true, email: true, role: true, createdAt: true },
    });
  }
});