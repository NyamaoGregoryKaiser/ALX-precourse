# AppInsight: Architecture Documentation

This document provides an overview of the architecture for the AppInsight Performance Monitoring System. It outlines the key components, their responsibilities, and how they interact to form a cohesive, scalable, and maintainable enterprise-grade application.

## 1. High-Level Overview

AppInsight is designed as a modular, layered application, primarily leveraging the Spring Boot ecosystem for its backend. It follows a microservice-lite approach, where the entire application is deployable as a single unit but with clearly separated concerns and components. This structure facilitates future scaling into distinct microservices if needed.

The system focuses on:
*   **Data Ingestion**: Receiving performance metrics from various monitored applications.
*   **Data Storage**: Persisting time-series metric data efficiently.
*   **Data Retrieval & Presentation**: Providing APIs for users to query and visualize performance trends.
*   **Security**: Ensuring secure access to APIs and data.

```
+------------------+     +--------------------+
|  Monitored App   |---->|  AppInsight Backend  |     +--------------------+
| (External Client)| API | (Spring Boot App)  |---->|  AppInsight Frontend |
+------------------+ Key +--------+-----------+ REST | (HTML/JS/CSS)      |
                           |        |             API  +--------------------+
                           |        |
                           |        | (JPA/JDBC)
                           |        v
                           +--------+-----------+
                           |  PostgreSQL DB   |
                           +--------------------+
```

## 2. Component Breakdown

### 2.1. AppInsight Backend (Spring Boot Application)

The core of the system, responsible for all business logic, data persistence, and API exposure.

#### Sub-Components:

*   **Controllers (API Layer)**:
    *   Expose RESTful endpoints (e.g., `MonitoredApplicationController`, `MetricController`, `MetricDataController`, `AuthController`).
    *   Handle HTTP requests, validation (using `@Valid`), and serialization/deserialization of DTOs.
    *   Delegate business operations to the Service Layer.
    *   Apply rate limiting using Bucket4j annotations/configuration.
*   **Service Layer (Business Logic)**:
    *   Encapsulates the core business rules and orchestrates complex operations.
    *   Interacts with multiple repositories.
    *   Handles data transformations between entities and DTOs.
    *   Applies caching strategies using Spring's `@Cacheable`, `@CachePut`, `@CacheEvict` with Caffeine as the provider.
    *   Manages transactions (`@Transactional`).
    *   Includes `UserService`, `MonitoredApplicationService`, `MetricService`, `MetricDataService`.
*   **Repository Layer (Data Access)**:
    *   Spring Data JPA interfaces (`MonitoredApplicationRepository`, `MetricRepository`, `MetricDataRepository`, `UserRepository`, `RoleRepository`).
    *   Provides abstraction over database operations (CRUD, custom queries).
    *   Leverages Hibernate for ORM.
*   **Model Layer (Entities)**:
    *   JPA Entities (`MonitoredApplication`, `Metric`, `MetricData`, `User`, `Role`, `BaseEntity`).
    *   Represents the domain objects and their relationships, mapped to database tables.
    *   Includes auditing fields (`createdAt`, `updatedAt`, `version` for optimistic locking).
*   **Security Layer**:
    *   **Spring Security**: Framework for authentication and authorization.
    *   **JWT (JSON Web Tokens)**: Used for stateless authentication.
        *   `JwtUtil`: Handles token generation, validation, and parsing.
        *   `JwtUserDetailsService`: Loads user details for Spring Security.
        *   `JwtRequestFilter`: Intercepts requests, validates JWT, and sets `SecurityContext`.
    *   **`@PreAuthorize`**: Annotation-based method-level authorization.
*   **Configuration**:
    *   `application.yml`: Externalized configuration for database, JWT, caching, rate limiting, logging.
    *   `SecurityConfig`: Defines security filter chain, authentication manager, password encoder.
    *   `CacheConfig`: Configures Caffeine cache manager.
*   **Error Handling**:
    *   `@ControllerAdvice` (`GlobalExceptionHandler`): Centralized exception handling to provide consistent, structured error responses across the API.
    *   Custom Exceptions (`ResourceNotFoundException`, `IllegalArgumentException`, `UnauthorizedException`).
*   **Logging**:
    *   SLF4j with Logback implementation.
    *   Configured via `logback-spring.xml` for console output and rolling file appenders.
    *   Provides different log levels (DEBUG, INFO, WARN, ERROR).
*   **Monitoring**:
    *   Spring Boot Actuator: Exposes operational endpoints (`/health`, `/info`, `/prometheus`, `/beans`) for monitoring the application's health, metrics, and internal state.

### 2.2. Database (PostgreSQL)

*   **Relational Database**: Chosen for its robustness, reliability, and rich feature set suitable for structured time-series data.
*   **Schema**: Designed with normalized tables for `MonitoredApplication`, `Metric`, `MetricData`, `User`, and `Role`.
*   **Indexes**: Strategically placed indexes (on foreign keys, unique constraints, and `timestamp` for `MetricData`) to optimize query performance, especially for time-series lookups.
*   **Migrations (Flyway)**: Manages database schema changes in a version-controlled and idempotent manner, ensuring consistent deployments across environments.
*   **Query Optimization**: Leverages Spring Data JPA's query capabilities, and custom repository methods for efficient data retrieval.

### 2.3. Frontend (Basic HTML/JS/CSS)

*   A minimalist static web application demonstrating basic user interaction with the backend APIs.
*   Handles user registration, login, JWT storage, and basic CRUD for applications and metrics.
*   Fetches and displays metric data.
*   Serves as a proof-of-concept and can be replaced by a more sophisticated SPA framework (React, Angular, Vue.js) in a production setting.

## 3. Data Flow and Interactions

1.  **Client Authentication**: A user interacts with the frontend (or directly via API) to `/api/auth/login`, providing credentials. The backend authenticates and returns a JWT.
2.  **Protected API Calls**: For subsequent requests to protected endpoints, the client includes the JWT in the `Authorization` header. `JwtRequestFilter` validates the token, and Spring Security authorizes the request based on the user's roles (`@PreAuthorize`).
3.  **Application/Metric Management**: `ADMIN` users can use REST APIs (via frontend or API client) to create, retrieve, update, and delete `MonitoredApplication` and `Metric` definitions. Services handle business logic and interact with repositories.
4.  **Metric Data Ingestion**: External monitored applications send performance data as a `POST` request to `/api/metric-data/ingest`. This endpoint is secured by an `X-API-KEY` header, which identifies and authorizes the sending application. `MetricDataService` validates the key, maps the data to existing metrics, and persists it.
5.  **Metric Data Retrieval**: `USER` or `ADMIN` users can query historical metric data through REST APIs, specifying metric ID and time ranges. `MetricDataService` retrieves data from the repository, potentially using optimized queries.
6.  **Caching**: `MonitoredApplicationService` and `MetricService` utilize caching (Caffeine) to reduce database load for frequently accessed read operations (e.g., `getApplicationById`, `getMetricById`).

## 4. Scalability and Reliability Considerations

*   **Stateless Backend**: JWT-based authentication ensures the backend is stateless, simplifying horizontal scaling by adding more instances.
*   **Database Scaling**: PostgreSQL can be scaled vertically (more powerful hardware) or horizontally (read replicas, sharding for larger datasets).
*   **Caching**: Reduces database load and improves response times for read-heavy operations.
*   **Rate Limiting**: Protects backend resources from being overwhelmed by excessive requests.
*   **Asynchronous Processing**: For very high ingestion rates, the `metric-data/ingest` endpoint could be enhanced to push data to a message queue (e.g., Kafka, RabbitMQ) for asynchronous processing, decoupling ingestion from persistence and allowing for backpressure management.
*   **Monitoring**: Spring Boot Actuator, combined with external monitoring tools (Prometheus, Grafana), provides visibility into application health and performance metrics, crucial for identifying and resolving issues.
*   **Containerization**: Docker and Docker Compose enable consistent deployment across environments and simplify orchestration with tools like Kubernetes.

## 5. Security Aspects

*   **Authentication**: JWT for secure, stateless user authentication.
*   **Authorization**: Role-based access control to restrict actions based on user roles.
*   **Password Hashing**: BCrypt for secure storage of user passwords.
*   **API Keys**: Unique, robustly generated API keys for external application data ingestion.
*   **Input Validation**: `jakarta.validation` annotations at the DTO and controller layers prevent common injection attacks and ensure data integrity.
*   **Error Handling**: Obfuscates internal server details from client responses.
*   **HTTPS**: Critical for production deployments to encrypt all traffic. (Implicitly assumed for production setup).

This architecture provides a solid foundation for a performant, secure, and manageable performance monitoring system.