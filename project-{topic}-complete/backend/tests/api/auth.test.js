const request = require('supertest');
const app = require('../../src/app');
const sequelize = require('../../src/config/database');
const User = require('../../src/models/user');
const { v4: uuidv4 } = require('uuid');

describe('Auth API', () => {
  beforeAll(async () => {
    // Connect to the test database and sync models
    await sequelize.authenticate();
    await sequelize.sync({ force: true }); // Clear and re-create tables for tests
  });

  afterAll(async () => {
    // Clean up test data and close database connection
    await sequelize.drop();
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clear users before each test
    await User.destroy({ truncate: true, cascade: true });
  });

  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('message', 'User registered successfully');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).not.toHaveProperty('password'); // Password should not be returned
    expect(res.body.user.username).toBe('newuser');

    const userInDb = await User.findOne({ where: { email: 'newuser@example.com' } });
    expect(userInDb).toBeDefined();
    expect(await userInDb.validPassword('password123')).toBe(true);
  });

  it('should not register a user with existing email', async () => {
    await User.create({
      id: uuidv4(),
      username: 'existing',
      email: 'existing@example.com',
      password: 'hashedpassword',
      role: 'user'
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'anotheruser',
        email: 'existing@example.com',
        password: 'password123'
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toMatch(/E-mail already in use|unique constraint violation/i);
  });

  it('should login an existing user and return a token', async () => {
    const user = await User.create({
      id: uuidv4(),
      username: 'loginuser',
      email: 'login@example.com',
      password: 'loginpassword', // Will be hashed by hook
      role: 'user'
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@example.com',
        password: 'loginpassword'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Logged in successfully');
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe('login@example.com');
  });

  it('should not login with incorrect password', async () => {
    await User.create({
      id: uuidv4(),
      username: 'badpassworduser',
      email: 'badpass@example.com',
      password: 'correctpassword',
      role: 'user'
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'badpass@example.com',
        password: 'wrongpassword'
      });

    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('message', 'Invalid credentials');
  });

  it('should not login with non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'anypassword'
      });

    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('message', 'Invalid credentials');
  });

  it('should get authenticated user profile (GET /api/auth/me)', async () => {
    const user = await User.create({
      id: uuidv4(),
      username: 'profileuser',
      email: 'profile@example.com',
      password: 'profilepassword',
      role: 'user'
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'profile@example.com',
        password: 'profilepassword'
      });

    const token = loginRes.body.token;

    const profileRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(profileRes.statusCode).toEqual(200);
    expect(profileRes.body).toHaveProperty('user');
    expect(profileRes.body.user.email).toBe('profile@example.com');
    expect(profileRes.body.user).not.toHaveProperty('password');
  });

  it('should return 401 for GET /api/auth/me without token', async () => {
    const res = await request(app)
      .get('/api/auth/me');

    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('message', 'No token provided.');
  });

  it('should return 401 for GET /api/auth/me with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer invalidtoken`);

    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('message', 'Unauthorized: Invalid token.');
  });
});