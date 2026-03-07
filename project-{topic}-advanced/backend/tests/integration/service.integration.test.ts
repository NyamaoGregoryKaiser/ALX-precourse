```typescript
import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/data-source';
import { User, UserRole } from '../../src/entities/User';
import { Service } from '../../src/entities/Service';
import { sign } from 'jsonwebtoken';
import { JWT_SECRET } from '../../src/config/env';

describe('Service API Integration Tests', () => {
  let server: any;
  let testUser: User;
  let testAdmin: User;
  let userAccessToken: string;
  let adminAccessToken: string;

  beforeAll(async () => {
    server = app.listen(4001); // Use a different port for service tests

    // Create a test user
    testUser = AppDataSource.getRepository(User).create({
      username: 'service_user',
      email: 'service_user@example.com',
      passwordHash: await require('bcryptjs').hash('password', 10),
      roles: [UserRole.USER, UserRole.SERVICE_OWNER],
    });
    await AppDataSource.getRepository(User).save(testUser);

    // Create a test admin
    testAdmin = AppDataSource.getRepository(User).create({
      username: 'service_admin',
      email: 'service_admin@example.com',
      passwordHash: await require('bcryptjs').hash('adminpass', 10),
      roles: [UserRole.ADMIN],
    });
    await AppDataSource.getRepository(User).save(testAdmin);

    // Generate access tokens
    userAccessToken = sign({ id: testUser.id, username: testUser.username, email: testUser.email, roles: testUser.roles }, JWT_SECRET!, { expiresIn: '1h' });
    adminAccessToken = sign({ id: testAdmin.id, username: testAdmin.username, email: testAdmin.email, roles: testAdmin.roles }, JWT_SECRET!, { expiresIn: '1h' });
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('POST /api/v1/services', () => {
    it('should create a new service for an authenticated user', async () => {
      const res = await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          name: 'My New Service',
          description: 'A service for integration testing.',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.name).toBe('My New Service');
      expect(res.body.data.userId).toBe(testUser.id);
      expect(res.body.data.apiKey).toBeDefined();

      const serviceInDb = await AppDataSource.getRepository(Service).findOneBy({ id: res.body.data.id });
      expect(serviceInDb).toBeDefined();
    });

    it('should return 400 if service name already exists for the user', async () => {
      await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ name: 'Duplicate Service', description: 'Initial' });

      const res = await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ name: 'Duplicate Service', description: 'Second attempt' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('A service with this name already exists for your account.');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/v1/services')
        .send({ name: 'Unauthorized Service' });
      expect(res.statusCode).toEqual(401);
    });

    it('should return 403 if user role lacks permission (e.g., plain USER)', async () => {
        const plainUser = AppDataSource.getRepository(User).create({
            username: 'plain_user',
            email: 'plain@example.com',
            passwordHash: await require('bcryptjs').hash('password', 10),
            roles: [UserRole.USER],
        });
        await AppDataSource.getRepository(User).save(plainUser);
        const plainUserAccessToken = sign({ id: plainUser.id, username: plainUser.username, email: plainUser.email, roles: plainUser.roles }, JWT_SECRET!, { expiresIn: '1h' });

        const res = await request(app)
          .post('/api/v1/services')
          .set('Authorization', `Bearer ${plainUserAccessToken}`)
          .send({ name: 'Service by plain user' });
        expect(res.statusCode).toEqual(403);
        expect(res.body.message).toContain('You do not have permission');
    });
  });

  describe('GET /api/v1/services', () => {
    let service1: Service;
    let service2: Service;
    let adminOwnedService: Service;

    beforeEach(async () => {
      service1 = AppDataSource.getRepository(Service).create({ name: 'User Service 1', userId: testUser.id, apiKey: 'b1a1b1a1-a1a1-4a1a-a1a1-a1a1a1a1a1a1' });
      service2 = AppDataSource.getRepository(Service).create({ name: 'User Service 2', userId: testUser.id, apiKey: 'c2b2c2b2-b2b2-4b2b-b2b2-b2b2b2b2b2b2' });
      adminOwnedService = AppDataSource.getRepository(Service).create({ name: 'Admin Service', userId: testAdmin.id, apiKey: 'd3c3d3c3-c3c3-4c3c-c3c3-c3c3c3c3c3c3' });
      await AppDataSource.getRepository(Service).save([service1, service2, adminOwnedService]);
    });

    it('should return all services for an admin', async () => {
      const res = await request(app)
        .get('/api/v1/services')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      expect(res.body.data.map((s: any) => s.name)).toContain('Admin Service');
      expect(res.body.data.map((s: any) => s.name)).toContain('User Service 1');
    });

    it('should return only user-owned services for a regular user/service owner', async () => {
      const res = await request(app)
        .get('/api/v1/services')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toEqual(2); // Only service1 and service2
      expect(res.body.data.map((s: any) => s.name)).toContain('User Service 1');
      expect(res.body.data.map((s: any) => s.name)).toContain('User Service 2');
      expect(res.body.data.map((s: any) => s.name)).not.toContain('Admin Service');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/v1/services');
      expect(res.statusCode).toEqual(401);
    });
  });

  describe('GET /api/v1/services/:id', () => {
    let ownedService: Service;
    let otherUserService: Service;

    beforeEach(async () => {
      ownedService = AppDataSource.getRepository(Service).create({ name: 'My Owned Service', userId: testUser.id, apiKey: 'e4d4e4d4-d4d4-4d4d-d4d4-d4d4d4d4d4d4' });
      otherUserService = AppDataSource.getRepository(User).create({
        username: 'other_owner', email: 'other@example.com', passwordHash: await require('bcryptjs').hash('pass', 10), roles: [UserRole.USER]
      });
      await AppDataSource.getRepository(User).save(otherUserService);
      otherUserService = AppDataSource.getRepository(Service).create({ name: 'Other User Service', userId: otherUserService.id, apiKey: 'f5e5f5e5-e5e5-4e5e-e5e5-e5e5e5e5e5e5' });
      await AppDataSource.getRepository(Service).save([ownedService, otherUserService]);
    });

    it('should return service details if user owns it', async () => {
      const res = await request(app)
        .get(`/api/v1/services/${ownedService.id}`)
        .set('Authorization', `Bearer ${userAccessToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(ownedService.id);
      expect(res.body.data.name).toBe('My Owned Service');
    });

    it('should return service details if admin requests it', async () => {
      const res = await request(app)
        .get(`/api/v1/services/${otherUserService.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(otherUserService.id);
      expect(res.body.data.name).toBe('Other User Service');
    });

    it('should return 403 if user does not own the service and is not admin', async () => {
      const res = await request(app)
        .get(`/api/v1/services/${otherUserService.id}`)
        .set('Authorization', `Bearer ${userAccessToken}`);
      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toContain('You do not have access to this service.');
    });

    it('should return 404 if service not found', async () => {
      const res = await request(app)
        .get('/api/v1/services/nonexistent-id')
        .set('Authorization', `Bearer ${userAccessToken}`);
      expect(res.statusCode).toEqual(404);
    });
  });

  describe('PUT /api/v1/services/:id', () => {
    let serviceToUpdate: Service;

    beforeEach(async () => {
      serviceToUpdate = AppDataSource.getRepository(Service).create({ name: 'Update Service', userId: testUser.id, apiKey: 'g6f6g6f6-f6f6-4f6f-f6f6-f6f6f6f6f6f6' });
      await AppDataSource.getRepository(Service).save(serviceToUpdate);
    });

    it('should update a service if user owns it', async () => {
      const res = await request(app)
        .put(`/api/v1/services/${serviceToUpdate.id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ name: 'Updated Service Name', description: 'New description' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.name).toBe('Updated Service Name');
      expect(res.body.data.description).toBe('New description');

      const updatedService = await AppDataSource.getRepository(Service).findOneBy({ id: serviceToUpdate.id });
      expect(updatedService?.name).toBe('Updated Service Name');
    });

    it('should return 403 if user does not own the service and is not admin', async () => {
      const otherUserService = AppDataSource.getRepository(User).create({
        username: 'other_update_owner', email: 'other_update@example.com', passwordHash: await require('bcryptjs').hash('pass', 10), roles: [UserRole.USER]
      });
      await AppDataSource.getRepository(User).save(otherUserService);
      const serviceOwnedByOther = AppDataSource.getRepository(Service).create({ name: 'Other Users Service for Update', userId: otherUserService.id, apiKey: 'h7g7h7g7-g7g7-4g7g-g7g7-g7g7g7g7g7g7' });
      await AppDataSource.getRepository(Service).save(serviceOwnedByOther);

      const res = await request(app)
        .put(`/api/v1/services/${serviceOwnedByOther.id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ name: 'Attempted Update' });
      expect(res.statusCode).toEqual(403);
    });
  });

  describe('DELETE /api/v1/services/:id', () => {
    let serviceToDelete: Service;

    beforeEach(async () => {
      serviceToDelete = AppDataSource.getRepository(Service).create({ name: 'Service to Delete', userId: testUser.id, apiKey: 'i8h8i8h8-h8h8-4h8h-h8h8-h8h8h8h8h8h8' });
      await AppDataSource.getRepository(Service).save(serviceToDelete);
    });

    it('should delete a service if user owns it', async () => {
      const res = await request(app)
        .delete(`/api/v1/services/${serviceToDelete.id}`)
        .set('Authorization', `Bearer ${userAccessToken}`);
      expect(res.statusCode).toEqual(204);

      const deletedService = await AppDataSource.getRepository(Service).findOneBy({ id: serviceToDelete.id });
      expect(deletedService).toBeNull();
    });

    it('should return 403 if user does not own the service and is not admin', async () => {
      const otherUserService = AppDataSource.getRepository(User).create({
        username: 'other_delete_owner', email: 'other_delete@example.com', passwordHash: await require('bcryptjs').hash('pass', 10), roles: [UserRole.USER]
      });
      await AppDataSource.getRepository(User).save(otherUserService);
      const serviceOwnedByOther = AppDataSource.getRepository(Service).create({ name: 'Other Users Service for Delete', userId: otherUserService.id, apiKey: 'j9i9j9i9-i9i9-4i9i-i9i9-i9i9i9i9i9i9' });
      await AppDataSource.getRepository(Service).save(serviceOwnedByOther);

      const res = await request(app)
        .delete(`/api/v1/services/${serviceOwnedByOther.id}`)
        .set('Authorization', `Bearer ${userAccessToken}`);
      expect(res.statusCode).toEqual(403);
    });
  });

  describe('POST /api/v1/services/:id/regenerate-api-key', () => {
    let serviceToRegenerate: Service;

    beforeEach(async () => {
      serviceToRegenerate = AppDataSource.getRepository(Service).create({ name: 'Regenerate Service', userId: testUser.id, apiKey: 'k0j0k0j0-j0j0-4j0j-j0j0-j0j0j0j0j0j0' });
      await AppDataSource.getRepository(Service).save(serviceToRegenerate);
    });

    it('should regenerate API key for a service if user owns it', async () => {
      const oldApiKey = serviceToRegenerate.apiKey;
      const res = await request(app)
        .post(`/api/v1/services/${serviceToRegenerate.id}/regenerate-api-key`)
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.apiKey).toBeDefined();
      expect(res.body.data.apiKey).not.toBe(oldApiKey);

      const updatedService = await AppDataSource.getRepository(Service).findOneBy({ id: serviceToRegenerate.id });
      expect(updatedService?.apiKey).toBe(res.body.data.apiKey);
    });
  });
});
```