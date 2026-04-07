# Project Management API (PMApi) - Architecture Documentation

This document outlines the architectural design of the Project Management API, focusing on its components, their interactions, and the underlying principles.

## 1. High-Level Architecture

The PMApi employs a **Microservices-oriented / Monolith-first** approach, leveraging a clear separation of concerns even within a single codebase. It's a full-stack application composed of:

*   **Frontend Client:** A minimal React application serving as the user interface.
*   **Backend API:** A Node.js (Express.js) application providing RESTful endpoints.
*   **Database:** PostgreSQL for persistent data storage.
*   **Cache/Message Broker:** Redis for caching and refresh token management.
*   **Containerization:** Docker for packaging and Docker Compose for local orchestration.

```
+-------------------------------------------------------------------------------------------------------------------------------------+
|                                                                                               Cloud / On-Premise Hosting              |
|                                                                                                                                     |
|                                                                                                                                     |
|                                                                                                                                     |
|    +--------------------+            +-----------------------+            +-----------------------------------------------------+   |
|    |     User Web       |            |       Nginx           |            |                 Backend API (Node.js/Express)       |   |
|    |     Browser        | <--------> |  (Frontend Service)   | <--------> |                                                     |   |
|    |  (React App)       |            |  (Static Files, Proxy)|            |  +---------------+      +---------------+          |   |
|    +--------------------+            +-----------------------+            |  |  Controllers  |------>|    Services   |          |   |
|                                                                          |  | (Request/Res) |        | (Business Logic)|          |   |
|                                                                          |  +---------------+      +-------^-------+          |   |
|                                                                          |                                |                      |   |
|                                                                          |  +---------------+      +-------v-------+          |   |
|                                                                          |  |  Middleware   |<------>|     Models    |<---------+   |
|                                                                          |  | (Auth, Error, |        |   (Sequelize) |          |   |
|                                                                          |  |  Rate Limit,  |        +---------------+          |   |
|                                                                          |  |  Logging)     |                                     |   |
|                                                                          |  +-------^-------+                                     |   |
|                                                                          |          |                                            |   |
|                                                                          |          +--------------------------------------------+   |
|                                                                          |                     ^                                   |   |
|                                                                          |                     |                                   |   |
|                                                                          |        +-----------------------------------+          |   |
|                                                                          |        |           Redis Cache           |<---------+   |
|                                                                          |        | (Session, Refresh Tokens, Caching)|          |   |
|                                                                          |        +-----------------------------------+          |   |
|                                                                          |                                                     |   |
|                                                                          +-----------------------------------------------------+   |
|                                                                                                  ^                                |   |
|                                                                                                  |                                |   |
|                                                                                                  |                                |   |
|                                                                                                  +--------------------------------+   |
|                                                                                                  |                                |   |
|                                                                                                  |                                |   |
|                                                                                                  v                                |   |
|                                                                         +-----------------------------------------------------+   |
|                                                                         |                  PostgreSQL Database                |   |
|                                                                         | (Users, Projects, Tasks, Migrations, Seeders)       |   |
|                                                                         +-----------------------------------------------------+   |
|                                                                                                                                     |
+-------------------------------------------------------------------------------------------------------------------------------------+
```

## 2. Component Breakdown

### 2.1 Frontend (React.js)

*   **Purpose:** Provides a user-friendly interface for interacting with the backend API. Minimalistic for this demonstration, focusing on core authentication and project listing.
*   **Key Libraries:** React, React Router DOM, Axios.
*   **`api/client.js`:** An Axios instance configured with a base URL and request/response interceptors.
    *   **Request Interceptor:** Automatically adds `Authorization` header with the JWT access token from `localStorage`.
    *   **Response Interceptor:** Handles `401 Unauthorized` errors by attempting to refresh the access token using the refresh token. If successful, it retries the original failed request. If refresh fails, it clears tokens and redirects to login. This provides a robust session management experience.
*   **`pages/` and `components/`:** Standard React component structure for UI elements and page layouts.

### 2.2 Backend (Node.js/Express.js)

The backend follows a **Layered Architecture** with a clear separation of concerns:

#### 2.2.1 `app.js` and `server.js`

*   **`server.js`:** The application entry point. Handles environment loading, database (PostgreSQL/Sequelize) and Redis connection, and starting the Express server. Includes graceful shutdown handlers.
*   **`app.js`:** Configures the Express application.
    *   **Security:** `helmet`, `xss-clean` to mitigate common web vulnerabilities.
    *   **Performance:** `compression` for Gzip encoding.
    *   **CORS:** `cors` middleware enabled.
    *   **Parsers:** `express.json()` and `express.urlencoded()` for request body parsing.
    *   **Global Middleware:** Logging (`morgan`), rate limiting (`express-rate-limit`), custom error handling.
    *   **Route Mounting:** Mounts all API routes under `/api/v1`.
    *   **Error Handling:** Catches 404s and passes errors to centralized error handling middleware.

#### 2.2.2 `config/`

*   Manages application settings loaded from environment variables (`.env`).
*   Includes configurations for database, JWT, Redis, and Winston logger.
*   Uses `Joi` for schema validation of environment variables at startup, ensuring critical configurations are present and correctly formatted.

#### 2.2.3 `db/` (Database Layer - PostgreSQL with Sequelize)

*   **`sequelize.js` / `models/index.js`:** Initializes Sequelize ORM and loads all defined models.
*   **`models/`:** Defines database schemas (User, Project, Task) using Sequelize models.
    *   Includes associations (e.g., `User hasMany Projects`, `Project hasMany Tasks`).
    *   Implements model-level business logic like password hashing (`User.hooks.beforeCreate/beforeUpdate`, `User.prototype.isPasswordMatch`).
    *   Uses UUIDs for primary keys for better scalability and security.
*   **`migrations/`:** Contains database migration scripts (generated via `sequelize-cli`) to manage schema changes.
*   **`seeders/`:** Contains scripts to populate the database with initial data (e.g., admin user, sample projects/tasks).
*   **Query Optimization:** Sequelize allows for eager loading (`include`), lazy loading, and fine-grained control over queries to optimize database interactions. Indexes are defined in migrations.

#### 2.2.4 `middleware/`

*   **`auth.middleware.js`:** JWT authentication and role-based authorization (RBAC). Verifies tokens, attaches user to `req.user`, and checks if the user's role meets `requiredRoles`.
*   **`error.middleware.js`:** Centralized error handling. Converts non-`ApiError` errors into `ApiError` instances and sends a standardized JSON error response. Differentiates between operational and programming errors.
*   **`logger.middleware.js`:** Integrates `morgan` (HTTP request logger) with `winston` for consistent logging.
*   **`rateLimit.middleware.js`:** Uses `express-rate-limit` to protect against brute-force attacks and resource exhaustion.
*   **`validate.middleware.js`:** Custom middleware to validate request bodies, query parameters, and path parameters against Joi schemas.

#### 2.2.5 `routes/`

*   Defines API endpoint paths and maps them to controllers.
*   Uses Express Routers for modularity (e.g., `auth.routes.js`, `user.routes.js`).
*   Middleware (auth, validation) is applied at the route level.
*   Demonstrates nested routes for resources (e.g., tasks under projects).

#### 2.2.6 `controllers/`

*   **Purpose:** Handle incoming HTTP requests, extract parameters, call appropriate services, and send HTTP responses.
*   They act as an interface between the HTTP layer and the business logic layer (services).
*   Controllers are kept thin ("fat model, thin controller" or "fat service, thin controller") by delegating complex logic to services.
*   Utilizes `catchAsync` utility to wrap asynchronous route handlers, automatically passing errors to the error handling middleware.

#### 2.2.7 `services/` (Business Logic Layer)

*   **Purpose:** Encapsulate business logic and interact directly with database models.
*   Provides a clean API for controllers, abstracting database operations.
*   **Examples:** `auth.service.js` (login, token generation), `user.service.js` (user CRUD), `project.service.js` (project CRUD with caching logic), `task.service.js` (task CRUD with caching logic).
*   **Caching Integration:** Services interact with Redis (`getRedisClient`) for caching frequently accessed data (e.g., `getProjectById`). This improves read performance and reduces database load. Invalidation logic is also handled here.

#### 2.2.8 `utils/`

*   **`ApiError.js`:** Custom error class extending `Error` to standardize API errors with `statusCode` and `isOperational` flags.
*   **`catchAsync.js`:** A higher-order function to simplify error handling in async Express route handlers.
*   **`jwt.utils.js` (now `token.service.js`):** Functions for generating and verifying JWTs.
*   **`pick.js`:** A utility to select specific properties from an object, useful for filtering request query parameters.
*   **`hash.utils.js` (not directly used but for common hashing needs):** For password hashing using `bcryptjs`. (Password hashing is handled in the `User` model hooks in this implementation).

#### 2.2.9 `validators/`

*   **Purpose:** Define request validation schemas using `Joi`.
*   Ensures that incoming data conforms to expected types, formats, and constraints before reaching the business logic.
*   Includes `custom.validation.js` for custom validation rules (e.g., strong password, UUID format).

### 2.3 Redis

*   **Purpose:** High-performance in-memory data store used for:
    *   **Refresh Token Management:** Storing and invalidating refresh tokens to enhance security.
    *   **Caching:** Caching individual `Project` and `Task` objects to reduce database load and improve response times for read operations.
*   **Implementation:** Configured in `config/redis.config.js`, accessed via `getRedisClient()`.

### 2.4 Docker and Docker Compose

*   **Dockerfiles (`backend/Dockerfile`, `frontend/Dockerfile`):** Define how to build container images for the backend (Node.js) and frontend (Nginx serving React build).
*   **`docker-compose.yml`:** Orchestrates the multi-service application.
    *   Defines `db` (PostgreSQL), `redis`, `backend`, and `frontend` services.
    *   Handles environment variables, port mappings, volume mounts (for persistence and hot-reloading), and service dependencies.
    *   `healthcheck` definitions ensure services are ready before dependent services start.
    *   Backend automatically runs migrations and seeds on startup for local development.

## 3. Core Principles & Design Choices

*   **Separation of Concerns:** Each layer (routing, validation, controller, service, model) has a distinct responsibility. This improves maintainability, testability, and scalability.
*   **Clean Code & Readability:** Adherence to ESLint rules, meaningful variable names, and clear function definitions.
*   **Robust Error Handling:** Centralized error handling using `ApiError` provides consistent error responses and better debugging.
*   **Security First:**
    *   JWT for stateless authentication.
    *   Refresh tokens stored securely in Redis.
    *   `bcrypt` for password hashing.
    *   `helmet`, `xss-clean` middleware for HTTP security.
    *   Rate limiting to prevent abuse.
    *   Role-Based Access Control (RBAC) implemented in `auth.middleware.js` and controllers.
*   **Scalability & Performance:**
    *   Leveraging Node.js's non-blocking I/O.
    *   PostgreSQL with Sequelize for robust database operations and potential for horizontal scaling.
    *   Redis for caching to offload database reads.
    *   Containerization with Docker facilitates easy scaling of services.
*   **Testability:** Clear module boundaries and dependency injection (implicit via service imports) make components easy to unit test. Mocking capabilities for external dependencies (DB, Redis) are considered.
*   **Observability:** Structured logging with Winston and HTTP request logging with Morgan.
*   **Configuration Management:** Use of `.env` files and a centralized `config` module makes the application adaptable to different environments.
*   **ALX SE Precourse Alignment:** The project emphasizes structured programming logic, algorithmic thinking (e.g., pagination, filtering, authorization logic), and technical problem-solving through robust error handling, testing, and modular design.
```