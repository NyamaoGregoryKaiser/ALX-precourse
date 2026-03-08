```javascript
const request = require('supertest');
const httpStatus = require('http-status-codes');
const app = require('../../src/app');
const { sequelize, User, Account, Transaction } = require('../../models');
const config = require('../../config/config');
const { USER_ROLES } = require('../../src/utils/constants');
const logger = require('../../src/utils/logger');

describe('Auth routes', () => {
  let newUser;

  beforeAll(async () => {
    // Clean up and re-migrate/seed before all tests
    await sequelize.drop();
    await sequelize.sync({ force: true });
    // Use the seed script or manually create data
    await require('../../seeders/20230101000003-initial-data').up(sequelize.getQueryInterface(), sequelize.Sequelize);

    // Fetch the admin user created by the seed
    const adminUser = await User.findOne({ where: { email: config.admin.email } });
    expect(adminUser).toBeDefined();

    newUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
      role: USER_ROLES.USER,
    };
  });

  afterAll(async () => {
    await sequelize.drop();
    await sequelize.close();
  });

  describe('POST /v1/auth/register', () => {
    test('should return 201 and successfully register user if data is valid', async () => {
      const res = await request(app)
        .post('/v1/auth/register')
        .send(newUser)
        .expect(httpStatus.CREATED);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body.user.email).toBe(newUser.email);
      expect(res.body).toHaveProperty('tokens');
      expect(res.body.tokens).toHaveProperty('access');
      expect(res.body.tokens.access).toHaveProperty('token');
      expect(res.body.tokens.access).toHaveProperty('expires');
    });

    test('should return 400 if email is already taken', async () => {
      await request(app)
        .post('/v1/auth/register')
        .send(newUser) // Try to register same user again
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 if password does not meet complexity requirements', async () => {
      await request(app)
        .post('/v1/auth/register')
        .send({ ...newUser, email: 'badpass@example.com', password: 'short' })
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('POST /v1/auth/login', () => {
    test('should return 200 and auth tokens if login is successful', async () => {
      const res = await request(app)
        .post('/v1/auth/login')
        .send({
          email: newUser.email,
          password: newUser.password,
        })
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body).toHaveProperty('tokens');
      expect(res.body.tokens).toHaveProperty('access');
    });

    test('should return 401 if login fails with wrong password', async () => {
      await request(app)
        .post('/v1/auth/login')
        .send({
          email: newUser.email,
          password: 'wrongpassword',
        })
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 401 if login fails with unknown email', async () => {
      await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'unknown@example.com',
          password: 'Password123!',
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
```