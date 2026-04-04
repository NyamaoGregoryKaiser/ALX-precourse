```markdown
# Real-time Chat Application Architecture Documentation

This document outlines the architecture of the Real-time Chat Application, focusing on its components, their interactions, data flow, and key design decisions.

## 1. High-Level Architecture

The system follows a typical **Microservices-lite / Monorepo** approach, where the frontend and backend are separate services but reside in the same repository, orchestrated by Docker Compose.

```
+----------------+       +-------------------+       +-----------------+
|   Web Browser  |<----->|    React Frontend   |<--->|    Node.js      |
|   (Client)     |       |   (Port 3000)     |       |   Backend       |
|                |       | (HTTP/WebSockets) |       |   (Port 5000)   |
+----------------+       +-------------------+       |                 |
                                                     |  +-------------+  |
                                                     |  | Express.js  |<--+  (REST API)
                                                     |  +-------------+  |
                                                     |  +-------------+  |
                                                     +->| Socket.IO   |<--+  (WebSockets)
                                                     |  +-------------+  |
                                                     |         |         |
                                                     |   +-----v-----+   |
                                                     |   |   Prisma    |   |
                                                     |   |    ORM      |   |
                                                     |   +-------------+   |
                                                     +---------|---------+
                                                               |
                                            +------------------+------------------+
                                            |                                     |
                                    +-------v--------+                  +-------v-------+
                                    |   PostgreSQL   |                  |     Redis     |
                                    |    Database    |                  |    (Cache/PubSub) |
                                    +----------------+                  +---------------+
```

### Key Components:

1.  **React Frontend:** Single-page application (SPA) responsible for the user interface and interaction. It communicates with the backend via REST APIs (for initial data and authentication) and WebSockets (for real-time updates).
2.  **Node.js Backend:** A robust server application handling business logic, API endpoints, and real-time communication.
    *   **Express.js:** Provides the RESTful API for user management, conversation creation, and historical message retrieval.
    *   **Socket.IO:** Manages persistent WebSocket connections for real-time messaging, typing indicators, and online status updates.
    *   **Prisma ORM:** Interfaces with the PostgreSQL database, providing a type-safe and efficient way to perform database operations.
    *   **JWT (JSON Web Tokens):** Used for stateless authentication between client and server.
    *   **Winston:** A logger for structured and configurable logging.
    *   **Redis:** Utilized for caching (e.g., rate limiting, potentially active user sessions) and as a Pub/Sub mechanism for horizontal scaling of Socket.IO (though not fully implemented for scaling in this example, the foundation is there).
3.  **PostgreSQL Database:** Relational database storing user profiles, conversations, messages, and participation data.
4.  **Redis:** In-memory data store used for specific use cases like:
    *   Rate limiting storage.
    *   Potentially session management.
    *   As a Pub/Sub backbone for Socket.IO when scaling across multiple backend instances.
5.  **Docker & Docker Compose:** Containerization tools for packaging the application and its dependencies, ensuring consistent environments across development, testing, and production.

## 2. Backend Architecture - Layered Approach

The backend follows a layered architecture to separate concerns, making it modular, testable, and maintainable.

```
+------------------------------------+
|             Client                 |
+------------------------------------+
              | HTTP/WS
+------------------------------------+
|           Router (routes/)         |  <- Maps URLs/events to controllers
| (Auth, User, Conv, Message, Socket)|
+------------------------------------+
              |
+------------------------------------+
|      Middleware (middlewares/)     |  <- Auth, Validation, Error Handling, Rate Limiting
+------------------------------------+
              |
+------------------------------------+
|       Controllers (controllers/)   |  <- Handle request/response, validate input, call services
+------------------------------------+
              |
+------------------------------------+
|        Services (services/)        |  <- Business logic, orchestrate data operations
+------------------------------------+
              |
+------------------------------------+
|          Prisma (prisma/)          |  <- ORM for database interactions
+------------------------------------+
              |
+------------------------------------+
|          PostgreSQL DB             |
+------------------------------------+
```

### Components Breakdown:

*   **`server.ts`**: The entry point, setting up the HTTP server and initializing Socket.IO.
*   **`app.ts`**: Configures the Express application, including middleware, routes, and error handlers.
*   **`config/`**: Manages environment variables, logger setup (`winston`), and Redis client configuration.
*   **`middlewares/`**:
    *   `auth.ts`: JWT verification middleware to protect routes.
    *   `errorHandler.ts`: Centralized Express error handling.
    *   `rateLimiter.ts`: Middleware to limit requests based on IP.
    *   `validation.ts`: Joi-based request body validation.
*   **`routes/`**: Defines API endpoints using Express Router, directing requests to appropriate controllers.
*   **`controllers/`**: Contain the request handlers. They parse request data, call the relevant service methods, and send back API responses. They should be thin, focusing on HTTP concerns.
*   **`services/`**: Encapsulate the core business logic. They interact with the Prisma client (representing the data access layer) and orchestrate operations across different models. This is where algorithms and complex logic reside.
*   **`prisma/`**: Contains `schema.prisma` (database schema), migration files, and `seed.ts` (initial data).
*   **`sockets/`**: Manages Socket.IO event listeners and emitters. It handles real-time interactions, authentication for WebSocket connections, and broadcasts events to relevant clients.
*   **`utils/`**: General utility functions (e.g., password hashing, API response formatting).
*   **`tests/`**: Contains unit tests for services and integration tests for API endpoints.

## 3. Frontend Architecture - React with Context API

The frontend is a React application structured for maintainability and scalability.

```
+------------------------------------+
|              App.tsx               |  <- Main application entry, defines routes
+------------------------------------+
              | Router
+------------------------------------+
|             Pages (pages/)         |  <- Top-level views (Login, Register, Chat, Profile)
+------------------------------------+
              | Components, Context
+------------------------------------+
|      Components (components/)      |  <- Reusable UI elements (MessageList, ChatInput, etc.)
+------------------------------------+
              |
+------------------------------------+
|        Contexts (contexts/)        |  <- Global state (AuthContext, SocketContext)
+------------------------------------+
              |
+------------------------------------+
|          Hooks (hooks/)            |  <- Custom hooks for logic reuse
+------------------------------------+
              |
+------------------------------------+
|       Services (services/)         |  <- API clients (Axios), Socket.IO client setup
+------------------------------------+
              |
+------------------------------------+
|       Types & Utils (types/, utils/) |  <- TypeScript interfaces, helper functions
+------------------------------------+
```

### Components Breakdown:

*   **`index.tsx`**: React app entry point, renders `App.tsx`.
*   **`App.tsx`**: Defines the main application structure and routing (`react-router-dom`).
*   **`pages/`**: Page-level components that compose multiple smaller components to form a complete view (e.g., `ChatPage.tsx` combines `ConversationList`, `MessageList`, `MessageInput`).
*   **`components/`**: Reusable UI components (e.g., `Button`, `Input`, `MessageBubble`, `UserCard`).
*   **`contexts/`**:
    *   `AuthContext.tsx`: Manages user authentication state globally (JWT token, user data).
    *   `SocketContext.tsx`: Manages the Socket.IO connection and provides it to the rest of the application.
*   **`hooks/`**: Custom React hooks (`useAuth`, `useSocket`, etc.) to encapsulate and reuse stateful logic.
*   **`services/`**:
    *   `api.ts`: Configures and exports an Axios instance for making authenticated REST API calls.
    *   `auth.ts`, `user.ts`, `conversation.ts`, `message.ts`: Functions to interact with specific backend API endpoints.
    *   `socket.ts`: Manages the Socket.IO client connection and event handling.
*   **`types/`**: TypeScript interface definitions for data models (User, Message, Conversation, etc.), ensuring type safety across the application.
*   **`utils/`**: Helper functions for local storage, date formatting, etc.

## 4. Data Flow

### REST API Flow (e.g., User Login)

1.  **Client (Frontend):** User submits login form. `AuthService.login()` is called.
2.  **AuthService (Frontend):** Makes an `axios.post('/api/auth/login')` request.
3.  **Backend (Express Router):** `POST /api/auth/login` is matched and directed to `AuthController.login()`.
4.  **AuthController:** Extracts credentials, calls `AuthService.login()` (backend service).
5.  **AuthService (Backend):**
    *   Retrieves user from `Prisma` based on email.
    *   Compares hashed password using `bcrypt`.
    *   Generates a JWT token using `JwtService`.
6.  **AuthController:** Sends back success response with JWT token and user data.
7.  **Client (Frontend):** Receives token, stores it in local storage, updates `AuthContext` state, and redirects the user.

### Real-time Messaging Flow (e.g., Sending a Message)

1.  **Client (Frontend):** User types message and presses send. `SocketService.sendMessage()` is called.
2.  **SocketService (Frontend):** Emits a `send_message` Socket.IO event to the backend with message content and conversation ID.
3.  **Backend (Socket.IO Handler):**
    *   Receives `send_message` event.
    *   Authenticates the socket connection (if not already done).
    *   Validates message and sender.
    *   Calls `MessageService.createMessage()` to persist the message in PostgreSQL via Prisma.
    *   Broadcasts a `receive_message` event to all clients in the `conversationId` room (except the sender) and to the sender.
4.  **Clients (Frontend):**
    *   Other clients in the room receive the `receive_message` event.
    *   Update their UI to display the new message.
    *   The sending client updates its UI directly after sending, or also listens for `receive_message` for confirmation/consistency.

## 5. Database Schema (PostgreSQL via Prisma)

The database schema is defined in `prisma/schema.prisma`.

*   **User:** Stores user details (username, email, password hash).
*   **Conversation:** Represents a chat conversation, can be a direct message or a group.
*   **ConversationParticipant:** Junction table linking Users to Conversations, defining who is part of which chat.
*   **Message:** Stores individual chat messages, linked to a sender and a conversation.

```prisma
model User {
  id                      String                  @id @default(uuid())
  username                String                  @unique
  email                   String                  @unique
  passwordHash            String
  createdAt               DateTime                @default(now())
  updatedAt               DateTime                @updatedAt
  sentMessages            Message[]
  conversations           ConversationParticipant[]
  status                  UserStatus              @default(OFFLINE) // For online/offline presence
}

model Conversation {
  id           String                  @id @default(uuid())
  name         String? // Null for direct messages
  isGroup      Boolean                 @default(false)
  createdAt    DateTime                @default(now())
  updatedAt    DateTime                @updatedAt
  participants ConversationParticipant[]
  messages     Message[]
  lastMessage  Message?                @relation("LastMessageInConversation")
  lastMessageId String?                 @unique // For efficient last message retrieval
}

model ConversationParticipant {
  userId         String
  conversationId String
  assignedAt     DateTime                @default(now())
  user           User                    @relation(fields: [userId], references: [id])
  conversation   Conversation            @relation(fields: [conversationId], references: [id])

  @@id([userId, conversationId])
}

model Message {
  id             String       @id @default(uuid())
  conversationId String
  senderId       String
  content        String
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender         User         @relation(fields: [senderId], references: [id])
  isLastMessage  Conversation? @relation("LastMessageInConversation", fields: [id], references: [lastMessageId])
}

enum UserStatus {
  ONLINE
  OFFLINE
  AWAY
}
```

## 6. Scalability Considerations

*   **Stateless Backend (mostly):** JWT-based authentication ensures the backend doesn't need to maintain session state for REST requests, simplifying horizontal scaling.
*   **Redis Pub/Sub for WebSockets:** While this example runs a single Socket.IO instance, in a production environment with multiple backend servers, Redis would be used as a Socket.IO Adapter. This allows messages to be broadcast across all connected servers, ensuring all clients receive updates regardless of which server they are connected to.
*   **Database Scaling:** PostgreSQL can be scaled vertically (more powerful server) or horizontally (read replicas, sharding for very large systems). Prisma supports database connection pooling.
*   **Containerization:** Docker facilitates easy deployment and scaling using orchestration tools like Kubernetes or AWS ECS.
*   **Caching:** Redis can be expanded to cache frequently accessed data (e.g., user profiles, conversation lists) to reduce database load.

This architecture provides a solid foundation for a real-time chat application, balancing complexity with maintainability and laying the groundwork for future scalability needs.
```