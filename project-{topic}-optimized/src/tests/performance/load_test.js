import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Configuration for the load test
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Warm-up: 20 users for 30 seconds
    { duration: '1m', target: 50 },  // Steady-state: 50 users for 1 minute
    { duration: '30s', target: 0 },  // Ramp-down: 0 users for 30 seconds
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],    // Error rate should be less than 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

// Shared data for users (pre-registered) to simulate real users
const users = new SharedArray('users', function () {
  return JSON.parse(open('../../tests/performance/users.json'));
});

export default function () {
  // Simulate user login (once per VU)
  if (__VU === 0 && !__ENV.JWT_TOKEN) { // Only the first VU logs in if no token is provided externally
    const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify(users[0]), {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Login' },
    });
    check(loginRes, { 'Login successful': (r) => r.status === 200 && r.json().tokens.accessToken !== undefined });
    if (loginRes.status === 200) {
      __ENV.JWT_TOKEN = loginRes.json().tokens.accessToken; // Store token for subsequent requests
    }
  }

  // Get a token, either from environment or the first VU login
  const authToken = __ENV.JWT_TOKEN || users[__VU % users.length].token; // Use pre-generated token or one from first VU
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };

  // Simulate getting all projects
  const projectsRes = http.get(`${BASE_URL}/projects`, {
    headers: headers,
    tags: { name: 'Get all Projects' },
  });
  check(projectsRes, { 'Get Projects successful': (r) => r.status === 200 });
  const projects = projectsRes.json();
  sleep(1);

  // Simulate getting a specific project (if any projects exist)
  if (projects && projects.length > 0) {
    const randomProject = projects[Math.floor(Math.random() * projects.length)];
    const projectDetailRes = http.get(`${BASE_URL}/projects/${randomProject.id}`, {
      headers: headers,
      tags: { name: 'Get Project Details' },
    });
    check(projectDetailRes, { 'Get Project Detail successful': (r) => r.status === 200 });
  }
  sleep(1);

  // Simulate getting tasks (for a specific project if available, or all)
  const tasksRes = http.get(`${BASE_URL}/tasks`, {
    headers: headers,
    tags: { name: 'Get Tasks' },
  });
  check(tasksRes, { 'Get Tasks successful': (r) => r.status === 200 });
  sleep(1);

  // Simulate creating a new task (less frequent, perhaps by managers/admins)
  if (__VU % 10 === 0 && projects && projects.length > 0) { // Only 10% of VUs create tasks
    const randomProjectForTask = projects[Math.floor(Math.random() * projects.length)];
    const newTask = {
      title: `Task-${__VU}-${__ITER}`,
      description: 'Performance test task',
      projectId: randomProjectForTask.id,
      status: 'PENDING',
      dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
      tags: ['perf', 'k6']
    };
    const createTaskRes = http.post(`${BASE_URL}/tasks`, JSON.stringify(newTask), {
      headers: headers,
      tags: { name: 'Create Task' },
    });
    check(createTaskRes, { 'Create Task successful': (r) => r.status === 201 });
  }
  sleep(2); // Longer sleep after task creation to simulate user thinking time
}
```

You would need a `src/tests/performance/users.json` file with pre-registered user credentials for login, or generated JWT tokens.

```json