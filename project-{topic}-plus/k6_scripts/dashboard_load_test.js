```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:5000/api';

// Shared data for users to login
const users = new SharedArray('users', function () {
  const f = JSON.parse(open('./users.json')); // Contains pre-registered user credentials
  return f.users;
});

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Warm-up: 20 VUs for 30s
    { duration: '1m', target: 100 }, // Ramp-up: 100 VUs for 1m
    { duration: '2m', target: 100 }, // Sustained load: 100 VUs for 2m
    { duration: '30s', target: 0 },  // Ramp-down: 0 VUs for 30s
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'], // less than 1% of http requests should fail
    http_req_duration: ['p(95)<200'], // 95% of requests should be below 200ms
  },
};

export default function () {
  const user = users[__VU % users.length]; // Each VU uses a different user

  let accessToken;
  let refreshToken;
  let dashboardId;
  let chartId;

  // 1. Login
  let res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: user.email,
    password: user.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'Login' },
  });

  check(res, {
    'login status is 200': (r) => r.status === 200,
    'login has accessToken': (r) => r.json() && r.json().data.accessToken,
  });

  if (res.status === 200) {
    accessToken = res.json().data.accessToken;
    refreshToken = res.json().data.refreshToken; // Not used in this flow, but good practice to get it
  } else {
    console.error(`VU ${__VU} failed to login: ${res.status} - ${res.body}`);
    return; // Stop current VU iteration if login fails
  }

  sleep(1);

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  };

  // 2. Get Dashboards
  res = http.get(`${BASE_URL}/dashboards`, {
    headers: authHeaders,
    tags: { name: 'Get Dashboards' },
  });

  check(res, {
    'get dashboards status is 200': (r) => r.status === 200,
  });

  if (res.status === 200 && res.json().data.length > 0) {
    dashboardId = res.json().data[0].id; // Take the first dashboard
    if (res.json().data[0].charts && res.json().data[0].charts.length > 0) {
      chartId = res.json().data[0].charts[0].id; // Take the first chart
    }
  }

  sleep(1);

  // 3. Get Specific Dashboard (with charts)
  if (dashboardId) {
    res = http.get(`${BASE_URL}/dashboards/${dashboardId}`, {
      headers: authHeaders,
      tags: { name: 'Get Specific Dashboard' },
    });
    check(res, { 'get dashboard status is 200': (r) => r.status === 200 });
    sleep(1);
  }

  // 4. Get Chart Data
  if (chartId) {
    res = http.get(`${BASE_URL}/charts/${chartId}/data`, {
      headers: authHeaders,
      tags: { name: 'Get Chart Data' },
    });
    check(res, { 'get chart data status is 200': (r) => r.status === 200 });
    sleep(1);
  }

  // Add more requests for creating/updating charts/data sources if testing those scenarios
}
```

**`k6_scripts/users.json` (for k6 script - needs to be generated or pre-filled)**