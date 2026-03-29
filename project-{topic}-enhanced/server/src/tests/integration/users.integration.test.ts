import request from 'supertest';
import app from '@/app';
import { AppDataSource } from '@/config/database';
import { User } from '@/entities/User';
import { Role } from '@/entities/Role';
import { UserRole } from '@/entities/UserRole';
import { Permission } from '@/entities/Permission';
import { RolePermission } from '@/entities/RolePermission';
import { clearDb } from '../setup';
import bcrypt from 'bcryptjs';
import * as jwtUtils from '@/utils/jwt';

const userRepository = AppDataSource.getRepository(User);
const roleRepository = AppDataSource.getRepository(Role);
const permissionRepository = AppDataSource.getRepository(Permission);
const userRoleRepository = AppDataSource.getRepository(UserRole);
const rolePermissionRepository = AppDataSource.getRepository(RolePermission);

describe('User Integration Tests', () => {
  let adminRole: Role;
  let userRole: Role;
  let editorRole: Role;
  let userReadPermission: Permission;
  let userWritePermission: Permission;
  let userDeletePermission: Permission;
  let adminAccessPermission: Permission;
  let testAdmin: User;
  let testUser: User;
  let testEditor: User;
  let adminAccessToken: string;
  let userAccessToken: string;
  let editorAccessToken: string;

  beforeEach(async () => {
    await clearDb(); // Clear database before each test

    // Seed Permissions
    userReadPermission = permissionRepository.create({ name: 'user:read', description: 'Read user profiles' });
    userWritePermission = permissionRepository.create({ name: 'user:write', description: 'Create/Update user profiles' });
    userDeletePermission = permissionRepository.create({ name: 'user:delete', description: 'Delete user profiles' });
    adminAccessPermission = permissionRepository.create({ name: 'admin:access', description: 'Grants access to all admin functionalities' });
    await permissionRepository.save([userReadPermission, userWritePermission, userDeletePermission, adminAccessPermission]);

    // Seed Roles
    adminRole = roleRepository.create({ name: 'admin', description: 'Administrator' });
    userRole = roleRepository.create({ name: 'user', description: 'Standard user' });
    editorRole = roleRepository.create({ name: 'editor', description: 'Editor user' });
    await roleRepository.save([adminRole, userRole, editorRole]);

    // Assign Permissions to Roles
    await rolePermissionRepository.save([
      // Admin gets all
      rolePermissionRepository.create({ role: adminRole, permission: userReadPermission }),
      rolePermissionRepository.create({ role: adminRole, permission: userWritePermission }),
      rolePermissionRepository.create({ role: adminRole, permission: userDeletePermission }),
      rolePermissionRepository.create({ role: adminRole, permission: adminAccessPermission }),
      // User gets read
      rolePermissionRepository.create({ role: userRole, permission: userReadPermission }),
      // Editor gets read/write
      rolePermissionRepository.create({ role: editorRole, permission: userReadPermission }),
      rolePermissionRepository.create({ role: editorRole, permission: userWritePermission }),
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

    const hashedPasswordEditor = await bcrypt.hash('EditorPassword1!', 10);
    testEditor = userRepository.create({
      username: 'editoruser',
      email: 'editor@test.com',
      password: hashedPasswordEditor,
      isEmailVerified: true,
    });
    await userRepository.save(testEditor);
    await userRoleRepository.save(userRoleRepository.create({ user: testEditor, role: editorRole }));


    // Generate tokens for test users
    adminAccessToken = jwtUtils.generateAccessToken(
      testAdmin.id,
      testAdmin.username,
      [adminRole.name],
      [userReadPermission.name, userWritePermission.name, userDeletePermission.name, adminAccessPermission.name]
    );
    userAccessToken = jwtUtils.generateAccessToken(
      testUser.id,
      testUser.username,
      [userRole.name],
      [userReadPermission.name]
    );
    editorAccessToken = jwtUtils.generateAccessToken(
      testEditor.id,
      testEditor.username,
      [editorRole.name],
      [userReadPermission.name, userWritePermission.name]
    );
  });

  describe('GET /api/v1/users', () => {
    it('should allow admin to get all users', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body).toBeArrayOfSize(3);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('email');
      expect(res.body[0]).toHaveProperty('roles');
      expect(res.body.some((u: any) => u.email === 'admin@test.com')).toBeTrue();
    });

    it('should forbid regular user from getting all users', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(403); // Forbidden

      expect(res.body.message).toBe('You do not have the necessary permissions to access this resource.');
    });

    it('should forbid unauthenticated user from getting all users', async () => {
      await request(app)
        .get('/api/v1/users')
        .expect(401); // Unauthorized
    });
  });

  describe('GET /api/v1/users/:userId', () => {
    it('should allow admin to get a user by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', testUser.id);
      expect(res.body.email).toBe(testUser.email);
    });

    it('should allow user to get their own profile', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${testUser.id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', testUser.id);
      expect(res.body.email).toBe(testUser.email);
    });

    it('should forbid user from getting another user\'s profile (without sufficient permissions)', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${testAdmin.id}`) // User tries to get admin's profile
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(403);

      expect(res.body.message).toBe('You do not have the necessary permissions to access this resource.');
    });

    it('should return 404 if user not found', async () => {
      await request(app)
        .get('/api/v1/users/non-existent-uuid')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(404);
    });
  });

  describe('POST /api/v1/users', () => {
    it('should allow admin to create a new user with specified role', async () => {
      const newUser = {
        username: 'newadminuser',
        email: 'newadmin@test.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'Admin',
        roleIds: [adminRole.id], // Assign admin role
      };

      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newUser)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe(newUser.email);
      expect(res.body.roles).toContain(adminRole.name);

      const createdUserInDb = await userRepository.findOne({ where: { id: res.body.id }, relations: ['userRoles.role'] });
      expect(createdUserInDb).toBeDefined();
      expect(createdUserInDb?.userRoles.some(ur => ur.role.id === adminRole.id)).toBeTrue();
    });

    it('should return 400 for invalid data when creating user', async () => {
      const invalidUser = {
        username: 'short', // Too short
        email: 'invalid-email', // Invalid email
        password: 'weak', // Weak password
      };

      await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(invalidUser)
        .expect(400);
    });

    it('should forbid regular user from creating a user', async () => {
      const newUser = {
        username: 'anotheruser',
        email: 'another@test.com',
        password: 'Password123!',
      };

      await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(newUser)
        .expect(403);
    });
  });

  describe('PATCH /api/v1/users/:userId', () => {
    it('should allow admin to update any user', async () => {
      const updateData = { username: 'updateduser', firstName: 'Updated' };
      const res = await request(app)
        .patch(`/api/v1/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body).toHaveProperty('id', testUser.id);
      expect(res.body.username).toBe(updateData.username);
      expect(res.body.firstName).toBe(updateData.firstName);

      const updatedUserInDb = await userRepository.findOneBy({ id: testUser.id });
      expect(updatedUserInDb?.username).toBe(updateData.username);
    });

    it('should allow editor with user:write permission to update a user', async () => {
      const updateData = { username: 'updatedbyeditor' };
      const res = await request(app)
        .patch(`/api/v1/users/${testUser.id}`)
        .set('Authorization', `Bearer ${editorAccessToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.username).toBe(updateData.username);
    });


    it('should forbid regular user from updating another user', async () => {
      const updateData = { username: 'tryhack' };
      await request(app)
        .patch(`/api/v1/users/${testAdmin.id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(updateData)
        .expect(403);
    });

    it('should allow user to update their own profile via /me', async () => {
      const updateData = { firstName: 'MyNewName' };
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body).toHaveProperty('id', testUser.id);
      expect(res.body.firstName).toBe(updateData.firstName);
    });

    it('should return 404 if user to update is not found', async () => {
      await request(app)
        .patch('/api/v1/users/non-existent-uuid')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ username: 'ghost' })
        .expect(404);
    });
  });

  describe('DELETE /api/v1/users/:userId', () => {
    it('should allow admin to delete any user', async () => {
      await request(app)
        .delete(`/api/v1/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(204);

      const deletedUser = await userRepository.findOneBy({ id: testUser.id });
      expect(deletedUser).toBeNull();
    });

    it('should forbid editor from deleting a user', async () => {
      await request(app)
        .delete(`/api/v1/users/${testUser.id}`)
        .set('Authorization', `Bearer ${editorAccessToken}`)
        .expect(403);
    });


    it('should forbid regular user from deleting a user', async () => {
      await request(app)
        .delete(`/api/v1/users/${testAdmin.id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(403);
    });

    it('should return 404 if user to delete is not found', async () => {
      await request(app)
        .delete('/api/v1/users/non-existent-uuid')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(404);
    });
  });
});