```javascript
const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/appError');
const logger = require('../utils/logger');

class AuthController {
  /**
   * @swagger
   * /auth/register:
   *   post:
   *     summary: Register a new user
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - username
   *               - email
   *               - password
   *             properties:
   *               username:
   *                 type: string
   *                 description: Unique username
   *               email:
   *                 type: string
   *                 format: email
   *                 description: Unique email address
   *               password:
   *                 type: string
   *                 format: password
   *                 description: User's password (min 6 characters)
   *               role:
   *                 type: string
   *                 enum: [user, admin]
   *                 default: user
   *                 description: User's role (admin role typically assigned by existing admin)
   *     responses:
   *       201:
   *         description: User registered successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "User registered successfully."
   *                 data:
   *                   type: object
   *                   properties:
   *                     user:
   *                       $ref: '#/components/schemas/User'
   *                     accessToken:
   *                       type: string
   *                     refreshToken:
   *                       type: string
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       409:
   *         $ref: '#/components/responses/Conflict'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  register = asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.register(req.body);

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: { user, accessToken, refreshToken },
    });
  });

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: Log in a user
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *                 format: password
   *     responses:
   *       200:
   *         description: User logged in successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "User logged in successfully."
   *                 data:
   *                   type: object
   *                   properties:
   *                     user:
   *                       $ref: '#/components/schemas/User'
   *                     accessToken:
   *                       type: string
   *                     refreshToken:
   *                       type: string
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         description: Account not activated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Account is not activated."
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.login(email, password);

    res.status(200).json({
      success: true,
      message: 'User logged in successfully.',
      data: { user, accessToken, refreshToken },
    });
  });

  /**
   * @swagger
   * /auth/logout:
   *   post:
   *     summary: Log out a user (revoke refresh token)
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - refreshToken
   *             properties:
   *               refreshToken:
   *                 type: string
   *                 description: The refresh token to revoke
   *     responses:
   *       200:
   *         description: User logged out successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "User logged out successfully."
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         description: Invalid refresh token for this user
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Invalid refresh token for this user."
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  logout = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const userId = req.user.id; // User ID from authenticated token

    await authService.logout(userId, refreshToken);

    res.status(200).json({
      success: true,
      message: 'User logged out successfully.',
    });
  });

  /**
   * @swagger
   * /auth/refresh-token:
   *   post:
   *     summary: Refresh access token using a refresh token
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - refreshToken
   *             properties:
   *               refreshToken:
   *                 type: string
   *                 description: The refresh token obtained during login
   *     responses:
   *       200:
   *         description: New access token and refresh token generated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Tokens refreshed successfully."
   *                 data:
   *                   type: object
   *                   properties:
   *                     accessToken:
   *                       type: string
   *                     refreshToken:
   *                       type: string
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         description: Invalid or expired refresh token
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Invalid or expired refresh token. Please log in again."
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken: currentRefreshToken } = req.body;
    const { accessToken, refreshToken: newRefreshToken } = await authService.refreshAccessToken(currentRefreshToken);

    res.status(200).json({
      success: true,
      message: 'Tokens refreshed successfully.',
      data: { accessToken, refreshToken: newRefreshToken },
    });
  });
}

module.exports = new AuthController();
```