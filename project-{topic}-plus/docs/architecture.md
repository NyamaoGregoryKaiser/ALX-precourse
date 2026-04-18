# Project Management API - Architecture Documentation

This document provides a high-level overview of the architecture of the Project Management API.

## 1. High-Level Design

The system follows a typical **three-tier architecture** pattern, separating concerns into presentation (API endpoints), business logic (services), and data management (database layer). It's implemented as a **monolithic service** for simplicity in this comprehensive example, but designed with modularity to allow for potential future microservices decomposition.

![Architecture Diagram](https://mermaid.live/svg/eyJjb2RlIjoiZ3JhcGggVERcbiAgQShDbGllbnQgQXBwbGljYXRpb24pIC0tPiBCKExvYWQgQmFsYW5jZXIpXG4gIEIgLS0-IEMxKEluc3RhbmNlIDEpXG4gIEIgLS0-IEMyKEluc3RhbmNlIDIpXG4gIEMxIC0tPiBEKFBvc3RncmVTUUwgRGF0YWJhc2UpXG4gIEMyIC0tPiBEIiwibWVybWFpZCI6eyJ0aGVtZSI6ImRlZmF1bHQifSwidXBkYXRlRWRpdG9yIjpmYWxzZSwiYXV0b1N5bmMiOnRydWUsInVwZGF0ZURpYWdyYW0iOmZhbHNlfQ)
_Simplified diagram. Replace A/B/C1/C2/D with actual components described below._

Let's use a more detailed component diagram for our system:

```mermaid
graph TD
    subgraph Client Layer
        A[Web/Mobile App] --> B(API Gateway/Load Balancer);
    end

    subgraph API Layer (C++ Crow Application)
        B --> C(Crow Server);
        C --> D(Auth Middleware);
        C --> E(Error Handling Middleware);
        C --> F(API Endpoints);
        D --> H(JWT Manager);
        F --> G(Business Services);
        F --> H;
    end

    subgraph Business Logic Layer
        G -- User, Project, Task, Team Services --> I(Database Layer);
    end

    subgraph Data Access Layer
        I -- DbManager --> J(PostgreSQL Connection Pool);
    end

    subgraph Persistence Layer
        J --> K(PostgreSQL Database);
        K -- Migration Scripts --> K;
        K -- Seed Data --> K;
    end

    subgraph Supporting Services
        L(Configuration Loader);
        M(Logger);
        N(Docker/Docker Compose);
        O(CI/CD Pipeline);
        H -- JWT Secret --> L;
        I -- DB Connection String --> L;
        C,D,F,G,I,J,K,L --> M;
    end

    L --> C;
    L --> D;
    L --> H;
    N --> C,K;
    O --> N, C;
```

## 2. Core Components

### 2.1. C++ Core Application (Crow Framework)

*   **`main.cpp`**: The entry point of the application.
    *   Initializes configuration, logger, database manager, JWT manager, and all business services.
    *   Sets up the Crow `App` instance.
    *   Registers middleware (e.g., `AuthMiddleware`).
    *   Defines all API routes (`CROW_ROUTE`) and their corresponding handlers.
    *   Handles global error responses (e.g., 404 Not Found, 500 Internal Server Error).
*   **`config/config.h`**:
    *   Handles loading environment-specific configurations (e.g., `APP_PORT`, `DB_HOST`, `JWT_SECRET`) from environment variables.
    *   Ensures separation of configuration from code.
*   **`middleware/auth_middleware.h/.cpp`**:
    *   An `Crow::ILogMiddleware` that intercepts incoming requests.
    *   Extracts and validates JWT tokens from the `Authorization` header.
    *   Populates a `context` object with authenticated user details (`user_id`, `username`, `email`).
    *   Sends `401 Unauthorized` or `403 Forbidden` responses for invalid/missing tokens or insufficient permissions.
*   **`models/`**:
    *   Contains C++ `struct` definitions for core data entities: `User`, `Project`, `Task`, `Team`.
    *   Includes `nlohmann/json` serialization/deserialization logic (`to_json`, `from_json`) to easily convert between C++ objects and JSON request/response bodies.
*   **`services/`**:
    *   Encapsulates the **business logic** for each domain entity.
    *   `UserService`, `ProjectService`, `TaskService`, `TeamService`.
    *   Interacts with the `DbManager` to perform CRUD operations.
    *   Implements data validation, authorization checks (e.g., "is user project owner?"), and any other domain-specific rules.
    *   Contains custom exceptions (e.g., `UserNotFoundException`, `ProjectNotFoundException`) for clear error reporting.
*   **`utils/jwt_manager.h/.cpp`**:
    *   Manages the creation, signing, and verification of JWT tokens.
    *   Uses `jwt-cpp` library.
*   **`utils/logger.h/.cpp`**:
    *   Provides a centralized, thread-safe logging utility using `spdlog`.
    *   Allows configurable log levels (`trace`, `debug`, `info`, `warn`, `error`, `critical`).
    *   Integrates Crow's internal logging.

### 2.2. Database Layer

*   **PostgreSQL**: The chosen relational database management system. Known for its robustness, feature set, and ACID compliance.
*   **`database/db_manager.h/.cpp`**:
    *   Implements a **connection pool** using `libpqxx` to efficiently manage database connections.
    *   `ConnectionGuard` (RAII wrapper) ensures connections are properly acquired and released, preventing leaks.
    *   Handles connection string management and basic error retry logic for connection failures.
*   **`database/migrations/`**:
    *   Contains SQL scripts for **schema definition** and incremental **database migrations**.
    *   `V1__create_tables.sql`: Defines initial tables (`users`, `projects`, `tasks`, `teams`, and junction tables).
    *   `V2__add_roles_and_seed_data.sql`: Adds triggers for `updated_at` timestamps and potentially other schema refinements.
    *   Executed automatically by `docker-compose.yml` on startup.
*   **`database/seed/seed.sql`**:
    *   SQL script to populate the database with initial **seed data** (users, teams, projects, tasks) for development and testing purposes.
    *   Executed after migrations by `docker-compose.yml`.

## 3. Configuration & Setup

*   **`.env.example`**:
    *   Defines all environment variables required for the application (ports, database credentials, JWT secret, log levels).
    *   Serves as a template for the actual `.env` file.
*   **`Dockerfile`**:
    *   Defines how to build the C++ application into a Docker image.
    *   Uses a multi-stage build: a `builder` stage with necessary compilers and development libraries, and a lean `debian-slim` runtime stage with only essential binaries and runtime dependencies. This minimizes image size.
*   **`docker-compose.yml`**:
    *   Orchestrates the multi-container application (C++ API service and PostgreSQL database).
    *   Defines services, networks, volumes, environment variables.
    *   Handles health checks for the database to ensure it's ready before the application starts.
    *   Includes a `command` override for the `app` service to automatically run database migrations and seed data before starting the API server.
*   **`CMakeLists.txt`**:
    *   The build system configuration for the C++ project.
    *   Manages external library dependencies (Crow, libpqxx, nlohmann/json, spdlog, jwt-cpp, Google Test).
    *   Defines compilation flags, include paths, and linking instructions.

## 4. Testing & Quality

*   **`tests/unit/`**:
    *   **Unit Tests**: Use `Google Test` to test individual components in isolation.
    *   Examples include:
        *   `test_models.cpp`: Verifies JSON serialization/deserialization of data models.
        *   `test_jwt_manager.cpp`: Tests JWT token generation and verification logic.
    *   Aims for high code coverage (80%+) on critical logic.
*   **`tests/integration/`**:
    *   **Integration Tests**: Use `Google Test` to verify interactions between components, primarily the `DbManager` and the PostgreSQL database.
    *   `test_db_manager.cpp`: Tests connection pooling, basic CRUD operations directly against the database to ensure the data access layer functions correctly.
    *   Includes database setup/teardown for a clean test environment.
*   **API Tests**:
    *   While not explicitly coded here as C++ `Crow` client tests, API testing would typically involve tools like `curl`, Postman/Insomnia, or dedicated frameworks (e.g., Python `requests` + `pytest`) to send HTTP requests to the running API and assert on responses. The `API Documentation` provides `curl` examples.
*   **Performance Tests**:
    *   Mentioned as a crucial aspect for production. Tools like `JMeter`, `Locust`, or `k6` would be used to simulate high load and measure response times, throughput, and resource utilization.
*   **`tests/CMakeLists.txt`**: Configures the build process for the test executables.

## 5. Additional Features

*   **Authentication/Authorization**: Implemented using JWTs with `AuthMiddleware` and role-based checks within services/routes (e.g., only project owner can delete).
*   **Logging and Monitoring**: `spdlog` for structured, configurable logging. Integration with Crow's internal logs. In production, logs would be forwarded to a centralized logging system (e.g., ELK stack, Grafana Loki).
*   **Error Handling Middleware**: Global exception handling in `main.cpp` routes for Crow, catching common exceptions (`nlohmann::json::exception`, custom service exceptions, `std::runtime_error`) and returning consistent JSON error responses. `AuthMiddleware` also handles authentication-specific errors.
*   **Caching Layer**: (Conceptual) While not fully implemented in C++ for this example due to scope, a production system would integrate a caching solution like `Redis`. The `services` layer would typically interact with Redis to store frequently accessed data (e.g., project details, user profiles) to reduce database load and improve response times.
*   **Rate Limiting**: (Conceptual) For a C++ application, rate limiting can be implemented at different levels:
    *   **API Gateway/Load Balancer**: Nginx, Envoy, or cloud-provider specific solutions can apply rate limits.
    *   **Crow Middleware**: A custom Crow middleware could track request counts per IP address or authenticated user ID using an in-memory map or an external store like Redis.
    *   Not fully implemented in this example but would be a critical production feature.

## 6. CI/CD Pipeline

*   **`.github/workflows/ci.yml`**:
    *   Defines a GitHub Actions workflow.
    *   **Triggers**: On push to `main` and pull requests.
    *   **Build Stage**: Builds the C++ application using CMake and Docker.
    *   **Test Stage**: Runs unit and integration tests after building.
    *   **Linting/Static Analysis**: (Not explicitly included in `ci.yml` but would be added) Tools like `Clang-Tidy`, `Cppcheck` for code quality.
    *   **Deployment Stage**: (Conceptual) For production, this would build a release Docker image and push it to a container registry, then deploy to a Kubernetes cluster or similar.

## 7. Performance Considerations

*   **C++ Performance**: Choosing C++ provides excellent performance characteristics out of the box due to its low-level control and compiled nature.
*   **Crow Framework**: A lightweight and fast C++ web framework.
*   **`libpqxx`**: Efficient C++ client for PostgreSQL.
*   **Connection Pooling**: `DbManager` uses a connection pool to minimize overhead of establishing new database connections.
*   **Prepared Statements**: `pqxx::work::exec_params` and `pqxx::nontransaction::exec_params` utilize prepared statements, which improve performance by reducing parsing overhead and providing security against SQL injection.
*   **Database Indexing**: Defined in migration scripts (`idx_users_email`, `idx_projects_owner_id`, etc.) to speed up query execution.
*   **Query Optimization**: Service methods aim for efficient queries, avoiding N+1 problems where possible (though complex joins are not explicitly shown for brevity).

This architecture provides a solid foundation for a robust, scalable, and maintainable Project Management API.
```