import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/database/data-source';
import { User, UserRole } from '../../src/database/entities/User.entity';

describe('Authentication API Tests', () => {
  const userRepository = AppDataSource.getRepository(User);
  const testUser = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@test.com',
    password: 'password123',
    role: UserRole.USER,
  };

  beforeEach(async () => {
    // Clear users table specifically for auth tests if not handled by global setup
    // For this setup, jest.setup.ts handles truncation.
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully and return a token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.firstName).toBe(testUser.firstName);
      expect(res.body.user.role).toBe(UserRole.USER);
      expect(res.body.user).not.toHaveProperty('password'); // Password should not be returned
      expect(res.body).toHaveProperty('token');
      expect(typeof res.body.token).toBe('string');

      const userInDb = await userRepository.findOne({
        where: { email: testUser.email },
        select: ['email', 'password'],
      });
      expect(userInDb).not.toBeNull();
      expect(userInDb?.email).toBe(testUser.email);
      // Verify password is hashed
      expect(userInDb?.password).not.toBe(testUser.password);
    });

    it('should return 409 if user with email already exists', async () => {
      // Register the user first
      await userRepository.save(userRepository.create(testUser));

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);

      expect(res.body.message).toBe('User with this email already exists.');
    });

    it('should return 400 for invalid input (e.g., missing email)', async () => {
      const invalidUser = { ...testUser, email: undefined };
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(res.body.message).toContain('email is required');
    });

    it('should return 400 for invalid email format', async () => {
      const invalidUser = { ...testUser, email: 'invalid-email' };
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(res.body.message).toContain('email must be a valid email');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const existingUser = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@test.com',
      password: 'strongPassword456',
    };
    let savedUser: User;

    beforeEach(async () => {
      // Create user directly in DB for login tests
      savedUser = userRepository.create(existingUser);
      await savedUser.hashPassword(); // Hash the password before saving
      await userRepository.save(savedUser);
    });

    it('should log in an existing user and return a token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: existingUser.email,
          password: existingUser.password,
        })
        .expect(200);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(existingUser.email);
      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body).toHaveProperty('token');
      expect(typeof res.body.token).toBe('string');
    });

    it('should return 401 for invalid credentials (non-existent email)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'anypassword',
        })
        .expect(401);

      expect(res.body.message).toBe('Invalid credentials.');
    });

    it('should return 401 for invalid credentials (incorrect password)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: existingUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(res.body.message).toBe('Invalid credentials.');
    });

    it('should return 400 for invalid input (e.g., missing password)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: existingUser.email,
          password: undefined,
        })
        .expect(400);

      expect(res.body.message).toContain('password is required');
    });
  });
});