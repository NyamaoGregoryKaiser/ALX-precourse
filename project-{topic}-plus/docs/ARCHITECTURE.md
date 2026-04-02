```markdown
# Architecture Documentation - Task Management System

This document describes the architectural design and components of the C++ Task Management System.

## 1. Overview

The Task Management System is a backend application built with C++17, following a modular, layered architecture pattern. It exposes a RESTful API to manage users, projects, and tasks. The system is designed for scalability, maintainability, and robustness, incorporating common enterprise-grade features.

## 2. Layered Architecture

The system is structured into several logical layers, each with distinct responsibilities:

### (a) Presentation Layer (Controllers)
*   **Components**: `AuthController`, `UserController`, `ProjectController`, `TaskController`
*   **Responsibility**:
    *   Handle incoming HTTP requests.
    *   Parse request bodies (JSON) and URL parameters.
    *   Delegate business logic to the `Service Layer`.
    *   Format responses (JSON) and set appropriate HTTP status codes.
    *   Catch and handle exceptions, translating them into standardized API error responses.
*   **Dependencies**: Depends on `Service Layer` and `Middleware`.

### (b) Application Layer (Middleware)
*   **Components**: `ErrorHandlingMiddleware`, `AuthMiddleware`, `RateLimitingMiddleware`
*   **Responsibility**:
    *   **Error Handling**: Catches exceptions thrown by lower layers and converts them into consistent HTTP error responses.
    *   **Authentication & Authorization**: Validates JWT tokens, extracts user identity, and determines access rights for protected routes. Populates user context for controllers.
    *   **Rate Limiting**: Throttles requests based on IP address to prevent abuse and ensure fair usage.
*   **Dependencies**: Depends on `Service Layer` (for user data in AuthMiddleware) and `Configuration`.

### (c) Business Logic Layer (Services)
*   **Components**: `AuthService`, `UserService`, `ProjectService`, `TaskService`
*   **Responsibility**:
    *   Implement core business logic and rules.
    *   Perform data validation.
    *   Orchestrate operations involving multiple data entities.
    *   Interact with the `Database Layer` and `Caching Layer`.
*   **Dependencies**: Depends on `Database Layer`, `Caching Layer`, `Utility Layer`, and `Configuration`. Services can also depend on other services (e.g., `AuthService` depends on `UserService`).

### (d) Data Access Layer (Database & Models)
*   **Components**: `Database`, `User`, `Project`, `Task`, `BaseModels`
*   **Responsibility**:
    *   `Database`: Provides an abstraction for interacting with the SQLite database (connection management, executing SQL, prepared statements, transactions).
    *   `Models`: Define the structure of data entities (e.g., `User`, `Project`, `Task`) and provide methods for serialization/deserialization to/from JSON and database rows.
*   **Dependencies**: Depends on `SQLite3` library directly or via a wrapper.

### (e) Infrastructure/Utility Layer
*   **Components**: `AppConfig`, `Logger`, `JWTUtils`, `StringUtil`, `TimeUtil`, `CustomExceptions`
*   **Responsibility**:
    *   `AppConfig`: Manages application-wide configuration loaded from `.env` files.
    *   `Logger`: Provides structured and configurable logging capabilities using `spdlog`.
    *   `JWTUtils`: Handles creation and verification of JSON Web Tokens.
    *   `StringUtil`, `TimeUtil`: Helper functions for string manipulation and time operations.
    *   `CustomExceptions`: Defines a hierarchy of custom exception classes for standardized error reporting.
*   **Dependencies**: Generally minimal, primarily standard C++ libraries or dedicated small libraries.

### (f) Caching Layer
*   **Components**: `Cache`
*   **Responsibility**:
    *   Provides an in-memory key-value store for frequently accessed data to reduce database load and improve response times.
    *   Implements Time-To-Live (TTL) based eviction.
*   **Dependencies**: Depends on `Utility Layer` (Logger) and `Configuration`.

## 3. Key Components and Technologies

*   **Crow C++ Microframework**: Used for building the RESTful API endpoints, handling HTTP requests, routing, and responses. Its lightweight nature makes it suitable for C++ backends.
*   **SQLite3**: An embedded, file-based relational database. Chosen for its simplicity, ease of setup, and lack of external server requirements, making it ideal for self-contained applications and testing environments.
*   **nlohmann/json**: A header-only C++ library for JSON. Essential for serializing/deserializing data between C++ objects and JSON for API requests/responses.
*   **spdlog**: A fast, header-only C++ logging library. Provides flexible logging to console and rotating files with configurable levels.
*   **CMake**: The build system generator. Manages project compilation, links libraries, and fetches external dependencies (Crow, nlohmann/json, spdlog, Google Test).
*   **JWT (JSON Web Tokens)**: Used for stateless authentication. Tokens are signed with a secret key and contain claims about the authenticated user.
*   **Docker**: For containerizing the application, providing consistent development and deployment environments.
*   **Google Test**: A robust testing framework used for unit and integration tests, ensuring code quality and correctness.

## 4. Data Flow (Example: Creating a Project)

1.  **Client Request**: A client sends a `POST /projects` request with a JSON body and a JWT in the `Authorization` header.
2.  **Crow App**: The `crow::App` receives the HTTP request.
3.  **RateLimitingMiddleware**: Checks if the client's IP has exceeded the allowed request rate. If so, returns `429 Too Many Requests`.
4.  **AuthMiddleware**:
    *   Extracts the JWT from the `Authorization` header.
    *   Calls `AuthService::authenticateToken` to verify the token's signature and expiration using `JWTUtils`.
    *   If valid, extracts `user_id`, `username`, `role` from the token's payload and populates the `crow::context` for the route handler.
    *   If invalid/missing, the context will indicate `is_authenticated=false`.
5.  **ErrorHandlingMiddleware**: Wraps the entire process in a `try-catch` block to handle any exceptions thrown by subsequent layers.
6.  **ProjectController**:
    *   Receives the request. Checks `ctx.is_authenticated`. If false, throws `UnauthorizedException`.
    *   Parses the request body into a `nlohmann::json` object.
    *   Constructs a `Models::Project` object from the JSON. Sets `owner_id` from the authenticated user's `ctx.user_id`.
    *   Calls `ProjectService::createProject`.
7.  **ProjectService**:
    *   Performs business validation (e.g., `name` is not empty).
    *   Constructs an SQL `INSERT` statement and parameters.
    *   Calls `Database::preparedExecute` to insert the project into the database.
    *   Calls `Database::getLastInsertRowId` to get the new project's ID.
    *   Returns the created `Models::Project` object.
8.  **ProjectController**:
    *   Receives the created project.
    *   Serializes the `Models::Project` object to JSON.
    *   Creates a `crow::response` with `201 Created` status and the JSON body.
9.  **Crow App**: Sends the response back to the client.

## 5. Security Considerations

*   **Password Hashing**: Passwords are never stored in plain text. `StringUtil::hashPassword` is a placeholder for a robust Key Derivation Function (KDF) like Argon2, bcrypt, or scrypt.
*   **JWT Secret**: The `JWT_SECRET` must be a long, complex, and securely stored secret. The `.env.example` explicitly warns about using the default.
*   **HTTPS**: For production, the API should always be served over HTTPS to protect against Man-in-the-Middle attacks. This usually involves a reverse proxy (Nginx, Caddy) in front of the C++ application.
*   **Input Validation**: All incoming API data is validated at the `Service Layer` to prevent common vulnerabilities like SQL injection (handled by prepared statements in `Database` layer) and other data integrity issues.
*   **Authorization Checks**: Comprehensive checks are performed in `Controller` and `Service` layers to ensure users only access resources they are permitted to.
*   **Rate Limiting**: Mitigates brute-force attacks and resource exhaustion.
*   **Logging**: Detailed logging helps in detecting and troubleshooting security incidents.

## 6. Scalability and Performance

*   **Multithreading**: Crow applications can be configured to run with multiple threads (`.multithreaded()`), leveraging multi-core CPUs.
*   **Database**: SQLite is suitable for small to medium-sized applications or as an embedded solution. For high-traffic, large-scale deployments, migrating to a client-server database (PostgreSQL, MySQL) would be necessary. The `Database` interface is designed to make such a migration easier.
*   **Caching**: The in-memory `Cache` reduces database load for frequently accessed read operations. For distributed or larger caches, external solutions like Redis would be integrated.
*   **Statelessness**: JWT-based authentication makes the API stateless, simplifying horizontal scaling by allowing any server instance to handle any request.
*   **Load Balancing**: The application is designed to be easily deployed behind a load balancer for horizontal scaling.

## 7. Future Enhancements

*   **Database Migration Tool**: Implement a dedicated migration tool (e.g., custom C++ tool, Flyway, Alembic) for more robust schema management.
*   **Container Orchestration**: Integrate with Kubernetes or similar platforms for advanced deployment, scaling, and management.
*   **Asynchronous Operations**: Explore C++ asynchronous programming models for blocking I/O (e.g., database calls) to further improve server concurrency.
*   **OpenAPI/Swagger**: Generate API documentation automatically using tools like OpenAPI.
*   **Advanced Caching**: Replace the simple in-memory cache with a distributed caching system like Redis.
*   **Background Jobs**: For long-running or resource-intensive tasks, implement a background job processing system.
*   **Environment-specific Configuration**: More sophisticated configuration management for different environments (dev, test, prod).

---
```