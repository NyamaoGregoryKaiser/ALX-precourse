import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// Define a custom metric for errors
const ErrorCounter = new Counter('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Simulate ramp-up to 20 users over 30 seconds
    { duration: '1m', target: 20 },  // Stay at 20 users for 1 minute
    { duration: '20s', target: 0 },  // Ramp-down to 0 users over 20 seconds
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests should be below 500ms, 99% below 1s
    http_req_failed: ['rate<0.01'],                  // Less than 1% of HTTP requests should fail
    errors: ['count<10'],                            // Less than 10 errors in custom error counter
  },
  ext: {
    // You can add options for k6 Cloud here if you use it
  },
};

// Base URL for the API
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:5000/api/v1';

// Seeded credentials for testing authenticated endpoints
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';
const USER_EMAIL = 'user@example.com';
const USER_PASSWORD = 'password123';

// Variable to store JWT token for authenticated requests
let authToken = null;

// Function to get an auth token (runs once per VU if needed)
function getAuthToken(email, password) {
  const loginRes = http.post(`${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login token exists': (r) => r.json() && r.json().token,
  });

  if (loginRes.status !== 200) {
    ErrorCounter.add(1);
    console.error(`Login failed for ${email}: ${loginRes.body}`);
    return null;
  }
  return loginRes.json('token');
}

// Init function runs once for each VU
export function setup() {
  console.log('Starting k6 setup...');
  // Ensure the database has some data if not already seeded
  // This is a simplified approach; in a real scenario, you'd use pre-test scripts
  // to ensure DB state or test against an already populated environment.

  // Get an admin token for setup if needed or for subsequent test runs
  const adminToken = getAuthToken(ADMIN_EMAIL, ADMIN_PASSWORD);

  // Example: Create some products if none exist using the admin token
  if (adminToken) {
    const productsRes = http.get(`${BASE_URL}/products`);
    if (productsRes.json('products.length') === 0) {
      console.log('No products found, creating one...');
      const createRes = http.post(`${BASE_URL}/products`,
        JSON.stringify({
          name: 'Load Test Product',
          description: 'A product created during load testing setup.',
          price: 100.00,
          stock: 100,
        }),
        { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` } }
      );
      check(createRes, { 'product created': (r) => r.status === 201 });
      if (createRes.status !== 201) {
        ErrorCounter.add(1);
        console.error(`Failed to create product during setup: ${createRes.body}`);
      }
    }
  }

  console.log('k6 setup complete.');
  return { adminToken: adminToken };
}

// Default function represents a single user's journey
export default function (data) {
  // Scenario: Browse products (unauthenticated)
  let res = http.get(`${BASE_URL}/products`);
  check(res, {
    'GET /products status is 200': (r) => r.status === 200,
    'GET /products has data': (r) => r.json('products.length') > 0,
  });
  if (res.status !== 200) {
    ErrorCounter.add(1);
    console.error(`GET /products failed: ${res.body}`);
  }
  sleep(1);

  // Each virtual user (VU) tries to log in
  if (!authToken) {
    authToken = getAuthToken(USER_EMAIL, USER_PASSWORD);
  }

  // Scenario: Get a specific product (authenticated)
  if (authToken) {
    const products = res.json('products');
    if (products && products.length > 0) {
      const productId = products[0].id; // Get the first product ID
      res = http.get(`${BASE_URL}/products/${productId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      check(res, {
        'GET /products/{id} status is 200': (r) => r.status === 200,
        'GET /products/{id} has correct ID': (r) => r.json('id') === productId,
      });
      if (res.status !== 200) {
        ErrorCounter.add(1);
        console.error(`GET /products/${productId} failed: ${res.body}`);
      }
    } else {
      console.warn('No products available to fetch by ID. Check setup.');
      ErrorCounter.add(1);
    }
    sleep(1);

    // Scenario: Create a new product (authenticated) - only a few VUs should do this
    if (__VU % 5 === 0) { // Only 20% of VUs create products
      const newProduct = {
        name: `Test Product ${__VU}-${__ITER}`,
        description: 'Description for load test product.',
        price: (Math.random() * 100).toFixed(2),
        stock: Math.floor(Math.random() * 50) + 1,
      };

      res = http.post(`${BASE_URL}/products`,
        JSON.stringify(newProduct),
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
        }
      );

      check(res, {
        'POST /products status is 201': (r) => r.status === 201,
        'POST /products has ID': (r) => r.json('id') !== null,
      });
      if (res.status !== 201) {
        ErrorCounter.add(1);
        console.error(`POST /products failed: ${res.body}`);
      }
      sleep(1);
    }
  } else {
    console.error('Auth token not available, skipping authenticated requests.');
  }

  sleep(Math.random() * 3); // Random sleep between 0 and 3 seconds
}
```