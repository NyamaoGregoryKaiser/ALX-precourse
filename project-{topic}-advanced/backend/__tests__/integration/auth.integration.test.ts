```typescript
import request from 'supertest';
import { AppDataSource } from '../../src/config/database';
import { initializeDataSource } from '../../src/data-source';
import app from '../../src/app';
import { User } from '../../src/entities/User';
import { Role, UserRole } from '../../src/entities/Role';
import { BlacklistedToken } from '../../src/entities/BlacklistedToken';
import { hashPassword } from '../../src/utils/password';
import { config } from '../../src/config';
import { mailService } from '../../src/services/mail.service'; // Mock mail service
import { connectRedis, closeRedis, getRedisClient } from '../../src/config/redis';

// Mock mail service
jest.mock('../../src/services/mail.service');
const mockSendVerificationEmail = mailService.sendVerificationEmail as jest.Mock;
const mockSendResetPasswordEmail = mailService.sendResetPasswordEmail as jest.Mock;

describe('Auth Endpoints Integration Tests', () => {
  let userRepository: any;
  let roleRepository: any;
  let blacklistedTokenRepository: any;
  let server: any; // To store the server instance for closing

  beforeAll(async () => {
    // Set environment for testing
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test_jwt_secret';
    process.env.DB_NAME = 'test_auth_db'; // Use a separate test database

    await initializeDataSource();
    await connectRedis();

    userRepository = AppDataSource.getRepository(User);
    roleRepository = AppDataSource.getRepository(Role);
    blacklistedTokenRepository = AppDataSource.getRepository(BlacklistedToken);

    server = app.listen(5001); // Start app on a different port for tests

    // Ensure test database is clean
    await AppDataSource.dropDatabase();
    await AppDataSource.synchronize(); // Re-create schema

    // Create default roles
    await roleRepository.save([
      roleRepository.create({ name: UserRole.USER, description: 'Standard user' }),
      roleRepository.create({ name: UserRole.ADMIN, description: 'Administrator' }),
    ]);
  });

  beforeEach(async () => {
    // Clear users and blacklisted tokens before each test
    await userRepository.clear();
    await blacklistedTokenRepository.clear();
    await getRedisClient().flushall(); // Clear Redis cache
    mockSendVerificationEmail.mockClear();
    mockSendResetPasswordEmail.mockClear();
  });

  afterAll(async () => {
    await server.close(); // Close the express server
    await AppDataSource.dropDatabase(); // Clean up test database
    await AppDataSource.destroy(); // Close DB connection
    await closeRedis(); // Close Redis connection
  });

  // --- /auth/register ---
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully and send verification email', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'Password123!',
      };

      const res = await request(app).post('/api/v1/auth/register').send(userData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toBe('Registration successful. Please check your email to verify your account.');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe(userData.email);
      expect(res.body.user).not.toHaveProperty('password'); // Password should not be returned
      expect(res.body.user.isEmailVerified).toBe(false);

      const registeredUser = await userRepository.findOneBy({ email: userData.email });
      expect(registeredUser).toBeDefined();
      expect(registeredUser.isEmailVerified).toBe(false);
      expect(registeredUser.verificationToken).toBeDefined();
      expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(mockSendVerificationEmail).toHaveBeenCalledWith(
        userData.email,
        userData.firstName,
        expect.any(String)
      );
    });

    it('should return 409 if email is already registered', async () => {
      const userRole = await roleRepository.findOneBy({ name: UserRole.USER });
      await userRepository.save(userRepository.create({
        firstName: 'Existing', lastName: 'User', email: 'exist@example.com',
        password: await hashPassword('Password123!'), role: userRole
      }));

      const userData = {
        firstName: 'Another',
        lastName: 'User',
        email: 'exist@example.com',
        password: 'AnotherPassword123!',
      };

      const res = await request(app).post('/api/v1/auth/register').send(userData);

      expect(res.statusCode).toEqual(409);
      expect(res.body.message).toBe('Email already registered.');
      expect(mockSendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid registration data', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'invalid-email',
        password: 'short', // Does not meet complexity
      });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toMatch(/Email must be a valid email/);
      expect(res.body.message).toMatch(/Password must be at least 8 characters long/);
    });
  });

  // --- /auth/login ---
  describe('POST /api/v1/auth/login', () => {
    let verifiedUser: User;
    let userRole: Role;

    beforeEach(async () => {
      userRole = await roleRepository.findOneBy({ name: UserRole.USER });
      verifiedUser = userRepository.create({
        firstName: 'Verified', lastName: 'User', email: 'verified@example.com',
        password: await hashPassword('Password123!'), isEmailVerified: true, role: userRole
      });
      await userRepository.save(verifiedUser);
    });

    it('should log in a verified user successfully and return tokens', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'verified@example.com',
        password: 'Password123!',
      });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('verified@example.com');
      expect(res.body.user.role).toBe(UserRole.USER);
      expect(res.body).toHaveProperty('tokens.accessToken');
      expect(res.body).toHaveProperty('tokens.refreshToken');
    });

    it('should return 401 for incorrect password', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'verified@example.com',
        password: 'WrongPassword!',
      });

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Incorrect email or password.');
    });

    it('should return 401 for unverified email', async () => {
      const unverifiedUser = userRepository.create({
        firstName: 'Unverified', lastName: 'User', email: 'unverified@example.com',
        password: await hashPassword('Password123!'), isEmailVerified: false, role: userRole
      });
      await userRepository.save(unverifiedUser);

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'unverified@example.com',
        password: 'Password123!',
      });

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Please verify your email to log in.');
    });
  });

  // --- /auth/logout ---
  describe('POST /api/v1/auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;
    let testUser: User;

    beforeEach(async () => {
      const userRole = await roleRepository.findOneBy({ name: UserRole.USER });
      testUser = userRepository.create({
        firstName: 'Logout', lastName: 'Test', email: 'logout@example.com',
        password: await hashPassword('Password123!'), isEmailVerified: true, role: userRole
      });
      await userRepository.save(testUser);

      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: 'Password123!',
      });
      accessToken = loginRes.body.tokens.accessToken;
      refreshToken = loginRes.body.tokens.refreshToken;
    });

    it('should blacklist the access token on logout', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('Logged out successfully.');

      const blacklistedToken = await blacklistedTokenRepository.findOneBy({ token: accessToken });
      expect(blacklistedToken).toBeDefined();

      // Subsequent request with the blacklisted token should fail
      const protectedRes = await request(app)
        .get('/api/v1/users/some-id') // Use a protected endpoint
        .set('Authorization', `Bearer ${accessToken}`);
      expect(protectedRes.statusCode).toEqual(401);
      expect(protectedRes.body.message).toBe('Token revoked or expired. Please log in again.');
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('No authentication token provided.');
    });
  });

  // --- /auth/refresh-tokens ---
  describe('POST /api/v1/auth/refresh-tokens', () => {
    let testUser: User;
    let initialRefreshToken: string;

    beforeEach(async () => {
      const userRole = await roleRepository.findOneBy({ name: UserRole.USER });
      testUser = userRepository.create({
        firstName: 'Refresh', lastName: 'Test', email: 'refresh@example.com',
        password: await hashPassword('Password123!'), isEmailVerified: true, role: userRole
      });
      await userRepository.save(testUser);

      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: 'Password123!',
      });
      initialRefreshToken = loginRes.body.tokens.refreshToken;
    });

    it('should return new access and refresh tokens with a valid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-tokens')
        .send({ refreshToken: initialRefreshToken });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.accessToken).not.toBe(initialRefreshToken);
      expect(res.body.refreshToken).not.toBe(initialRefreshToken); // New refresh token should be issued
    });

    it('should return 401 with an invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-tokens')
        .send({ refreshToken: 'invalid.refresh.token' });

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Invalid or expired refresh token. Please log in again.');
    });
  });

  // --- /auth/forgot-password ---
  describe('POST /api/v1/auth/forgot-password', () => {
    let testUser: User;
    beforeEach(async () => {
      const userRole = await roleRepository.findOneBy({ name: UserRole.USER });
      testUser = userRepository.create({
        firstName: 'Forgot', lastName: 'Test', email: 'forgot@example.com',
        password: await hashPassword('Password123!'), isEmailVerified: true, role: userRole
      });
      await userRepository.save(testUser);
      mockSendResetPasswordEmail.mockClear();
    });

    it('should send a password reset email if user exists', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('If an account with that email exists, a password reset link has been sent.');
      expect(mockSendResetPasswordEmail).toHaveBeenCalledTimes(1);
      expect(mockSendResetPasswordEmail).toHaveBeenCalledWith(
        testUser.email,
        testUser.firstName,
        expect.any(String)
      );

      const updatedUser = await userRepository.findOneBy({ email: testUser.email });
      expect(updatedUser?.resetPasswordToken).toBeDefined();
      expect(updatedUser?.resetPasswordTokenExpires).toBeDefined();
    });

    it('should return 200 even if user does not exist (security precaution)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('If an account with that email exists, a password reset link has been sent.');
      expect(mockSendResetPasswordEmail).not.toHaveBeenCalled();
    });
  });

  // --- /auth/reset-password ---
  describe('POST /api/v1/auth/reset-password', () => {
    let testUser: User;
    let resetToken: string;

    beforeEach(async () => {
      const userRole = await roleRepository.findOneBy({ name: UserRole.USER });
      testUser = userRepository.create({
        firstName: 'Reset', lastName: 'Test', email: 'reset@example.com',
        password: await hashPassword('OldPassword123!'), isEmailVerified: true, role: userRole
      });
      testUser.resetPasswordToken = 'validResetToken123';
      testUser.resetPasswordTokenExpires = new Date(Date.now() + config.jwt.resetPasswordExpirationMinutes * 60 * 1000); // 10 minutes from now
      await userRepository.save(testUser);
      resetToken = testUser.resetPasswordToken;
    });

    it('should reset password successfully with a valid token', async () => {
      const newPassword = 'NewPassword456!';
      const res = await request(app)
        .post(`/api/v1/auth/reset-password?token=${resetToken}`)
        .send({ newPassword });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('Password reset successful. You can now log in with your new password.');

      const updatedUser = await userRepository.findOneBy({ email: testUser.email });
      expect(updatedUser?.resetPasswordToken).toBeNull();
      expect(updatedUser?.resetPasswordTokenExpires).toBeNull();

      // Try logging in with new password
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: newPassword,
      });
      expect(loginRes.statusCode).toEqual(200);
      expect(loginRes.body.user.email).toBe(testUser.email);
    });

    it('should return 400 with an invalid or expired reset token', async () => {
      // Test with invalid token
      let res = await request(app)
        .post('/api/v1/auth/reset-password?token=invalid_token')
        .send({ newPassword: 'NewPassword456!' });
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe('Invalid or expired password reset token.');

      // Test with expired token
      testUser.resetPasswordTokenExpires = new Date(Date.now() - 1000); // Expire token immediately
      await userRepository.save(testUser);

      res = await request(app)
        .post(`/api/v1/auth/reset-password?token=${resetToken}`)
        .send({ newPassword: 'NewPassword456!' });
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe('Invalid or expired password reset token.');
    });

    it('should return 400 for invalid new password', async () => {
      const res = await request(app)
        .post(`/api/v1/auth/reset-password?token=${resetToken}`)
        .send({ newPassword: 'short' }); // Invalid password

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toMatch(/Password must be at least 8 characters long/);
    });
  });

  // --- /auth/verify-email ---
  describe('GET /api/v1/auth/verify-email', () => {
    let unverifiedUser: User;
    let verificationToken: string;

    beforeEach(async () => {
      const userRole = await roleRepository.findOneBy({ name: UserRole.USER });
      unverifiedUser = userRepository.create({
        firstName: 'Verify', lastName: 'Test', email: 'verify@example.com',
        password: await hashPassword('Password123!'), isEmailVerified: false, role: userRole
      });
      unverifiedUser.verificationToken = 'validVerificationToken123';
      unverifiedUser.verificationTokenExpires = new Date(Date.now() + config.jwt.verifyEmailExpirationMinutes * 60 * 1000); // 10 minutes from now
      await userRepository.save(unverifiedUser);
      verificationToken = unverifiedUser.verificationToken;
    });

    it('should verify email successfully with a valid token', async () => {
      const res = await request(app)
        .get(`/api/v1/auth/verify-email?token=${verificationToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('Email verified successfully.');

      const updatedUser = await userRepository.findOneBy({ email: unverifiedUser.email });
      expect(updatedUser?.isEmailVerified).toBe(true);
      expect(updatedUser?.verificationToken).toBeNull();
      expect(updatedUser?.verificationTokenExpires).toBeNull();
    });

    it('should return 400 with an invalid or expired verification token', async () => {
      // Test with invalid token
      let res = await request(app)
        .get('/api/v1/auth/verify-email?token=invalid_token');
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe('Invalid or expired email verification token.');

      // Test with expired token
      unverifiedUser.verificationTokenExpires = new Date(Date.now() - 1000); // Expire token immediately
      await userRepository.save(unverifiedUser);

      res = await request(app)
        .get(`/api/v1/auth/verify-email?token=${verificationToken}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe('Invalid or expired email verification token.');
    });
  });

  // --- /auth/resend-verification ---
  describe('POST /api/v1/auth/resend-verification', () => {
    let unverifiedUser: User;
    let verifiedUser: User;

    beforeEach(async () => {
      const userRole = await roleRepository.findOneBy({ name: UserRole.USER });
      unverifiedUser = userRepository.create({
        firstName: 'Resend', lastName: 'Test', email: 'resend@example.com',
        password: await hashPassword('Password123!'), isEmailVerified: false, role: userRole
      });
      await userRepository.save(unverifiedUser);

      verifiedUser = userRepository.create({
        firstName: 'Already', lastName: 'Verified', email: 'alreadyverified@example.com',
        password: await hashPassword('Password123!'), isEmailVerified: true, role: userRole
      });
      await userRepository.save(verifiedUser);
      mockSendVerificationEmail.mockClear();
    });

    it('should resend verification email for an unverified user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/resend-verification')
        .send({ email: unverifiedUser.email });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('If an account with that email exists and is not verified, a new verification email has been sent.');
      expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(mockSendVerificationEmail).toHaveBeenCalledWith(
        unverifiedUser.email,
        unverifiedUser.firstName,
        expect.any(String)
      );

      const updatedUser = await userRepository.findOneBy({ email: unverifiedUser.email });
      expect(updatedUser?.verificationToken).toBeDefined(); // Token should be updated
    });

    it('should return 400 if email is already verified', async () => {
      const res = await request(app)
        .post('/api/v1/auth/resend-verification')
        .send({ email: verifiedUser.email });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe('Email is already verified.');
      expect(mockSendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should return 404 if user not found', async () => {
      const res = await request(app)
        .post('/api/v1/auth/resend-verification')
        .send({ email: 'nonexistent@example.com' });

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toBe('User not found.');
      expect(mockSendVerificationEmail).not.toHaveBeenCalled();
    });
  });
});
```