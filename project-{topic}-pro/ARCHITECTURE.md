# Real-time Chat Application Architecture

This document outlines the high-level architecture and key components of the Real-time Chat Application. The system is designed for scalability, reliability, and maintainability, following a microservices-inspired approach where the frontend and backend are decoupled.

## 1. High-Level Overview

The application follows a traditional client-server architecture with a strong emphasis on real-time communication.

*   **Client (Frontend)**: A single-page application (SPA) built with React.js and TypeScript, consuming RESTful APIs and interacting via WebSockets.
*   **Server (Backend)**: A Node.js application built with Express.js and TypeScript, providing RESTful APIs for CRUD operations and handling real-time communication via Socket.IO.
*   **Database**: PostgreSQL for persistent data storage.
*   **Cache/Message Broker**: Redis, primarily used for JWT refresh token storage and potentially for managing user presence/distributed Socket.IO adapters.
*   **Containerization**: Docker and Docker Compose for development and deployment environments.

```
+------------------+     HTTP/WS     +---------------------+     TCP     +----------------+
|                  | <-------------> |                     | <---------> |                |
|  Client (React)  |                 | Backend (Node/Exp)  |             | PostgreSQL DB  |
|                  | <-------------> |                     | <---------> |                |
+------------------+     Socket.IO   +---------------------+             +----------------+
                                           ^        ^
                                           |        | Redis Client
                                           |        |
                                           +--------+----------------+
                                                    |                |
                                                    |  Redis (Cache/PubSub)  |
                                                    |                |
                                                    +----------------+
```

## 2. Component Breakdown

### 2.1. Frontend (React.js, TypeScript)

*   **Framework**: React.js for building the user interface.
*   **Language**: TypeScript for type safety and improved developer experience.
*   **State Management**: React Context API for global state (e.g., authentication, socket connection). Could be extended with Zustand/Redux Toolkit for larger scale.
*   **Routing**: React Router DOM for navigation between pages.
*   **API Integration**: Axios for making HTTP requests to the backend REST APIs.
*   **Real-time Communication**: Socket.IO client library for establishing and managing WebSocket connections.
*   **Styling**: Tailwind CSS for utility-first CSS.
*   **Key Modules**:
    *   `src/api`: Axios instances and functions for interacting with backend REST APIs.
    *   `src/components`: Reusable UI components (e.g., `LoginForm`, `ChatRoomList`, `ChatWindow`).
    *   `src/contexts`: Context providers for managing global state like `AuthContext` and `SocketContext`.
    *   `src/pages`: Top-level components representing application views (e.g., `LoginPage`, `ChatDashboard`).
    *   `src/types`: TypeScript interfaces for shared data structures (users, messages, chat rooms).

### 2.2. Backend (Node.js, Express.js, Socket.IO, TypeORM, TypeScript)

The backend is structured using a layered approach to separate concerns:

*   **Entry Point**: `src/server.ts` handles server startup, database initialization, and Socket.IO setup.
*   **Application Core**: `src/app.ts` configures the Express application (middleware, routes).
*   **Controllers**: `src/controllers` handle incoming HTTP requests, validate input, and orchestrate calls to services. They focus on request/response logic.
*   **Services**: `src/services` encapsulate the core business logic. They interact with the database (via repositories) and other services (e.g., `SocketService` for broadcasting). This layer is responsible for data manipulation and complex operations.
*   **Database Layer**:
    *   **ORM**: TypeORM is used to interact with PostgreSQL.
    *   **Entities**: `src/database/entities` define the database schema using TypeORM decorators (`User`, `ChatRoom`, `Message`, `ChatRoomParticipant`).
    *   **Migrations**: `src/database/migrations` manage schema changes.
    *   **Data Source**: `src/config/data-source.ts` configures the TypeORM `DataSource`.
*   **Middleware**: `src/middleware` contains reusable Express middleware for common tasks:
    *   `authMiddleware.ts`: JWT token verification and user authentication.
    *   `errorHandler.ts`: Centralized error handling for consistent API responses.
    *   `rateLimitMiddleware.ts`: Prevents abuse by limiting request rates.
    *   `loggingMiddleware.ts`: Request/response logging using Winston.
*   **Routes**: `src/routes` define the API endpoints and map them to controller methods.
*   **Configuration**: `src/config` manages environmental settings (database, Redis, JWT secrets, logger).
*   **Utilities**: `src/utils` contains helper functions (e.g., `catchAsync` for error handling in async routes).
*   **Real-time Logic**: `src/services/socketService.ts` manages Socket.IO events, room management, and broadcasting messages.

### 2.3. Database (PostgreSQL)

*   **Type**: Relational Database Management System (RDBMS).
*   **Purpose**: Stores all persistent application data, including user accounts, chat rooms, messages, and participation records.
*   **Schema Design**: Normalized schema to ensure data integrity and efficient querying. Key tables: `users`, `chat_rooms`, `messages`, `chat_room_participants`, `message_read_by_users`.
*   **Query Optimization**: TypeORM's query builder is used, with explicit eager/lazy loading of relations to minimize N+1 problems. Indices are defined on foreign keys and frequently queried columns (e.g., `email`, `username`, `createdAt` on messages).

### 2.4. Cache / Pub/Sub (Redis)

*   **Purpose**:
    *   **JWT Refresh Token Storage**: Provides a persistent and fast lookup for refresh tokens, allowing for token invalidation on logout or security breaches.
    *   **Session Management**: Can be extended to store user session data.
    *   **Real-time Presence/State (Scalability)**: In a multi-instance backend deployment, Redis can act as a Socket.IO adapter (using `socket.io-redis`) to allow messages to be broadcast across all instances, and for managing user presence (who is online).
*   **Implementation**: `ioredis` client for Node.js.

## 3. Communication Flows

### 3.1. Authentication Flow

1.  **Register/Login**: Client sends `POST /api/auth/register` or `POST /api/auth/login` with credentials.
2.  **Server Response**: Backend authenticates/registers user, generates `accessToken` (short-lived) and `refreshToken` (long-lived) using JWT.
3.  **Token Storage**: Client stores tokens (e.g., in `localStorage` for convenience in this example; `HttpOnly` cookies are more secure for refresh tokens in production).
4.  **API Requests**: Client includes `accessToken` in the `Authorization: Bearer <token>` header for all protected REST API calls.
5.  **Token Refresh**: If `accessToken` expires, client uses `refreshToken` (sent to `POST /api/auth/refresh-token` with the expired access token in the header) to obtain a new `