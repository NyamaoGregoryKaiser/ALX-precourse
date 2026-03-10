# Real-time Chat Application

A comprehensive, production-ready real-time chat application built with TypeScript, Node.js (Express, Socket.io), React, PostgreSQL, and Redis.

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Technologies Used](#technologies-used)
4.  [Prerequisites](#prerequisites)
5.  [Setup & Installation](#setup--installation)
    *   [Local Setup (without Docker)](#local-setup-without-docker)
    *   [Docker Compose Setup](#docker-compose-setup)
6.  [Running the Application](#running-the-application)
7.  [Database Management](#database-management)
8.  [Testing](#testing)
9.  [API Documentation](#api-documentation)
10. [Deployment Guide](#deployment-guide)
11. [Contributing](#contributing)
12. [License](#license)

## 1. Features

*   **Real-time Messaging:** Instant message delivery using WebSockets (Socket.io).
*   **User Authentication & Authorization:** Secure JWT-based authentication (Register, Login).
*   **Private & Group Conversations:** Create one-on-one chats or multi-user groups.
*   **Conversation Management:** Add/remove participants, update group names.
*   **User Management:** View other users, start new chats.
*   **Online Status:** See which users are currently online.
*   **Message History:** Load previous messages in a conversation.
*   **Scalability:** Designed with Redis for caching and session management.
*   **Robust Error Handling & Logging:** Centralized error handling and structured logging.
*   **Rate Limiting:** Protects against abuse and brute-force attacks.
*   **Containerization:** Docker for easy setup and deployment.
*   **CI/CD:** Basic GitHub Actions workflow for automated testing.

## 2. Architecture

The application follows a client-server architecture with a clear separation of concerns:

*   **Frontend (Client):** A React application built with TypeScript, responsible for the user interface and interacting with the backend API and WebSocket server.
*   **Backend (Server):** A Node.js application using Express.js for RESTful APIs and Socket.io for real-time communication. It handles business logic, data persistence, authentication, and WebSocket events.
*   **Database (PostgreSQL):** A robust relational database for storing user, conversation, and message data. Managed with TypeORM.
*   **Cache/Message Broker (Redis):** Used for managing user online status, caching frequently accessed data, and potentially for scaling WebSocket messages across multiple backend instances (though only status is implemented here).

```mermaid
graph TD
    A[Client - React App] -->|HTTP/REST| B(Backend - Node.js/Express)
    A -->|WebSocket/Socket.io| B
    B -->|ORM/TypeORM| C(Database - PostgreSQL)
    B -->|Client| D(Cache - Redis)
    C --&gt; D
    A[Client - React App] --&gt; E{Nginx Proxy}
    E --&gt; B
```

## 3. Technologies Used

*   **Backend:**
    *   TypeScript
    *   Node.js
    *   Express.js
    *   Socket.io
    *   TypeORM (ORM for PostgreSQL)
    *   PostgreSQL (Database)
    *   Redis (Caching, User Status)
    *   Bcrypt.js (Password Hashing)
    *   JSON Web Tokens (JWT) for authentication
    *   Passport.js (Authentication Middleware)
    *   Winston (Logging)
    *   Express Rate Limit (Rate Limiting)
*   **Frontend:**
    *   TypeScript
    *   React
    *   React Router DOM
    *   Axios (HTTP Client)
    *   Socket.io Client
    *   Vite (Build Tool)
*   **Testing:**
    *   Jest (Unit & Integration Tests)
    *   Supertest (API Integration Tests)
    *   React Testing Library (Frontend Unit Tests)
*   **Development & Deployment:**
    *   Docker & Docker Compose
    *   Nginx (Frontend Reverse Proxy)
    *   GitHub Actions (CI/CD)

## 4. Prerequisites

Before you begin, ensure you have the following installed:

*   [Node.js](https://nodejs.org/) (v20 or higher)
*   [npm](https://www.npmjs.com/) (comes with Node.js)
*   [Git](https://git-scm.com/)
*   [Docker](https://www.docker.com/products/docker-desktop) & [Docker Compose](https://docs.docker.com/compose/install/) (recommended)
*   [PostgreSQL](https://www.postgresql.org/download/) client tools (if not using Docker for DB)
*   [Redis](https://redis.io/download/) (if not using Docker for Redis)

## 5. Setup & Installation

Clone the repository:

```bash
git clone https://github.com/your-username/realtime-chat-app.git
cd realtime-chat-app
```

### Local Setup (without Docker)

**5.1. Backend Setup**

1.  Navigate to the `server` directory:
    ```bash
    cd server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file based on `.env.example` and fill in your PostgreSQL and JWT details.
    ```env
    # .env
    NODE_ENV=development
    PORT=5000
    CLIENT_URL=http://localhost:3000

    DB_HOST=localhost
    DB_PORT=5432
    DB_USER=chatuser
    DB_PASSWORD=chatpass
    DB_NAME=chat_db

    JWT_SECRET=supersecretkeythatshouldbemorandomandlonger
    JWT_EXPIRES_IN=1d

    REDIS_URL=redis://localhost:6379
    ```
4.  Ensure you have a PostgreSQL server running (e.g., locally or via Docker) and a Redis instance.
    *   Create a user and database as specified in your `.env` file (e.g., `chatuser`, `chat_db`).
5.  Run database migrations:
    ```bash
    npm run migrate
    ```
6.  (Optional) Seed initial data:
    ```bash
    npm run seed # This script needs to be uncommented/created based on the conceptual seed logic
    ```

**5.2. Frontend Setup**

1.  Navigate to the `client` directory:
    ```bash
    cd ../client
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file based on `.env.example`:
    ```env
    # .env
    VITE_API_URL=http://localhost:5000/api
    VITE_WS_URL=http://localhost:5000
    ```

### Docker Compose Setup (Recommended)

This method simplifies setup by running all services in isolated Docker containers.

1.  Ensure Docker and Docker Compose are installed.
2.  From the project root directory (`realtime-chat-app`), create a `.env` file. This `.env` will be used by `docker-compose.yml`.
    ```env
    # .env (in project root)
    DB_USER=chatuser
    DB_PASSWORD=chatpass
    DB_NAME=chat_db
    JWT_SECRET=your_docker_jwt_secret_here_make_it_long_and_random
    JWT_EXPIRES_IN=1d
    ```
3.  Build and start the services:
    ```bash
    docker-compose up --build -d
    ```
    This command will:
    *   Build Docker images for `server` and `client` services.
    *   Pull official images for `db` (PostgreSQL) and `redis`.
    *   Start all containers in detached mode.
    *   Run backend database migrations automatically.

## 6. Running the Application

### Local (without Docker Compose)

1.  Start the backend (from `server` directory):
    ```bash
    npm run dev
    ```
    The backend will run on `http://localhost:5000`.
2.  Start the frontend (from `client` directory):
    ```bash
    npm run dev
    ```
    The frontend will run on `http://localhost:3000`.

### With Docker Compose

1.  After `docker-compose up -d`, the services will be running in the background.
2.  Access the frontend in your browser: `http://localhost:3000`
3.  The backend API will be accessible internally within Docker at `http://server:5000` and proxied by Nginx.

## 7. Database Management

When using Docker Compose, migrations are run on container startup. For local development:

*   **Run migrations:** `cd server && npm run migrate`
*   **Revert last migration:** `cd server && npm run migrate:revert`
*   **Create a new migration:** `cd server && npm run migrate:create --name=YourMigrationName` (replace `YourMigrationName`)

## 8. Testing

Testing is separated into unit, integration, and API tests for the backend, and unit tests for the frontend.

### Backend Tests

1.  Navigate to the `server` directory.
2.  **Run all tests:** `npm test`
3.  **Run unit tests:** `npm run test:unit`
4.  **Run integration tests:** `npm run test:integration` (requires a running PostgreSQL instance for the test database, as configured in `server/tests/integration/user.api.test.ts`)

### Frontend Tests

1.  Navigate to the `client` directory.
2.  **Run all tests:** `npm test`
3.  **Run tests with coverage:** `npm run test:coverage`

## 9. API Documentation

The backend exposes a RESTful API and a WebSocket interface.

### REST API Endpoints

*   **Authentication:**
    *   `POST /api/auth/register`: Register a new user.
    *   `POST /api/auth/login`: Log in an existing user, get JWT token.
*   **Users:** (Requires JWT authentication)
    *   `GET /api/users/me`: Get current authenticated user's profile.
    *   `GET /api/users`: Get a list of all users.
    *   `GET /api/users/:id`: Get a specific user by ID.
    *   `GET /api/users/search?q=query`: Search users by username or email.
*   **Conversations:** (Requires JWT authentication)
    *   `GET /api/conversations`: Get all conversations for the authenticated user.
    *   `GET /api/conversations/:id`: Get a specific conversation by ID (with messages and participants).
    *   `POST /api/conversations/private`: Create or get a private conversation (payload: `{ targetUserId: string }`).
    *   `POST /api/conversations/group`: Create a group conversation (payload: `{ name: string, participantIds: string[] }`).
    *   `POST /api/conversations/:id/participants`: Add a participant to a group conversation (payload: `{ userId: string }`).
    *   `DELETE /api/conversations/:id/participants/:userId`: Remove a participant from a group conversation.
    *   `DELETE /api/conversations/:id`: Delete a conversation (if authorized).
*   **Messages:** (Requires JWT authentication)
    *   `GET /api/messages/:conversationId`: Get messages for a specific conversation.
    *   `POST /api/messages/:conversationId`: Send a message to a conversation (payload: `{ content: string }`).
    *   `POST /api/messages/:id/read`: Mark a message as read.

*(For detailed schema and examples, a Swagger/OpenAPI definition would typically be generated or manually maintained. This documentation serves as a high-level overview.)*

### WebSocket Events

The Socket.io server handles real-time communication. All WebSocket connections require a JWT token for authentication during handshake.

*   **Client Emits:**
    *   `message:send`: `{ conversationId: string, content: string }` - Sends a new message.
    *   `conversation:join`: `string` (conversationId) - Explicitly joins a conversation room (useful for ensuring real-time updates).
*   **Server Emits:**
    *   `message:receive`: `{ id: string, content: string, sender: { id: string, username: string }, conversationId: string, sentAt: string }` - A new message received in a conversation.
    *   `user:status`: `{ userId: string, isOnline: boolean }` - Broadcasts user online/offline status changes.
    *   `error`: `string` - Generic error messages from the server.

## 10. Deployment Guide

The `docker-compose.yml` provides a production-ready setup for a single-node deployment.

1.  **Build production images:**
    ```bash
    docker-compose build --no-cache
    ```
2.  **Start services:**
    ```bash
    docker-compose up -d
    ```
3.  **Ensure `.env` variables are set:** In a production environment, you should secure your `.env` file or pass environment variables directly to your containers (e.g., using Kubernetes secrets, Docker Swarm secrets, or cloud provider environment management).
4.  **CI/CD Integration:** The `.github/workflows/ci.yml` provides a basic CI pipeline. For production deployments, you would extend this to:
    *   Build Docker images on merge to `main`.
    *   Push images to a container registry (e.g., Docker Hub, AWS ECR, GCR).
    *   Deploy updated images to your production server (e.g., using SSH, Kubernetes manifests, or cloud-specific deployment tools).

    **Example `deploy` step (conceptual for a simple server):**
    ```yaml
    # ... after build and push to registry
    - name: Deploy to Production
      if: github.ref == 'refs/heads/main'
      uses: appleboy/ssh-action@v1.0.3
      with:
        host: ${{ secrets.SSH_HOST }}
        username: ${{ secrets.SSH_USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /path/to/your/app
          docker-compose pull # Pull latest images
          docker-compose up -d --remove-orphans # Restart services
          docker system prune -f # Clean up old images
    ```

## 11. Contributing

Feel free to fork the repository, open issues, and submit pull requests.

## 12. License

This project is licensed under the MIT License.