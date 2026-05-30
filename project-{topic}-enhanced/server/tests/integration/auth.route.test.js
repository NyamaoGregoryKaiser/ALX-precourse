const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const { User, Token } = require('../../src/models');
const userService = require('../../src/services/user.service');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');
const config = require('../../src/config/config');
const { v4: uuidv4 } = require('uuid');

describe('Auth routes', () => {
  let newUser;

  beforeEach(async () => {
    newUser = {
      id: uuidv4(),
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'member',
    };
    await User.destroy({ truncate: true, cascade: true }); // Clear all users and associated tokens
    await Token.destroy({ truncate: true, cascade: true }); // Clear all tokens
  });

  describe('POST /v1/auth/register', () => {
    test('should return 201 and user info if registration is successful', async () => {
      const res = await request(app)
        .post('/v1/auth/register')
        .send(newUser)
        .expect(httpStatus.CREATED);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toEqual(expect.objectContaining({
        id: expect.any(String),
        firstName: newUser.firstName,
        email: newUser.email,
        role: newUser.role,
      }));
      expect(res.body).toHaveProperty('tokens');
      expect(res.body.tokens).toHaveProperty('access.token');
      expect(res.body.tokens).toHaveProperty('refresh.token');

      const dbUser = await User.findByPk(res.body.user.id);
      expect(dbUser).toBeDefined();
      expect(await dbUser.isPasswordMatch(newUser.password)).toBe(true);
    });

    test('should return 400 if email is already taken', async () => {
      await userService.createUser(newUser);
      await request(app)
        .post('/v1/auth/register')
        .send(newUser)
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 if password is too short', async () => {
      await request(app)
        .post('/v1/auth/register')
        .send({ ...newUser, password: 'short' })
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('POST /v1/auth/login', () => {
    let user;
    beforeEach(async () => {
      user = await userService.createUser(newUser);
    });

    test('should return 200 and tokens if login is successful', async () => {
      const res = await request(app)
        .post('/v1/auth/login')
        .send({ email: newUser.email, password: newUser.password })
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(newUser.email);
      expect(res.body).toHaveProperty('tokens');
      expect(res.body.tokens).toHaveProperty('access.token');
      expect(res.body.tokens).toHaveProperty('refresh.token');
    });

    test('should return 401 if incorrect email', async () => {
      await request(app)
        .post('/v1/auth/login')
        .send({ email: 'wrong@example.com', password: newUser.password })
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 401 if incorrect password', async () => {
      await request(app)
        .post('/v1/auth/login')
        .send({ email: newUser.email, password: 'wrongpassword' })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /v1/auth/logout', () => {
    let user;
    let tokens;
    beforeEach(async () => {
      user = await userService.createUser(newUser);
      tokens = await tokenService.generateAuthTokens(user);
    });

    test('should return 204 if logout is successful', async () => {
      await request(app)
        .post('/v1/auth/logout')
        .set('Authorization', `Bearer ${tokens.access.token}`)
        .send({ refreshToken: tokens.refresh.token })
        .expect(httpStatus.NO_CONTENT);

      const refreshTokenDoc = await Token.findOne({ where: { token: tokens.refresh.token } });
      expect(refreshTokenDoc).toBeNull(); // Token should be deleted
    });

    test('should return 404 if refresh token is not found', async () => {
      await request(app)
        .post('/v1/auth/logout')
        .set('Authorization', `Bearer ${tokens.access.token}`)
        .send({ refreshToken: 'invalidtoken' })
        .expect(httpStatus.NOT_FOUND);
    });

    test('should return 401 if no access token is provided', async () => {
      await request(app)
        .post('/v1/auth/logout')
        .send({ refreshToken: tokens.refresh.token })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /v1/auth/refresh-tokens', () => {
    let user;
    let tokens;
    beforeEach(async () => {
      user = await userService.createUser(newUser);
      tokens = await tokenService.generateAuthTokens(user);
    });

    test('should return 200 and new tokens if refresh token is valid', async () => {
      const res = await request(app)
        .post('/v1/auth/refresh-tokens')
        .send({ refreshToken: tokens.refresh.token })
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('access.token');
      expect(res.body).toHaveProperty('refresh.token');

      const oldRefreshTokenDoc = await Token.findOne({ where: { token: tokens.refresh.token } });
      expect(oldRefreshTokenDoc).toBeNull(); // Old refresh token should be deleted
    });

    test('should return 401 if refresh token is invalid', async () => {
      await request(app)
        .post('/v1/auth/refresh-tokens')
        .send({ refreshToken: 'invalidtoken' })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});