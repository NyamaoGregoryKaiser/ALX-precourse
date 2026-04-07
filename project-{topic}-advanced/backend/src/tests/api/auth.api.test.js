const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../app');
const { User } = require('../../db/models');
const { getRedisClient } = require('../../config/redis.config');
const { v4: uuidv4 } = require('uuid');

describe('Auth API Coverage', () => {
  let adminUser, regularUser, adminAccessToken, regularAccessToken, adminRefreshToken, regularRefreshToken;
  let redisClient;

  beforeAll(async () => {
    // Rely on global setupTests.js to seed the database
    adminUser = await User.findOne({ where: { email: 'admin@example.com' } });
    regularUser = await User.findOne({ where: { email: 'user@example.com' } });

    // Login once to get tokens for API tests
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: adminUser.email, password: 'password123' });
    adminAccessToken = adminLoginRes.body.tokens.access.token;
    adminRefreshToken = adminLoginRes.body.tokens.refresh.token;

    const regularLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: regularUser.email, password: 'password123' });
    regularAccessToken = regularLoginRes.body.tokens.access.token;
    regularRefreshToken = regularLoginRes.body.tokens.refresh.token;

    redisClient = getRedisClient();
  });

  afterAll(async () => {
    // Clean up refresh tokens from Redis for the generated tokens
    await redisClient.del(`refreshToken:${adminUser.id}:${adminRefreshToken}`);
    await redisClient.del(`refreshToken:${regularUser.id}:${regularRefreshToken}`);
  });

  it('should respond with 401 Unauthorized for missing access token', async () => {
    await request(app)
      .get('/api/v1/users') // An authenticated route
      .expect(httpStatus.UNAUTHORIZED);
  });

  it('should respond with 401 Unauthorized for invalid access token', async () => {
    await request(app)
      .get('/api/v1/users')
      .set('Authorization', 'Bearer invalidtoken123')
      .expect(httpStatus.UNAUTHORIZED);
  });

  it('should respond with 403 Forbidden for insufficient role (user accessing admin route)', async () => {
    await request(app)
      .get('/api/v1/users') // Admin-only route
      .set('Authorization', `Bearer ${regularAccessToken}`)
      .expect(httpStatus.FORBIDDEN);
  });

  it('should allow admin to access admin-only routes', async () => {
    await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(httpStatus.OK);
  });

  it('should allow regular user to access common routes (e.g., their own projects)', async () => {
    await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${regularAccessToken}`)
      .expect(httpStatus.OK);
  });

  it('should return 404 for unknown routes', async () => {
    await request(app)
      .get('/api/v1/unknown-route')
      .set('Authorization', `Bearer ${regularAccessToken}`) // Authenticated to bypass auth error
      .expect(httpStatus.NOT_FOUND);
  });

  it('should handle too many requests with 429 Too Many Requests (rate limiting)', async () => {
    const originalMaxRequests = config.rateLimit.max;
    const originalWindowMs = config.rateLimit.windowMs;

    // Temporarily reduce rate limit for testing
    config.rateLimit.max = 2; // Allow 2 requests
    config.rateLimit.windowMs = 1000; // In 1 second

    // Re-initialize limiter middleware if it was dynamic (or restart app)
    // For supertest, this requires a fresh app instance or direct middleware testing.
    // Assuming the limiter is active on /auth routes for simplicity here.
    // In a real scenario, you might have specific rate limits for different routes.

    // Make 3 requests to a rate-limited endpoint (e.g., login)
    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: regularUser.email, password: 'password123' })
      .expect(httpStatus.OK);

    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: regularUser.email, password: 'password123' })
      .expect(httpStatus.OK);

    // Third request should be rate-limited
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: regularUser.email, password: 'password123' })
      .expect(httpStatus.TOO_MANY_REQUESTS);

    expect(res.body.message).toContain('Too many requests');

    // Restore original rate limit config (important for subsequent tests)
    config.rateLimit.max = originalMaxRequests;
    config.rateLimit.windowMs = originalWindowMs;
  });
});