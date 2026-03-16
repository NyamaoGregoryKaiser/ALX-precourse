# Performance Testing with K6

This section outlines how to perform basic performance testing for the Data Visualization Tools System using [K6](https://k6.io/). K6 is an open-source load testing tool that makes performance testing easy for developers.

## 1. Installation

Install K6 globally or using Docker:

### Global Installation (Linux/macOS)
```bash
sudo apt-get update && sudo apt-get install k6 # Debian/Ubuntu
brew install k6 # macOS
```

### Docker
```bash
docker pull grafana/k6
```

## 2. Basic Load Test Scenarios

We will define a simple K6 script to simulate multiple users accessing the login endpoint and then fetching dashboards.

### `k6_login_dashboard.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

// Environment variables can be passed to K6, e.g., k6 run script.js --env BASE_URL=http://localhost:5000
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000/api';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Simulate ramp-up to 20 users over 30 seconds
    { duration: '1m', target: 20 },  // Stay at 20 users for 1 minute
    { duration: '30s', target: 0 },  // Ramp-down to 0 users over 30 seconds
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should complete within 500ms
    http_req_failed: ['rate<0.01'],    // Less than 1% of requests should fail
  },
};

export default function () {
  let res;

  // 1. Simulate user login
  res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    emailOrUsername: 'user@example.com', // Use a seeded user or register one before test
    password: 'password123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'login status is 200': (r) => r.status === 200,
    'login returns token': (r) => r.json() && r.json().token !== '',
  });

  const token = res.json('token'); // Extract token for subsequent requests

  if (token) {
    // 2. Simulate fetching dashboards
    res = http.get(`${BASE_URL}/dashboards`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    check(res, {
      'dashboards status is 200': (r) => r.status === 200,
      'dashboards are returned': (r) => r.json() && Array.isArray(r.json()),
    });
  }

  sleep(1); // Simulate user think time between actions
}
```

## 3. Running the Tests

Make sure your backend server is running (e.g., `http://localhost:5000`).

### Using K6 CLI
```bash
k6 run -e BASE_URL=http://localhost:5000/api k6_login_dashboard.js
```

### Using Docker
```bash
docker run -i grafana/k6 run --env BASE_URL=http://localhost:5000/api - <k6_login_dashboard.js
```

## 4. Interpreting Results

K6 will output a summary to the console, including:
*   **`http_req_duration`**: Request duration statistics (min, max, avg, percentiles).
*   **`http_req_failed`**: Rate of failed HTTP requests.
*   **`iterations`**: Number of completed test script iterations.
*   **`checks`**: Success rate of your `check()` assertions.

Look for:
*   **High failure rates (`http_req_failed`, `checks`)**: Indicates functional issues under load.
*   **High request durations (especially p95 and max)**: Points to slow response times and potential bottlenecks.
*   **CPU/Memory usage of backend service**: Monitor your application server's resources during the test to identify resource exhaustion.

## 5. Advanced Scenarios

*   **More Complex User Journeys**: Simulate creating a data source, adding a visualization, viewing dashboard.
*   **Data Parameterization**: Use different usernames/passwords for each virtual user.
*   **Distributed Testing**: Run K6 tests across multiple machines for higher load.
*   **Integration with Grafana/Prometheus**: For advanced monitoring and visualization of test results.