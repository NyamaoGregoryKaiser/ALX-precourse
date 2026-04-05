```markdown
# Task Management System - Architecture Document

This document outlines the architecture of the Task Management System, a secure C++ backend API.

## 1. High-Level Architecture

The system follows a typical layered architecture pattern, designed for maintainability, scalability, and security. It is a monolithic application deployed within a Docker container, providing a RESTful API interface.

```
+-------------------+      +-----------------+
|     Clients       |----->|   Load Balancer | (Optional, for scaling)
| (Web UI, Mobile,  |<-----| / Reverse Proxy |
|     CLI, etc.)    |      +--------+--------+
+-------------------+               |
                                    v
+-----------------------------------+-----------------------------------+
|               API Gateway / Backend Service (C++ Crow)                |
|                                                                       |
|  +---------------------+                                              |
|  | Request Flow        |                                              |
|  |                     |                                              |
|  | 1. HTTP Request     |                                              |
|  | 2. Rate Limiting    |                                              |
|  | 3. Authentication   |                                              |
|  | 4. Authorization    |                                              |
|  | 5. Endpoint Routing |                                              |
|  | 6. Input Validation |                                              |
|  | 7. Business Logic   |                                              |
|  | 8. Database Access  |<----------------+----------------+           |
|  | 9. Response         |                 |                |           |
|  |                     |        +--------+-------+  +-----+------+   |
|  | 10. Error Handling  |        |  Caching Service |  |  Logging   |   |
|  +---------------------+        +------------------+  +------------+   |
|                                         ^                       ^        |
|                                         |                       |        |
|  +--------------------------------------+-----------------------+----+  |
|  |                         Internal Services / Layers                 |  |
|  |                                                                    |  |
|  |  +------------+  +--------------+  +-----------+  +-------------+ |  |
|  |  | Controllers|->|   Services   |->|  Models   |->|  Database   | |  |
|  |  | (API Endpoints)|  (Business Logic)|  (Data Access)| (SQLite3)   | |  |
|  |  +------------+  +--------------+  +-----------+  +-------------+ |  |
|  |          ^                                                        |  |
|  |          |                                                        |  |
|  |  +-------+---------+                                              |  |
|  |  |   Middleware    | (Auth, Rate Limit, Error Handler)            |  |
|  |  +-----------------+                                              |  |
|  +--------------------------------------------------------------------+  |
+---------------------------------------------------------------------------+
```

## 2. Core Components

### 2.1. C++ Backend (Crow Framework)

The heart of the system, implementing all business logic and API endpoints.

*   **`main.cpp`:** The application entry point. Initializes the Crow app, loads configuration, sets up logging, registers middleware, and defines routes.
*   **`config/`:** Manages environment-based configuration using `Config.hpp/.cpp`. It reads `.env` variables to configure the application's runtime behavior.
*   **`logger/`:** Provides a centralized logging utility using `spdlog`, allowing structured and configurable logging to console and file.
*   **`middleware/`:** A crucial layer for security and cross-cutting concerns.
    *   **`ErrorHandlerMiddleware`:** Catches exceptions from controllers and services, converting them into standardized JSON error responses. Prevents sensitive information leakage.
    *   **`RateLimitMiddleware`:** Protects endpoints from abuse by limiting the number of requests per IP address within a given time window.
    *   **`AuthMiddleware`:** Validates JWTs, extracts user information (ID, role), and attaches it to the request context. Also performs basic role-based access checks.
*   **`controllers/`:** Defines the API endpoints (`/auth`, `/api/v1/users`, `/api/v1/tasks`). Each controller handles parsing request data, delegating to services for business logic, and formatting responses.
*   **`services/`:** Contains the core business logic.
    *   **`AuthService`:** Handles user registration, login, password validation, and interaction with `JwtManager`.
    *   **`UserService`:** Manages CRUD operations for users, including password updates.
    *   **`TaskService`:** Manages CRUD operations for tasks, including ownership and status updates.
    *   **`CacheService`:** An in-memory cache for frequently accessed data with TTL.
*   **`models/`:** Represents data structures (User, Task) and provides direct interaction with the database. These are essentially repositories or DAOs (Data Access Objects).
*   **`auth/JwtManager.hpp/.cpp`:** Encapsulates JWT creation, parsing, and validation logic, including token signing and verification using HMAC-SHA256.
*   **`utils/CryptoUtils.hpp/.cpp`:** Provides cryptographic utilities, primarily for password hashing (SHA256 with salt) and random salt generation.

### 2.2. Database Layer (SQLite3)

*   **`database/Database.hpp/.cpp`:** A wrapper around the SQLite3 C API, providing a simplified interface for executing SQL queries and managing connections. Uses parameterized queries to prevent SQL injection.
*   **`db/schema.sql`:** Defines the table structures (`users`, `tasks`) and indexes.
*   **`db/seed.sql`:** Contains initial data to populate the database (e.g., default admin user).
*   **`db/migrations.sh`:** A shell script to apply `schema.sql` and `seed.sql`, ensuring the database is initialized correctly on startup or deployment.

## 3. Data Flow Example: User Login

1.  **Client Request:** A client sends a `POST /auth/login` request with `username` and `password`.
2.  **Crow App:** The Crow framework receives the request.
3.  **Rate Limiting Middleware:** `RateLimitMiddleware` checks the client's IP against rate limits. If exceeded, returns `429 Too Many Requests`.
4.  **Endpoint Routing:** The request is routed to `AuthController::login`.
5.  **Input Validation:** `AuthController` validates the JSON payload (presence of username/password).
6.  **Auth Service:** `AuthController` calls `AuthService::loginUser`.
7.  **User Model:** `AuthService` queries `User::findByUsername` to retrieve the user's stored hash and salt.
8.  **Crypto Utils:** `AuthService` uses `CryptoUtils::verifyPassword` to compare the provided password with the stored hash.
9.  **JWT Manager:** If credentials are valid, `AuthService` calls `JwtManager::createToken` to generate a new JWT with user ID and role.
10. **Response:** `AuthController` sends back a `200 OK` response containing the JWT and user details.

## 4. Data Flow Example: Accessing a Protected Endpoint (`GET /api/v1/tasks`)

1.  **Client Request:** A client sends a `GET /api/v1/tasks` request with `Authorization: Bearer <JWT>`.
2.  **Crow App:** The Crow framework receives the request.
3.  **Rate Limiting Middleware:** `RateLimitMiddleware` checks the client's IP.
4.  **Auth Middleware:** `AuthMiddleware` intercepts the request:
    *   Extracts the JWT from the `Authorization` header.
    *   Calls `JwtManager::verifyToken` to validate the token's signature, expiry, and integrity.
    *   If valid, it extracts `user_id` and `role` from the token and attaches them to the request context.
    *   If invalid/missing, it returns `401 Unauthorized`.
5.  **Authorization Check (Middleware/Controller):** The `AuthMiddleware` (or the `TaskController` itself for finer-grained checks) then checks if the user's role permits access to this endpoint. For `GET /api/v1/tasks?all=true`, it specifically checks for `admin` role.
6.  **Endpoint Routing:** The request is routed to `TaskController::getTasks`.
7.  **Task Service:** `TaskController` calls `TaskService::getTasks` (passing the authenticated `user_id` and `role`).
8.  **Task Model:** `TaskService` queries the `tasks` table using `Task::findByUserId` or `Task::findAll` based on authorization.
9.  **Response:** `TaskController` returns `200 OK` with the list of tasks.
10. **Error Handling Middleware:** If any error occurs during this flow (e.g., database error, invalid task ID), the `ErrorHandlerMiddleware` catches it and returns a structured error response.

## 5. Security Considerations in Architecture

*   **Layered Security:** Security measures are applied at multiple layers:
    *   **Network (Conceptual):** External reverse proxy/load balancer for HTTPS termination, WAF.
    *   **API Gateway/Framework:** Rate limiting, authentication, authorization.
    *   **Business Logic:** Input validation, access control checks.
    *   **Data Layer:** Parameterized queries, secure password storage.
*   **Principle of Least Privilege:** Users are granted only the necessary permissions (e.g., `user` vs. `admin` roles). Database connections use minimal privileges where possible (conceptual for SQLite, more relevant for external DBs).
*   **Secure Defaults:** Configuration uses environment variables, avoiding hardcoded secrets. Log levels are configurable.
*   **Failure Modes:** Centralized error handling prevents information leakage on errors.
*   **Modularity:** Separating concerns (AuthService, JwtManager, CryptoUtils) makes security components easier to audit and maintain.

## 6. Deployment Architecture

The application is designed for containerized deployment using Docker.

*   **Docker Container:** The C++ application runs inside a lightweight Docker container.
*   **Docker Compose:** Used for local development and managing the application container, including persistent volumes for database and logs, and environment variable injection.
*   **Reverse Proxy (Production):** In production, it's recommended to place a reverse proxy (e.g., Nginx, Envoy) in front of the C++ application. This handles:
    *   SSL/TLS termination (HTTPS).
    *   Load balancing across multiple instances of the C++ app.
    *   Advanced rate limiting and WAF capabilities.
    *   Request logging.
*   **External Database (Scaling):** While SQLite is used for simplicity, for production scale, an external database like PostgreSQL or MySQL would be used, managed separately from the application containers.
*   **CI/CD:** Automated build, test, and deployment using tools like GitHub Actions ensures consistent and reliable releases.

This architectural overview provides a solid foundation for understanding the system's design and how its components work together to deliver a secure and robust Task Management API.
```