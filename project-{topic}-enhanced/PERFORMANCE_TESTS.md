```markdown
# Performance Tests for Realtime Chat Application

This section outlines conceptual performance tests using k6. A full implementation would involve more detailed scripting and robust test infrastructure.

## Test Scenarios

1.  **Concurrent Chatting:** Simulate a large number of users joining a channel and sending messages simultaneously.
2.  **Channel Joins/Leaves:** Test the system's ability to handle high rates of users joining and leaving channels.
3.  **Authentication/Refresh:** Load test login and token refresh endpoints.

## Setup for K6

1.  **Install k6:** Follow instructions on [k6.io](https://k6.io/docs/getting-started/installation/).
2.  **Ensure Docker environment is running:** The backend and Redis services must be accessible.

## Example K6 Script: Concurrent Chatting

This script simulates users logging in, joining a channel, and sending messages.

```javascript
// === k6_chat_scenario.js ===
import http from 'k6/http';
import { check, sleep } from 'k6';
import { WebSocket } from 'k6/experimental/ws';
import { Counter } from 'k6/metrics';

// Configuration
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:5000/api';
const WS_URL = __ENV.WS_URL || 'ws://localhost:5000';
const VUS = __ENV.VUS ? parseInt(__ENV.VUS) : 10; // Virtual Users
const DURATION = __ENV.DURATION || '1m'; // Duration of the test
const MESSAGES_PER_SECOND = __ENV.MESSAGES_PER_SECOND ? parseFloat(__ENV.MESSAGES_PER_SECOND) : 1; // Messages per user per second

// Custom Metrics
const wsConnects = new Counter('ws_connects');
const wsMessagesSent = new Counter('ws_messages_sent');
const wsMessagesReceived = new Counter('ws_messages_received');

export const options = {
  scenarios: {
    chat_users: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
      tags: { test_type: 'realtime_chat' },
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // http errors should be less than 1%
    http_req_duration: ['p(95)<500'], // 95% of http requests should be below 500ms
    ws_connects: ['count>0'], // Ensure at least one WebSocket connection
    ws_messages_sent: ['rate>0'], // Ensure messages are sent
    ws_messages_received: ['rate>0'], // Ensure messages are received
  },
};

// Global test data (e.g., pre-registered users, channels)
let testUsers = [];
let testChannelId = '';

// Setup function runs once before all VUs
export function setup() {
  // 1. Create a channel for all users to join
  const channelName = `test-channel-${__VU}`;
  const ownerEmail = `setup_user_${__VU}@example.com`;
  const ownerPassword = 'password123';

  // Ensure owner user exists or create them
  let ownerId;
  let ownerAccessToken;

  try {
    const registerRes = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
      username: `setup_user_${__VU}`,
      email: ownerEmail,
      password: ownerPassword,
    }), {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Register_SetupUser' }
    });

    if (registerRes.status === 201) {
      ownerId = registerRes.json('user.id');
      ownerAccessToken = registerRes.json('tokens.accessToken.token');
      console.log(`Setup user ${ownerId} registered and logged in.`);
    } else if (registerRes.status === 400 && registerRes.json('message') === 'Email already taken') {
      // User likely exists, try to log in
      const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        email: ownerEmail,
        password: ownerPassword,
      }), {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'Login_SetupUser_Existing' }
      });
      check(loginRes, { 'login successful for existing user': (r) => r.status === 200 });
      ownerId = loginRes.json('user.id');
      ownerAccessToken = loginRes.json('tokens.accessToken.token');
      console.log(`Setup user ${ownerId} logged in.`);
    } else {
      console.error(`Failed to setup user for channel creation: ${registerRes.status} ${registerRes.body}`);
      return; // Abort setup if critical failure
    }

    const createChannelRes = http.post(`${BASE_URL}/channels`, JSON.stringify({
      name: channelName,
      description: 'k6 performance test channel',
    }), {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerAccessToken}` },
      tags: { name: 'Create_Channel_Setup' }
    });

    check(createChannelRes, { 'channel created successfully': (r) => r.status === 201 });
    testChannelId = createChannelRes.json('id');
    console.log(`Channel ${testChannelId} (${channelName}) created by setup user.`);

  } catch (e) {
    console.error(`Setup error: ${e.message}`);
    return;
  }

  // 2. Register/login all virtual users (VUs)
  const users = [];
  for (let i = 0; i < VUS; i++) {
    const userEmail = `user${i}@k6.com`;
    const userPassword = 'k6password';
    let userId;
    let accessToken;
    let refreshToken;

    const registerRes = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
      username: `k6user${i}`,
      email: userEmail,
      password: userPassword,
    }), {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Register_VUUser' }
    });

    if (registerRes.status === 201) {
      userId = registerRes.json('user.id');
      accessToken = registerRes.json('tokens.accessToken.token');
      refreshToken = registerRes.json('tokens.refreshToken.token');
    } else if (registerRes.status === 400 && registerRes.json('message') === 'Email already taken') {
      // User likely exists, try to log in
      const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        email: userEmail,
        password: userPassword,
      }), {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'Login_VUUser_Existing' }
      });
      check(loginRes, { 'login successful for existing VU': (r) => r.status === 200 });
      userId = loginRes.json('user.id');
      accessToken = loginRes.json('tokens.accessToken.token');
      refreshToken = loginRes.json('tokens.refreshToken.token');
    } else {
      console.error(`Failed to register/login VU user ${i}: ${registerRes.status} ${registerRes.body}`);
      continue;
    }

    users.push({ id: userId, username: `k6user${i}`, accessToken, refreshToken });

    // Join the common test channel
    const joinChannelRes = http.post(`${BASE_URL}/channels/${testChannelId}/join`, null, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      tags: { name: 'Join_Channel_VUUser' }
    });
    check(joinChannelRes, { 'VU user joined channel': (r) => r.status === 200 });
  }

  // Return data for each VU to use
  return { users, testChannelId };
}

// Teardown function runs once after all VUs
export function teardown(data) {
    // Optional: Delete created channels and users to clean up
    // This part can be complex depending on your cleanup needs.
    // For simplicity, we'll skip aggressive cleanup for now.
    // In a real scenario, you'd iterate through created channels and delete them.
    console.log('Teardown complete.');
}


export default function (data) {
  const user = data.users[__VU - 1]; // Get the current VU's user data
  if (!user || !data.testChannelId) {
    console.error('User or channel data missing for VU:', __VU);
    return;
  }

  // WebSocket connection
  const ws = new WebSocket(`${WS_URL}/socket.io/?EIO=4&transport=websocket`, {
    headers: {
      'Authorization': `Bearer ${user.accessToken}` // Pass token in auth header for Socket.IO middleware
    },
    // Adding query parameter for socket.io client, if needed.
    // auth: { token: user.accessToken } // This approach is for socket.io-client on frontend, not for raw ws in k6
  });

  ws.on('open', () => {
    wsConnects.add(1);
    console.log(`VU ${__VU}: WebSocket connected to ${WS_URL}`);

    // Simulate joining the specific channel
    ws.send(JSON.stringify(['joinChannel', data.testChannelId]));

    // Send messages periodically
    ws.setInterval(() => {
      const messageContent = `Hello from VU ${__VU} - ${Date.now()}`;
      // Format Socket.IO message: ['event', payload]
      ws.send(JSON.stringify(['sendMessage', { channelId: data.testChannelId, content: messageContent }]));
      wsMessagesSent.add(1);
      console.log(`VU ${__VU}: Sent message: ${messageContent}`);
    }, 1000 / MESSAGES_PER_SECOND); // Adjust message rate

  });

  ws.on('message', (event) => {
    wsMessagesReceived.add(1);
    // console.log(`VU ${__VU}: Received message: ${event}`);
    // Check for specific message types if needed, e.g., 'newMessage'
  });

  ws.on('close', () => console.log(`VU ${__VU}: WebSocket closed`));
  ws.on('error', (e) => {
    if (e.error() !== 'websocket: close sent') {
      console.error(`VU ${__VU}: WebSocket error: ${e.error()}`);
    }
  });

  sleep(1); // Keep the VU active for the duration, or until test ends
}
```

To run this k6 script:
```bash
cd chat-app
# Ensure your backend is running, e.g., `docker-compose up -d`
k6 run --env API_BASE_URL=http://localhost:5000/api --env WS_URL=ws://localhost:5000 k6_chat_scenario.js
```

This will run `VUS` virtual users for `DURATION`, with each user sending `MESSAGES_PER_SECOND` messages after connecting to WebSockets and joining the designated channel.

```
```