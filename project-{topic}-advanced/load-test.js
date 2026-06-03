```javascript
// A conceptual k6 load test script for the Task Manager Backend
// To run: install k6 (https://k6.io/docs/getting-started/installation/)
// Then: k6 run load-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Warm-up: 20 concurrent users for 30 seconds
    { duration: '1m', target: 50 },  // Ramp-up: 50 concurrent users for 1 minute
    { duration: '2m', target: 100 }, // Steady-state: 100 concurrent users for 2 minutes
    { duration: '30s', target: 0 },  // Cool-down: ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests should be <500ms, 99% <1000ms
    http_req_failed: ['rate<0.01'], // less than 1% of requests should fail
  },
};

// Base URL of your API
const BASE_URL = 'http://localhost:5000/api/v1';

// Shared data for users (e.g., pre-registered users for login)
// In a real scenario, you'd generate/load many users
const users = new SharedArray('users', function () {
  const data = [];
  // Add some dummy users, or load from a file
  for (let i = 0; i < 10; i++) {
    data.push({
      email: `perf_user_${i}@example.com`,
      password: 'PerfUser123!',
      name: `Perf User ${i}`,
    });
  }
  return data;
});

export function setup() {
  // Pre-register users if they don't exist
  // This phase runs once before all VUs start
  users.forEach(user => {
    const res = http.post(`${BASE_URL}/auth/register`, JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Setup_RegisterUser' }
    });
    if (res.status !== 201 && res.status !== 409) { // 409 means user already exists
      console.error(`Failed to register user ${user.email}: ${res.status} - ${res.body}`);
    } else if (res.status === 201) {
      console.log(`Registered user: ${user.email}`);
    }
  });
  return { users: users };
}

export default function () {
  const user = users[__VU % users.length]; // Each VU gets a unique user from the array

  // 1. Login (obtain JWT)
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: user.email,
    password: user.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'Login' }
  });

  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login has accessToken': (r) => r.json('data.accessToken') !== undefined,
  });

  const accessToken = loginRes.json('data.accessToken');
  if (!accessToken) {
    console.error(`Login failed for ${user.email}: ${loginRes.status} - ${loginRes.body}`);
    return;
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  };

  sleep(1); // Simulate user think time

  // 2. Get User Profile
  const profileRes = http.get(`${BASE_URL}/users/me`, {
    headers: authHeaders,
    tags: { name: 'GetUserProfile' }
  });
  check(profileRes, {
    'get profile status is 200': (r) => r.status === 200,
    'profile contains user data': (r) => r.json('data.user.email') === user.email,
  });

  sleep(1);

  // 3. Get Categories
  const categoriesRes = http.get(`${BASE_URL}/categories`, {
    headers: authHeaders,
    tags: { name: 'GetCategories' }
  });
  check(categoriesRes, {
    'get categories status is 200': (r) => r.status === 200,
  });

  const categories = categoriesRes.json('data.categories');
  let categoryId = null;
  if (categories && categories.length > 0) {
    categoryId = categories[0].id; // Use first category for task creation
  }

  sleep(1);

  // 4. Create a Task
  const createTaskPayload = {
    title: `Task for VU ${__VU} - Iteration ${__ITER}`,
    description: `Description for task for user ${user.email}`,
    dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    categoryId: categoryId,
    status: 'PENDING',
  };

  const createTaskRes = http.post(`${BASE_URL}/tasks`, JSON.stringify(createTaskPayload), {
    headers: authHeaders,
    tags: { name: 'CreateTask' }
  });
  check(createTaskRes, {
    'create task status is 201': (r) => r.status === 201,
  });

  const taskId = createTaskRes.json('data.task.id');

  sleep(1);

  // 5. Get All Tasks (with some filters)
  const getTasksRes = http.get(`${BASE_URL}/tasks?status=PENDING&limit=5`, {
    headers: authHeaders,
    tags: { name: 'GetFilteredTasks' }
  });
  check(getTasksRes, {
    'get tasks status is 200': (r) => r.status === 200,
  });

  sleep(1);

  // 6. Update a Task (if created successfully)
  if (taskId) {
    const updateTaskPayload = {
      status: 'COMPLETED',
      description: 'Updated description by k6 test',
    };
    const updateTaskRes = http.patch(`${BASE_URL}/tasks/${taskId}`, JSON.stringify(updateTaskPayload), {
      headers: authHeaders,
      tags: { name: 'UpdateTask' }
    });
    check(updateTaskRes, {
      'update task status is 200': (r) => r.status === 200,
      'updated task status is COMPLETED': (r) => r.json('data.task.status') === 'COMPLETED',
    });
    sleep(1);
  }

  // 7. Delete a Task (cleanup)
  if (taskId) {
    const deleteTaskRes = http.del(`${BASE_URL}/tasks/${taskId}`, null, {
      headers: authHeaders,
      tags: { name: 'DeleteTask' }
    });
    check(deleteTaskRes, {
      'delete task status is 204': (r) => r.status === 204,
    });
    sleep(1);
  }
}
```

---

### 5. Documentation

**Comprehensive README**