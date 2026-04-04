# Task Manager System - Architecture Documentation

## 1. High-Level Overview

The Task Manager System is designed as a RESTful API backend, implemented in C++, serving as the core logic and data provider for a potential frontend client (web, mobile, or desktop). It follows a modular, layered architecture to ensure separation of concerns, maintainability, and scalability.

```
+-------------------+       +--------------------+       +---------------------+
|   Client (Browser/Mobile)  |  (HTTPS/REST API)  |    Application Server     |
| (Conceptual, not implemented) |----------------->|       (C++ Crow App)      |
+-------------------+       |                    |                           |
                            | Authentication & Authorization Middleware      |
                            | (JWT Validation, Role Checks, Rate Limiting)   |
                            |                                                |
                            | Error Handling & Logging Middleware            |
                            |                                                |
                            | Routes/API Endpoints                           |
                            |   - /auth/*                                    |
                            |   - /users/* (CRUD)                            |
                            |   - /tasks/* (CRUD)                            |
                            |                                                |
                            | Services Layer                                 |
                            |   - UserService (Business Logic for Users)     |
                            |   - TaskService (Business Logic for Tasks)     |
                            |   - AuthService (Business Logic for Auth)      |
                            |                                                |
                            | Repository Layer                               |
                            |   - UserRepository (DB Interaction for Users)  |
                            |   - TaskRepository (DB Interaction for Tasks)  |
                            |                                                |
                            | Utilities (Hashing, Cache, Logger, UUID)       |
                            +--------------------+-------------------------+
                                                 |
                                                 | (SQLite3 C++ Bindings)
                                                 v
                                        +---------------------+
                                        |   Database (SQLite)   |
                                        |   - users table       |
                                        |   - tasks table       |
                                        |   - schema_migrations |
                                        +---------------------+
```

## 2. Layered Architecture

The application is structured into distinct layers to manage complexity and promote modularity.

### 2.1. API/Controller Layer (`src/{module}Controller.h/.cpp`)

*   **Responsibility:** Handles HTTP requests, parses incoming data, calls the appropriate service layer method, and formats the HTTP response.
*   **Technologies:** `Crow` C++ web microframework, `jsoncpp` for JSON parsing/serialization.
*   **Security:** This layer integrates with middleware for authentication, authorization, and rate limiting *before* business logic is executed. It also translates application-specific exceptions into standard HTTP error responses.
*   **Example:** `AuthController`, `UserController`, `TaskController`.

### 2.2. Middleware Layer (`src/middleware/`, `src/auth/AuthMiddleware.h/.cpp`)

*   **Responsibility:** Intercepts requests and responses to perform cross-cutting concerns such as logging, authentication, authorization, rate limiting, and global error handling.
*   **Technologies:** `Crow` middleware features, custom C++ logic.
*   **Security:**
    *   `AuthMiddleware`: Validates JWT tokens, extracts user identity and roles, and enforces access control on protected routes.
    *   `LogMiddleware`: Logs incoming requests and outgoing responses.
    *   `RateLimiter`: Controls the number of requests a client can make within a time window.
    *   `ErrorMiddleware`: Catches exceptions and formats consistent JSON error responses.

### 2.3. Service Layer (`src/{module}Service.h/.cpp`)

*   **Responsibility:** Contains the core business logic of the application. It orchestrates operations, applies business rules, and interacts with the repository layer.
*   **Technologies:** Pure C++ logic.
*   **Security:** Performs input validation beyond basic syntax checks, implements authorization checks based on user roles (passed from AuthMiddleware), and handles business-level exceptions.
*   **Example:** `AuthService`, `UserService`, `TaskService`.

### 2.4. Repository Layer (`src/{module}Repository.h/.cpp`)

*   **Responsibility:** Abstracts the data storage details. It handles all interactions with the database (CRUD operations) and maps database results to application-specific models.
*   **Technologies:** `SQLite3` C++ API.
*   **Security:** Uses parameterized queries (`sqlite3_bind_text`) to prevent SQL injection vulnerabilities.

### 2.5. Database Layer (`src/database/`)

*   **Responsibility:** Manages the database connection, executes SQL queries, and handles transactions.
*   **Technologies:** `SQLite3`.
*   **Features:**
    *   `SQLiteManager`: Handles connection pooling (though for SQLite, it's a single connection with mutex for thread safety), query execution, and error handling.
    *   `MigrationManager`: Manages schema evolution and initial data seeding.

## 3. Core Components and Utilities

### 3.1. Models (`src/models/`)

*   Simple C++ structs/classes representing the core entities of the application (e.g., `User`, `Task`). They are typically plain data structures with minimal logic.

### 3.2. Data Transfer Objects (DTOs) (`src/dto/`)

*   Structs/classes used to define the shape of data exchanged between the client and the server (request and response bodies). They help in validation and clear API contracts.

### 3.3. Configuration (`src/config/`)

*   `Config` class loads settings from `config.json` (or environment variables) providing centralized access to application parameters (e.g., database path, JWT secret, API port).

### 3.4. Logging (`src/utils/Logger.h/.cpp`)

*   A wrapper around `spdlog` for structured logging. It provides different logging levels (DEBUG, INFO, WARN, ERROR, CRITICAL) and outputs to both console and file. Essential for monitoring and debugging.

### 3.5. Hashing (`src/utils/Hasher.h/.cpp`)

*   Provides functionality for hashing and verifying passwords. **Critically**, it uses a placeholder in this example but is designed to integrate with strong algorithms like Argon2 or bcrypt for production.

### 3.6. JWT Management (`src/auth/JWTManager.h/.cpp`)

*   Handles the creation, signing, and verification of JSON Web Tokens. Utilizes the `jwt-cpp` library.

### 3.7. Error Handling (`src/utils/ErrorHandler.h/.cpp`)

*   Defines custom exception classes (`AppException`) to categorize and standardize error responses, making it easier for API consumers to interpret errors.

### 3.8. Caching (`src/utils/Cache.h/.cpp`)

*   A simple in-memory LRU (Least Recently Used) cache implementation for storing and retrieving frequently accessed, non-sensitive data to improve performance and reduce database load.

### 3.9. Rate Limiting (`src/utils/RateLimiter.h/.cpp`)

*   An IP-based rate limiter to protect API endpoints from abuse and brute-force attacks by limiting the number of requests from a single IP address within a specified time window.

## 4. Security Highlights

*   **Authentication (JWT):** Stateless, scalable authentication using industry-standard JWTs. Tokens are signed with a strong secret.
*   **Authorization (RBAC):** Middleware checks user roles (e.g., `user`, `admin`) extracted from JWTs to restrict access to resources and operations.
*   **Password Security:** Hashing (conceptually Argon2/bcrypt) with unique salts for each user, preventing rainbow table attacks.
*   **SQL Injection Prevention:** All database interactions use parameterized queries via `sqlite3_prepare_v2` and `sqlite3_bind_text`.
*   **Input Validation:** Performed at DTO and service layers to ensure data integrity and prevent common vulnerabilities.
*   **Rate Limiting:** Protects against DoS attacks and brute-force login attempts.
*   **Secure Configuration:** Sensitive data (like JWT secret) is managed via `config.json` and ideally overridden by environment variables in production.
*   **HTTPS (External):** Assumed to be handled by a reverse proxy in front of the C++ application.
*   **Least Privilege:** Docker setup uses `no-new-privileges` and `cap_drop` to minimize attack surface.

## 5. Deployment

The application is containerized using Docker, allowing for consistent deployment across various environments (local, staging, production). `docker-compose.yml` provides a simple way to run the application with volume mappings for persistent data and logs.

## 6. Testing Strategy

*   **Unit Tests:** Focus on individual functions and methods (e.g., `Hasher`, `Cache`, `JWTManager`).
*   **Integration Tests:** Verify interactions between components (e.g., `UserRepository` with `SQLiteManager`, `AuthService` with `UserRepository`).
*   **API Tests:** End-to-end tests against the running API endpoints, ensuring correct request/response handling, authentication, and authorization.
*   **Performance Tests:** (Conceptual) Tools like Apache JMeter or wrk would be used to assess API throughput and latency under load.

This architecture provides a solid foundation for a robust, secure, and maintainable C++ backend application.