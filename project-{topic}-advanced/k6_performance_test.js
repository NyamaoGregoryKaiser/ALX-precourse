```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Configuration for the load test
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 virtual users over 30 seconds
    { duration: '1m', target: 20 },   // Stay at 20 virtual users for 1 minute
    { duration: '10s', target: 0 },   // Ramp down to 0 virtual users over 10 seconds
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should complete within 500ms
    http_req_failed: ['rate<0.01'],    // Error rate should be less than 1%
  },
};

// Shared data for users
const users = new SharedArray('users', function () {
  const data = JSON.parse(open('./tests/k6_users.json')); // Load user data
  return data;
});

// Main test function
export default function () {
  const baseUrl = 'http://localhost:3000/api/v1';

  // 1. Authenticate (Login) - each VU logs in
  const user = users[__VU % users.length]; // Select user based on virtual user ID
  const loginRes = http.post(`${baseUrl}/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Login' }
    }
  );

  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login has access token': (r) => r.json() && r.json().tokens && r.json().tokens.access && r.json().tokens.access.token !== '',
  });

  const accessToken = loginRes.json('tokens.access.token');

  // If login failed, stop here for this VU
  if (!accessToken) {
    console.error(`VU ${__VU}: Login failed for user ${user.email}.`);
    return;
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  };

  sleep(1); // Think time

  // 2. Fetch all products (read operation)
  const productsRes = http.get(`${baseUrl}/products?limit=10&page=1`, {
    headers: authHeaders,
    tags: { name: 'GetProducts' }
  });

  check(productsRes, {
    'get products status is 200': (r) => r.status === 200,
    'get products has results': (r) => r.json() && r.json().results && r.json().results.length > 0,
  });

  const products = productsRes.json('results');
  let productIdToOrder = null;
  if (products && products.length > 0) {
    productIdToOrder = products[0].id; // Pick the first product to order
  }

  sleep(1);

  // 3. Create an order (write operation)
  if (productIdToOrder) {
    const orderRes = http.post(`${baseUrl}/orders`,
      JSON.stringify({ productId: productIdToOrder, quantity: 1 }),
      {
        headers: authHeaders,
        tags: { name: 'CreateOrder' }
      }
    );

    check(orderRes, {
      'create order status is 201 or 400 (stock)': (r) => r.status === 201 || r.status === 400, // 400 if out of stock
      'create order has ID': (r) => r.json() && r.json().id !== undefined,
    });
  } else {
    console.warn(`VU ${__VU}: No products found to create an order.`);
  }

  sleep(1);

  // 4. Fetch user's own orders (read operation)
  const myOrdersRes = http.get(`${baseUrl}/orders`, {
    headers: authHeaders,
    tags: { name: 'GetMyOrders' }
  });

  check(myOrdersRes, {
    'get my orders status is 200': (r) => r.status === 200,
    'get my orders has results array': (r) => r.json() && Array.isArray(r.json().results),
  });

  sleep(1);
}
```