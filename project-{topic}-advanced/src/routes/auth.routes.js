```javascript
const express = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validation.middleware');
const Joi = require('joi');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication management
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
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: At least one number and one uppercase letter
 *             example:
 *               name: Jane Doe
 *               email: jane.doe@example.com
 *               password: Password1
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       "400":
 *         $ref: '#/components/schemas/Error'
 */
router.post(
  '/register',
  validate({
    body: Joi.object().keys({
      name: Joi.string().required(),
      email: Joi.string().required().email(),
      password: Joi.string().required().min(8).regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).*$/)
        .message('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
      role: Joi.string().valid('user', 'admin').default('user'), // Allow role specification during registration
    }),
  }),
  authController.register
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
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
 *             example:
 *               email: john.doe@example.com
 *               password: Password1
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       "401":
 *         $ref: '#/components/schemas/Error'
 */
router.post(
  '/login',
  validate({
    body: Joi.object().keys({
      email: Joi.string().required().email(),
      password: Joi.string().required(),
    }),
  }),
  authController.login
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     description: This endpoint invalidates the current user's session token.
 *     responses:
 *       "204":
 *         description: No Content
 *       "401":
 *         $ref: '#/components/schemas/Error'
 */
router.post('/logout', authController.logout); // Implement token blacklisting if using refresh tokens


module.exports = router;
```