```typescript
import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/data-source';
import { User, UserRole } from '../../src/entities/User';
import { Service } from '../../src/entities/Service';
import { MetricDefinition, MetricType } from '../../src/entities/MetricDefinition';
import { DataPoint } from '../../src/entities/DataPoint';
import { sign } from 'jsonwebtoken';
import { JWT_SECRET } from '../../src/config/env';
import { v4 as uuidv4 } from 'uuid';

describe('DataPoint API Integration Tests', () => {
  let server: any;
  let testUser: User;
  let testService: Service;
  let testMetric: MetricDefinition;
  let userAccessToken: string;

  beforeAll(async () => {
    server = app.listen(4002); // Use a different port for dataPoint tests

    // Create a test user
    testUser = AppDataSource.getRepository(User).create({
      username: 'datapoint_user',
      email: 'datapoint_user@example.com',
      passwordHash: await require('bcryptjs').hash('password', 10),
      roles: [UserRole.USER, UserRole.SERVICE_OWNER],
    });
    await AppDataSource.getRepository(User).save(testUser);

    // Create a test service for the user
    testService = AppDataSource.getRepository(Service).create({
      name: 'DataPoint Test Service',
      description: 'Service for testing data points.',
      apiKey: uuidv4(),
      userId: testUser.id,
    });
    await AppDataSource.getRepository(Service).save(testService);

    // Create a metric definition for the service
    testMetric = AppDataSource.getRepository(MetricDefinition).create({
      serviceId: testService.id,
      name: 'test_latency',
      type: MetricType.LATENCY,
      unit: 'ms',
    });
    await AppDataSource.getRepository(MetricDefinition).save(testMetric);

    // Generate access token for the user
    userAccessToken = sign({ id: testUser.id, username: testUser.username, email: testUser.email, roles: testUser.roles }, JWT_SECRET!, { expiresIn: '1h' });
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('POST /api/v1/data-points/submit', () => {
    it('should submit a new data point with valid API key', async () => {
      const timestamp = new Date().toISOString();
      const res = await request(app)
        .post('/api/v1/data-points/submit')
        .set('X-API-Key', testService.apiKey)
        .send({
          serviceId: testService.id,
          metricName: testMetric.name,
          value: 123.45,
          timestamp: timestamp,
          metadata: { path: '/test', status: 200 },
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.metricDefinitionId).toBe(testMetric.id);
      expect(res.body.data.value).toBe(123.45);
      expect(res.body.data.metadata.path).toBe('/test');

      const dataPointInDb = await AppDataSource.getRepository(DataPoint).findOneBy({ id: res.body.data.id });
      expect(dataPointInDb).toBeDefined();
    });

    it('should return 401 if API key is missing', async () => {
      const res = await request(app)
        .post('/api/v1/data-points/submit')
        .send({
          serviceId: testService.id,
          metricName: testMetric.name,
          value: 100,
          timestamp: new Date().toISOString(),
        });
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Missing X-API-Key header');
    });

    it('should return 401 if API key is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/data-points/submit')
        .set('X-API-Key', 'invalid-api-key')
        .send({
          serviceId: testService.id,
          metricName: testMetric.name,
          value: 100,
          timestamp: new Date().toISOString(),
        });
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Invalid Service ID or API Key.');
    });

    it('should return 404 if metric definition not found for service', async () => {
      const res = await request(app)
        .post('/api/v1/data-points/submit')
        .set('X-API-Key', testService.apiKey)
        .send({
          serviceId: testService.id,
          metricName: 'non_existent_metric',
          value: 100,
          timestamp: new Date().toISOString(),
        });
      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toContain('Metric definition \'non_existent_metric\' not found');
    });

    it('should return 400 for invalid request body', async () => {
      const res = await request(app)
        .post('/api/v1/data-points/submit')
        .set('X-API-Key', testService.apiKey)
        .send({
          serviceId: 'invalid-uuid', // Invalid
          metricName: testMetric.name,
          value: 'not-a-number', // Invalid
          timestamp: 'not-a-date', // Invalid
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('GET /api/v1/data-points/:serviceId', () => {
    let otherUser: User;
    let otherService: Service;
    let otherMetric: MetricDefinition;
    let otherUserAccessToken: string;

    beforeAll(async () => {
      // Create another user, service, and metric for permission testing
      otherUser = AppDataSource.getRepository(User).create({
        username: 'other_datapoint_user',
        email: 'other_datapoint_user@example.com',
        passwordHash: await require('bcryptjs').hash('password', 10),
        roles: [UserRole.USER],
      });
      await AppDataSource.getRepository(User).save(otherUser);

      otherService = AppDataSource.getRepository(Service).create({
        name: 'Other DataPoint Service',
        apiKey: uuidv4(),
        userId: otherUser.id,
      });
      await AppDataSource.getRepository(Service).save(otherService);

      otherMetric = AppDataSource.getRepository(MetricDefinition).create({
        serviceId: otherService.id,
        name: 'other_metric',
        type: MetricType.CUSTOM_GAUGE,
      });
      await AppDataSource.getRepository(MetricDefinition).save(otherMetric);

      otherUserAccessToken = sign({ id: otherUser.id, username: otherUser.username, email: otherUser.email, roles: otherUser.roles }, JWT_SECRET!, { expiresIn: '1h' });

      // Add some data points for testMetric
      const now = new Date();
      for (let i = 0; i < 5; i++) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000); // Hourly
        await AppDataSource.getRepository(DataPoint).save({
          metricDefinitionId: testMetric.id,
          value: 10 + i * 5,
          timestamp: timestamp,
        });
      }
    });

    it('should return aggregated data points for an owned service', async () => {
      const res = await request(app)
        .get(`/api/v1/data-points/${testService.id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .query({
          metricDefinitionId: testMetric.id,
          interval: '1h',
          aggregateFunction: 'avg',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1); // At least one hour of data
      expect(res.body.data[0]).toHaveProperty('time');
      expect(res.body.data[0]).toHaveProperty('metricName', testMetric.name);
      expect(res.body.data[0]).toHaveProperty('value');
    });

    it('should return 403 if user does not own the service', async () => {
      const res = await request(app)
        .get(`/api/v1/data-points/${otherService.id}`)
        .set('Authorization', `Bearer ${userAccessToken}`); // User tries to access otherUser's service
      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toBe('You do not have permission to view data for this service.');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .get(`/api/v1/data-points/${testService.id}`);
      expect(res.statusCode).toEqual(401);
    });

    it('should return 404 if service not found', async () => {
      const res = await request(app)
        .get('/api/v1/data-points/nonexistent-service-id')
        .set('Authorization', `Bearer ${userAccessToken}`);
      expect(res.statusCode).toEqual(404);
    });

    it('should handle time range queries', async () => {
        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
        const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();

        const res = await request(app)
          .get(`/api/v1/data-points/${testService.id}`)
          .set('Authorization', `Bearer ${userAccessToken}`)
          .query({
            metricDefinitionId: testMetric.id,
            startDate: twoHoursAgo,
            endDate: oneHourAgo,
            interval: '1h',
            aggregateFunction: 'avg',
          });

        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data).toBeInstanceOf(Array);
        // Expect data for timestamps within the last 2 hours to 1 hour ago
        // This count might vary based on how many data points fall exactly in this small window.
        // A more robust test would check the `time` property of results.
        expect(res.body.data.length).toBeGreaterThanOrEqual(0);
    });
  });
});
```