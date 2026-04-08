```markdown
# DB-Optimizer: Architecture Documentation

## 1. High-Level Architecture

The DB-Optimizer is designed as a microservice-oriented application, consisting primarily of a C++ backend service that exposes a RESTful API. It interacts with its own PostgreSQL database for internal data storage and connects to external PostgreSQL databases for monitoring and analysis.

```
+------------------+     +--------------------------+
|  User (Web/CLI)  |<----+      DB-Optimizer        |
|                  |     |     (C++ Backend)        |
+------------------+     |                          |
       ^                   |  +-------------------+ |
       | HTTP/REST         |  | HTTP Server       |<--+ API Endpoints
       v                   |  | (Poco::Net)       | |   (Auth, Users, DBs, Reports)
+--------------------+     |  +---------+---------+ |
|   API Gateway      |<------- Router, Middleware  |
| (Optional, for     |     |  +---------+---------+ |
| Production Deploy) |     |  | Controllers       | |
+--------------------+     |  | (Auth, User, DB,  | |
                             |  |  Optimization)    | |
                             |  +---------+---------+ |
                             |  | Services          | |
                             |  | (Auth, DBMonitor, | |
                             |  |  QueryAnalyzer,   | |
                             |  |  IndexRecommender)| |
                             |  +---------+---------+ |
                             |  | DB Connection Pool| |<-- (Optimizer's DB)
                             |  |  (Poco::Data)     | |
                             |  +-------------------+ |
                             +-----------|------------+
                                         | PostgreSQL Adapter
                                         | (for target DBs)
                                         v
                      +-----------------------------------+
                      |   External Monitored Databases    |
                      |   (e.g., PostgreSQL instances)    |
                      +-----------------------------------+
```

## 2. Core Modules and Components

### 2.1. `app/core/Application`
*   **Entry Point:** The main application class, inheriting from `Poco::Util::ServerApplication`.
*   **Initialization:** Responsible for loading configurations, initializing logging, setting up the internal database connection pool, configuring the HTTP server, registering routes, and starting background services (like `DBMonitorService`).
*   **Lifecycle Management:** Manages the startup and shutdown sequence of all components.

### 2.2. `app/config/ConfigManager`
*   **Configuration Management:** Loads application settings from `config.json` and overrides them with environment variables, providing a unified access point for all configurations.

### 2.3. `app/utils/Logger`
*   **Logging:** Centralized logging utility based on `spdlog`, providing different log levels (debug, info, warn, error, critical) and output to console and file.

### 2.4. `app/db/`
*   **`DBConnectionPool`:** Manages a pool of `Poco::Data::Session` objects for connecting to the DB-Optimizer's internal PostgreSQL database. This ensures efficient and concurrent database access.
*   **`PostgreSQLAdapter`:** A specialized adapter for connecting to and interacting with *external* PostgreSQL databases registered for monitoring. It handles dynamic connections based on stored credentials for each monitored DB.
*   **`migrations/`:** Contains SQL scripts for evolving the DB-Optimizer's internal database schema.

### 2.5. `app/http/`
*   **`HTTPServer`:** Encapsulates `Poco::Net::HTTPServer`, handling incoming HTTP requests.
*   **`Router`:** Maps API paths and HTTP methods to appropriate request handlers (controllers). Supports middleware chain.
*   **`RequestHandler`:** Base class or interface for handling specific HTTP requests.
*   **`middleware/`:**
    *   **`AuthMiddleware`:** Intercepts requests to validate JWT tokens and enforce authentication/authorization.
    *   **`ErrorMiddleware`:** Catches exceptions during request processing and formats error responses consistently.
    *   **`RateLimiter` (Conceptual):** Controls the rate of requests to protect the API from abuse.
*   **`responses/APIResponses`:** Utility for generating standardized JSON API responses.

### 2.6. `app/models/`
*   **Data Models:** C++ classes representing the data entities stored in the DB-Optimizer's internal database (e.g., `User`, `MonitoredDB`, `QueryLog`, `OptimizationReport`). These are typically plain old data structures (PODs) or simple classes with getters/setters.

### 2.7. `app/services/`
*   **`AuthService`:** Handles user registration, login, password hashing, and JWT token generation/validation.
*   **`DBMonitorService`:** The core background service.
    *   Periodically retrieves registered `MonitoredDB`s.
    *   Connects to each target database using `PostgreSQLAdapter`.
    *   Fetches query statistics from `pg_stat_statements` and `EXPLAIN ANALYZE` outputs.
    *   Passes queries to `QueryAnalyzer` and `IndexRecommender`.
    *   Stores `QueryLog`s and `OptimizationReport`s in the internal database.
*   **`QueryAnalyzer`:**
    *   Parses SQL query strings (using regular expressions for simplicity, a full SQL parser would be more robust).
    *   Extracts relevant information like tables, columns in WHERE/ORDER BY/GROUP BY clauses, and JOIN conditions.
*   **`IndexRecommender`:**
    *   Takes analyzed query data and `EXPLAIN ANALYZE` output.
    *   Identifies potential performance bottlenecks (e.g., sequential scans).
    *   Suggests `CREATE INDEX` statements, avoiding redundant indexes.

### 2.8. `app/controllers/`
*   **API Endpoints:** Classes responsible for handling specific API routes. They receive HTTP requests, interact with services, and send back formatted responses.
    *   `AuthController`: `/auth/register`, `/auth/login`
    *   `UserController`: `/users`, `/users/{id}`
    *   `MonitoredDBController`: `/monitored-dbs`, `/monitored-dbs/{id}`, `/monitored-dbs/{id}/analyze`
    *   `OptimizationController`: `/monitored-dbs/{db_id}/optimization-reports`

### 2.9. `app/utils/`
*   **`JSONUtils`:** Helper functions for common JSON operations.
*   **`JWTUtils`:** Utility for encoding and decoding JWT tokens.
*   **`Cache`:** A simple in-memory cache (e.g., LRU-based) for reducing database lookups of frequently accessed data.
*   **`RateLimiter`:** A basic token bucket implementation for API rate limiting.

## 3. Data Flow Example: Monitoring and Index Recommendation

1.  **Application Startup:**
    *   `Application` initializes `DBConnectionPool` for its own DB, `HTTPServer`, and `DBMonitorService`.
    *   `DBMonitorService` starts a background thread/task to periodically run `analyzeMonitoredDatabase` for all registered DBs.

2.  **User Adds Monitored DB (via API):**
    *   `POST /monitored-dbs` request is handled by `MonitoredDBController`.
    *   `MonitoredDBController` validates input and stores the DB connection details (name, host, port, user, password) into the `monitored_databases` table in the DB-Optimizer's internal DB.

3.  **DBMonitorService Loop (Scheduled Task):**
    *   `DBMonitorService` queries its own `monitored_databases` table to get a list of active target DBs.
    *   For each `MonitoredDB`:
        *   It uses `PostgreSQLAdapter` to establish a `Poco::Data::Session` to the target DB.
        *   It queries `pg_stat_statements` on the target DB to get top N queries (e.g., by total execution time).
        *   For each significant query:
            *   It executes `EXPLAIN (ANALYZE, FORMAT JSON)` on the target DB to get the query plan.
            *   The raw query text and `EXPLAIN ANALYZE` output are stored as a `QueryLog` in the DB-Optimizer's DB.
            *   The query text is passed to `QueryAnalyzer::analyzeQuery()`. This extracts tables, filter/sort columns, join conditions.
            *   The `QueryAnalyzer` output (a JSON object) and `EXPLAIN ANALYZE` output are passed to `IndexRecommender::recommendIndexes()`.
            *   `IndexRecommender` identifies sequential scans, expensive operations, and determines if existing indexes cover the identified columns. It generates `CREATE INDEX` DDLs if beneficial.
            *   Any generated `IndexRecommendation`s are saved as `OptimizationReport`s in the DB-Optimizer's DB.

4.  **User Views Reports (via API):**
    *   `GET /monitored-dbs/{db_id}/optimization-reports` request is handled by `OptimizationController`.
    *   `OptimizationController` retrieves the `OptimizationReport`s from the DB-Optimizer's internal DB for the specified `db_id`.
    *   These reports are formatted into a JSON response and sent back to the user.

## 4. Key Technologies & Libraries

*   **C++17:** Modern C++ features for robust and efficient code.
*   **Poco C++ Libraries:**
    *   `Poco::Net`: HTTP server, client, network utilities.
    *   `Poco::Util`: Application framework, configuration handling.
    *   `Poco::Data`: Database abstraction layer, including PostgreSQL connector.
    *   `Poco::JSON`: JSON parsing and serialization.
    *   `Poco::RegularExpression`: Regex for query parsing.
*   **spdlog:** Fast, header-only C++ logging library.
*   **jwt-cpp:** C++ library for JSON Web Tokens (JWT).
*   **PostgreSQL:** Both as the internal database for DB-Optimizer and as the primary target database for monitoring.
*   **CMake:** Cross-platform build system.
*   **Docker & Docker Compose:** Containerization for isolated and consistent development/deployment environments.
*   **Catch2:** A modern, header-only C++ test framework.
*   **GitHub Actions:** CI/CD pipeline for automated testing and deployment.

## 5. Security Considerations

*   **Password Storage:** Passwords for the DB-Optimizer's users are stored as salted hashes. Passwords for *monitored databases* are stored as plain text for demonstration, but in production, these *must* be encrypted using a Key Management System (KMS) or a secure secrets management solution.
*   **JWT Security:** JWT secret key is managed via environment variables and should be a strong, randomly generated string. Tokens are signed and expiry is enforced.
*   **Input Validation:** All API inputs are validated to prevent injection attacks and ensure data integrity.
*   **Role-Based Access Control (RBAC):** Users are assigned roles (`user`, `admin`), and API access is restricted based on these roles using `AuthMiddleware`.
*   **Least Privilege:** Database connections to monitored systems should use users with minimal necessary permissions (e.g., `SELECT` on `pg_stat_statements` and tables, `EXPLAIN` permissions).

This architecture provides a solid foundation for a scalable and maintainable database optimization system.
```