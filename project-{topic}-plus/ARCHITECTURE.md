```markdown
# Task Manager Pro - Architecture Documentation

This document describes the architectural design of the Task Manager Pro API, a comprehensive task management system built with Spring Boot, PostgreSQL, and various enterprise-grade features.

## 1. Overview

The Task Manager Pro is a multi-layered application designed to provide robust CRUD operations for tasks, categories, and user management, along with essential features like authentication, authorization, caching, and rate limiting.

## 2. High-Level Architecture

The system follows a typical **Client-Server Architecture** with a clear separation of concerns:

```
+----------------+       +------------------+       +-------------------+
|    Frontend    | ----> |   API Gateway    | ----> |     Backend       |
| (HTML/JS Demo) |       | (Optional/N/A)   |       | (Spring Boot App) |
+----------------+       +------------------+       +-------------------+
                                                          |
                                                          | Database Access (JPA/JDBC)
                                                          V
                                                +-----------------+
                                                |   PostgreSQL    |
                                                |     Database    |
                                                +-----------------+
```

-   **Frontend:** A simple HTML/JavaScript application demonstrating interaction with the API. In a real-world scenario, this would typically be a Single Page Application (SPA) built with frameworks like React, Angular, or Vue.js.
-   **API Gateway (Optional):** For complex microservices architectures, an API Gateway (e.g., Spring Cloud Gateway, NGINX) would sit in front of the backend to handle routing, load balancing, security, and more. For this monolithic backend, the Spring Boot application directly exposes its endpoints.
-   **Backend (Spring Boot):** The core of the system, implementing business logic, data persistence, and exposing RESTful APIs.
-   **Database (PostgreSQL):** A relational database for storing application data.

## 3. Backend Architecture (Spring Boot)

The Spring Boot backend adopts a **Layered Architecture** to promote modularity, maintainability, and testability.

```
+-------------------------------------------------------+
|                 Clients (Frontend, Other APIs)        |
+-------------------------------------------------------+
    | HTTP Requests
    V
+-------------------------------------------------------+
|  **Presentation Layer (Controllers)**                 |
|  - `AuthController`, `TaskController`, `CategoryController`, `UserController`
|  - Handles HTTP requests, parses DTOs, returns responses
|  - Invokes Service Layer methods
|  - Global Exception Handling (`GlobalExceptionHandler`)
|  - Security: JWT Authentication Filter (`JwtAuthFilter`)
|  - Rate Limiting (`RateLimitInterceptor`)
+-------------------------------------------------------+
    | Method Calls, DTOs
    V
+-------------------------------------------------------+
|  **Business/Service Layer (Services)**                |
|  - `AuthService`, `TaskService`, `CategoryService`, `UserService`, `JwtService`
|  - Contains core business logic and rules
|  - Orchestrates interactions between multiple repositories
|  - Performs validation, authorization checks (e.g., ownership for tasks)
|  - Transaction Management (`@Transactional`)
|  - Caching (`@Cacheable`, `@CacheEvict`)
+-------------------------------------------------------+
    | Entity Objects
    V
+-------------------------------------------------------+
|  **Persistence/Data Access Layer (Repositories)**     |
|  - `UserRepository`, `TaskRepository`, `CategoryRepository`
|  - Abstraction over database operations
|  - Uses Spring Data JPA for CRUD and custom query methods
+-------------------------------------------------------+
    | JPA / JDBC / SQL
    V
+-------------------------------------------------------+
|  **Database Layer (PostgreSQL)**                      |
|  - Stores persistent data
|  - Managed by Flyway for schema migrations
+-------------------------------------------------------+
```

### 3.1. Key Components

*   **Entities (`com.alx.taskmgr.entity`):** JPA annotated classes (`User`, `Task`, `Category`, `Role`, `TaskStatus`) representing the domain model and database tables.
*   **Data Transfer Objects (DTOs) (`com.alx.taskmgr.dto`):** Plain Java objects (`AuthRequest`, `RegisterRequest`, `TaskRequest`, `TaskResponse`, etc.) used for transferring data between the client and the server, and between different layers. They decouple the API contract from the internal entity model.
*   **Repositories (`com.alx.taskmgr.repository`):** Spring Data JPA interfaces that extend `JpaRepository`, providing powerful, convention-over-configuration data access methods.
*   **Services (`com.alx.taskmgr.service`):** Implement the core business logic. They encapsulate transactions, caching logic, and interact with multiple repositories.
*   **Controllers (`com.alx.taskmgr.controller`):** RESTful endpoints that expose the application's functionality. They receive HTTP requests, delegate to services, and return HTTP responses.
*   **Configuration (`com.alx.taskmgr.config`):** Spring `@Configuration` classes for setting up various aspects of the application, including:
    *   **Spring Security (`SecurityConfig`, `ApplicationConfig`):** Defines security filter chains, authentication providers, and password encoders.
    *   **JWT (`JwtAuthFilter`, `JwtService`):** Custom filter for JWT token validation and service for token generation/parsing.
    *   **Caching (`CachingConfig`):** Configures Caffeine as the caching provider.
    *   **Rate Limiting (`RateLimitInterceptor`, `BucketProvider`, `WebMvcConfig`):** Custom interceptor using Bucket4j for API rate limiting.
    *   **Web MVC (`WebMvcConfig`):** Registers custom interceptors and static resource handlers.
*   **Exception Handling (`com.alx.taskmgr.exception`, `GlobalExceptionHandler`):** Custom exception classes and a `@RestControllerAdvice` to centralize and standardize error responses for the API.
*   **Logging:** Configured with SLF4J and Logback (`logback-spring.xml`) for structured logging to console and rolling files.

## 4. Database Schema

The database schema is managed by **Flyway** for version control and migrations. The core entities are:

*   **`users`:** Stores user information (`id`, `fullName`, `email`, `password`, `createdAt`, `updatedAt`). `email` is unique.
*   **`user_roles`:** A join table for `users` and `roles` (as an `@ElementCollection` in `User` entity, this becomes a simple join table with `user_id` and `role`).
*   **`categories`:** Stores task categories (`id`, `name`, `createdAt`, `updatedAt`). `name` is unique.
*   **`tasks`:** Stores task details (`id`, `title`, `description`, `dueDate`, `status`, `owner_id` (FK to `users`), `category_id` (FK to `categories`), `createdAt`, `updatedAt`).

Relationships:
*   `User` (One) to `Task` (Many): A user can own multiple tasks. (`owner_id` in `tasks` table).
*   `Category` (One) to `Task` (Many): A category can have multiple tasks. (`category_id` in `tasks` table).

**Migration Strategy (Flyway):**
*   `V1__initial_schema.sql`: Sets up all necessary tables, constraints, and indexes.
*   `V2__add_seed_data.sql`: Inserts initial data like an admin user, a regular user, and default categories/tasks.

## 5. Security

**Authentication:** JWT (JSON Web Token) based.
*   Users register or authenticate by sending credentials to `/api/v1/auth/register` or `/api/v1/auth/authenticate`.
*   Upon successful authentication, a JWT token is issued.
*   This token must be included in the `Authorization` header as `Bearer <token>` for all subsequent protected requests.
*   `JwtAuthFilter` intercepts requests, validates the JWT, and sets the `Authentication` object in Spring Security's context.

**Authorization:** Role-based.
*   Users have roles (`ROLE_USER`, `ROLE_ADMIN`).
*   Spring Security's `@PreAuthorize` annotation is used on controller methods to restrict access based on roles (e.g., `hasRole('ADMIN')`, `hasAnyRole('USER', 'ADMIN')`).
*   `ADMIN` role has elevated privileges (e.g., creating/deleting categories, viewing all tasks).

## 6. Caching

*   **Spring Cache Abstraction** with **Caffeine** as the underlying cache provider.
*   Enabled via `@EnableCaching` on `TaskmgrApplication` and configured in `CachingConfig`.
*   `@Cacheable` is used on read-heavy service methods (e.g., `CategoryService.getAllCategories`, `TaskService.getAllTasksForUser`, `TaskService.getTaskById`) to cache results.
*   `@CacheEvict` is used on modifying methods (e.g., `CategoryService.createCategory`, `TaskService.updateTask`) to invalidate relevant cache entries, ensuring data consistency.

## 7. Rate Limiting

*   Implemented using the **Bucket4j Spring Boot Starter** and a custom `RateLimitInterceptor`.
*   The `RateLimitInterceptor` is registered with Spring MVC (`WebMvcConfig`) to apply to `/api/v1/**` endpoints (excluding `/api/v1/auth/**`).
*   Each client (identified by IP address) is assigned a token bucket.
*   The default policy is **10 requests per minute**. If a client exceeds this, a `TooManyRequestsException` (HTTP 429) is returned.

## 8. Development and Deployment

*   **Maven:** Used for dependency management and project building (`pom.xml`).
*   **Docker:** `Dockerfile` provides instructions to containerize the Spring Boot application.
*   **Docker Compose:** `docker-compose.yml` orchestrates the application (`app`) and the PostgreSQL database (`db`) for easy local development and testing.
*   **CI/CD (Conceptual):** A `.github/workflows/ci-cd.yml` file demonstrates a GitHub Actions pipeline for:
    *   **Continuous Integration (CI):** Building the application and running tests on every push/pull request.
    *   **Continuous Deployment (CD):** Building and pushing a Docker image to Docker Hub, and conceptually deploying to a target environment (e.g., EC2) on pushes to the `main` branch.

## 9. Testing Strategy

The project employs a multi-faceted testing approach:

*   **Unit Tests:** Focus on individual components (e.g., services) in isolation, mocking dependencies. Achieved using JUnit 5 and Mockito. (Examples: `AuthServiceTest`, `CategoryServiceTest`, `TaskServiceTest`). Aims for 80%+ code coverage (enforced by JaCoCo plugin).
*   **Integration Tests (Repository Layer):** Verify that data access components interact correctly with the actual database. Uses Spring Boot's `@DataJpaTest` and **Testcontainers** to spin up a real PostgreSQL instance for each test run, ensuring database-specific logic is validated. (Example: `UserRepositoryTest`).
*   **API Tests (Controller Layer):** Verify that API endpoints behave as expected, handling requests, responses, and authorization correctly. Uses Spring Boot's `@WebMvcTest` and **MockMvc** to simulate HTTP requests without starting a full server. (`AuthControllerTest`, `TaskControllerTest`).
*   **Performance Tests (Conceptual):** Described as using tools like JMeter or k6 to simulate high load and measure response times, throughput, and error rates. (No code provided for this, but methodology is outlined).

## 10. Documentation

*   **README.md:** Comprehensive setup, build, run instructions, project overview.
*   **API Documentation:** Integrated **Springdoc-openapi** (Swagger UI). Accessible at `/swagger-ui.html` when the application is running. Provides an interactive interface to explore and test API endpoints.
*   **Architecture Documentation:** This `ARCHITECTURE.md` file.
*   **Deployment Guide:** Included within `README.md` (Docker-Compose based deployment).

## 11. Future Enhancements

*   **Pagination and Filtering:** For large datasets, implement pagination and robust filtering/sorting options for task retrieval.
*   **User Profile Updates:** Add endpoints for users to update their own profile information (name, password).
*   **Admin User Management:** Admin endpoints to manage users (e.g., assign roles, disable accounts).
*   **Task Assignment:** Feature to assign tasks to other users.
*   **Notifications:** Email or in-app notifications for task due dates, status changes, etc.
*   **Frontend Framework:** Replace the simple HTML/JS demo with a full-fledged SPA using React, Angular, or Vue.js for a richer user experience.
*   **Metrics and Monitoring:** Integrate Micrometer with Prometheus and Grafana for real-time application metrics and dashboards.
*   **Distributed Caching:** For distributed deployments, use a dedicated cache server like Redis.
*   **More Advanced Rate Limiting:** Implement rate limiting based on user ID or API key, not just IP address.
*   **Observability:** Implement tracing with tools like Zipkin/Jaeger.
```