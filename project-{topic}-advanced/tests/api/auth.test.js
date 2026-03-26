```javascript
const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const { User } = require('../../src/models');
const setupTestDB = require('../jest.setup');

setupTestDB();

describe('Auth API', () => {
  let newUser;

  beforeEach(async () => {
    await User.destroy({ truncate: true, cascade: true }); // Clear all users before each test
    newUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'TestPassword1', // Valid password with uppercase, lowercase, and number
    };
  });

  describe('POST /api/v1/auth/register', () => {
    it('should return 201 and successfully register user if data is ok', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(newUser)
        .expect(httpStatus.CREATED);

      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('tokens');
      expect(res.body.user.email).toBe(newUser.email);
      expect(res.body.user.role).toBe('user'); // Default role
      expect(res.body.user).not.toHaveProperty('password'); // Ensure password is not exposed
      expect(res.body.tokens.access.token).toBeDefined();
      expect(res.body.tokens.refresh.token).toBeDefined();

      const dbUser = await User.findOne({ where: { email: newUser.email } });
      expect(dbUser).toBeDefined();
      expect(await dbUser.isPasswordMatch(newUser.password)).toBe(true);
    });

    it('should return 400 if email is invalid', async () => {
      newUser.email = 'invalid-email';
      await request(app)
        .post('/api/v1/auth/register')
        .send(newUser)
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should return 400 if password is too short', async () => {
      newUser.password = 'short1A'; // Less than 8 chars
      await request(app)
        .post('/api/v1/auth/register')
        .send(newUser)
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should return 400 if password does not meet complexity requirements', async () => {
      newUser.password = 'password123'; // Missing uppercase
      await request(app)
        .post('/api/v1/auth/register')
        .send(newUser)
        .expect(httpStatus.BAD_REQUEST);

      newUser.password = 'PASSWORD123'; // Missing lowercase
      await request(app)
        .post('/api/v1/auth/register')
        .send(newUser)
        .expect(httpStatus.BAD_REQUEST);

      newUser.password = 'Password'; // Missing number
      await request(app)
        .post('/api/v1/auth/register')
        .send(newUser)
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should return 400 if email is already taken', async () => {
      await request(app).post('/api/v1/auth/register').send(newUser).expect(httpStatus.CREATED);
      await request(app).post('/api/v1/auth/register').send(newUser).expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(newUser).expect(httpStatus.CREATED);
    });

    it('should return 200 and auth tokens if login is successful', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: newUser.email,
          password: newUser.password,
        })
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('tokens');
      expect(res.body.user.email).toBe(newUser.email);
      expect(res.body.tokens.access.token).toBeDefined();
      expect(res.body.tokens.refresh.token).toBeDefined();
    });

    it('should return 401 if email is incorrect', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'wrong@example.com',
          password: newUser.password,
        })
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('should return 401 if password is incorrect', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: newUser.email,
          password: 'wrongpassword',
        })
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('should return 400 if email is missing', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          password: newUser.password,
        })
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should return 400 if password is missing', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: newUser.email,
        })
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let accessToken;
    beforeEach(async () => {
      const res = await request(app).post('/api/v1/auth/register').send(newUser).expect(httpStatus.CREATED);
      accessToken = res.body.tokens.access.token;
    });

    it('should return 204 for successful logout', async () => {
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(httpStatus.NO_CONTENT);
    });

    it('should return 401 if no token is provided', async () => {
      await request(app)
        .post('/api/v1/auth/logout')
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('should return 401 if invalid token is provided', async () => {
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
```