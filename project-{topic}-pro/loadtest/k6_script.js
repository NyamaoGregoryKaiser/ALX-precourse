import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Custom metrics
const myTrend = new Trend('response_time');
const myRate = new Rate('success_rate');

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Simulate 20 users for 30 seconds
    { duration: '1m', target: 50 },  // Ramp up to 50 users over 1 minute
    { duration: '30s', target: 0 },  // Ramp down to 0 users over 30 seconds
  ],
  thresholds: {
    'response_time{scenario:login}': ['p(95)<500'], // 95th percentile response time for login should be < 500ms
    'response_time{scenario:initiatePayment}': ['p(95)<1000'], // < 1s for payment initiation
    'success_rate': ['rate>0.99'], // 99% success rate
    'http_req_duration': ['p(99)<2000'], // 99% of requests should complete within 2s
  },
  ext: {
    loadimpact: {
      projectID: 1234567, // Replace with your k6 Cloud project ID
      name: "ALXPay Load Test",
    },
  },
};

const BASE_URL = 'http://localhost:5000/api'; // Ensure your backend is running

export default function () {
  let res;
  let authToken = '';

  // 1. User Login (Scenario: login)
  res = http.post(`${BASE_URL}/auth/login`,
    JSON.stringify({ email: 'merchant@alxpay.com', password: 'password123' }),
    { headers: { 'Content-Type': 'application/json' }, tags: { scenario: 'login' } }
  );

  check(res, {
    'login: status is 200': (r) => r.status === 200,
    'login: token received': (r) => r.json() && r.json().token,
  });
  myTrend.add(res.timings.duration, { scenario: 'login' });
  myRate.add(res.status === 200);

  if (res.status === 200 && res.json() && res.json().token) {
    authToken = res.json().token;
  } else {
    console.error('Login failed, skipping subsequent requests.');
    sleep(1);
    return;
  }

  sleep(1); // Wait for 1 second

  // 2. Initiate Payment (Scenario: initiatePayment)
  const initiatePaymentPayload = {
    merchantId: 'a_known_merchant_id_from_seed_data', // Replace with a merchant ID from your seed data
    amount: (Math.random() * 1000 + 1).toFixed(2), // Random amount between 1 and 1000
    currency: 'USD',
    method: 'card',
    customerEmail: `customer-${__VU}-${__ITER}@example.com`,
    metadata: { orderId: `order-${__VU}-${__ITER}` }
  };

  res = http.post(`${BASE_URL}/payments/initiate`,
    JSON.stringify(initiatePaymentPayload),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      tags: { scenario: 'initiatePayment' }
    }
  );

  check(res, {
    'initiatePayment: status is 202': (r) => r.status === 202,
    'initiatePayment: payment ID received': (r) => r.json() && r.json().data.payment.id,
  });
  myTrend.add(res.timings.duration, { scenario: 'initiatePayment' });
  myRate.add(res.status === 202);

  sleep(1);
}