```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Load test data (e.g., user credentials for login)
const users = new SharedArray('users', function () {
  return JSON.parse(open('./users.json')).users;
});

export const options = {
  vus: 10, // 10 virtual users
  duration: '30s', // for 30 seconds
  stages: [
    { duration: '5s', target: 5 },  // Ramp up to 5 users over 5 seconds
    { duration: '20s', target: 10 }, // Stay at 10 users for 20 seconds
    { duration: '5s', target: 0 },  // Ramp down to 0 users over 5 seconds
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% of requests should fail
  },
};

export default function () {
  const BASE_URL = 'http://localhost:5000/api/v1';

  // 1. Simulate Home Page / Get Posts (Public)
  let res = http.get(`${BASE_URL}/posts`);
  check(res, {
    'GET /posts status is 200': (r) => r.status === 200,
    'GET /posts has data': (r) => JSON.parse(r.body).data.length > 0,
  });
  sleep(1); // Simulate user reading posts

  // 2. Simulate User Login (Authenticated Action)
  const user = users[Math.floor(Math.random() * users.length)];
  res = http.post(`${BASE_URL}/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  check(res, {
    'POST /auth/login status is 200': (r) => r.status === 200,
    'POST /auth/login successful': (r) => r.json().success === true,
  });

  // Extract token from cookie if set (assuming cookie-based auth)
  let authToken = '';
  if (res.cookies && res.cookies.token && res.cookies.token.length > 0) {
    authToken = res.cookies.token[0].value;
  }

  // 3. Simulate fetching a protected resource (e.g., user dashboard data or individual post)
  if (authToken) {
    res = http.get(`${BASE_URL}/auth/me`, {
      cookies: { token: authToken } // Use the received token
    });
    check(res, {
      'GET /auth/me status is 200': (r) => r.status === 200,
      'GET /auth/me returns user data': (r) => r.json().data.id === user.id,
    });
  } else {
    console.error('Login failed, cannot perform authenticated actions.');
  }

  sleep(Math.random() * 2 + 1); // Random sleep between 1 and 3 seconds
}

// Example users.json for k6 (placed in the same directory as k6-performance-test.js)
// === users.json ===
// {
//   "users": [
//     { "email": "admin@example.com", "password": "password123" },
//     { "email": "editor@example.com", "password": "password123" },
//     { "email": "author@example.com", "password": "password123" }
//   ]
// }