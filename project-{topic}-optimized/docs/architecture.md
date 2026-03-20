# Architecture Documentation - Mobile App Backend System

This document outlines the architecture of the Task Management Mobile Backend System, detailing its components, their interactions, and the design principles adopted.

## 1. High-Level Architecture Overview

The system follows a layered, modular architecture, commonly seen in modern backend applications. It's designed to be scalable, maintainable, and robust.

```
+------------------+
|   Mobile Client  |
+------------------+
        | HTTP/S
        v
+------------------------------------------------------------------------------------------------------------------+
|                                              Node.js / Express Backend                                           |
| +--------------------------------------------------------------------------------------------------------------+ |
| |       Load Balancer / API Gateway (e.g., Nginx, AWS ALB)                                                     | |
| +--------------------------------------------------------------------------------------------------------------+ |
|                                                      |                                                           |
| +---------------------+  +---------------------+  +---------------------+  +---------------------+            |
| |  Rate Limiting      |  |  Security (Helmet)  |  |  CORS               |  |  Logging (Morgan)   |            |
| +---------------------+  +---------------------+  +---------------------+  +---------------------+            |
|                                                      | Middleware Chain                                          |
| +--------------------------------------------------------------------------------------------------------------+ |
| | Authentication (JWT) -> Authorization (RBAC) -> Validation (Joi) -> Route Handlers (Controllers)             | |
| +--------------------------------------------------------------------------------------------------------------+ |
|                                                      |                                                           |
|                       +-----------------------------------------------------------------------------------------+
|                       |                                                                                         |
|                       v                                                                                         v
|   +-------------------+--------------------+     +-------------------+--------------------+                    |
|   |                  Controllers           |     |                  Services                |                    |
|   | - Handle HTTP Requests                 |     | - Implement Business Logic             |                    |
|   | - Call appropriate services            |     | - Orchestrate data operations          |                    |
|   | - Format responses                     |     | - Interact with Caching & Database     |                    |
|   +----------------------------------------+     +----------------------------------------+                    |
|                       |                                     ^                                                     |
|                       |                                     |                                                     |
|                       +-------------------------------------+----------------------------------------------------+
|                                                             |                                                     |
|                                         +-------------------+-------------------+                               |
|                                         |                     Utilities         |                               |
|                                         | - JWT Handling                        |                               |
|                                         | - Password Hashing (Bcrypt)           |                               |
|                                         | - Logging (Winston)                   |                               |
|                                         +---------------------------------------+                               |
|                                                             |                                                     |
|           +---------------------------------------------------+---------------------------------------------------+
|           |                                                                                                       |
|           v                                                                                                       v
|   +---------------------+                        +---------------------+                                        |
|   |   Caching Layer     |                        |   Database Layer    |                                        |
|   |   (Redis)           |                        |   (PostgreSQL + Prisma)   |                                        |
|   | - Session/Token Mgmt|                        | - Schema Management     |                                        |
|   | - Data Caching      |                        | - Querying              |                                        |
|   +---------------------+                        | - Migrations            |                                        |
|                                                +---------------------+                                        |
+------------------------------------------------------------------------------------------------------------------+
```

## 2. Core Components and Their Responsibilities

### a. API Gateway / Load Balancer (Conceptual)
*   **Purpose**: Distributes incoming API requests across multiple backend instances, handles SSL termination, and provides an initial layer of security/routing.
*   **Technology**: Nginx, AWS ALB, Cloudflare (not implemented in code, but crucial for production).

### b. Node.js / Express Backend
The core application is built with Node.js and the Express.js framework.

*   **`src/server.js`**: The entry point of the application. It initializes the Express app, connects to the database (Prisma) and Redis, and starts the HTTP server. It also handles graceful shutdown.
*   **`src/app.js`**: Configures the Express application. This includes:
    *   **Global Middlewares**: `helmet` (security headers), `cors` (cross-origin resource sharing), `compression` (gzip compression), `express.json()`/`express.urlencoded()` (body parsing).
    *   **Application-Specific Middlewares**:
        *   `rateLimit.middleware.js`: Limits repeated requests to public APIs.
        *   `logger.middleware.js`: Logs HTTP requests using Morgan for auditing and debugging.
    *   **Route Registration**: Mounts API routes.
    *   **Error Handling**: Catches 404 errors and forwards them to a centralized error handler (`error.middleware.js`).

### c. Middlewares (`src/middlewares/`)
These are functions that execute in the request-response cycle.

*   **`auth.middleware.js`**:
    *   `authenticate`: Verifies JWT tokens, extracts user ID and role, and attaches user info to `req.user`.
    *   `authorize`: Checks if the authenticated user's role has the necessary permissions for the requested action (Role-Based Access Control - RBAC).
*   **`error.middleware.js`**: A centralized error handling middleware that catches all errors, formats them consistently, and sends appropriate HTTP responses (e.g., 400, 401, 403, 404, 500). It logs detailed errors using Winston.
*   **`rateLimit.middleware.js`**: Prevents brute-force attacks and abuse by limiting the number of requests a user can make within a specified timeframe.
*   **`logger.middleware.js`**: Integrates Morgan with Winston for structured HTTP request logging.

### d. Controllers (`src/controllers/`)
*   **Responsibility**: Handle incoming HTTP requests, parse request data (params, query, body), delegate business logic to services, and construct HTTP responses.
*   **Characteristics**: Controllers are kept thin; they primarily coordinate between the request layer and the service layer.
*   **Validation**: Uses `src/utils/validation.js` to validate incoming request payloads.

### e. Services (`src/services/`)
*   **Responsibility**: Encapsulate the application's business logic. They interact with the database (via Prisma) and caching layer (Redis) to perform data operations and enforce business rules.
*   **Characteristics**: Services are reusable and independent of the HTTP context, making them easily testable.
*   **Examples**: `auth.service.js` (user registration/login), `user.service.js` (user CRUD), `project.service.js` (project CRUD), `task.service.js` (task CRUD).
*   **Caching Integration**: `cache.service.js` provides an interface to Redis for `get`, `set`, and `delete` operations, used by other services to manage cached data.

### f. Utilities (`src/utils/`)
Helper functions used across different parts of the application.

*   **`bcrypt.util.js`**: Handles password hashing and comparison using `bcryptjs`.
*   **`jwt.util.js`**: Manages JWT token generation and verification.
*   **`logger.js`**: Configures Winston for structured logging throughout the application.
*   **`validation.js`**: Defines Joi schemas for input validation and provides a generic validation middleware.

### g. Database Layer (PostgreSQL with Prisma)
*   **`prisma/schema.prisma`**: Defines the application's data model, including tables (User, Project, Task), fields, relationships, and enums.
*   **Prisma Client**: Automatically generated based on `schema.prisma`, providing a type-safe API for database interactions.
*   **Migrations**: Prisma Migrate manages database schema changes (e.g., `npx prisma migrate dev`).
*   **`seed.js`**: Populates the database with initial data for development and testing.

### h. Caching Layer (Redis)
*   **`src/services/cache.service.js`**: Provides an abstraction over the Redis client. It handles connecting to Redis, getting/setting/deleting cached data, and invalidating cache entries by key or pattern.
*   **Purpose**: Improves API response times and reduces database load by storing frequently accessed data (e.g., project details, user profiles).

## 3. Data Flow

1.  **Client Request**: A mobile client sends an HTTP request to the API (e.g., `POST /api/v1/auth/login`).
2.  **Middleware Chain**: The request passes through global middlewares (security, CORS, body parsing, logging, rate limiting).
3.  **Authentication/Authorization**: If the route requires it, `auth.middleware.js` authenticates the user via JWT and authorizes based on their role.
4.  **Validation**: `validation.js` checks the request body against a Joi schema.
5.  **Controller**: The appropriate controller function receives the request, extracts data, and calls a service.
6.  **Service**: The service executes business logic.
    *   It might first check the **Redis cache** (`cache.service.js`) for the requested data.
    *   If not found in cache, it interacts with the **PostgreSQL database** via Prisma Client to fetch or modify data.
    *   After fetching/modifying, it may update or invalidate the Redis cache.
7.  **Response**: The service returns data to the controller, which formats it into an HTTP response and sends it back to the client.
8.  **Error Handling**: Any errors at any stage are caught by `error.middleware.js`, logged, and returned as a standardized error response.

## 4. Scalability Considerations

*   **Stateless Backend**: The use of JWTs makes the backend stateless, allowing for easy horizontal scaling of Node.js instances behind a load balancer.
*   **Database (PostgreSQL)**: Can be scaled vertically (more powerful server) or horizontally (read replicas, sharding, though more complex). Prisma supports connection pooling for efficient database connections.
*   **Caching (Redis)**: Offloads read requests from the database, significantly improving performance for frequently accessed data. Redis itself can be clustered for high availability and scalability.
*   **Modularity**: The clear separation of concerns (controllers, services, utilities) facilitates independent development, testing, and scaling of specific features.
*   **Dockerization**: Allows for consistent deployment across various environments, from development to production, and integrates well with container orchestration platforms like Kubernetes.

## 5. Security Aspects

*   **JWT Authentication**: Securely authenticates users with signed tokens.
*   **Role-Based Authorization**: Ensures users only access resources and perform actions they are permitted to.
*   **Password Hashing**: Passwords are never stored in plain text, always hashed with `bcryptjs`.
*   **Input Validation**: Prevents common vulnerabilities like SQL injection (handled by Prisma ORM) and XSS (if outputs are properly escaped on frontend, or if rich text inputs are sanitized server-side).
*   **Helmet**: Sets various HTTP headers to enhance security (e.g., `X-XSS-Protection`, `Strict-Transport-Security`).
*   **CORS**: Configured to allow requests from specified origins.
*   **Rate Limiting**: Protects against denial-of-service attacks and brute-force login attempts.
*   **Environment Variables**: Sensitive configuration details are loaded from environment variables, not hardcoded.

## 6. Development & Operations

*   **Docker Compose**: Provides a local development environment with `app`, `db`, and `redis` services pre-configured.
*   **Prisma Studio**: `npx prisma studio` offers a GUI to inspect and manage database data during development.
*   **Comprehensive Testing**: Unit, Integration, and API tests ensure code quality and prevent regressions.
*   **Structured Logging**: Aids in debugging, monitoring, and auditing application behavior.
*   **CI/CD**: Automates the build, test, and potentially deployment process, ensuring consistent and rapid delivery.

This architecture provides a solid foundation for a production-ready mobile app backend, emphasizing a balance between performance, security, and developer experience.
```

#### `docs/deployment.md`

```markdown