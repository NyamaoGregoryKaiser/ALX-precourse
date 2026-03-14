import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Load test data (e.g., existing user credentials for login)
const users = new SharedArray('users', function () {
  return JSON.parse(open('./users.json')).users;
});

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 virtual users over 30 seconds
    { duration: '1m', target: 50 },   // Stay at 50 virtual users for 1 minute
    { duration: '30s', target: 0 },   // Ramp down to 0 virtual users over 30 seconds
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete within 500ms
    http_req_failed: ['rate<0.01'],    // Less than 1% of requests should fail
  },
  ext: {
    loadimpact: {
      projectID: 123456, // Replace with your k6 Cloud project ID
      name: 'Task Management API Load Test',
    },
  },
};

export default function () {
  const BASE_URL = 'http://localhost:5000/api';
  const user = users[Math.floor(Math.random() * users.length)];

  // 1. User Login (simulates a common initial action)
  let loginRes = http.post(`${BASE_URL}/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Login' },
    }
  );

  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login token exists': (r) => r.json() && r.json().token !== '',
  });

  const authToken = loginRes.json('token');
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };

  if (authToken) {
    // 2. Fetch User Workspaces (simulates dashboard view)
    let workspacesRes = http.get(`${BASE_URL}/workspaces`, { headers: headers, tags: { name: 'GetWorkspaces' } });
    check(workspacesRes, {
      'get workspaces status is 200': (r) => r.status === 200,
      'workspaces count > 0': (r) => r.json().length > 0,
    });
    sleep(1);

    // 3. Create a new Task (simulates write operation)
    let createRes = http.post(`${BASE_URL}/tasks`,
      JSON.stringify({
        title: `Test Task ${__VU}-${__ITER}`,
        description: 'Description for test task',
        projectId: 'a-valid-project-id-from-seed-data', // Replace with a valid project ID
        assigneeId: user.id // Assign to current user
      }),
      { headers: headers, tags: { name: 'CreateTask' } }
    );
    check(createRes, {
      'create task status is 201': (r) => r.status === 201,
      'created task has ID': (r) => r.json() && r.json().id !== '',
    });
    sleep(1);
  } else {
    console.error(`VU ${__VU}: Failed to log in for user ${user.email}`);
  }

  sleep(2); // Think time between iterations
}