# Real-time Chat Application

This project is a comprehensive, production-ready real-time chat application system built with a modern full-stack approach. It features a TypeScript-based Node.js backend with Express and Socket.IO, a React frontend, PostgreSQL for the database, Redis for caching, and Docker for containerization. The architecture emphasizes modularity, scalability, and robust error handling, adhering to best practices for enterprise-grade applications.

## Table of Contents

1.  [Features](#features)
2.  [Technology Stack](#technology-stack)
3.  [Project Structure](#project-structure)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Development with Docker Compose](#local-development-with-docker-compose)
    *   [Backend Setup (Manual)](#backend-setup-manual)
    *   [Frontend Setup (Manual)](#frontend-setup-manual)
5.  [Database Management](#database-management)
    *   [Migrations](#migrations)
    *   [Seeding](#seeding)
6.  [Running Tests](#running-tests)
7.  [API Documentation](#api-documentation)
8.  [Architecture](#architecture)
9.  [Deployment](#deployment)
10. [CI/CD](#cicd)
11. [Additional Features](#additional-features)
12. [Contributing](#contributing)
13. [License](#license)

## Features

*   **User Authentication & Authorization**: Secure JWT-based authentication (registration, login, refresh tokens).
*   **Real-time Messaging**: Instant message exchange using WebSockets (Socket.IO).
*   **Chat Room Management**: Create, join, leave chat rooms.
*   **Private and Group Chats**: Supports both private 1-on-1 and group chat functionalities.
*   **Message History**: Load past messages for a chat room.
*   **Typing Indicators**: Real-time "typing..." status.
*   **Message Read Status**: Indication of message read status.
*   **User Presence**: Online/offline status (conceptual, can be extended).
*   **Scalability**: Designed with stateless backend components (for horizontal scaling) and Redis for shared state.
*   **Robust Error Handling**: Centralized error management with informative responses.
*   **Logging & Monitoring**: Structured logging for debugging and operational insights.
*   **Caching**: Redis integration for session management and performance optimization.
*   **Rate Limiting**: Protects against abuse and DoS attacks.
*   **Comprehensive Testing**: Unit, Integration, and API tests.
*   **Containerization**: Docker for consistent development and deployment environments.
*   **Detailed Documentation**: README, API docs, Architecture, Deployment guides.

## Technology Stack

### Backend
*   **Runtime**: Node.js
*   **Language**: TypeScript
*   **Framework**: Express.js
*   **Real-time**: Socket.IO
*   **Database ORM**: TypeORM
*   **Database**: PostgreSQL
*   **Caching/Messaging**: Redis
*   **Authentication**: JWT (jsonwebtoken, bcrypt)
*   **Validation**: class-validator, class-transformer
*   **Logging**: Winston
*   **Testing**: Jest, Supertest
*   **Other**: `dotenv`, `express-rate-limit`, `helmet`, `cors`

### Frontend
*   **Framework**: React.js
*   **Language**: TypeScript
*   **State Management**: React Context API
*   **Routing**: React Router DOM
*   **Real-time**: Socket.IO client
*   **Styling**: Tailwind CSS
*   **HTTP Client**: Axios
*   **Testing**: React Testing Library, Jest

### Infrastructure
*   **Containerization**: Docker, Docker Compose
*   **Web Server/Reverse Proxy**: Nginx (optional, for production deployment)
*   **CI/CD**: GitHub Actions (conceptual workflow)

## Project Structure

```
<See Project Structure section above in the main response>
```

## Setup and Installation

### Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js**: v18.x or higher
*   **npm** or **Yarn**: (npm v9.x or higher recommended)
*   **Docker Desktop**: (Includes Docker Engine and Docker Compose)
*   **Git**

### Local Development with Docker Compose (Recommended)

This is the easiest way to get the entire application running.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/chat-app.git
    cd chat-app
    ```

2.  **Create `.env` files:**
    *   Copy `.env.example` to `.env` in the root directory.
    *   Copy `server/.env.example` to `server/.env`.
    *   Copy `client/.env.example` to `client/.env`.

    Adjust variables as needed. The defaults should work for local Docker setup.

    **Example `chat-app/.env`:**
    ```
    POSTGRES_USER=chatuser
    POSTGRES_PASSWORD=chatpassword
    POSTGRES_DB=chatdb
    REDIS_HOST=redis
    REDIS_PORT=6379
    ```

    **Example `chat-app/server/.env`:**
    ```
    NODE_ENV=development
    PORT=5000
    DATABASE_URL=postgresql://chatuser:chatpassword@db:5432/chatdb
    JWT_SECRET=supersecretjwtkeythatshouldbeverylongandcomplex
    JWT_REFRESH_SECRET=anothersupersecretrefreshkey
    ACCESS_TOKEN_EXPIRATION=15m
    REFRESH_TOKEN_EXPIRATION=7d
    CLIENT_URL=http://localhost:3000
    REDIS_HOST=redis
    REDIS_PORT=6379
    RATE_LIMIT_WINDOW_MS=60000
    RATE_LIMIT_MAX_REQUESTS=100
    LOG_LEVEL=info
    ```

    **Example `chat-app/client/.env`:**
    ```
    REACT_APP_API_BASE_URL=http://localhost:5000/api
    REACT_APP_WS_BASE_URL=http://localhost:5000
    ```

3.  **Build and run services:**
    This command will build the Docker images, create the containers for PostgreSQL, Redis, backend, and frontend, and start them.

    ```bash
    docker-compose up --build -d
    ```

    *   `--build`: Rebuilds images even if they exist (useful after code changes).
    *   `-d`: Runs containers in detached mode (in the background).

4.  **Run Database Migrations and Seeding (after services are up):**

    Connect to the backend container to run migrations:
    ```bash
    docker-compose exec server npm run typeorm migration:run
    docker-compose exec server npm run seed:run
    ```
    *This is crucial for setting up the database schema and initial data.*

5.  **Access the application:**
    *   Frontend: `http://localhost:3000`
    *   Backend API: `http://localhost:5000/api`

### Backend Setup (Manual)

If you prefer to run the backend directly on your host machine:

1.  **Navigate to the server directory:**
    ```bash
    cd chat-app/server
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up PostgreSQL and Redis:**
    Ensure you have a PostgreSQL database and a Redis instance running locally, or use Docker for just these services:
    ```bash
    # From chat-app root:
    docker-compose up -d db redis
    ```
    Update `server/.env` with correct `DATABASE_URL` and `REDIS_HOST`/`REDIS_PORT` if they are not `localhost` (e.g., if using host IP).

4.  **Run migrations and seeding:**
    ```bash
    npm run typeorm migration:run
    npm run seed:run
    ```

5.  **Build and Start the backend:**
    ```bash
    npm run build
    npm run start
    ```
    Or for development with hot-reloading:
    ```bash
    npm run dev
    ```
    The backend will run on `http://localhost:5000`.

### Frontend Setup (Manual)

If you prefer to run the frontend directly on your host machine:

1.  **Navigate to the client directory:**
    ```bash
    cd chat-app/client
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the frontend development server:**
    ```bash
    npm start
    ```
    The frontend will run on `http://localhost:3000`.

## Database Management

This project uses TypeORM for database interactions and migrations.

### Migrations

*   **Generate a new migration:**
    ```bash
    # From server directory (or docker-compose exec server)
    npm run typeorm migration:create ./src/database/migrations/NewMigrationName
    ```
*   **Run pending migrations:**
    ```bash
    # From server directory (or docker-compose exec server)
    npm run typeorm migration:run
    ```
*   **Revert the last migration:**
    ```bash
    # From server directory (or docker-compose exec server)
    npm run typeorm migration:revert
    ```

### Seeding

The `seed:run` command populates the database with initial data (users, chat rooms).

*   **Run seeds:**
    ```bash
    # From server directory (or docker-compose exec server)
    npm run seed:run
    ```

## Running Tests

Tests are organized into Unit, Integration, and API categories using Jest and Supertest.

1.  **Navigate to the server directory:**
    ```bash
    cd chat-app/server
    ```

2.  **Run all tests:**
    ```bash
    npm test
    ```

3.  **Run unit tests only:**
    ```bash
    npm run test:unit
    ```

4.  **Run integration tests only:**
    ```bash
    npm run test:integration
    ```

5.  **Run tests with coverage report:**
    ```bash
    npm run test:cov
    ```
    *We aim for 80%+ coverage on critical business logic.*

**Frontend Tests:**

1.  **Navigate to the client directory:**
    ```bash
    cd chat-app/client
    ```

2.  **Run all frontend tests:**
    ```bash
    npm test
    ```

## API Documentation

The backend API is documented using the OpenAPI (Swagger) specification. A `API_DOCS.md` file provides a simplified overview and can be used to generate a full Swagger UI if needed.

<details>
<summary>View API Documentation Snippet</summary>

```yaml
# API_DOCS.md (simplified OpenAPI 3.0 specification snippet)
# This would typically be a more extensive YAML or JSON file.
# For interactive UI, tools like Swagger UI can render this.

openapi: 3.0.0
info:
  title: Real-time Chat Application API
  version: 1.0.0
  description: API for managing users, chat rooms, and messages in a real-time chat application.
servers:
  - url: http://localhost:5000/api
    description: Development Server
  - url: https://api.yourdomain.com/api
    description: Production Server
tags:
  - name: Auth
    description: User authentication and authorization
  - name: Users
    description: User profiles and management
  - name: ChatRooms
    description: Chat room creation, joining, and listing
  - name: Messages
    description: Sending and retrieving messages

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        username:
          type: string
        email:
          type: string
          format: email
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
    ChatRoom:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        type:
          type: string
          enum: [private, group]
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
    Message:
      type: object
      properties:
        id:
          type: string
          format: uuid
        chatRoomId:
          type: string
          format: uuid
        senderId:
          type: string
          format: uuid
        content:
          type: string
        createdAt:
          type: string
          format: date-time
        isRead:
          type: boolean
    Error:
      type: object
      properties:
        message:
          type: string
        statusCode:
          type: number
        errorCode:
          type: string
      required:
        - message
        - statusCode
        - errorCode

paths:
  /auth/register:
    post:
      summary: Register a new user
      tags: [Auth]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                username: { type: string, minLength: 3 }
                email: { type: string, format: email }
                password: { type: string, minLength: 6 }
              required: [username, email, password]
      responses:
        '201':
          description: User registered successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  message: { type: string, example: "User registered successfully" }
                  user: { $ref: '#/components/schemas/User' }
        '400':
          description: Bad Request (e.g., validation error, user already exists)
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Error' }

  /auth/login:
    post:
      summary: Login a user and get JWT tokens
      tags: [Auth]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email: { type: string, format: email }
                password: { type: string }
              required: [email, password]
      responses:
        '200':
          description: Successful login
          content:
            application/json:
              schema:
                type: object
                properties:
                  accessToken: { type: string, description: "JWT Access Token" }
                  refreshToken: { type: string, description: "JWT Refresh Token" }
                  user: { $ref: '#/components/schemas/User' }
        '401':
          description: Unauthorized (invalid credentials)
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Error' }

  /auth/refresh-token:
    post:
      summary: Refresh access token using refresh token
      tags: [Auth]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                refreshToken: { type: string }
              required: [refreshToken]
      responses:
        '200':
          description: New access token generated
          content:
            application/json:
              schema:
                type: object
                properties:
                  accessToken: { type: string }
        '401':
          description: Unauthorized (invalid or expired refresh token)

  /users/me:
    get:
      summary: Get current authenticated user's profile
      tags: [Users]
      security:
        - bearerAuth: []
      responses:
        '200':
          description: User profile
          content:
            application/json:
              schema: { $ref: '#/components/schemas/User' }
        '401':
          description: Unauthorized

  /chat-rooms:
    post:
      summary: Create a new chat room
      tags: [ChatRooms]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name: { type: string, description: "Name of the chat room (optional for private)" }
                type: { type: string, enum: [private, group], default: group }
                participantIds:
                  type: array
                  items:
                    type: string
                    format: uuid
                  description: "IDs of users to invite (excluding creator for group, including other user for private)"
              required: [type]
      responses:
        '201':
          description: Chat room created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ChatRoom' }
        '400':
          description: Bad Request (e.g., invalid participants)
        '401':
          description: Unauthorized
    get:
      summary: Get all chat rooms the authenticated user is a part of
      tags: [ChatRooms]
      security:
        - bearerAuth: []
      responses:
        '200':
          description: List of chat rooms
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/ChatRoom' }
        '401':
          description: Unauthorized

  /chat-rooms/{id}/messages:
    get:
      summary: Get message history for a chat room
      tags: [Messages]
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          schema:
            type: string
            format: uuid
          required: true
          description: The ID of the chat room
        - in: query
          name: limit
          schema:
            type: integer
            default: 50
          description: Number of messages to retrieve
        - in: query
          name: offset
          schema:
            type: integer
            default: 0
          description: Offset for pagination
      responses:
        '200':
          description: List of messages
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Message' }
        '401':
          description: Unauthorized
        '403':
          description: Forbidden (user not a member of the chat room)
        '404':
          description: Chat room not found
```
</details>

## Architecture

Please refer to `ARCHITECTURE.md` for a detailed overview of the system design.

## Deployment

Refer to `DEPLOYMENT.md` for instructions on deploying the application to a production environment using Docker and Nginx.

## CI/CD

A conceptual CI/CD pipeline using GitHub Actions is defined in `.github/workflows/ci-cd.yml`. This pipeline typically includes steps for linting, testing, building Docker images, and deploying to a cloud provider.

## Additional Features

*   **Logging & Monitoring**: Integrated `Winston` for structured logging. For production, consider integrating with monitoring tools like Prometheus, Grafana, ELK stack.
*   **Error Handling Middleware**: Centralized error handling catches all exceptions and sends consistent error responses.
*   **Caching Layer**: Redis is used for JWT refresh token storage and can be extended for other data caching (e.g., frequently accessed user profiles, chat room metadata).
*   **Rate Limiting**: `express-rate-limit` middleware is applied to API routes to prevent abuse.

## Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Write tests for your changes.
5.  Ensure all tests pass (`npm test`).
6.  Commit your changes (`git commit -m 'feat: Add new feature'`).
7.  Push to the branch (`git push origin feature/your-feature-name`).
8.  Open a Pull Request.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
```