# ALXChat Architecture Document

This document outlines the architectural overview, key components, and design decisions for the ALXChat real-time chat application.

## 1. High-Level Architecture

The ALXChat system adopts a service-oriented architecture, separating concerns between a frontend client, a backend API/WebSocket server, and dedicated data stores. A reverse proxy/load balancer sits in front to manage traffic and serve static assets.

```
+----------------+       +-------------------+       +---------------------+
|   React App    | <---> |   Nginx/Gateway   | <---> |   Spring Boot       |
| (Frontend)     |       |   (Load Balancer) |       |   (Backend API &    |
|                |       |                   |       |   WebSocket Server) |
+----------------+       +-------------------+       +---------+-----------+
      ^                                                      |
      |   WebSocket (STOMP)                                  |   JDBC
      v                                                      |
+-------------------------------------------------------------------------+
|                                    Redis Cache                          |
+-------------------------------------------------------------------------+
      ^                                                                  |
      |                                                                  |
      |                                                                  v
+-------------------------------------------------------------------------+
|                                  PostgreSQL Database                    |
+-------------------------------------------------------------------------+
```

### Key Architectural Characteristics:

*   **Modularity:** Clear separation between frontend, backend, and data layers.
*   **Scalability:** Backend designed to be stateless (except for WebSocket sessions managed by Spring), allowing for horizontal scaling. Redis for caching reduces DB load.
*   **Real-time:** Utilizes WebSockets for instant, bi-directional communication.
*   **Security:** JWT-based authentication for both REST and WebSocket connections.
*   **Observability:** Integrated logging and basic health endpoints.
*   **Resilience:** Rate limiting to protect against abuse.

## 2. Component Deep Dive

### 2.1. Frontend (React Application)

*   **Technology:** React 18, React Router DOM, Axios, `@stomp/stompjs`, `sockjs-client`, Tailwind CSS.
*   **Responsibility:**
    *   User Interface (UI) rendering and user interaction.
    *   Handling user authentication (login, registration) and managing JWT tokens.
    *   Making REST API calls to the backend for non-real-time operations (e.g., getting chat room lists, history).
    *   Establishing and managing WebSocket connections for real-time messaging and participant updates.
    *   Local state management (React Context API for auth, component state for chat).
*   **Key Files/Folders:**
    *   `src/index.js`, `src/App.js`: Main application entry and routing.
    *   `src/context/AuthContext.js`: Manages user authentication state and JWT.
    *   `src/api/*.js`: Centralized API calls using Axios.
    *   `src/services/WebSocketService.js`: Encapsulates STOMP client logic.
    *   `src/hooks/useChatWebSocket.js`: Custom hook for simplified WebSocket usage in components.
    *   `src/components/`: Reusable UI components (Navbar, ChatList, ChatWindow, MessageInput, UserList).
    *   `src/pages/`: Page-level components (LoginPage, RegisterPage, HomePage, ChatPage).
*   **Communication:**
    *   HTTP/REST: For authentication, initial data loads (room lists, user profiles), and non-real-time updates.
    *   WebSocket (STOMP): For real-time message exchange and dynamic updates (e.g., new participants joining).

### 2.2. Backend (Spring Boot Application)

*   **Technology:** Java 17, Spring Boot 3, Spring Security, Spring Data JPA, PostgreSQL Driver, Flyway, Redis, Lombok, Springdoc-openapi.
*   **Responsibility:**
    *   **Authentication & Authorization:** Validates user credentials, generates/validates JWTs, secures API endpoints and WebSocket channels.
    *   **Business Logic:** Manages user profiles, chat rooms (creation, joining, leaving), and message persistence.
    *   **Data Persistence:** Interacts with PostgreSQL using Spring Data JPA.
    *   **Real-time Messaging Broker:** Leverages Spring WebSocket to handle STOMP messages, broadcast messages to chat rooms, and manage user presence.
    *   **Caching:** Uses Spring Cache with Redis to store frequently accessed data.
    *   **Error Handling:** Provides consistent error responses through a global exception handler.
    *   **Rate Limiting:** Protects API endpoints from excessive requests.
    *   **Logging & Monitoring:** Logs application events and provides actuator endpoints for health checks.
*   **Key Modules/Folders:**
    *   `com.alxchat.config/`: Global configurations (Security, WebSocket, Redis, Exception Handling, Rate Limiting).
    *   `com.alxchat.auth/`: JWT utility, filter, and authentication controller.
    *   `com.alxchat.model/`: JPA entities (User, ChatRoom, Message, RoomParticipant).
    *   `com.alxchat.repository/`: Spring Data JPA repositories for data access.
    *   `com.alxchat.dto/`: Data Transfer Objects for API input/output.
    *   `com.alxchat.service/`: Business logic layer.
    *   `com.alxchat.controller/`: REST API endpoints.
    *   `com.alxchat.websocket/`: WebSocket event listener for presence.
    *   `src/main/resources/db/migration/`: Flyway migration scripts.
*   **Security Details:**
    *   JWTs are used as bearer tokens for stateless authentication.
    *   `JwtRequestFilter` intercepts requests to validate tokens.
    *   `SecurityConfig` defines public vs. protected endpoints and configures CORS.
    *   WebSocket connections also require JWT for initial handshake.

### 2.3. PostgreSQL Database

*   **Technology:** PostgreSQL 15.
*   **Responsibility:** Primary data store for the application.
    *   `users`: Stores user credentials and basic profile information.
    *   `chat_rooms`: Stores information about each chat room.
    *   `room_participants`: Junction table linking users to chat rooms they have joined.
    *   `messages`: Stores all chat messages, linked to rooms and senders.
*   **Schema Management:** Flyway is used for version-controlled database migrations, ensuring consistency across environments and easy updates.
*   **Query Optimization:** Indexes are applied to frequently queried columns (e.g., `username`, `room_id`, `timestamp`) to enhance performance.

### 2.4. Redis Cache

*   **Technology:** Redis 7 (in-memory data store).
*   **Responsibility:** Caching layer to improve application performance and reduce database load.
    *   Caches `User` objects by ID and username.
    *   Caches `ChatRoom` objects by ID.
    *   Caches lists of `ChatRoom`s for a specific user.
*   **Integration:** Spring Cache abstraction (`@Cacheable`, `@CachePut`, `@CacheEvict`) is used for transparent caching.

### 2.5. Nginx (Reverse Proxy / Gateway)

*   **Technology:** Nginx.
*   **Responsibility:**
    *   Serves the static build files of the React frontend.
    *   Acts as a reverse proxy, routing `/api/` requests to the Spring Boot backend.
    *   Acts as a reverse proxy, routing `/websocket/` requests to the Spring Boot backend, handling WebSocket protocol upgrades.
    *   Provides a single entry point for the entire application.

## 3. Data Flow and Interactions

1.  **User Authentication:**
    *   Frontend sends `/api/auth/register` or `/api/auth/login` (HTTP POST) to Backend.
    *   Backend validates credentials, interacts with `UserRepository`, and upon success, generates a JWT.
    *   Backend returns JWT to Frontend. Frontend stores JWT in local storage and includes it in `Authorization` header for subsequent requests.

2.  **Initial Data Load (e.g., Chat Rooms):**
    *   Frontend sends `/api/chatrooms/my-rooms` or `/api/chatrooms` (HTTP GET) to Backend with JWT.
    *   Backend validates JWT, retrieves data via `ChatRoomRepository`, potentially from Redis cache.
    *   Backend returns `ChatRoomDTO` list to Frontend.

3.  **Real-time Messaging:**
    *   Frontend (after login) establishes a WebSocket connection to `ws://<backend-url>/websocket` (via Nginx proxy), passing the JWT in connection headers.
    *   Spring Security authenticates the WebSocket session using the JWT.
    *   Frontend subscribes to `/topic/room/{roomId}/messages` and `/topic/room/{roomId}/participants` via STOMP.
    *   When a user sends a message:
        *   Frontend sends a STOMP message to `/app/chat.sendMessage` with `NewMessageDTO`.
        *   Backend's `@MessageMapping` controller receives it, processes it via `MessageService`, saves to DB.
        *   `MessageService` then broadcasts the `MessageDTO` to `/topic/room/{roomId}/messages` via `SimpMessagingTemplate`.
        *   All subscribed clients (including the sender) receive the message in real-time.
    *   When a user joins/leaves a room or connects/disconnects (changing `UserStatus`):
        *   Backend detects the event (e.g., `WebSocketEventListener`, `ChatRoomService`).
        *   Backend broadcasts updated participant list or user status to relevant `/topic/room/{roomId}/participants` (or `/topic/users/status` for global updates).

## 4. Security Considerations

*   **JWT Token Security:** Tokens are stored in browser local storage (for simplicity in this demo), but for higher security, `HttpOnly` cookies combined with CSRF protection, or session storage, would be considered. Expiration is enforced.
*   **Rate Limiting:** Protects against brute-force attacks and API abuse.
*   **Input Validation:** All incoming DTOs are validated using JSR 303 (Bean Validation).
*   **Password Hashing:** BCrypt is used for secure password storage.
*   **CORS:** Explicitly configured to allow communication from the frontend origin.
*   **Authentication for WebSockets:** JWT is used during the WebSocket handshake to secure real-time communication.

## 5. Scalability and Performance

*   **Stateless Backend:** The backend services are mostly stateless (apart from WebSocket session management), enabling easy horizontal scaling.
*   **Database Indexing:** Crucial for efficient query performance on large datasets.
*   **Caching with Redis:** Reduces database load for read-heavy operations.
*   **Asynchronous Communication:** WebSockets offload polling requests, improving real-time efficiency.
*   **Containerization:** Docker and Docker Compose facilitate easy deployment and scaling of individual services.

## 6. Future Enhancements

*   **Microservices Refinement:** Further split backend into dedicated User Service, Chat Service, etc., for independent scaling.
*   **Load Balancing:** Implement a proper load balancer (e.g., AWS ALB, Nginx with multiple backend instances) for the backend services.
*   **Advanced User Presence:** Integrate with Redis Pub/Sub for more robust and scalable user presence tracking across multiple backend instances.
*   **Private Chats:** Implement direct 1-to-1 messaging.
*   **Message Editing/Deletion:** Add more CRUD operations for messages.
*   **File Uploads:** Allow users to share images/files.
*   **Notifications:** Push notifications for new messages.
*   **E2E Testing:** Integrate Cypress or Playwright for end-to-end tests.
*   **Monitoring & Alerting:** Integrate Prometheus, Grafana, ELK stack for comprehensive monitoring and alerting.
*   **Error Reporting:** Sentry or similar for real-time error tracking.

This architecture provides a robust and extensible foundation for a production-ready real-time chat application.