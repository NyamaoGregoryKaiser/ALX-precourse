```typescript
import SockJS from 'sockjs-client';
import { Client, Stomp } from '@stomp/stompjs'; // Correct import for Stomp
import { Message } from '../types';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'http://localhost:8080/websocket';

let stompClient: Client | null = null; // Use @stomp/stompjs Client

export const connectWebSocket = (
  token: string,
  onConnect: (client: Client) => void,
  onError: (error: any) => void
) => {
  if (stompClient && stompClient.connected) {
    // console.log("STOMP client already connected.");
    onConnect(stompClient);
    return;
  }

  // Use SockJS for fallback
  const socket = new SockJS(WS_BASE_URL);

  stompClient = new Client({
    webSocketFactory: () => socket,
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    debug: (str) => {
      // console.log(str);
    },
    reconnectDelay: 5000, // Reconnect every 5 seconds
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
    onConnect: () => {
      console.log('WebSocket connected!');
      if (stompClient) {
        onConnect(stompClient);
      }
    },
    onStompError: (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
      onError(frame);
    },
    onWebSocketClose: (event) => {
        console.log('WebSocket connection closed:', event);
    },
    onDisconnect: () => {
        console.log('WebSocket disconnected.');
    }
  });

  stompClient.activate();
};

export const disconnectWebSocket = (client: Client | null) => {
  if (client && client.connected) {
    client.deactivate();
    console.log('WebSocket disconnected.');
  }
};

export const subscribeToChannel = (client: Client, channelId: number, onMessage: (message: Message) => void) => {
  if (!client || !client.connected) {
    console.error('STOMP client not connected. Cannot subscribe.');
    return;
  }

  const destination = `/topic/channels/${channelId}`;
  const subscription = client.subscribe(destination, (messageFrame) => {
    try {
      const receivedMessage: Message = JSON.parse(messageFrame.body);
      onMessage(receivedMessage);
    } catch (error) {
      console.error('Error parsing received message:', error, messageFrame.body);
    }
  });

  console.log(`Subscribed to ${destination}`);
  return subscription; // Return the subscription object for potential unsubscription
};

export const sendMessage = (client: Client, channelId: number, message: Message) => {
  if (!client || !client.connected) {
    console.error('STOMP client not connected. Cannot send message.');
    return;
  }

  const destination = `/app/chat/${channelId}`; // Matches @MessageMapping("/chat/{channelId}")
  client.publish({
    destination: destination,
    body: JSON.stringify(message),
  });
  console.log(`Message sent to ${destination}:`, message);
};
```

---

## 2. Database Layer

The database layer is designed for PostgreSQL using Spring Data JPA.

### Schema Definitions & Migration Scripts

The `V1__init.sql` provided above defines all necessary tables: `users`, `channels`, `channel_members`, and `messages`. It includes:
*   Primary keys (`BIGSERIAL`)
*   Unique constraints (e.g., `username`, `email`, `channel.name`, `user_id` + `channel_id` for members)
*   Foreign key constraints with `ON DELETE CASCADE` for data integrity
*   Default timestamps
*   Text type for message content
*   Indexes on frequently queried columns (`username`, `email`, `channel_id`, `timestamp`) for query optimization.

### Seed Data

The `V1__init.sql` script also includes basic seed data for two users, two channels, and some initial messages. This allows for quick setup and testing of the application without manual data entry.

### Query Optimization

*   **Indexes:** Added indexes on `username`, `email`, `channel_id`, `sender_id`, and `timestamp` to speed up common lookups and message retrieval.
*   **`findBy...` methods in Spring Data JPA:** These methods often translate to optimized SQL queries, leveraging indices automatically.
*   **`@Transactional(readOnly = true)`:** For read-only operations, this can allow JPA to apply optimizations (e.g., avoiding dirty checking).
*   **Lazy Loading:** `fetch = FetchType.LAZY` is used on `@ManyToOne` and `@OneToMany` relationships to avoid fetching unnecessary data until explicitly accessed, preventing N+1 query problems.
*   **Caching:** The Caffeine cache layer (described below) is implemented to reduce database load for frequently accessed data like user profiles, channel details, and channel members.

---

## 3. Configuration & Setup

### Dependencies

*   **`backend/pom.xml`**: Contains all Java dependencies for Spring Boot, JPA, Security, WebSockets, PostgreSQL, Flyway, JWT, Lombok, MapStruct, Swagger, and testing libraries (JUnit, Mockito, Testcontainers, RestAssured).
*   **`frontend/package.json`**: Lists all React and TypeScript dependencies, including Chakra UI, React Router, Axios, SockJS, StompJS, and testing libraries (Jest, React Testing Library).

### Environment Configuration

*   **`backend/src/main/resources/application.yml`**: Centralized configuration for the Spring Boot application. It uses environment variables (`${DB_HOST:localhost}`) for sensitive or deployment-specific settings like database credentials and JWT secret, providing sensible defaults for local development.
*   **`frontend/.env` (and `vite.config.ts`)**: For React, environment variables are typically managed with a `.env` file (e.g., `.env.development`, `.env.production`). Vite automatically loads `VITE_` prefixed variables.
    *   `VITE_API_BASE_URL=http://localhost:8080/api`
    *   `VITE_WS_BASE_URL=ws://localhost:8080/websocket`
    (Note: `ws://` is for WebSocket, `http://` for SockJS fallback, but SockJS will internally handle the upgrade from HTTP to WS)

### Docker Setup

Docker will be used to containerize the application components (backend, frontend, database) for consistent development and deployment environments.