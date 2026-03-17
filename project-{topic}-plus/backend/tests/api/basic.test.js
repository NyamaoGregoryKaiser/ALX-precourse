```javascript
const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/database'); // Ensure DB connection is handled

describe('Basic API Endpoint Tests', () => {
  // Test the root endpoint
  it('should return a welcome message on the root endpoint', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toContain('Welcome to the Product Management API!');
  });

  // Test 404 for undefined routes
  it('should return 404 for an undefined route', async () => {
    const res = await request(app).get('/api/v1/non-existent-route');
    expect(res.statusCode).toEqual(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Can\'t find /api/v1/non-existent-route on this server!');
  });

  // Test rate limiting (assuming it's enabled and configured)
  it('should apply rate limiting', async () => {
    // Make many requests rapidly to hit the limit
    const numRequests = 110; // Assuming max 100 requests per minute
    let lastResponse;
    for (let i = 0; i < numRequests; i++) {
      lastResponse = await request(app).get('/api/v1/products');
      if (lastResponse.statusCode === 429) {
        break; // Stop if rate limit is hit
      }
    }
    expect(lastResponse.statusCode).toEqual(429);
    expect(lastResponse.body.message).toContain('Too many requests');
  }, 60000); // Increase timeout for this test
});
```