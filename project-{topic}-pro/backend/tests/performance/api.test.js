import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://js.k6.io/k6-summary/0.0.1/index.js";

// Ensure your backend is running at this host and port
const BASE_URL = 'http://localhost:5000/api';

// This is a simple performance test. For a real app,
// you'd typically have a setup function to create users/data,
// log in, get tokens, and then use those tokens in the test scenarios.

// A dummy user data for login (ensure this user exists in your test DB)
const TEST_USER_EMAIL = 'user@example.com';
const TEST_USER_PASSWORD = 'Password123!';
let authToken = '';

export const options = {
  // A moderate load profile:
  // 10 virtual users, running for 30 seconds
  // iterations: 500, // Total number of requests
  vus: 10,
  duration: '30s',

  thresholds: {
    http_req_failed: ['rate<0.01'], // http errors should be less than 1%
    http_req_duration: ['p(95)<200'], // 95% of requests should be below 200ms
  },
};

export function setup() {
  // Login to get a token
  const loginRes = http.post(`${BASE_URL}/auth/login`,
    JSON.stringify({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Login' },
    }
  );

  check(loginRes, {
    'login successful': (resp) => resp.status === 200 && resp.json().token !== undefined,
  });

  if (loginRes.status === 200) {
    authToken = loginRes.json().token;
    console.log(`Successfully obtained auth token: ${authToken.substring(0, 10)}...`);
    // Fetch a project ID to use in subsequent requests
    const projectsRes = http.get(`${BASE_URL}/projects`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      tags: { name: 'Get Projects (Setup)' },
    });
    check(projectsRes, {
      'projects fetched successfully': (resp) => resp.status === 200 && resp.json().data.projects.length > 0,
    });
    if (projectsRes.status === 200 && projectsRes.json().data.projects.length > 0) {
      return { token: authToken, projectId: projectsRes.json().data.projects[0].id };
    }
  }

  // If setup fails, we should terminate
  console.error('Setup failed: Could not obtain auth token or project ID.');
  return { token: null, projectId: null };
}

export default function (data) {
  if (!data.token || !data.projectId) {
    console.error('Skipping test execution due to failed setup.');
    return;
  }

  // Define headers for authenticated requests
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  // Scenario 1: Get all projects (read operation, possibly cached)
  let res = http.get(`${BASE_URL}/projects`, { headers: authHeaders, tags: { name: 'Get all Projects' } });
  check(res, { 'get all projects status is 200': (r) => r.status === 200 });
  sleep(1); // Simulate user think time

  // Scenario 2: Get a specific project by ID
  res = http.get(`${BASE_URL}/projects/${data.projectId}`, { headers: authHeaders, tags: { name: 'Get Project by ID' } });
  check(res, { 'get project by ID status is 200': (r) => r.status === 200 });
  sleep(1);

  // Scenario 3: Get ML tasks for a project
  res = http.get(`${BASE_URL}/projects/${data.projectId}/ml-tasks`, { headers: authHeaders, tags: { name: 'Get ML Tasks for Project' } });
  check(res, { 'get ML tasks status is 200': (r) => r.status === 200 });
  sleep(1);

  // Scenario 4: Create an ML Task (write operation, should not be cached)
  // Use a simple, fast-executing task type
  const createMLTaskPayload = {
    type: 'min_max_scaling',
    inputData: { data: [{ feature: 10 }, { feature: 20 }, { feature: 30 }] },
    parameters: { column: 'feature' },
  };
  res = http.post(`${BASE_URL}/projects/${data.projectId}/ml-tasks`,
    JSON.stringify(createMLTaskPayload),
    { headers: authHeaders, tags: { name: 'Create ML Task' } }
  );
  check(res, { 'create ML task status is 201': (r) => r.status === 201 });
  sleep(1);
}

export function handleSummary(data) {
  return {
    "summary.html": htmlReport(data),
    "summary.txt": textSummary(data, { indent: " ", enableColors: true }),
  };
}