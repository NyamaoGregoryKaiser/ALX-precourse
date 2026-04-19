const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

/**
 * @api {post} /api/auth/register Register User
 * @apiName RegisterUser
 * @apiGroup Auth
 * @apiParam {String} username User's unique username.
 * @apiParam {String} email User's unique email.
 * @apiParam {String} password User's password.
 * @apiSuccess {String} message Success message.
 * @apiSuccess {Object} user Registered user details (excluding password).
 * @apiError (400 Bad Request) ValidationError Invalid input data.
 * @apiError (400 Bad Request) DuplicateUser E-mail or username already in use.
 */
router.post('/register', authController.register);

/**
 * @api {post} /api/auth/login Login User
 * @apiName LoginUser
 * @apiGroup Auth
 * @apiParam {String} email User's email.
 * @apiParam {String} password User's password.
 * @apiSuccess {String} message Success message.
 * @apiSuccess {String} token JWT authentication token.
 * @apiSuccess {Object} user Logged in user details (excluding password).
 * @apiError (401 Unauthorized) InvalidCredentials Invalid email or password.
 */
router.post('/login', authController.login);

/**
 * @api {get} /api/auth/me Get Current User Profile
 * @apiName GetCurrentUser
 * @apiGroup Auth
 * @apiHeader {String} Authorization User's JWT token (Bearer token).
 * @apiSuccess {Object} user Current user's details (excluding password).
 * @apiError (401 Unauthorized) NoToken No authentication token provided.
 * @apiError (401 Unauthorized) InvalidToken Invalid or expired authentication token.
 */
router.get('/me', authenticate, authController.getMe);

module.exports = router;