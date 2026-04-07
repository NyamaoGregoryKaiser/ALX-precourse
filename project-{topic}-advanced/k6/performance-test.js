import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Load user credentials from an external JSON file
// In a real scenario, this might be dynamically generated or come from a secure source
const users = new SharedArray('users', function () {
  return JSON.parse(open('./users.json')).users;
});

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Warm-up: 30s to 20 VUs
    { duration: '1m', target: 100 }, // Load test: 1m to 100 VUs
    { duration: '30s', target: 0 },  // Ramp-down: 30s to 0 VUs
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% of requests should be < 500ms, 99% < 1s
    'http_req_failed': ['rate<0.01'], // less than 1% of requests should fail
    'checks': ['rate>0.90'], // 90% of checks should pass
  },
};

export default function () {
  const user = users[__VU % users.length]; // Pick a user based on Virtual User ID
  const BASE_URL = 'http://localhost:3000/api/v1'; // Adjust if running k6 against a different host

  let accessToken = '';
  let refreshToken = '';

  // 1. User Login
  const loginRes = http.post(`${BASE_URL}/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Login' },
    }
  );

  check(loginRes, {
    'login: status is 200': (r) => r.status === 200,
    'login: access token received': (r) => r.json() && r.json().tokens.access.token !== '',
  });

  if (loginRes.status === 200) {
    accessToken = loginRes.json().tokens.access.token;
    refreshToken = loginRes.json().tokens.refresh.token;
  }
  sleep(1);

  if (accessToken) {
    // 2. Get Projects (Authenticated)
    const projectsRes = http.get(`${BASE_URL}/projects`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      tags: { name: 'Get Projects' },
    });

    check(projectsRes, {
      'get projects: status is 200': (r) => r.status === 200,
      'get projects: has results array': (r) => r.json() && Array.isArray(r.json().results),
    });
    sleep(1);

    let projectIds = [];
    if (projectsRes.json() && projectsRes.json().results) {
      projectIds = projectsRes.json().results.map(p => p.id);
    }

    if (projectIds.length > 0) {
      const projectId = projectIds[Math.floor(Math.random() * projectIds.length)];

      // 3. Get Specific Project (Authenticated)
      const specificProjectRes = http.get(`${BASE_URL}/projects/${projectId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        tags: { name: 'Get Specific Project' },
      });

      check(specificProjectRes, {
        'get specific project: status is 200': (r) => r.status === 200,
        'get specific project: correct ID': (r) => r.json().id === projectId,
      });
      sleep(1);

      // 4. Create Task (Authenticated, assuming project ID exists)
      const createTaskRes = http.post(`${BASE_URL}/projects/${projectId}/tasks`,
        JSON.stringify({
          title: `New Task ${__VU}-${__ITER}`,
          description: 'Performance test task',
          status: 'todo',
          priority: 'low',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          tags: { name: 'Create Task' },
        }
      );

      check(createTaskRes, {
        'create task: status is 201': (r) => r.status === 201,
        'create task: task ID received': (r) => r.json() && r.json().id !== '',
      });
      sleep(1);
    } else {
      // 5. Create Project if no projects found (Authenticated)
      const createProjectRes = http.post(`${BASE_URL}/projects`,
        JSON.stringify({
          name: `Perf Test Project ${__VU}-${__ITER}`,
          description: 'A project created during perf test.',
          status: 'pending',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          tags: { name: 'Create Project' },
        }
      );

      check(createProjectRes, {
        'create project: status is 201': (r) => r.status === 201,
        'create project: project ID received': (r) => r.json() && r.json().id !== '',
      });
      sleep(1);
    }
  }

  // Add a small sleep at the end of each iteration to simulate user thinking time
  sleep(Math.random() * 2 + 1); // Random sleep between 1 and 3 seconds
}