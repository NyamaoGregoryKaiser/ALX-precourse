```markdown
# Real-time Chat Application - Architecture Documentation

## 1. Introduction

This document outlines the architectural design of the Real-time Chat Application. The goal is to create a robust, scalable, and maintainable system capable of handling real-time communication for multiple users and chat rooms. The design prioritizes modularity, security, and developer experience using modern tools and practices.

## 2. High-Level Architecture Diagram

```mermaid
graph TD
    UserClient[Web Browser/Mobile App] -->|HTTP/HTTPS (REST)| BackendAPI
    UserClient -->|WebSocket (Socket.IO)| BackendWebSocket
    UserClient -- Auth Tokens --> BackendAPI & BackendWebSocket

    subgraph Backend (Node.js/Express/TypeScript)
        BackendAPI[REST API Server] -->|CRUD Operations| Database(PostgreSQL)
        BackendAPI -->|Cache Operations| Cache(Redis)
        BackendAPI -- Auth Validation --> AuthLayer(Authentication Layer)
        BackendAPI -- Rate Limiting --> RateLimiter(Rate Limiting Middleware)
        BackendAPI -- Error Handling --> ErrorHandler(Error Handling Middleware)
        BackendAPI -- Logging --> Logger(Winston Logger)

        BackendWebSocket[Socket.IO Server] -->|Real-time Events| Database
        BackendWebSocket -->|Cache Operations| Cache
        BackendWebSocket -- Auth Validation --> AuthLayer
        BackendWebSocket -- Logging --> Logger
        BackendWebSocket --> OtherBackendServices(Other Backend Services/Pub-Sub)
    end

    Database -- ORM (Prisma) --> BackendAPI & BackendWebSocket
    Cache -- Session/Data Store --> BackendAPI & BackendWebSocket

    subgraph Infrastructure
        PostgreSQL[Persistent Data Storage]
        Redis[In-Memory Cache & Pub/Sub]
        Docker[Containerization]
        DockerCompose[Local Orchestration]
        GitHubActions[CI/CD Pipeline]
    end

    BackendAPI --- PostgreSQL
    BackendWebSocket --- PostgreSQL
    BackendAPI --- Redis
    BackendWebSocket --- Redis

    AuthLayer -- JWT Validation --> BackendAPI & BackendWebSocket
    RateLimiter -- Limits requests --> BackendAPI
    ErrorHandler -- Catches exceptions --> BackendAPI
    Logger -- Records events --> BackendAPI & BackendWebSocket

    GitHubActions -- Build, Test, Deploy --> Docker
    Docker --> CloudProvider[Cloud Hosting (e.g., AWS, GCP, Azure)]
```

## 3. Component Breakdown

### 3.1. Frontend (Client Application)

*   **Technology:** React.js, TypeScript, Styled Components.
*   **Purpose:** Provides the user interface for interacting with the chat application.
*   **Key Responsibilities:**
    *   User authentication (login, registration).
    *   Displaying chat rooms and messages.
    *   Sending messages in real-time.
    *   Managing local state (e.g., currently active chat room, typing status).
    *   Handling API calls for non-real-time operations (e.g., fetching chat history, creating rooms).
    *   Establishing and managing WebSocket connections for real-time updates.

### 3.2. Backend (API & WebSocket Server)

*   **Technology:** Node.js, Express.js, Socket.IO, TypeScript.
*   **Purpose:** The central server that handles all application logic, API requests, and real-time communication.
*   **Modules:**
    *   **Auth Module:** Handles user registration, login, and JWT generation/validation.
    *   **Users Module:** Manages user profiles (e.g., fetching user details).
    *   **Chats Module:** Manages chat rooms (creation, joining, fetching details) and message persistence.
    *   **WebSocket Handler:** Manages Socket.IO events for real-time message exchange, typing indicators, and user presence.
*   **Key Responsibilities:**
    *   **RESTful API:** For CRUD operations related to users and chat rooms.
    *   **Authentication & Authorization:** Validates JWTs, protects routes.
    *   **Real-time Messaging:** Broadcasts messages to relevant chat room participants via WebSockets.
    *   **Data Persistence:** Interacts with the database via Prisma ORM.
    *   **Caching:** Uses Redis for session tokens, and potentially other frequently accessed data.
    *   **Error Handling:** Catches and standardizes error responses.
    *   **Logging:** Records application events and errors.
    *   **Rate Limiting:** Protects API endpoints from abuse.

### 3.3. Database (PostgreSQL)

*   **Technology:** PostgreSQL
*   **Purpose:** Stores all persistent application data.
*   **Schema (Prisma):**
    *   `User`: Stores user credentials (hashed password), username, email.
    *   `ChatRoom`: Stores chat room metadata (name, description).
    *   `Message`: Stores individual chat messages (content, sender, room, timestamp).
    *   `ChatRoomParticipant`: A junction table for the many-to-many relationship between `User` and `ChatRoom`, tracking which users are in which rooms.
*   **ORM:** Prisma is used for type-safe database interactions, schema migrations, and seeding.

### 3.4. Cache (Redis)

*   **Technology:** Redis
*   **Purpose:** An in-memory data store for high-speed data access.
*   **Key Responsibilities:**
    *   **JWT Session Management:** Stores and validates active JWT tokens (e.g., for logout, preventing replay attacks).
    *   **User Caching:** Caches frequently requested user profiles to reduce database load.
    *   **(Future/Scalability) WebSocket Pub/Sub:** In a horizontally scaled backend, Redis can act as a Pub/Sub backbone to enable all Socket.IO instances to communicate and broadcast messages across instances.

## 4. Design Principles & Considerations

*   **Modularity:** The backend is divided into logical modules (auth, users, chats) with clear separation of concerns (routes, controllers, services). This improves maintainability and testability.
*   **Scalability:**
    *   **Stateless Backend (mostly):** JWT-based authentication keeps the API stateless, making horizontal scaling of backend instances easier.
    *   **Redis for Sessions/Caching:** Centralizing session management and caching in Redis allows multiple backend instances to share this state.
    *   **Database Indexing:** Optimized database queries (e.g., `@@index([chatRoomId, createdAt])` for messages) ensure performance under load.
    *   **WebSocket Scalability:** While a single Socket.IO server is used for simplicity, it's designed to be extendable with Redis Adapter for multi-node deployments.
*   **Security:**
    *   **JWT:** Secure authentication.
    *   **Password Hashing:** `bcrypt.js` for storing passwords securely.
    *   **Helmet:** Sets various HTTP headers for enhanced security.
    *   **CORS:** Properly configured to allow requests from the frontend origin.
    *   **Rate Limiting:** Protects against brute-force attacks and API abuse.
    *   **Input Validation:** `Zod` is used for robust API request validation.
*   **Maintainability:**
    *   **TypeScript:** Provides static type checking, reducing runtime errors and improving code readability.
    *   **Prisma ORM:** Offers a type-safe and intuitive way to interact with the database.
    *   **Comprehensive Documentation:** README, API docs, and architecture docs.
    *   **Consistent Code Style:** ESLint and Prettier for code quality.
*   **Observability:**
    *   **Logging:** Winston provides flexible and structured logging.
    *   **Error Handling:** Centralized error handling for consistent error responses.
*   **Real-time Performance:** Socket.IO is chosen for its efficiency and widespread adoption in real-time web applications.

## 5. Data Flow (Example: Sending a Message)

1.  **Frontend:** User types a message and clicks 'Send'.
2.  **Frontend:** `MessageInput` component calls `onSendMessage` prop.
3.  **Frontend:** `ChatRoom` component invokes `socket.emit('chatMessage', payload)`.
4.  **Backend (WebSocket):** The `socket.handler.ts` receives the `chatMessage` event.
5.  **Backend (Middleware):** The socket connection is authenticated via JWT middleware (`io.use`).
6.  **Backend (Validation):** The message content is validated using `Zod`.
7.  **Backend (Service):** `chatService.sendMessage` is called to persist the message in PostgreSQL. This also updates the `updatedAt` field of the `ChatRoom`.
8.  **Backend (WebSocket):** After successful persistence, the Socket.IO server `io.to(chatRoomId).emit('message', newMessage)` broadcasts the message to all connected clients in that specific `chatRoomId`.
9.  **Frontend:** `ChatRoom` component's `socket.on('message')` listener receives the new message.
10. **Frontend:** The new message is added to the component's state, causing the message list to re-render and scroll to the bottom.

## 6. Scalability Considerations for Production

*   **Horizontal Scaling of Backend:** Use a load balancer to distribute traffic across multiple Node.js backend instances. For Socket.IO, a Redis Adapter would be essential to allow all instances to broadcast messages to all connected clients, regardless of which instance they are connected to.
*   **Database Scaling:** Implement read replicas for PostgreSQL, sharding, or consider a managed database service.
*   **Redis Cluster:** For high availability and performance, deploy Redis in a cluster.
*   **CDN for Frontend:** Serve static frontend assets via a Content Delivery Network for faster global access.
*   **Monitoring & Alerting:** Integrate with monitoring tools (e.g., Prometheus, Grafana, Datadog) to track application health, performance, and errors.
*   **Logging Aggregation:** Send logs to a centralized logging system (e.g., ELK Stack, Splunk, Loki) for easier analysis.
*   **Managed Services:** Utilize cloud provider managed services for database (RDS), cache (Elasticache), and Kubernetes (EKS, GKE, AKS) for orchestration.
```