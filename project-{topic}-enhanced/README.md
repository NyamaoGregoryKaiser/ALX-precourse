```markdown
# ALX Task Manager Backend (Java Spring Boot)

This is a comprehensive, production-ready backend system for a mobile task management application, built using Java Spring Boot. It provides robust API endpoints, handles authentication/authorization, integrates with a PostgreSQL database, includes caching, logging, rate limiting, and is ready for containerized deployment with Docker and CI/CD pipelines.

## Table of Contents

1.  [Features](#features)
2.  [Technology Stack](#technology-stack)
3.  [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Local Development Setup](#local-development-setup)
    *   [Running with Docker Compose](#running-with-docker-compose)
4.  [API Documentation (Swagger UI)](#api-documentation-swagger-ui)
5.  [Authentication & Authorization](#authentication--authorization)
6.  [Database Layer](#database-layer)
7.  [Caching](#caching)
8.  [Rate Limiting](#rate-limiting)
9.  [Logging & Monitoring](#logging--monitoring)
10. [Testing](#testing)
11. [Deployment Guide](#deployment-guide)
12. [Architecture Documentation](#architecture-documentation)
13. [Contribution](#contribution)
14. [License](#license)

## Features

*   **User Management:** Register, Login, User Profile retrieval.
*   **Task Management:** Full CRUD operations for tasks (create, read, update, delete).
*   **Category Management:** Full CRUD operations for user-specific task categories.
*   **Task Filtering:** Filter tasks by completion status, overdue status, or category.
*   **Authentication & Authorization:** Secure JWT-based authentication and role-based access control (RBAC).
*   **Database:** PostgreSQL with Flyway for robust schema migrations.
*   **Caching:** Ehcache for in-memory caching of frequently accessed data to improve performance.
*   **Rate Limiting:** Protects API endpoints from abuse and ensures fair usage.
*   **Logging:** Centralized logging with Logback for effective debugging and monitoring.
*   **Monitoring:** Spring Boot Actuator for health checks and application metrics.
*   **Error Handling:** Global exception handling middleware for consistent API error responses.
*   **Validation:** Input validation using Jakarta Bean Validation.
*   **Containerization:** Dockerfile and Docker Compose for easy setup and deployment.
*   **CI/CD:** GitHub Actions workflow for automated build, test, and Docker image pushing.
*   **API Documentation:** Self-generating OpenAPI (Swagger UI) documentation.

## Technology Stack

*   **Language:** Java 17
*   **Framework:** Spring Boot 3
*   **Build Tool:** Apache Maven
*   **Database:** PostgreSQL
*   **ORM:** Spring Data JPA (Hibernate)
*   **Database Migrations:** Flyway
*   **Authentication:** Spring Security, JWT (JJWT library)
*   **Caching:** Spring Cache with Ehcache
*   **Rate Limiting:** Google Guava RateLimiter (in-memory)
*   **Logging:** SLF4J + Logback
*   **Monitoring:** Spring Boot Actuator
*   **API Documentation:** Springdoc OpenAPI (Swagger UI)
*   **Testing:** JUnit 5, Mockito, Spring Boot Test, JaCoCo (code coverage)
*   **Containerization:** Docker, Docker Compose
*   **CI/CD:** GitHub Actions

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

*   **Java Development Kit (JDK) 17 or higher**
*   **Apache Maven 3.6.0 or higher**
*   **Docker Desktop** (or Docker Engine and Docker Compose) for containerized setup
*   **Git**

### Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/task-manager-backend.git
    cd task-manager-backend
    ```

2.  **Build the project:**
    ```bash
    mvn clean install
    ```
    This will compile the code, run tests, and package the application into a JAR file.

3.  **Run the application locally (using H2 in-memory database):**
    You can run the application using Spring Boot's Maven plugin, activating the `dev` profile which uses an H2 in-memory database for convenience.

    ```bash
    mvn spring-boot:run -Dspring-boot.run.profiles=dev
    ```
    The application will start on `http://localhost:8080`.
    The H2 Console will be available at `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:taskmgrdb`, User: `sa`, Password: ` `).

### Running with Docker Compose

For a more production-like environment with PostgreSQL, use Docker Compose.

1.  **Build the Docker image for the backend:**
    Ensure you've run `mvn clean install` first to generate the JAR file.
    ```bash
    docker build -t task-manager-backend .
    ```
    Alternatively, the `docker-compose.yml` will build the image automatically if it doesn't exist.

2.  **Start the application and database containers:**
    ```bash
    docker-compose up -d
    ```
    This command will:
    *   Pull the PostgreSQL image if not already present.
    *   Create a Docker network.
    *   Start the PostgreSQL database container.
    *   Build (if necessary) and start the Spring Boot application container, connecting it to the database.
    The backend will be accessible at `http://localhost:8080`. The database will also be accessible on `localhost:5432`.

3.  **Verify services are running:**
    ```bash
    docker-compose ps
    ```

4.  **Stop the services:**
    ```bash
    docker-compose down
    ```

## API Documentation (Swagger UI)

Once the application is running (locally or via Docker), you can access the interactive API documentation at:

*   **Swagger UI:** `http://localhost:8080/swagger-ui.html`
*   **OpenAPI Docs (JSON):** `http://localhost:8080/v3/api-docs`

This documentation allows you to explore all available endpoints, their request/response formats, and even test them directly from your browser.

## Authentication & Authorization

The backend implements JWT (JSON Web Token) based authentication using Spring Security.

*   **Registration:** `POST /api/auth/register` (creates a new user)
*   **Login:** `POST /api/auth/login` (authenticates user and returns a JWT token)

**To access protected endpoints:**
You must include the JWT token in the `Authorization` header of your requests, prefixed with `Bearer `.

Example: `Authorization: Bearer <your_jwt_token_here>`

**Role-Based Access Control:**
*   Most endpoints (`/api/tasks`, `/api/categories`, `/api/users/me`) require `ROLE_USER`.
*   `GET /api/users/{id}` (fetching any user by ID) requires `ROLE_ADMIN` (though in this basic implementation, all registered users default to `ROLE_USER`).

## Database Layer

*   **Database:** PostgreSQL is used for persistence.
*   **ORM:** Spring Data JPA with Hibernate is used for object-relational mapping.
*   **Migrations:** Flyway manages database schema evolution.
    *   Migration scripts are located in `src/main/resources/db/migration/`.
    *   `V1__initial_schema.sql` sets up the initial tables and indexes.
    *   Flyway automatically runs migrations on application startup.
*   **Seed Data:** `src/main/resources/data.sql` can be used for initial data population (primarily for H2, Flyway would typically use dedicated V*__data.sql scripts for more controlled production seeding).
*   **Query Optimization:**
    *   Indexes are defined on frequently queried columns (e.g., `username`, `email`, `user_id`, `due_date`, `completed`).
    *   Lazy loading is configured for one-to-many and many-to-one relationships to avoid unnecessary data fetching.
    *   Spring Data JPA repository methods are optimized for common CRUD and search patterns.

## Caching

*   **Technology:** Spring Cache abstraction with Ehcache as the underlying provider.
*   **Configuration:** `ehcache.xml` defines cache regions (`users`, `categories`, `tasks`) with specific time-to-live (TTL) and eviction policies.
*   **Usage:** `@Cacheable` annotations on service methods (e.g., `UserService.getUserById`, `CategoryService.getAllCategories`) cache method results. `@CacheEvict` annotations ensure caches are invalidated when data changes (e.g., after creating, updating, or deleting a task/category).

## Rate Limiting

*   **Implementation:** A custom Spring `HandlerInterceptor` (`RateLimitInterceptor`) is used.
*   **Technology:** Google Guava's `RateLimiter` provides a simple, in-memory rate limiting mechanism.
*   **Configuration:** Configured in `SecurityConfig` to apply to specific endpoints (e.g., `/api/users/me`).
*   **Behavior:** Blocks requests exceeding a defined rate (e.g., 5 requests per 10 seconds per IP address). Returns `HTTP 429 Too Many Requests` if the limit is exceeded.
*   **Note:** For production-grade rate limiting in a distributed environment, external solutions like Redis-backed rate limiters or API Gateways (e.g., AWS API Gateway, Netflix Zuul/Spring Cloud Gateway) are recommended.

## Logging & Monitoring

*   **Logging:**
    *   Uses SLF4J as the logging facade with Logback as the implementation.
    *   Configuration is in `src/main/resources/logback-spring.xml`.
    *   Logs are written to both console and a rolling file (`logs/task-manager-backend.log`).
    *   Configurable log levels for different packages (`com.alx.taskmgr` at `DEBUG`, `root` at `INFO`).
    *   SQL statements and their parameters are logged at `INFO` and `TRACE` levels respectively (can be adjusted).
*   **Monitoring:**
    *   Spring Boot Actuator provides production-ready features.
    *   Access Actuator endpoints at `http://localhost:8080/actuator` (e.g., `/health`, `/info`, `/metrics`).
    *   Enabled endpoints are configured in `application.yml`.

## Testing

The project emphasizes quality through a comprehensive testing suite:

*   **Unit Tests:** Focus on individual components (services, utilities) in isolation. Mock dependencies using Mockito.
    *   Example: `UserServiceTest.java`
*   **Integration Tests:** Test the interaction between multiple layers (e.g., controller to service, service to repository, full API endpoints). Use `@SpringBootTest`, `@DataJpaTest`, and `MockMvc`.
    *   Example: `UserRepositoryTest.java`, `TaskControllerIntegrationTest.java`
*   **API Tests:** Covered largely by `TaskControllerIntegrationTest` using `MockMvc` to simulate HTTP requests and assert API responses. This ensures API contracts are maintained.
*   **Code Coverage:** Achieved using JaCoCo Maven plugin, aiming for **80%+ line coverage**. The CI/CD pipeline includes a step to generate and upload coverage reports to Codecov.

To run all tests and generate a coverage report:
```bash
mvn clean test jacoco:report
```
The JaCoCo report will be available in `target/site/jacoco/index.html`.

## Deployment Guide

A detailed deployment guide is available in [DEPLOYMENT.md](DEPLOYMENT.md).

## Architecture Documentation

A high-level overview of the system's architecture is provided in [ARCHITECTURE.md](ARCHITECTURE.md).

## Contribution

Contributions are welcome! If you find a bug or have a feature request, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
```