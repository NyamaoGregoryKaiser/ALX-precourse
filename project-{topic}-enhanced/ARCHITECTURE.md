```markdown
# Task Manager Backend Architecture Documentation

This document provides a high-level overview of the architecture of the Task Manager Backend, highlighting its key components, layers, and interactions.

## 1. High-Level Overview

The Task Manager Backend is a monolithic Spring Boot application designed to serve RESTful APIs for a mobile task management application. It follows a layered architectural pattern, promoting separation of concerns and maintainability.

```
+----------------+
|  Mobile Client |
| (iOS/Android)  |
+-------+--------+
        | HTTP/HTTPS (REST API)
        v
+-------------------------------------------------+
|               Task Manager Backend              |
|                                                 |
| +---------------------------------------------+ |
| |        API Gateway (e.g., Nginx, LB)        | |  (Optional for production)
| +---------------------------------------------+ |
|                        |                        |
| +----------------------+---------------------+ |
| |               Rate Limiting               | |
| +----------------------+---------------------+ |
|                        |                        |
| +----------------------+---------------------+ |
| |      Spring Security (JWT AuthN/AuthZ)    | |
| +----------------------+---------------------+ |
|                        |                        |
| +----------------------+---------------------+ |
| |       Global Exception Handler            | |
| +----------------------+---------------------+ |
|                        |                        |
| +----------------------+---------------------+ |
| |            Controller Layer (REST APIs)     | |
| | +-----------------------------------------+ | |
| | | AuthController, UserController,         | | |
| | | CategoryController, TaskController      | | |
| | +-----------------------------------------+ | |
| +----------------------+---------------------+ |
|                        | DTOs                 |
| +----------------------+---------------------+ |
| |               Service Layer                 | |
| | +-----------------------------------------+ | |
| | | UserService, CategoryService, TaskService | | |
| | | (Business Logic, Transactions, Caching) | | |
| | +-----------------------------------------+ | |
| +----------------------+---------------------+ |
|                        | Entities             |
| +----------------------+---------------------+ |
| |             Repository Layer (JPA)          | |
| | +-----------------------------------------+ | |
| | | UserRepository, CategoryRepository,     | | |
| | | TaskRepository                          | | |
| | +-----------------------------------------+ | |
| +----------------------+---------------------+ |
|                        | Entities (via Hibernate) |
| +----------------------+---------------------+ |
| |              Database Layer (PostgreSQL)    | |
| | +-----------------------------------------+ | |
| | | Tables: users, categories, tasks        | | |
| | | Flyway (Schema Migrations)              | | |
| | +-----------------------------------------+ | |
| +-------------------------------------------------+
```

## 2. Architectural Layers

The application is structured into distinct layers, each with specific responsibilities:

### 2.1. Controller Layer (`com.alx.taskmgr.controller`)

*   **Responsibility:** Exposes RESTful API endpoints, handles HTTP requests, marshals/unmarshals JSON data (DTOs), and delegates business logic to the Service Layer.
*   **Technologies:** Spring Web (`@RestController`, `@RequestMapping`, `@GetMapping`, etc.), `@Valid` for input validation.
*   **Security:** Uses Spring Security annotations (`@PreAuthorize`) for method-level authorization.
*   **Features:** API documentation via Springdoc OpenAPI (`@Tag`, `@Operation`, `@SecurityRequirement`).

### 2.2. Service Layer (`com.alx.taskmgr.service`)

*   **Responsibility:** Contains the core business logic. Orchestrates operations, applies business rules, interacts with the Repository Layer, and handles transactions.
*   **Technologies:** Spring `@Service`, `@Transactional`, `@RequiredArgsConstructor` (Lombok).
*   **Features:**
    *   **Caching:** `@Cacheable` and `@CacheEvict` annotations integrate with Spring's caching abstraction (Ehcache).
    *   **Input Validation:** Relies on DTO validation handled at the Controller layer, but can add more complex business rule validations here.

### 2.3. Repository Layer (`com.alx.taskmgr.repository`)

*   **Responsibility:** Provides data access operations (CRUD) for entities. Abstracts away the underlying database technology.
*   **Technologies:** Spring Data JPA, extending `JpaRepository`.
*   **Features:** Custom query methods are automatically implemented by Spring Data JPA based on method names (e.g., `findByUserIdAndCompleted`).

### 2.4. Model Layer (`com.alx.taskmgr.model`)

*   **Responsibility:** Defines the data structure (entities) that map directly to database tables.
*   **Technologies:** JPA annotations (`@Entity`, `@Table`, `@Id`, `@OneToMany`, `@ManyToOne`), Lombok (`@Data`, `@Builder`).
*   **Relationships:** Defines relationships between entities (e.g., `User` has many `Tasks` and `Categories`).

### 2.5. Data Transfer Objects (DTOs) (`com.alx.taskmgr.dto`)

*   **Responsibility:** Objects used for data transfer between the client and the server (and sometimes between layers). They decouple the API from the internal domain model.
*   **Features:** Includes validation annotations (`@NotBlank`, `@Size`, `@Email`).

## 3. Cross-Cutting Concerns

### 3.1. Authentication & Authorization

*   **Technology:** Spring Security, JWT (JSON Web Tokens).
*   **Flow:**
    1.  User registers/logs in via `AuthController`.
    2.  Upon successful login, a JWT token is generated by `JwtService` and returned to the client.
    3.  For subsequent requests, the client sends the JWT in the `Authorization` header.
    4.  `JwtAuthFilter` intercepts requests, validates the JWT using `JwtService`, and sets the `Authentication` context.
    5.  `@PreAuthorize` annotations on controller methods enforce role-based access.

### 3.2. Error Handling

*   **Technology:** Spring's `@RestControllerAdvice` and `@ExceptionHandler`.
*   **Implementation:** `GlobalExceptionHandler` provides a centralized mechanism to catch specific exceptions (`ResourceNotFoundException`, `UserAlreadyExistsException`, `MethodArgumentNotValidException`) and return consistent, meaningful HTTP error responses (e.g., 404 Not Found, 409 Conflict, 400 Bad Request).

### 3.3. Logging

*   **Technology:** SLF4J (facade) and Logback (implementation).
*   **Configuration:** `logback-spring.xml` defines appenders (console, file), log patterns, and log levels.
*   **Monitoring:** Spring Boot Actuator exposes `/actuator/health`, `/actuator/info`, `/actuator/metrics` endpoints for application monitoring.

### 3.4. Caching

*   **Technology:** Spring Cache abstraction with Ehcache.
*   **Mechanism:** In-memory caching for frequently accessed read operations (e.g., retrieving user profiles, categories, tasks). Reduces database load and improves response times.

### 3.5. Rate Limiting

*   **Technology:** Custom Spring `HandlerInterceptor` using Guava `RateLimiter`.
*   **Purpose:** Protects specific endpoints (e.g., `/api/users/me`) from excessive requests from a single IP address, preventing abuse and ensuring service availability.

### 3.6. Database Migration

*   **Technology:** Flyway.
*   **Purpose:** Manages schema changes in a version-controlled and idempotent manner. Ensures the database schema is always compatible with the application code.

## 4. Deployment Architecture

The application is containerized using Docker.

*   **`Dockerfile`:** Defines how to build the Spring Boot application's Docker image.
*   **`docker-compose.yml`:** Orchestrates the deployment of the application container alongside a PostgreSQL database container, facilitating local development and single-server deployment.
*   **CI/CD (GitHub Actions):** Automates the build, test, Docker image creation, and deployment process (pushing to Docker Hub and deploying to a target server via SSH).

## 5. Scalability Considerations

*   **Stateless Backend:** The use of JWTs makes the backend largely stateless, simplifying horizontal scaling.
*   **Database:** PostgreSQL can be scaled vertically (more powerful server) or horizontally (read replicas, sharding) for high-traffic scenarios.
*   **Caching:** While Ehcache is in-memory and scales with the application instance, for true distributed caching, an external solution like Redis or Memcached would be integrated.
*   **Load Balancing:** Deploying multiple instances of the backend behind a load balancer (e.g., Nginx, AWS ELB) is straightforward due to its stateless nature.
*   **Microservices:** While currently a monolith, the layered architecture and clear separation of concerns make it a candidate for future decomposition into microservices if specific parts require independent scaling or development.
```