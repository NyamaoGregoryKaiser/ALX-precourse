```javascript
const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/appError');
const { signToken } = require('../utils/jwt');

/**
 * Authentication Service Module
 * Handles business logic for user authentication (registration, login).
 */
const authService = {
  /**
   * Registers a new user.
   * @param {object} userData - User registration data (username, email, password).
   * @returns {Promise<object>} Object containing the new user and a JWT token.
   * @throws {AppError} If email or username is already taken.
   */
  async register(userData) {
    const { username, email, password } = userData;

    // 1. Check if email already exists
    const existingUserByEmail = await userRepository.findByEmail(email);
    if (existingUserByEmail) {
      throw new AppError('Email already registered.', 409); // 409 Conflict
    }

    // 2. Check if username already exists
    const existingUserByUsername = await userRepository.findByUsername(username);
    if (existingUserByUsername) {
      throw new AppError('Username already taken.', 409); // 409 Conflict
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 12); // Salt rounds: 12 is a good default

    // 4. Create user
    const newUser = await userRepository.create({
      username,
      email,
      password: hashedPassword,
      role: 'USER', // Default role
    });

    // 5. Generate JWT token
    const token = signToken(newUser.id);

    return { user: newUser, token };
  },

  /**
   * Logs in a user.
   * @param {string} email - User's email.
   * @param {string} password - User's password.
   * @returns {Promise<object>} Object containing the user and a JWT token.
   * @throws {AppError} If email/password is incorrect.
   */
  async login(email, password) {
    // 1. Check if user exists and get their password hash
    const user = await userRepository.findByEmail(email, true); // Retrieve password hash
    if (!user) {
      throw new AppError('Incorrect email or password.', 401); // 401 Unauthorized
    }

    // 2. Compare passwords
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      throw new AppError('Incorrect email or password.', 401); // 401 Unauthorized
    }

    // 3. Generate JWT token
    const token = signToken(user.id);

    // Remove password from user object before returning
    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  },
};

module.exports = authService;
```