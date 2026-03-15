# Architecture Documentation for ML Utilities System

## 1. High-Level Architecture

The ML Utilities System is a modular, layered backend application built with Spring Boot. It follows a classical N-tier architecture pattern, separating concerns into presentation (API controllers), business logic (services), and data access (repositories).

```
+-------------------+      +-------------------+
|    Client (UI,    |      |  External ML Ops  |
|    CLI, API Tool) |----->|     (e.g.,       |
+-------------------+      |   orchestrators)  |
         |                 +-------------------+
         |                       ^
         v                       |  (Future integrations)
+------------------------------------------------+
|           ML Utilities System Backend          |
|  (Spring Boot Java Application)                |
|                                                |
| +-------------------+                          |
| |   Presentation    |                          |
| | (Controllers)     |<----+                    |
| +-------------------+     | HTTP/REST          |
|          ^                | JSON               |
|          | Global Exception Handler, Rate Limiting, Logging |
|          | Spring Security (JWT AuthN/AuthZ)   |
| +-------------------+     |                    |
| |   Business Logic  |---->| Caching (Caffeine) |
| |   (Services)      |<----+                    |
| +-------------------+     |                    |
|          ^                | Transactional      |
|          |                | Logic              |
| +-------------------+     |                    |
| |    Data Access    |---->| Flyway (Migrations)|
| |   (Repositories)  |<----+                    |
| +-------------------+                          |
|                                                |
+------------------------------------------------+
         |
         | PostgreSQL Driver (JDBC)
         v
+-------------------+
|     Database      |
|   (PostgreSQL)    |
+-------------------+
```

### Key Components:

*   **Client:** Any application or tool interacting with the system's REST API. This could be a web UI, a command-line interface, or another microservice.
*   **ML Utilities System Backend:** The core Spring Boot application.
    *   **Presentation Layer (Controllers):** Handles incoming HTTP requests, validates input, delegates to services, and returns appropriate HTTP responses.
    *   **Business Logic Layer (Services):** Contains the core application logic. It orchestrates operations, applies business rules, and manages transactions. It interacts with repositories and potentially external services.
    *   **Data Access Layer (Repositories):** Manages interactions with the database. Uses Spring Data JPA for abstracting CRUD operations and providing query methods.
    *   **Security Layer (Spring Security + JWT):** Intercepts requests, authenticates users via JWT tokens, and enforces role-based authorization for API endpoints.
    *   **Caching Layer (Spring Cache + Caffeine):** Improves performance by storing frequently accessed data in-memory, reducing database load.
    *   **Rate Limiting:** A custom interceptor that limits the number of requests to certain endpoints to prevent abuse.
    *   **Global Exception Handling:** Provides consistent error responses across the API.
    *   **Logging:** Structured logging for operational insights and debugging.
*   **Database (PostgreSQL):** The primary persistent storage for all metadata (datasets, features, models, users, roles).
*   **Flyway:** Manages database schema evolution through versioned migration scripts.

## 2. Data Flow

1.  **Client Request:** A client sends an HTTP request (e.g., `GET /api/datasets/1`, `POST /api/auth/signin`) to the Spring Boot application.
2.  **Web Filter Chain:**
    *   The request first hits Spring Security's filter chain.
    *   `AuthTokenFilter` extracts JWT from the `Authorization` header, validates it, and sets the authenticated user in the Spring Security context. If invalid or missing, `AuthEntryPointJwt` handles unauthorized access.
3.  **Rate Limiting Interceptor:** The `RateLimitInterceptor` checks if the incoming request (for `@RateLimited` endpoints) exceeds the defined rate limits. If so, it immediately returns a `429 Too Many Requests` error.
4.  **Controller:** If the request passes filters and interceptors, it reaches the appropriate controller method.
    *   Input validation (`@Valid`) is performed.
    *   `@PreAuthorize` annotations ensure the authenticated user has the necessary roles.
    *   The controller delegates the request to the relevant service method.
5.  **Service Layer:**
    *   The service method executes business logic.
    *   **Caching:** For `GET` operations, `@Cacheable` annotation attempts to retrieve data from the cache. If found, it returns directly. If not, it proceeds to the repository. For `POST`/`PUT`/`DELETE` operations, `@CacheEvict` annotations ensure relevant cache entries are invalidated.
    *   **Transactions:** `@Transactional` ensures atomicity of database operations.
    *   The service interacts with one or more repositories to fetch, create, update, or delete data.
    *   Data Transfer Objects (DTOs) are used for communication between the controller and service layers, and also between the service layer and external clients, to prevent exposing internal entity structures.
6.  **Repository Layer:** Spring Data JPA repositories abstract database interactions. They execute queries, map results to JPA entities, and handle persistence.
7.  **Database:** PostgreSQL stores and retrieves data. Flyway ensures the schema is up-to-date.
8.  **Response:**
    *   Results from the service are converted back to DTOs by the controller.
    *   An HTTP response with appropriate status code and JSON payload is returned to the client.
    *   **Global Exception Handler:** If any exception occurs at any layer, `GlobalExceptionHandler` intercepts it and returns a consistent, user-friendly error response.

## 3. Module Breakdown

The project is organized into standard Spring Boot packages:

*   `com.ml_utilities_system`: Base package
    *   `MlUtilitiesSystemApplication`: Main Spring Boot entry point.
    *   `config`: Spring configurations for security, caching, OpenAPI, and WebMvc interceptors.
        *   `jwt`: JWT-specific components (token generation, validation, filter).
    *   `controller`: REST API endpoints, handling HTTP requests and responses.
    *   `dto`: Data Transfer Objects used for API requests and responses, separating entity models from external contracts.
    *   `exception`: Custom exceptions and the `GlobalExceptionHandler` for centralized error handling.
    *   `interceptor`: Contains the `RateLimitInterceptor` and its annotation.
    *   `model`: JPA entities representing the database schema (Users, Roles, Datasets, Features, Models).
    *   `repository`: Spring Data JPA interfaces for database CRUD operations.
    *   `service`: Business logic layer, orchestrating operations and applying business rules.
        *   `UserDetailsImpl`, `UserDetailsServiceImpl`, `AuthService`: Security-related services.
    *   `util`: General utility classes (e.g., `RateLimiter` implementation using Bucket4j).

## 4. Scalability Considerations

*   **Stateless Application:** The use of JWTs makes the application stateless, which is crucial for horizontal scaling. Any instance can handle any request without session affinity.
*   **Database Scaling:** PostgreSQL can be scaled vertically (more powerful hardware) or horizontally (read replicas, sharding, though sharding requires more complex application logic). Connection pooling (`HikariCP` used by Spring Boot by default) is optimized.
*   **Caching:** Caffeine provides fast in-memory caching. For higher scale or distributed caching, it could be replaced with Redis or Memcached (e.g., via Spring Data Redis).
*   **Load Balancing:** The application is designed to run behind a load balancer, distributing traffic across multiple instances.
*   **Message Queues:** For asynchronous operations (e.g., heavy data processing, model training jobs), integration with message queues (Kafka, RabbitMQ) would decouple components and improve responsiveness. (Future enhancement).
*   **Microservices:** While this is a monolithic application, its modular design facilitates breaking it down into smaller microservices if complexity or team size grows (e.g., a dedicated "Dataset Service," "Feature Store Service," "Model Registry Service").

## 5. Security Aspects

*   **JWT Authentication:** Secure token-based authentication for all API interactions.
*   **Role-Based Authorization:** Fine-grained access control using `@PreAuthorize` annotations on controller and service methods.
*   **Password Hashing:** BCryptPasswordEncoder is used for strong one-way password hashing.
*   **Input Validation:** `@Valid` annotations on DTOs prevent common injection attacks and ensure data integrity.
*   **CORS Configuration:** `CorsFilter` allows controlled cross-origin requests.
*   **HTTPS:** Deployment should always enforce HTTPS to protect data in transit.

## 6. Observability

*   **Logging:** Configured with Logback to provide detailed application logs. Logs should be collected by a centralized logging system (ELK stack, Splunk) in production.
*   **Monitoring:** Spring Boot Actuator endpoints provide metrics (`/actuator/metrics`), health (`/actuator/health`), etc. These can be scraped by tools like Prometheus and visualized in Grafana to monitor application health and performance.
*   **Tracing:** For distributed systems, integrating with a tracing solution (e.g., OpenTelemetry, Zipkin) would help track requests across services. (Future enhancement).

## 7. Performance Testing Strategy (Conceptual)

*   **Tooling:** Use tools like Apache JMeter or Gatling to simulate realistic user loads.
*   **Scenarios:**
    *   **Login Storm:** Test authentication endpoint under high load.
    *   **Read-Heavy Load:** Simulate many users retrieving datasets, features, and models concurrently. Observe cache hit rates.
    *   **CRUD Mix:** Simulate a mix of creation, update, and deletion operations with reads.
    *   **Edge Cases:** Test pagination with large numbers of pages, filtering, and sorting.
*   **Metrics to Monitor:** Response times, throughput (requests/second), error rates, CPU/Memory utilization, database connection pool usage, cache hit/miss ratio.
*   **Goal:** Identify bottlenecks, validate rate limiting, and ensure the system meets desired performance SLAs under anticipated load.

---