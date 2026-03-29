import request from 'supertest';
import app from '@/app';
import { AppDataSource } from '@/config/database';
import { User } from '@/entities/User';
import { Role } from '@/entities/Role';
import { UserRole } from '@/entities/UserRole';
import { RefreshToken } from '@/entities/RefreshToken';
import { Permission } from '@/entities/Permission';
import { RolePermission } from '@/entities/RolePermission';
import { clearDb } from '../setup';
import bcrypt from 'bcryptjs';
import * as jwtUtils from '@/utils/jwt';
import { config } from '@/config';
import { getRedisClient } from '@/config/redis';

const userRepository = AppDataSource.getRepository(User);
const roleRepository = AppDataSource.getRepository(Role);
const permissionRepository = AppDataSource.getRepository(Permission);
const userRoleRepository = AppDataSource.getRepository(UserRole);
const rolePermissionRepository = AppDataSource.getRepository(RolePermission);
const refreshTokenRepository = AppDataSource.getRepository(RefreshToken);
const redisClient = getRedisClient();

describe('Auth Integration Tests', () => {
  let adminRole: Role;
  let userRole: Role;
  let userReadPermission: Permission;
  let userWritePermission: Permission;
  let adminAccessPermission: Permission;
  let testAdmin: User;
  let testUser: User;
  let adminAccessToken: string;
  let adminRefreshToken: string;
  let userAccessToken: string;
  let userRefreshToken: string;

  beforeEach(async () => {
    await clearDb(); // Clear database before each test

    // Seed Permissions
    userReadPermission = permissionRepository.create({ name: 'user:read', description: 'Read user profiles' });
    userWritePermission = permissionRepository.create({ name: 'user:write', description: 'Create/Update user profiles' });
    adminAccessPermission = permissionRepository.create({ name: 'admin:access', description: 'Grants access to all admin functionalities' });
    await permissionRepository.save([userReadPermission, userWritePermission, adminAccessPermission]);

    // Seed Roles
    adminRole = roleRepository.create({ name: 'admin', description: 'Administrator' });
    userRole = roleRepository.create({ name: 'user', description: 'Standard user' });
    await roleRepository.save([adminRole, userRole]);

    // Assign Permissions to Roles
    await rolePermissionRepository.save([
      rolePermissionRepository.create({ role: adminRole, permission: userReadPermission }),
      rolePermissionRepository.create({ role: adminRole, permission: userWritePermission }),
      rolePermissionRepository.create({ role: adminRole, permission: adminAccessPermission }),
      rolePermissionRepository.create({ role: userRole, permission: userReadPermission }),
    ]);

    // Seed Users
    const hashedPasswordAdmin = await bcrypt.hash('AdminPassword1!', 10);
    testAdmin = userRepository.create({
      username: 'adminuser',
      email: 'admin@test.com',
      password: hashedPasswordAdmin,
      isEmailVerified: true,
    });
    await userRepository.save(testAdmin);
    await userRoleRepository.save(userRoleRepository.create({ user: testAdmin, role: adminRole }));

    const hashedPasswordUser = await bcrypt.hash('UserPassword1!', 10);
    testUser = userRepository.create({
      username: 'regularuser',
      email: 'user@test.com',
      password: hashedPasswordUser,
      isEmailVerified: true,
    });
    await userRepository.save(testUser);
    await userRoleRepository.save(userRoleRepository.create({ user: testUser, role: userRole }));

    // Generate tokens for test users
    const adminTokens = await jwtUtils.generateAuthTokens(
      await userRepository.findOne({
        where: { id: testAdmin.id },
        relations: ['userRoles.role.rolePermissions.permission'],
      }) as User
    );
    adminAccessToken = adminTokens.accessToken;
    adminRefreshToken = adminTokens.refreshToken;

    const userTokens = await jwtUtils.generateAuthTokens(
      await userRepository.findOne({
        where: { id: testUser.id },
        relations: ['userRoles.role.rolePermissions.permission'],
      }) as User
    );
    userAccessToken = userTokens.accessToken;
    userRefreshToken = userTokens.refreshToken;
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully with default role', async () => {
      const newUser = {
        username: 'newtestuser',
        email: 'newuser@example.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
      };
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(newUser)
        .expect(201);

      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe(newUser.email);
      expect(res.body.tokens).toHaveProperty('accessToken');
      expect(res.body.tokens).toHaveProperty('refreshToken');

      const registeredUser = await userRepository.findOne({
        where: { email: newUser.email },
        relations: ['userRoles.role'],
      });
      expect(registeredUser).toBeDefined();
      expect(registeredUser?.userRoles[0].role.name).toBe('user');
    });

    it('should return 400 if email is already taken', async () => {
      const existingUser = {
        username: 'existinguser',
        email: 'admin@test.com', // Existing email
        password: 'Password123!',
      };
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(existingUser)
        .expect(400);

      expect(res.body.message).toBe('Email already taken');
    });

    it('should return 400 if username is already taken', async () => {
      const existingUsername = {
        username: 'adminuser', // Existing username
        email: 'another@test.com',
        password: 'Password123!',
      };
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(existingUsername)
        .expect(400);

      expect(res.body.message).toBe('Username already taken');
    });

    it('should return 400 if password is weak', async () => {
      const weakPasswordUser = {
        username: 'weakpassuser',
        email: 'weakpass@example.com',
        password: 'pass', // Weak password
      };
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(weakPasswordUser)
        .expect(400);

      expect(res.body.message).toContain('Password must be at least 8 characters long');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should log in an existing user successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: 'AdminPassword1!' })
        .expect(200);

      expect(res.body.user).toHaveProperty('id', testAdmin.id);
      expect(res.body.user.email).toBe(testAdmin.email);
      expect(res.body.tokens).toHaveProperty('accessToken');
      expect(res.body.tokens).toHaveProperty('refreshToken');

      // Check if refresh token is stored in DB and Redis
      const storedRefreshToken = await refreshTokenRepository.findOneBy({ token: res.body.tokens.refreshToken });
      expect(storedRefreshToken).toBeDefined();
      const redisToken = await redisClient.get(`refreshToken:${res.body.tokens.refreshToken}`);
      expect(redisToken).toBe(testAdmin.id);
    });

    it('should return 401 for incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: 'wrongpassword' })
        .expect(401);

      expect(res.body.message).toBe('Incorrect email or password');
    });

    it('should return 401 for unregistered email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'Password123!' })
        .expect(401);

      expect(res.body.message).toBe('Incorrect email or password');
    });

    it('should return 401 if email not verified', async () => {
      const unverifiedUser = userRepository.create({
        username: 'unverified',
        email: 'unverified@test.com',
        password: await bcrypt.hash('Password123!', 10),
        isEmailVerified: false,
      });
      await userRepository.save(unverifiedUser);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'unverified@test.com', password: 'Password123!' })
        .expect(401);

      expect(res.body.message).toBe('Email not verified. Please check your inbox.');
    });
  });

  describe('POST /api/v1/auth/refresh-tokens', () => {
    it('should refresh tokens with a valid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-tokens')
        .send({ refreshToken: adminRefreshToken })
        .expect(200);

      expect(res.body.user).toHaveProperty('id', testAdmin.id);
      expect(res.body.tokens).toHaveProperty('accessToken');
      expect(res.body.tokens).toHaveProperty('refreshToken');
      expect(res.body.tokens.refreshToken).not.toBe(adminRefreshToken); // Should be a new refresh token

      // Old refresh token should be revoked
      const oldTokenStatus = await refreshTokenRepository.findOneBy({ token: adminRefreshToken });
      expect(oldTokenStatus?.isRevoked).toBe(true);
      const oldRedisToken = await redisClient.get(`refreshToken:${adminRefreshToken}`);
      expect(oldRedisToken).toBeNull();
    });

    it('should return 401 for invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-tokens')
        .send({ refreshToken: 'invalidRefreshTokenString' })
        .expect(401);

      expect(res.body.message).toBe('Invalid refresh token.');
    });

    it('should return 401 for revoked refresh token', async () => {
      await request(app).post('/api/v1/auth/logout').send({ refreshToken: adminRefreshToken }); // Revoke it first

      const res = await request(app)
        .post('/api/v1/auth/refresh-tokens')
        .send({ refreshToken: adminRefreshToken })
        .expect(401);

      expect(res.body.message).toBe('Refresh token invalid or expired.');
    });

    it('should return 401 for expired refresh token', async () => {
      // Mock JWT verify to simulate an expired token (or shorten config.jwt.refreshTokenExpiration for tests)
      // For a real integration test, you'd let time pass or use a library to generate an expired token.
      // Here, we simulate by marking it as expired in the DB.
      const expiredTokenEntry = await refreshTokenRepository.findOneBy({ token: userRefreshToken });
      if (expiredTokenEntry) {
        expiredTokenEntry.expiresAt = new Date(Date.now() - 1000); // Set to past
        await refreshTokenRepository.save(expiredTokenEntry);
      }

      const res = await request(app)
        .post('/api/v1/auth/refresh-tokens')
        .send({ refreshToken: userRefreshToken })
        .expect(401);

      expect(res.body.message).toBe('Refresh token invalid or expired.');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should successfully log out a user by revoking refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: userRefreshToken })
        .expect(204);

      const storedRefreshToken = await refreshTokenRepository.findOneBy({ token: userRefreshToken });
      expect(storedRefreshToken?.isRevoked).toBe(true);
      const redisToken = await redisClient.get(`refreshToken:${userRefreshToken}`);
      expect(redisToken).toBeNull();
    });

    it('should return 404 if refresh token not found or already revoked', async () => {
      await request(app).post('/api/v1/auth/logout').send({ refreshToken: userRefreshToken }); // Revoke it first

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: userRefreshToken }) // Attempt to logout again
        .expect(404);

      expect(res.body.message).toBe('Refresh token not found or already revoked.');
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should generate a password reset token for an existing user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'admin@test.com' })
        .expect(200);

      expect(res.body.message).toContain('password reset link has been sent');

      const user = await userRepository.findOneBy({ email: 'admin@test.com' });
      expect(user?.passwordResetToken).toBeDefined();
      expect(user?.passwordResetExpires).toBeDefined();
      expect(user?.passwordResetExpires?.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return 404 for a non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(404);

      expect(res.body.message).toBe('No user found with that email address.');
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    let resetToken: string;

    beforeEach(async () => {
      // Generate a valid reset token for admin
      const user = await userRepository.findOneByOrFail({ email: 'admin@test.com' });
      resetToken = jwtUtils.generateAccessToken(user.id, user.username, [], []); // Use access token as a stand-in for a simple reset token
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
      await userRepository.save(user);
    });

    it('should reset password successfully with a valid token', async () => {
      const newPassword = 'NewAdminPassword1!';
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: resetToken, newPassword })
        .expect(204);

      const updatedUser = await userRepository.findOne({
        where: { id: testAdmin.id },
        select: ['password', 'passwordResetToken'],
      });
      expect(updatedUser?.passwordResetToken).toBeNull();
      expect(await bcrypt.compare(newPassword, updatedUser!.password)).toBe(true);

      // Try logging in with new password
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: newPassword })
        .expect(200);
      expect(loginRes.body.user.id).toBe(testAdmin.id);
    });

    it('should return 400 for an invalid or expired token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'invalidOrExpiredToken', newPassword: 'NewPassword123!' })
        .expect(400);

      expect(res.body.message).toBe('Invalid or expired password reset token.');
    });

    it('should return 400 if new password is weak', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: resetToken, newPassword: 'weak' })
        .expect(400);

      expect(res.body.message).toContain('New password must be at least 8 characters long');
    });
  });
});