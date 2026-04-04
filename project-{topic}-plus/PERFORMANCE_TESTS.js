```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Rate } from 'k6/metrics';

// Load environment variables from a .env file (or K6_ENVIRONMENT_VARIABLES)
// For local K6 testing, you can use:
// K6_ADMIN_EMAIL=admin@example.com K6_ADMIN_PASSWORD=adminpassword123 k6 run PERFORMANCE_TESTS.js
// Or set in your system environment.
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const ADMIN_EMAIL = __ENV.K6_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = __ENV.K6_ADMIN_PASSWORD || 'adminpassword123';

// Custom metrics
const errorRate = new Rate('errors');
const unauthorizedRate = new Rate('unauthorized_errors');
const notFoundRate = new Rate('not_found_errors');
const conflictRate = new Rate('conflict_errors');
const tooManyRequestsRate = new Rate('too_many_requests_errors');
const requestCounter = new Counter('http_reqs_total');

// Test scenarios configuration
export const options = {
  scenarios: {
    // 1. Warm-up scenario for basic sanity check
    warmup: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      exec: 'testAuthFlow', // Using auth flow for warm-up
      tags: { scenario: 'warmup' },
    },
    // 2. Stress Test: High load over a longer period
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },  // Ramp up to 50 VUs over 1 minute
        { duration: '3m', target: 50 },  // Stay at 50 VUs for 3 minutes
        { duration: '1m', target: 0 },   // Ramp down to 0 VUs over 1 minute
      ],
      exec: 'testAuthenticatedFlow', // Focus on authenticated operations
      startTime: '35s', // Start after warmup
      tags: { scenario: 'stress' },
    },
    // 3. Spike Test: Sudden, intense burst of traffic
    spike: {
      executor: 'constant-arrival-rate',
      rate: 100, // 100 requests per second
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 10, // Max VUs to use
      maxVUs: 100, // Max possible VUs
      exec: 'testSpikeLoad', // Mixed operations
      startTime: '5m', // Start after stress test
      tags: { scenario: 'spike' },
    },
    // 4. Rate Limit Test: Specifically hit a rate-limited endpoint
    rate_limit: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 20, // Each VU tries 20 logins, total 200 attempts
      exec: 'testRateLimit',
      startTime: '5m 35s', // Start after spike
      tags: { scenario: 'rate_limit' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests should be below 500ms, 99% below 1s
    http_req_failed: ['rate<0.01'], // less than 1% of requests should fail
    errors: ['rate<0.01'], // Less than 1% application/logical errors
    unauthorized_errors: ['rate<0.01'], // Less than 1% auth errors (except for rate_limit test)
    not_found_errors: ['rate<0.01'],
    conflict_errors: ['rate<0.01'],
    too_many_requests_errors: ['rate<0.1'], // Allow more for rate_limit scenario
    // Add thresholds for custom metrics if needed
  },
};

// Shared data for users
const users = new SharedArray('users', function () {
  const data = [];
  for (let i = 0; i < 20; i++) {
    data.push({
      username: `k6user${i}_${__VU}_${__ITER}`,
      email: `k6user${i}_${__VU}_${__ITER}@test.com`,
      password: 'K6TestPassword123!',
    });
  }
  return data;
});

// Admin token holder
let adminJwt = '';

// Pre-test setup function (runs once before VUs start)
export function setup() {
  console.log('Setup: Logging in as admin to get a token...');
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'Admin login successful': (r) => r.status === 200 && r.json().token !== undefined,
  }) || errorRate.add(1);

  if (loginRes.status === 200) {
    adminJwt = loginRes.json().token;
    console.log(`Admin token obtained.`);
  } else {
    console.error(`Admin login failed: ${loginRes.status} ${loginRes.body}`);
    // If admin login fails, subsequent tests requiring admin will also fail
  }

  // Register some users for the authenticated flows
  const registeredUsers = [];
  for (const userData of users) {
    const registerRes = http.post(`${BASE_URL}/auth/register`, JSON.stringify(userData), {
      headers: { 'Content-Type': 'application/json' },
    });
    check(registerRes, {
      [`User ${userData.email} registered`]: (r) => r.status === 201 || (r.status === 409 && r.body.includes('Email already registered.')),
    }) || errorRate.add(1);

    if (registerRes.status === 201) {
      registeredUsers.push({ email: userData.email, password: userData.password, id: registerRes.json().data.user.id });
    } else if (registerRes.status === 409) {
      // If user already registered from previous run, try to log in
      const loginAttempt = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        email: userData.email,
        password: userData.password,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
      check(loginAttempt, {
        [`Existing user ${userData.email} logged in`]: (r) => r.status === 200,
      }) || errorRate.add(1);
      if (loginAttempt.status === 200) {
        registeredUsers.push({ email: userData.email, password: userData.password, id: loginAttempt.json().data.user.id });
      }
    }
  }

  return { adminToken: adminJwt, registeredUsers };
}

// Function to get a random user from the SharedArray
function getRandomUserData(setupData) {
  const index = Math.floor(Math.random() * setupData.registeredUsers.length);
  return setupData.registeredUsers[index];
}


export function testAuthFlow(setupData) {
  requestCounter.add(1);
  const user = users[__VU % users.length]; // Use VU-specific user data for registration

  // 1. Register a user (might conflict if already run)
  const registerRes = http.post(`${BASE_URL}/auth/register`, JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(registerRes, {
    'Register status is 201 or 409': (r) => r.status === 201 || r.status === 409,
    'Register no auth error': (r) => r.status !== 401,
  }) || errorRate.add(1);
  if (registerRes.status === 401) unauthorizedRate.add(1);
  if (registerRes.status === 409) conflictRate.add(1);

  // 2. Log in (with either new or existing user)
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: user.email,
    password: user.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(loginRes, {
    'Login status is 200': (r) => r.status === 200,
    'Login no auth error': (r) => r.status !== 401,
    'Login has token': (r) => r.json().token !== undefined,
  }) || errorRate.add(1);
  if (loginRes.status === 401) unauthorizedRate.add(1);

  sleep(1); // Simulate user think time
}


export function testAuthenticatedFlow(setupData) {
  requestCounter.add(1);
  const userData = getRandomUserData(setupData);
  let jwt = '';

  // Log in
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: userData.email,
    password: userData.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(loginRes, {
    'Auth flow: login status 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  if (loginRes.status === 200) {
    jwt = loginRes.json().token;
  } else {
    unauthorizedRate.add(1);
    console.warn(`User login failed in authenticated flow for ${userData.email}: ${loginRes.status} ${loginRes.body}`);
    sleep(1);
    return; // Exit if login fails
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwt}`,
  };

  // Get user profile
  const profileRes = http.get(`${BASE_URL}/users/me`, { headers: authHeaders });
  check(profileRes, {
    'Auth flow: get profile status 200': (r) => r.status === 200,
    'Auth flow: get profile has user data': (r) => r.json().data.user.id === userData.id,
  }) || errorRate.add(1);
  if (profileRes.status === 401) unauthorizedRate.add(1);

  sleep(0.5);

  // Create a category
  const categoryName = `TestCategory_${__VU}_${__ITER}`;
  const createCategoryRes = http.post(`${BASE_URL}/categories`, JSON.stringify({ name: categoryName }), { headers: authHeaders });
  check(createCategoryRes, {
    'Auth flow: create category status 201 or 409': (r) => r.status === 201 || r.status === 409,
  }) || errorRate.add(1);
  if (createCategoryRes.status === 401) unauthorizedRate.add(1);
  if (createCategoryRes.status === 409) conflictRate.add(1);

  let categoryId = '';
  if (createCategoryRes.status === 201) {
    categoryId = createCategoryRes.json().data.category.id;
  } else if (createCategoryRes.status === 409) {
    // If category already exists, try to fetch it
    const fetchExistingCategoryRes = http.get(`${BASE_URL}/categories?name=${encodeURIComponent(categoryName)}`, { headers: authHeaders });
    if (fetchExistingCategoryRes.status === 200 && fetchExistingCategoryRes.json().data.categories.length > 0) {
      categoryId = fetchExistingCategoryRes.json().data.categories[0].id;
    }
  }

  sleep(0.5);

  // Create a task
  const taskTitle = `Test Task ${__VU}-${__ITER}`;
  const createTaskRes = http.post(`${BASE_URL}/tasks`, JSON.stringify({
    title: taskTitle,
    description: 'Performance test task',
    categoryId: categoryId || undefined,
  }), { headers: authHeaders });
  check(createTaskRes, {
    'Auth flow: create task status 201': (r) => r.status === 201,
  }) || errorRate.add(1);
  if (createTaskRes.status === 401) unauthorizedRate.add(1);

  let taskId = createTaskRes.json()?.data?.task?.id;

  sleep(0.5);

  // Get tasks (with pagination)
  const getTasksRes = http.get(`${BASE_URL}/tasks?page=1&limit=10`, { headers: authHeaders });
  check(getTasksRes, {
    'Auth flow: get tasks status 200': (r) => r.status === 200,
    'Auth flow: get tasks has data': (r) => Array.isArray(r.json().data.tasks),
  }) || errorRate.add(1);
  if (getTasksRes.status === 401) unauthorizedRate.add(1);

  sleep(0.5);

  // Update a task (if created)
  if (taskId) {
    const updateTaskRes = http.patch(`${BASE_URL}/tasks/${taskId}`, JSON.stringify({ status: 'COMPLETED' }), { headers: authHeaders });
    check(updateTaskRes, {
      'Auth flow: update task status 200': (r) => r.status === 200,
    }) || errorRate.add(1);
    if (updateTaskRes.status === 401) unauthorizedRate.add(1);
    if (updateTaskRes.status === 404) notFoundRate.add(1);
  }

  sleep(0.5);

  // Admin: Get all users (only if adminToken is available)
  if (setupData.adminToken) {
    const adminHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${setupData.adminToken}`,
    };
    const getAllUsersRes = http.get(`${BASE_URL}/users?limit=5`, { headers: adminHeaders });
    check(getAllUsersRes, {
      'Auth flow: admin get all users status 200': (r) => r.status === 200,
      'Auth flow: admin get all users has data': (r) => Array.isArray(r.json().data.users),
    }) || errorRate.add(1);
    if (getAllUsersRes.status === 401) unauthorizedRate.add(1);
  }

  sleep(1);
}

export function testSpikeLoad(setupData) {
  requestCounter.add(1);
  const userData = getRandomUserData(setupData);
  let jwt = '';

  // Log in
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: userData.email,
    password: userData.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(loginRes, {
    'Spike: login status 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  if (loginRes.status === 200) {
    jwt = loginRes.json().token;
  } else {
    unauthorizedRate.add(1);
    // console.warn(`Spike: User login failed for ${userData.email}: ${loginRes.status} ${loginRes.body}`);
    sleep(1);
    return; // Exit if login fails
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwt}`,
  };

  // Mix of reads and writes
  http.get(`${BASE_URL}/tasks?limit=5`, { headers: authHeaders });
  sleep(0.1);

  http.get(`${BASE_URL}/categories`, { headers: authHeaders });
  sleep(0.1);

  if (__ITER % 5 === 0) { // Every 5th iteration, create a task
    http.post(`${BASE_URL}/tasks`, JSON.stringify({
      title: `Spike Task ${__VU}-${__ITER}`,
      description: 'Spike load task',
    }), { headers: authHeaders });
    sleep(0.1);
  }

  // Admin access (less frequent)
  if (__ITER % 10 === 0 && setupData.adminToken) {
    const adminHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${setupData.adminToken}`,
    };
    http.get(`${BASE_URL}/users?limit=1`, { headers: adminHeaders });
    sleep(0.1);
  }
}

export function testRateLimit() {
  requestCounter.add(1);
  const user = users[0]; // Use a fixed user to consistently hit rate limit on auth endpoint

  // Attempt login multiple times to trigger rate limit
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: user.email, // Use an existing user, or even a non-existent one
    password: 'wrongpassword', // Intentional wrong password to force checks
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status === 429) {
    tooManyRequestsRate.add(1);
  } else if (loginRes.status === 401) {
    unauthorizedRate.add(1);
  } else {
    errorRate.add(1);
  }

  check(loginRes, {
    'Rate limit: login status is 429 or 401': (r) => r.status === 429 || r.status === 401,
  });

  sleep(0.1);
}
```