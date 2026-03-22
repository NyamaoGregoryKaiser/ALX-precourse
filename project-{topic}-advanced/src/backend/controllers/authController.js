```javascript
const { StatusCodes } = require('http-status-codes');
const User = require('../models/User');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const jwt = require('jsonwebtoken');
const { generateToken } = require('../utils/jwtUtils');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User authentication and authorization
 */

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
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: newuser@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: MySecurePassword123
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 default: user
 *                 description: User's role (admin role can only be set by another admin)
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 token:
 *                   type: string
 *                   description: JWT token for the new user
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/schemas/Error'
 *       409:
 *         description: User with this email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
exports.register = catchAsync(async (req, res, next) => {
    const { email, password, role } = req.body;

    // Prevent direct creation of admin by non-admin users
    if (role && role === 'admin') {
        return next(new AppError('Unauthorized attempt to set admin role.', StatusCodes.FORBIDDEN));
    }

    const newUser = await User.create({ email, password, role: role || 'user' });

    const token = generateToken(newUser.id, newUser.role);

    res.status(StatusCodes.CREATED).json({
        status: 'success',
        token,
        data: {
            user: {
                id: newUser.id,
                email: newUser.email,
                role: newUser.role,
            },
        },
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
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: User logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 token:
 *                   type: string
 *                   description: JWT token for the user
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/schemas/Error'
 */
exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(new AppError('Please provide email and password!', StatusCodes.BAD_REQUEST));
    }

    const user = await User.scope('withPassword').findOne({ where: { email } });

    if (!user || !(await user.comparePassword(password))) {
        return next(new AppError('Incorrect email or password', StatusCodes.UNAUTHORIZED));
    }

    const token = generateToken(user.id, user.role);

    res.status(StatusCodes.OK).json({
        status: 'success',
        token,
        data: {
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
        },
    });
});
```