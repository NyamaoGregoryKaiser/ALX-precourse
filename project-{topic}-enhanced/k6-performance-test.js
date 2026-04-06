```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://js.k6.io/k6-summary/0.0.1/index.js";

// Global variables for API URL and test credentials
const BASE_URL = __ENV.VITE_API_BASE_URL || 'http://localhost:5000/api';
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'adminpassword';

let ACCESS_TOKEN = '';

export let options = {
    stages: [
        { duration: '30s', target: 20 }, // Warm-up: 20 virtual users for 30 seconds
        { duration: '1m', target: 50 },  // Moderate load: 50 virtual users for 1 minute
        { duration: '30s', target: 0 },  // Ramp-down: gradually reduce to 0 users over 30 seconds
    ],
    thresholds: {
        http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests should be below 500ms, 99% below 1s
        http_req_failed: ['rate<0.01'], // less than 1% of requests should fail
        checks: ['rate>0.99'],          // 99% of checks should pass
    },
    ext: {
        loadimpact: {
            projectID: 123456, // Replace with your k6 Cloud project ID
            name: 'DBOptiFlow Performance Test',
        },
    },
};

// Setup function runs once before all VUs start
export function setup() {
    console.log('--- K6 Setup: Logging in admin user ---');
    const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
    }), {
        headers: { 'Content-Type': 'application/json' },
    });

    check(loginRes, {
        'login successful': (resp) => resp.status === 200 && resp.json('accessToken') !== undefined,
    });

    if (loginRes.status !== 200) {
        console.error(`Login failed: ${loginRes.status} - ${loginRes.body}`);
        throw new Error('Failed to log in admin user for performance test setup.');
    }
    ACCESS_TOKEN = loginRes.json('accessToken');
    console.log('--- K6 Setup: Admin login successful ---');
    return { accessToken: ACCESS_TOKEN };
}

// Teardown function runs once after all VUs finish
export function teardown(data) {
    console.log('--- K6 Teardown: No specific teardown actions for this test ---');
}


// Default function for each virtual user
export default function (data) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.accessToken}`,
    };

    // Scenario 1: Fetch Dashboard Summary
    let res = http.get(`${BASE_URL}/dashboard/summary`, { headers });
    check(res, {
        'Dashboard summary fetched successfully': (r) => r.status === 200,
        'Dashboard summary has expected properties': (r) => r.json() !== null && r.json('totalDbConnections') !== undefined,
    });
    sleep(1); // Simulate user thinking time

    // Scenario 2: Fetch List of DB Connections
    res = http.get(`${BASE_URL}/db-connections`, { headers });
    check(res, {
        'DB connections list fetched successfully': (r) => r.status === 200,
        'DB connections list is an array': (r) => Array.isArray(r.json()),
    });
    sleep(1);

    // Scenario 3: Fetch List of Recommendations
    res = http.get(`${BASE_URL}/recommendations?status=open`, { headers });
    check(res, {
        'Recommendations list fetched successfully': (r) => r.status === 200,
        'Recommendations list is an array': (r) => Array.isArray(r.json()),
    });
    sleep(0.5); // Shorter sleep for a potentially more frequent action
}

// Generate HTML report on test completion
export function handleSummary(data) {
    return {
        "summary.html": htmlReport(data),
        "stdout": textSummary(data, { indent: " ", enableColors: true }),
    };
}
```