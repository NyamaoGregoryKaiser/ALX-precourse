```markdown
# ALX Data Visualization Tool - Architecture Documentation

This document describes the architecture of the ALX Data Visualization Tool, detailing its components, their interactions, and the design decisions made to achieve an enterprise-grade, scalable, and maintainable system.

---

## 1. System Overview

The Data Visualization Tool is designed as a web application allowing users to manage data sources, create interactive dashboards, and design various charts. It follows a multi-tier architecture, separating presentation, business logic, and data persistence layers.

**Key Design Principles:**
*   **Modularity:** Separation of concerns using Spring Boot's component model.
*   **Scalability:** Stateless backend for horizontal scaling, caching layer, and database optimization considerations.
*   **Security:** Robust authentication (JWT) and authorization (RBAC + resource-based).
*   **Resilience:** Comprehensive error handling, rate limiting.
*   **Observability:** Integrated logging and monitoring with Actuator/Prometheus.
*   **Maintainability:** Clear code structure, DTOs for API consistency, automated testing.

## 2. Component Breakdown

### 2.1. Frontend (Conceptual)

*   **Technology:** React.js
*   **Purpose:** Provides the user interface for interacting with the backend API.
*   **Key Components:**
    *   **Authentication/Authorization Module:** Handles user login, registration, and manages JWT tokens.
    *   **Dashboard Listing/Viewing:** Displays user's dashboards, allows navigation to individual dashboards.
    *   **Dashboard Editor:** Drag-and-drop interface for arranging charts on a dashboard.
    *   **Chart Editor:** Interface for creating/editing charts, selecting data sources, defining chart types and configurations (e.g., axis mappings, aggregations).
    *   **Data Source Manager:** UI for connecting to, configuring, and viewing data sources.
    *   **Visualization Renderer:** Integrates with libraries like Recharts or Nivo to render charts based on data from the backend and chart configurations.
*   **Communication:** Uses RESTful API calls to the Java backend.

### 2.2. Backend Application

*   **Technology:** Spring Boot (Java 17)
*   **Deployment:** Containerized (Docker), designed for cloud-native environments (Kubernetes).
*   **Layers:**

    #### 2.2.1. API Layer (Controllers)
    *   **Purpose:** Exposes RESTful endpoints for the frontend and external clients. Handles HTTP requests, input validation, and marshaling/unmarshaling JSON data.
    *   **Components:** `AuthController`, `UserController`, `DataSourceController`, `DashboardController`, `ChartController`.
    *   **Key Responsibilities:**
        *   Receive HTTP requests.
        *   Validate request payloads using JSR 380 annotations (`@Valid`).
        *   Delegate business logic to the Service Layer.
        *   Return appropriate HTTP status codes and JSON responses.
        *   Integrates with Spring Security for pre-authentication checks (`@PreAuthorize`).
        *   `@RestControllerAdvice` for global error handling.

    #### 2.2.2. Business Logic Layer (Services)
    *   **Purpose:** Contains the core business rules, orchestrates operations across multiple repositories, and performs complex data transformations/aggregations.
    *   **Components:** `UserService`, `DataSourceService`, `DashboardService`, `ChartService`, `JwtService`.
    *   **Key Responsibilities:**
        *   Implement business rules and workflows.
        *   Interact with the Data Access Layer (Repositories).
        *   Perform data processing for visualizations (`DataProcessor`).
        *   Apply caching logic (`@Cacheable`, `@CacheEvict`).
        *   Manage transactions (`@Transactional`).
        *   Implement granular authorization checks (e.g., resource ownership).
        *   Map between DTOs and Entity models using `ModelMapper`.

    #### 2.2.3. Data Access Layer (Repositories)
    *   **Technology:** Spring Data JPA with Hibernate
    *   **Purpose:** Provides an abstraction over the underlying database, handling CRUD operations and complex queries.
    *   **Components:** `UserRepository`, `DataSourceRepository`, `DashboardRepository`, `ChartRepository`.
    *   **Key Responsibilities:**
        *   Persistence of `Model` entities to the database.
        *   Retrieval of data based on various criteria.
        *   Error handling for database-specific exceptions.
        *   Leverages Spring Data JPA's conventions for derived queries and pagination.

    #### 2.2.4. Security Module
    *   **Technology:** Spring Security, `jjwt` library
    *   **Purpose:** Handles authentication and authorization for all API endpoints.
    *   **Components:**
        *   `SecurityConfig`: Main configuration for HTTP security rules, CORS, authentication providers.
        *   `JwtAuthFilter`: Intercepts requests, validates JWT tokens, and sets up the Spring Security context.
        *   `JwtService`: Utility for generating, validating, and parsing JWT tokens.
        *   `CustomUserDetailsService`: Integrates user details from the database with Spring Security.
        *   `JwtAuthEntryPoint`: Handles unauthorized access attempts.
        *   `CustomAccessDeniedHandler`: Handles forbidden access attempts.
        *   `UserSecurity`, `DataSourceSecurity`, etc.: Custom security predicates for `@PreAuthorize` annotations, enabling resource-level authorization.
    *   **Authorization Strategy:** Role-Based Access Control (RBAC) complemented by resource ownership checks.

    #### 2.2.5. Utilities & Cross-Cutting Concerns
    *   **`DataProcessor`**: A service responsible for simulating data retrieval from various `DataSource` types (CSV, Database, API) and converting it into a standardized `DataPointDto` format suitable for visualization. In a real-world scenario, this would integrate with actual data connectors (JDBC, HTTP clients, file readers).
    *   **`RateLimitingFilter`**: A custom `OncePerRequestFilter` that applies API rate limits based on client IP address using `Bucket4j`. This protects against abuse and ensures fair usage.
    *   **Caching (`CacheConfig`, `Caffeine`)**: Configures Spring's caching abstraction with Caffeine as the underlying cache provider. Annotations like `@Cacheable` and `@CacheEvict` are used in service methods to cache frequently accessed data (e.g., user profiles, dashboard details, processed chart data).
    *   **Error Handling (`GlobalExceptionHandler`)**: A `@ControllerAdvice` component that centralizes exception handling across all controllers, providing consistent JSON error responses.
    *   **Logging (`logback-spring.xml`)**: Configured with SLF4J and Logback for structured logging to console and file, with different levels for various packages.
    *   **Monitoring (`Actuator`, `OpenAPIConfig`)**: Spring Boot Actuator endpoints expose health, metrics, and environment details. Micrometer integration allows exporting metrics to Prometheus. Springdoc OpenAPI provides interactive API documentation (Swagger UI).

### 2.3. Database Layer

*   **Technology:** PostgreSQL
*   **Purpose:** Persistent storage for application data.
*   **Schema:** Defined by JPA entities and managed by Flyway migrations.
    *   `app_user`: Stores user authentication and profile information.
    *   `user_roles`: Maps users to roles (USER, ADMIN).
    *   `data_source`: Stores connection details and metadata for external data sources.
    *   `dashboard`: Stores metadata for user-created dashboards.
    *   `chart`: Stores chart configurations, linking to data sources and dashboards.
*   **Migration:** Flyway is used for version-controlled database schema migrations, ensuring consistent database states across environments. `V1__initial_schema.sql` creates tables and inserts seed data.
*   **Query Optimization:** Repositories use Spring Data JPA features (e.g., pagination, derived queries). For complex reporting queries, custom JPA `@Query` or native SQL could be introduced.

### 2.4. Infrastructure & DevOps

*   **Docker:** Used for containerizing the Spring Boot application and PostgreSQL database, providing environment consistency.
*   **Docker Compose:** Orchestrates the multi-container application locally, simplifying setup and development.
*   **CI/CD (Jenkins):** A `Jenkinsfile` outlines a robust pipeline for:
    *   Automated builds.
    *   Running unit, integration, and API tests.
    *   Code quality checks (e.g., JaCoCo for coverage, conceptual SonarQube integration).
    *   Docker image building and pushing to a registry.
    *   Automated deployment to development and production environments (e.g., Kubernetes, Docker Swarm).
    *   Post-deployment API and performance testing.

## 3. Data Flow

1.  **User Interaction (Frontend):** User logs in, creates a dashboard, adds a chart.
2.  **API Call (Frontend to Backend):** Frontend sends authenticated (JWT) HTTP requests to the backend API (e.g., `POST /api/dashboards`).
3.  **Authentication & Authorization (Backend Security Filter Chain):**
    *   `RateLimitingFilter` checks request rate.
    *   `JwtAuthFilter` extracts and validates the JWT.
    *   Spring Security authenticates the user and establishes their roles/permissions.
    *   `@PreAuthorize` on controller/service methods checks if the user is authorized for the specific resource/action.
4.  **Controller Processing:** The relevant controller (`DashboardController`) receives the request. Input `DashboardDto` is validated.
5.  **Service Layer Logic:** The controller delegates to `DashboardService`.
    *   `DashboardService` performs business logic (e.g., associates the dashboard with the current user).
    *   It uses `ModelMapper` to convert `DashboardDto` to `Dashboard` entity.
    *   It interacts with `DashboardRepository` to persist the new dashboard.
    *   Caching might be involved (`@CacheEvict` on creation/update/delete, `@Cacheable` on read operations).
6.  **Data Access (Repository to Database):** `DashboardRepository` uses JPA/Hibernate to interact with PostgreSQL, saving the `Dashboard` entity.
7.  **Data Retrieval (for Charts):**
    *   When a chart needs to display data, the frontend calls `GET /api/charts/{chartId}/data`.
    *   `ChartService` retrieves the `Chart` and its associated `DataSource`.
    *   It then calls `DataSourceService.getProcessedDataSourceData()` which uses `DataProcessor`.
    *   `DataProcessor` (simulated): Determines data source type (CSV, DB, API) from `connectionDetails` and generates `List<DataPointDto>`. In a real scenario, this involves fetching data from external systems.
    *   `ChartService` may apply further aggregations/filters based on `chart.getConfiguration()` (e.g., group by, sum, filter dates).
8.  **Response Back to Frontend:** The processed `DataPointDto` list is sent back to the frontend for rendering by a visualization library.

## 4. Scalability and Performance Considerations

*   **Stateless Backend:** JWT-based authentication means no session state on the server, allowing for easy horizontal scaling of backend instances.
*   **Database Scaling:** PostgreSQL can be scaled vertically (more powerful server) or horizontally (read replicas, sharding for very large datasets).
*   **Caching:** In-memory caching with Caffeine (configured via Spring Cache) reduces database load for frequently accessed read operations (e.g., fetching dashboards, user profiles, chart data). Can be extended to distributed caches (Redis, Memcached) for multi-instance deployments.
*   **Rate Limiting:** Protects the API from being overwhelmed by too many requests from a single client.
*   **Efficient Data Access:** Spring Data JPA provides efficient repository methods and supports pagination, reducing data transfer over the network.
*   **Asynchronous Processing:** For long-running data source processing or report generation, asynchronous tasks (e.g., Spring @Async, message queues like Kafka/RabbitMQ) could be introduced to avoid blocking API requests.

## 5. Security Considerations

*   **Authentication:** JWT ensures secure, stateless authentication. Tokens are short-lived and refreshed.
*   **Authorization:**
    *   **Role-Based:** `ADMIN` vs `USER` roles enforce broad access policies.
    *   **Resource-Based:** `@PreAuthorize` with custom security evaluators (`UserSecurity`, `DashboardSecurity`, etc.) ensures users can only access/modify resources they own (or if they are an `ADMIN`).
*   **Password Hashing:** `BCryptPasswordEncoder` is used to securely store passwords.
*   **Input Validation:** JSR 380 ensures malformed inputs are rejected early.
*   **CORS Configuration:** Explicitly configured to allow requests only from trusted frontend origins.
*   **Secure Defaults:** Spring Security provides many out-of-the-box protections (CSRF disabled for stateless API, secure headers).
*   **Dependency Security:** Regular updates of dependencies (via Maven) and use of tools like Dependabot to catch vulnerabilities.

---
```