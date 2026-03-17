```javascript
const db = require('../database');
const { AppError } = require('../utils/appError');
const { generateAuthTokens } = require('../utils/jwt');
const logger = require('../utils/logger');

class AuthService {
  /**
   * Registers a new user.
   * @param {object} userData - User details including username, email, password, role.
   * @returns {object} The created user (excluding password) and auth tokens.
   * @throws {AppError} If user with email or username already exists.
   */
  async register(userData) {
    const { username, email, password, role } = userData;

    // Check if user already exists
    const existingUser = await db.User.findOne({
      where: {
        [db.Sequelize.Op.or]: [{ email }, { username }]
      }
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new AppError('User with this email already exists.', 409);
      }
      if (existingUser.username === username) {
        throw new AppError('User with this username already exists.', 409);
      }
    }

    const newUser = await db.User.create({ username, email, password, role });

    // Generate tokens
    const { accessToken, refreshToken } = generateAuthTokens(newUser);

    // Save refresh token to DB (hashed or as a token ID)
    // For simplicity, we'll store it directly. In a real app, hash it or store a unique ID mapped to the token.
    newUser.refreshToken = refreshToken;
    await newUser.save({ fields: ['refreshToken'] }); // Only update refreshToken field

    logger.info(`New user registered: ${newUser.email}`);

    // Exclude password and refresh token from the returned object
    const userResponse = newUser.toJSON();
    delete userResponse.password;
    delete userResponse.refreshToken;
    delete userResponse.deletedAt;

    return { user: userResponse, accessToken, refreshToken };
  }

  /**
   * Logs in a user and generates auth tokens.
   * @param {string} email - User's email.
   * @param {string} password - User's password.
   * @returns {object} The logged-in user (excluding password) and auth tokens.
   * @throws {AppError} If invalid credentials.
   */
  async login(email, password) {
    const user = await db.User.scope('withPassword').findOne({ where: { email } });

    if (!user || !(await user.isValidPassword(password))) {
      throw new AppError('Invalid credentials.', 401);
    }

    if (!user.isActivated) {
      throw new AppError('Account is not activated.', 403);
    }

    // Generate new tokens
    const { accessToken, refreshToken } = generateAuthTokens(user);

    // Update refresh token and last login time
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ fields: ['refreshToken', 'lastLogin'] });

    logger.info(`User logged in: ${user.email}`);

    const userResponse = user.toJSON();
    delete userResponse.password;
    delete userResponse.refreshToken;
    delete userResponse.deletedAt;

    return { user: userResponse, accessToken, refreshToken };
  }

  /**
   * Revokes a user's refresh token (logs them out from a specific device/token).
   * @param {string} userId - The ID of the user whose token is being revoked.
   * @param {string} refreshToken - The refresh token to revoke.
   * @returns {boolean} True if logout was successful.
   * @throws {AppError} If user or token not found.
   */
  async logout(userId, refreshToken) {
    const user = await db.User.scope('withRefreshToken').findByPk(userId);

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    // Check if the provided refresh token matches the one stored for the user
    // In a more robust system, you might have multiple refresh tokens per user,
    // or use a token blacklist. For simplicity, we assume one active refresh token.
    if (user.refreshToken !== refreshToken) {
      throw new AppError('Invalid refresh token for this user.', 401);
    }

    user.refreshToken = null; // Clear the refresh token
    await user.save({ fields: ['refreshToken'] });

    logger.info(`User logged out: ${user.email}`);
    return true;
  }

  /**
   * Generates a new access token using a valid refresh token.
   * @param {string} currentRefreshToken - The refresh token provided by the client.
   * @returns {object} A new access token and refresh token.
   * @throws {AppError} If refresh token is invalid or expired.
   */
  async refreshAccessToken(currentRefreshToken) {
    const user = await db.User.scope('withRefreshToken').findOne({
      where: { refreshToken: currentRefreshToken }
    });

    if (!user) {
      throw new AppError('Invalid or expired refresh token. Please log in again.', 403);
    }

    // Generate new tokens
    const { accessToken, refreshToken } = generateAuthTokens(user);

    // Update refresh token in DB
    user.refreshToken = refreshToken;
    await user.save({ fields: ['refreshToken'] });

    logger.info(`Access token refreshed for user: ${user.email}`);

    return { accessToken, refreshToken };
  }
}

module.exports = new AuthService();
```