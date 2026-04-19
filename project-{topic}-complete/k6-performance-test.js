import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// 1. Configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Simulate 20 users over 30 seconds (ramp-up)
    { duration: '1m', target: 50 },  // Stay at 50 users for 1 minute
    { duration: '30s', target: 0 },  // Ramp-down to 0 users over 30 seconds
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],    // Error rate should be less than 1%
  },
};

// Test data for user login
const users = new SharedArray('users', function () {
  return [
    { email: 'alice@example.com', password: 'password123' },
    { email: 'bob@example.com', password: 'password456' },
  ];
});

// Base URL for the backend API
const BASE_URL = 'http://localhost:5000/api';

// This function runs for each virtual user
export default function () {
  let res;
  let authToken;

  // Simulate user login
  const randomUser = users[Math.floor(Math.random() * users.length)];
  res = http.post(`${BASE_URL}/auth/login`, JSON.stringify(randomUser), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'Login' },
  });

  check(res, {
    'Login successful': (r) => r.status === 200,
    'Has auth token': (r) => r.json() && r.json().token !== '',
  });

  if (res.json() && res.json().token) {
    authToken = res.json().token;
  } else {
    console.error(`Login failed for user ${randomUser.email}: ${res.status} - ${res.body}`);
    return; // Stop if login fails
  }

  // Simulate getting user's own projects
  res = http.get(`${BASE_URL}/projects`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    tags: { name: 'Get all projects' },
  });

  check(res, {
    'Get projects successful': (r) => r.status === 200,
    'Projects array is present': (r) => Array.isArray(r.json()),
  });

  // Simulate getting all tasks assigned to the user
  res = http.get(`${BASE_URL}/tasks`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    tags: { name: 'Get all tasks' },
  });

  check(res, {
    'Get tasks successful': (r) => r.status === 200,
    'Tasks array is present': (r) => Array.isArray(r.json()),
  });

  // Simulate creating a new task (less frequent, but important for write operations)
  if (__VU % 10 === 0) { // Only 10% of VUs create tasks to avoid too much data
    const projectRes = http.get(`${BASE_URL}/projects`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      tags: { name: 'Get projects for task creation' },
    });
    const projects = projectRes.json();
    if (projectRes.status === 200 && projects.length > 0) {
      const randomProject = projects[Math.floor(Math.random() * projects.length)];
      const newTask = {
        title: `Performance Test Task ${__VU}-${__ITER}`,
        description: 'Created during performance test',
        status: 'pending',
        priority: 'medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: randomProject.id,
        assignedToId: res.json().user.id, // Assuming /projects returns user info or we store it from login
      };
      res = http.post(`${BASE_URL}/projects/${randomProject.id}/tasks`, JSON.stringify(newTask), {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        tags: { name: 'Create task' },
      });
      check(res, { 'Task created successfully': (r) => r.status === 201 });
    }
  }

  sleep(Math.random() * 3 + 2); // Random sleep between 2 and 5 seconds
}