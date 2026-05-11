# Database Optimization System (DBO) - Architecture Document

## 1. Introduction

This document describes the architecture of the Database Optimization System (DBO), a C++ application designed to analyze and recommend optimizations for PostgreSQL databases. The system focuses on maintainability, scalability, and performance, leveraging modern C++ features and robust third-party libraries.

## 2. High-Level Architecture

The DBO system follows a layered, monolithic architecture, where components are logically separated but deployed as a single application unit. This design choice simplifies deployment for moderate complexity while allowing for clear separation of concerns.

```
+------------------+
|                  |
|  Client (Browser/ |
|     CLI / Other   |
|     Applications) |
|                  |
+--------+---------+
         | HTTP(S)
         |
+--------v---------+
|  **Presentation Layer**   |
|  (Boost.Beast HTTP Server)|
|  - Request Routing        |
|  - Auth/Rate Limit/Error  |
|  - Static File Serving    |
+--------+---------+
         |
+--------v---------+
|  **Application/Service Layer**  |
|  - QueryAnalyzerService   |
|  - SchemaAnalyzerService  |
|  - AuthService            |
|  - CacheService           |
|  - Business Logic Orchestration |
+--------+---------+
         | Dependencies / Data Models
+--------v---------+
|  **Domain/Model Layer**   |
|  - User, QueryLog         |
|  - IndexRecommendation    |
|  - SchemaIssue            |
|  - Data Structures        |
+--------+---------+
         |
+--------v---------+
|  **Data Access Layer**    |
|  (Repositories)           |
|  - UserRepository         |
|  - QueryLogRepository     |
|  - IndexRecommendationRepo|
|  - SchemaIssueRepository  |
|  - DbConnection (libpqxx Connection Pool) |
+--------+---------+
         | PostgreSQL Protocol
+--------v---------+
|                  |
| **PostgreSQL Database** |
|  - Data Storage         |
|  - Query Execution      |
|  - Transaction Management |
|                  |
+------------------+

**Cross-Cutting Concerns**:
- Logging (spdlog)
- Configuration (dotenv)
- Exception Handling
```

## 3. Layer Breakdown

### 3.1. Presentation Layer (`src/server/`)

*   **`HttpServer`**: The core HTTP server responsible for accepting incoming connections and managing `HttpSession` instances. Utilizes `Boost.Asio` for asynchronous I/O and `Boost.Beast` for HTTP protocol parsing and serialization.
*   **`HttpSession`**: Handles a single client connection, performing async reads/writes of HTTP messages.
*   **`RequestHandler`**: Acts as the central router and dispatcher. It maps incoming HTTP requests (method, path) to specific C++ handler functions. It also orchestrates the application of middleware.
*   **Middleware**:
    *   **`AuthMiddleware`**: Intercepts requests to protected routes, validates JWT tokens, and populates user context.
    *   **`RateLimiter`**: Prevents abuse by limiting the number of requests from a given client IP within a timeframe.
    *   **`ErrorHandler`**: Catches exceptions and crafts standardized error responses.
*   **`StaticFileHandler`**: Serves static assets (HTML, CSS, JS) from the `web/` directory.
*   **`ViewRenderer`**: A very basic mechanism for rendering simple HTML templates (e.g., replacing placeholders). In a more complex frontend, this would be a separate SPA.

### 3.2. Application/Service Layer (`src/services/`)

This layer encapsulates the primary business logic and orchestrates data flow between the presentation and data access layers. Services are responsible for domain-specific tasks.

*   **`AuthService`**: Handles user registration, login, password hashing (using Crypto++ SHA256), and JWT token generation/validation.
*   **`QueryAnalyzerService`**: The core intelligence for database optimization. It fetches `QueryLog` data, parses SQL queries (simplified regex-based parsing), identifies frequently used columns in slow queries, and suggests `IndexRecommendation`s. It would ideally integrate with PostgreSQL's `EXPLAIN ANALYZE` or system views for richer analysis.
*   **`SchemaAnalyzerService`**: (Conceptualized) Would analyze the target database's schema (tables, columns, constraints) to identify issues like missing foreign keys, non-normalized structures, or suboptimal data types.
*   **`CacheService`**: Provides an in-memory key-value store for caching frequently accessed data (e.g., lists of recommendations) to reduce database load and improve response times.
*   **`Config`**: Loads application configuration from `.env` files.
*   **`Logger`**: Centralized logging utility using `spdlog`.

### 3.3. Domain/Model Layer (`src/models/`)

This layer defines the core data structures (Plain Old C++ Objects - POCS) that represent entities in the system. These are largely independent of specific database or framework technologies.

*   **`User`**: Represents a user of the DBO system, including authentication details and roles.
*   **`QueryLog`**: Stores details about executed SQL queries from the target database.
*   **`IndexRecommendation`**: Represents a suggestion for a new database index.
*   **`SchemaIssue`**: Represents a detected problem within the target database's schema.

### 3.4. Data Access Layer (`src/db/`)

Responsible for abstracting database interactions and providing persistent storage for domain objects.

*   **`DbConnection`**: Manages a connection pool of `libpqxx::connection` objects to the PostgreSQL database. This ensures efficient resource utilization and robustness.
*   **`MigrationManager`**: A custom migration system that reads SQL scripts from `database/migrations/` and applies them to the database, ensuring schema evolution is managed version by version.
*   **Repositories (`UserRepository`, `QueryLogRepository`, `IndexRecommendationRepository`, `SchemaIssueRepository`)**: Each repository provides CRUD (Create, Read, Update, Delete) operations for a specific domain model. They map C++ objects to SQL queries and vice-versa, abstracting `libpqxx` details from the service layer.

### 3.5. Infrastructure / Utilities (`src/utils/`, `src/common/`)

Shared components and utilities:

*   **`JsonUtils`**: Helper functions for serializing C++ objects to `nlohmann/json` and deserializing JSON to C++ objects.
*   **`Logger`**: Global `spdlog` instance management.
*   **`Config`**: Environment variable loading.
*   **`Constants`**: Global constants and magic strings.
*   **`Exceptions`**: Custom exception classes for domain-specific error handling.

## 4. Database Schema (PostgreSQL)

The DBO system uses a PostgreSQL database. Key tables include:

*   `users`: Stores user credentials and roles for accessing the DBO system.
*   `query_logs`: Stores parsed log data from target databases (or manually ingested slow queries).
*   `index_recommendations`: Stores suggested indexes, their status, and impact.
*   `schema_issues`: Records identified problems within the target database's schema.
*   `db_migrations`: Internal table to track applied schema migrations of the DBO's own database.

## 5. Deployment and Operations

*   **Docker**: The entire application (C++ backend + PostgreSQL) is containerized using `Dockerfile` and `docker-compose.yml` for simplified setup, deployment, and isolation.
*   **CI/CD (GitHub Actions)**: A `ci-cd.yml` workflow automates:
    *   Building the Docker images.
    *   Running unit and integration tests against a temporary PostgreSQL instance.
    *   Running API tests.
    *   (Optional) Pushing images to a registry and deploying to a target environment (e.g., Kubernetes, EC2).
*   **Logging & Monitoring**: `spdlog` is integrated for structured logging. In a production environment, these logs would be forwarded to a centralized logging system (e.g., ELK stack, Grafana Loki).
*   **Error Handling**: Centralized error middleware ensures consistent API error responses.

## 6. Future Enhancements

*   **Advanced SQL Parsing**: Integrate a robust SQL parser library (e.g., `libpg_query`) for deeper query analysis.
*   **PostgreSQL Catalog Integration**: Directly query `pg_stat_statements`, `pg_indexes`, `pg_class`, `pg_attribute` for real-time performance metrics and schema introspection.
*   **Real-time Query Capture**: Implement a mechanism to capture slow queries directly from a target PostgreSQL instance (e.g., via `pg_stat_statements` polling, or a custom logging extension).
*   **Machine Learning**: Apply ML models for more intelligent index suggestions or anomaly detection.
*   **Multi-Database Support**: Extend to support other database systems (MySQL, SQL Server, etc.).
*   **Web UI**: Develop a richer, interactive single-page application (SPA) using frameworks like React/Vue/Angular, consuming the C++ API.
*   **Scalability**: For very high loads, consider breaking down the monolithic application into microservices (e.g., a dedicated Query Analysis service, an API Gateway).
*   **Asynchronous Processing**: Use message queues (RabbitMQ, Kafka) for long-running analysis tasks.
*   **Security**: Implement mTLS, stricter input validation, and security scanning.

This architecture provides a solid foundation for a performant and maintainable database optimization system.
```