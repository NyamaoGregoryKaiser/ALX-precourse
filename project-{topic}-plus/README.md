```markdown
# Task Manager Pro - Enterprise-Grade API Development System

## Table of Contents
1.  [Project Overview](#1-project-overview)
2.  [Features](#2-features)
3.  [Technologies Used](#3-technologies-used)
4.  [Architecture](#4-architecture)
5.  [Setup and Installation](#5-setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Development Setup (using Docker Compose)](#local-development-setup-using-docker-compose)
    *   [Building and Running Manually (without Docker)](#building-and-running-manually-without-docker)
6.  [Running the Frontend Demo](#6-running-the-frontend-demo)
7.  [API Documentation (Swagger UI)](#7-api-documentation-swagger-ui)
8.  [Database](#8-database)
    *   [Schema Definitions](#schema-definitions)
    *   [Migration Scripts](#migration-scripts)
    *   [Seed Data](#seed-data)
9.  [Testing](#9-testing)
    *   [Running Tests](#running-tests)
    *   [Code Coverage](#code-coverage)
    *   [Performance Testing (Conceptual)](#performance-testing-conceptual)
10. [CI/CD Pipeline (Conceptual)](#10-cicd-pipeline-conceptual)
11. [Additional Features](#11-additional-features)
    *   [Authentication & Authorization (JWT)](#authentication--authorization-jwt)
    *   [Logging & Monitoring](#logging--monitoring)
    *   [Error Handling Middleware](#error-handling-middleware)
    *   [Caching Layer](#caching-layer)
    *   [Rate Limiting](#rate-limiting)
12. [ALX Precourse Focus](#12-alx-precourse-focus)
13. [Contributing](#13-contributing)
14. [License](#14-license)

---

## 1. Project Overview

The Task Manager Pro is a comprehensive, production-ready API development system designed to manage tasks, categories, and users. This full-scale project demonstrates best practices in backend development using Java with Spring Boot, robust database management, a multi-layered architecture, advanced security features, extensive testing, and thorough documentation. It also includes a simple frontend demo to showcase API interaction.

## 2. Features

*   **User Management:**
    *   User registration (signup)
    *   User authentication (login with JWT)
    *   User profile retrieval (`/me` endpoint for authenticated user, by ID for admin)
*   **Task Management (CRUD):**
    *   Create, retrieve, update, delete tasks.
    *   Tasks are associated with an owner and a category.
    *   Authorization checks ensure users only access/modify their own tasks (or any task if ADMIN).
*   **Category Management (CRUD):**
    *   Create, retrieve, update, delete task categories.
    *   Restricted to `ADMIN` role.
*   **Robust Security:**
    *   JWT-based Authentication and Authorization with Spring Security.
    *   Role-based access control (`ROLE_USER`, `ROLE_ADMIN`) using `@PreAuthorize`.
*   **Logging:** Structured logging with Logback to console and rolling files.
*   **Error Handling:** Global exception handler providing consistent, informative error responses.
*   **Caching:** In-memory caching with Caffeine for frequently accessed data (e.g., categories).
*   **Rate Limiting:** Protects API endpoints against abuse by limiting request frequency per client IP.
*   **API Documentation:** Interactive API documentation using Swagger UI (Springdoc-openapi).
*   **Database Management:** PostgreSQL with Flyway for schema migrations and seed data.
*   **Containerization:** Docker and Docker Compose for easy setup and deployment.
*   **Testing:** Comprehensive suite including unit, integration, and API tests, aiming for high coverage.

## 3. Technologies Used

*   **Backend:**
    *   Java 17
    *   Spring Boot 3.2.x
    *   Spring Security (JWT)
    *   Spring Data JPA (Hibernate)
    *   Lombok
    *   Caffeine (Caching)
    *   Bucket4j (Rate Limiting)
    *   Flyway (Database Migrations)
    *   Springdoc-openapi (Swagger UI)
*   **Database:** PostgreSQL
*   **Build Tool:** Apache Maven
*   **Containerization:** Docker, Docker Compose
*   **Testing:** JUnit 5, Mockito, Spring Boot Test, Testcontainers
*   **Frontend (Demo):** HTML5, CSS3, Vanilla JavaScript
*   **CI/CD:** GitHub Actions (conceptual)

## 4. Architecture

The backend follows a **layered architecture**:

*   **Presentation Layer (`controller`):** Handles HTTP requests, authentication, authorization, global exception handling, and rate limiting. Uses DTOs for request/response bodies.
*   **Business/Service Layer (`service`):** Contains the core business logic, orchestrates operations across repositories, handles caching, and performs validations.
*   **Persistence/Data Access Layer (`repository`):** Abstracts database interactions using Spring Data JPA.
*   **Database Layer (PostgreSQL):** Stores application data, managed by Flyway.

For a detailed architecture overview, refer to [ARCHITECTURE.md](ARCHITECTURE.md).

## 5. Setup and Installation

### Prerequisites

*   Java Development Kit (JDK) 17 or higher
*   Apache Maven 3.6.x or higher
*   Docker Desktop (includes Docker Engine and Docker Compose)
*   Git

### Local Development Setup (using Docker Compose)

This is the recommended way to set up and run the application locally, as it handles the database setup automatically.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/taskmgr-pro.git # Replace with your repo URL
    cd taskmgr-pro
    ```

2.  **Build the Docker image for the Spring Boot application:**
    ```bash
    docker compose build app
    ```
    This will build the `taskmgr-pro` Docker image based on the `Dockerfile`.

3.  **Start the application and database containers:**
    ```bash
    docker compose up -d
    ```
    This command will:
    *   Start a PostgreSQL container (`db`).
    *   Start the Spring Boot application container (`app`).
    *   The Spring Boot app will connect to PostgreSQL and Flyway will automatically run database migrations and seed data.

4.  **Verify containers are running:**
    ```bash
    docker compose ps
    ```
    You should see both `app` and `db` containers in `running` state.

5.  **Access the application:**
    *   Backend API: `http://localhost:8080`
    *   Swagger UI: `http://localhost:8080/swagger-ui.html`
    *   Frontend Demo: `http://localhost:8080/frontend/index.html`

### Building and Running Manually (without Docker)

If you prefer to run the Spring Boot application directly and manage PostgreSQL separately:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/taskmgr-pro.git
    cd taskmgr-pro
    ```

2.  **Set up PostgreSQL:**
    *   Ensure you have a PostgreSQL instance running (e.g., locally or via a separate Docker container for just the DB).
    *   Create a database (e.g., `taskmgr_db`).
    *   Create a user (e.g., `taskmgr_user` with password `password`).
    *   Grant necessary permissions to the user on the database.

3.  **Update `application.yml` (if necessary):**
    *   Modify `src/main/resources/application.yml` to match your PostgreSQL connection details if they differ from the defaults.
    *   Ensure the `JWT_SECRET_KEY` environment variable is set or replace `${JWT_SECRET_KEY:...}` with a strong secret directly.

4.  **Build the project with Maven:**
    ```bash
    mvn clean install -DskipTests
    ```
    This will compile the code and package it into a JAR file in the `target/` directory.

5.  **Run the Spring Boot application:**
    ```bash
    java -jar target/taskmgr-pro-0.0.1-SNAPSHOT.jar
    ```
    *   Flyway will automatically run migrations against your configured PostgreSQL database.

6.  **Access the application:**
    *   Backend API: `http://localhost:8080`
    *   Swagger UI: `http://localhost:8080/swagger-ui.html`
    *   Frontend Demo: `http://localhost:8080/frontend/index.html`

## 6. Running the Frontend Demo

A simple HTML/JavaScript frontend is provided to interact with the API:

1.  Ensure the backend application is running (as per [Setup and Installation](#5-setup-and-installation)).
2.  Open your browser and navigate to: `http://localhost:8080/frontend/index.html`

**Default Credentials for Seeded Data:**
*   **User:**
    *   Email: `user@taskmgr.com`
    *   Password: `userpassword`
*   **Admin:**
    *   Email: `admin@taskmgr.com`
    *   Password: `adminpassword`

You can use these credentials to log in and test different functionalities and roles.

## 7. API Documentation (Swagger UI)

The API is fully documented using **Springdoc-openapi**, providing an interactive Swagger UI.

1.  Once the application is running, open your browser and go to: `http://localhost:8080/swagger-ui.html`
2.  You can explore all available endpoints, their request/response schemas, and even test them directly from the UI.
3.  To test protected endpoints, click the "Authorize" button and enter your JWT token (obtained from `/api/v1/auth/authenticate`) in the `Bearer` field.

## 8. Database

### Schema Definitions

The database schema is defined through JPA entities (`src/main/java/com/alx/taskmgr/entity/`). Hibernate (the JPA provider) maps these entities to PostgreSQL tables.

### Migration Scripts

**Flyway** is used for database schema migrations.
*   Migration scripts are located in `src/main/resources/db/migration/`.
*   They are executed automatically when the Spring Boot application starts.

### Seed Data

Initial seed data is provided in `src/main/resources/db/migration/V2__add_seed_data.sql`. This includes:
*   An `ADMIN` user (`admin@taskmgr.com`/`adminpassword`).
*   A `USER` user (`user@taskmgr.com`/`userpassword`).
*   Default categories (Work, Personal, Shopping, Health, Learning).
*   Sample tasks for both users.

## 9. Testing

The project includes a comprehensive test suite to ensure quality and correctness.

### Running Tests

To run all unit, integration, and API tests:
```bash
mvn clean test
```

### Code Coverage

**JaCoCo** is integrated to generate code coverage reports.
*   To run tests and generate the coverage report:
    ```bash
    mvn clean verify
    ```
*   After running `mvn clean verify`, you can find the HTML report at:
    `target/site/jacoco/index.html`
*   The `pom.xml` is configured with a minimum line coverage of 70% and branch coverage of 60%.

### Performance Testing (Conceptual)

For production-ready systems, performance testing is crucial.
*   **Tools:** Apache JMeter, k6, Locust, Gatling.
*   **Methodology:**
    1.  **Define Scenarios:** Identify critical user flows (e.g., register, login, create task, get all tasks, delete task).
    2.  **Simulate Load:** Create test plans to simulate varying numbers of concurrent users and requests.
    3.  **Monitor Metrics:** Track response times, throughput (requests per second), error rates, and resource utilization (CPU, memory) on the server and database.
    4.  **Identify Bottlenecks:** Analyze results to pinpoint performance bottlenecks (e.g., slow queries, inefficient code, insufficient resources).
    5.  **Optimize and Retest:** Implement optimizations and repeat tests until performance targets are met.

## 10. CI/CD Pipeline (Conceptual)

A conceptual CI/CD pipeline configuration using **GitHub Actions** is provided in `.github/workflows/ci-cd.yml`.

**Workflow:**
1.  **Build & Test (`build-and-test` job):**
    *   Triggered on `push` and `pull_request` to `main` and `develop` branches.
    *   Checks out code, sets up Java 17, builds the project with Maven, and runs all tests.
    *   Uploads JaCoCo coverage reports as artifacts.
    *   Uses Testcontainers for robust database integration testing.
2.  **Deploy (`deploy` job):**
    *   **Depends on `build-and-test`:** Only runs if all previous steps succeed.
    *   Triggered only on `push` to the `main` branch.
    *   Logs in to Docker Hub using GitHub Secrets.
    *   Builds and pushes the Docker image to Docker Hub.
    *   (Conceptual) Includes steps for deployment to a cloud provider (e.g., AWS EC2 via SSH).

**GitHub Secrets required for CI/CD:**
*   `DOCKER_USERNAME`: Your Docker Hub username.
*   `DOCKER_PASSWORD`: Your Docker Hub access token/password.
*   `JWT_SECRET_KEY`: A strong JWT secret key for production environments.
*   (Optional for deployment) `AWS_EC2_HOST`, `AWS_EC2_USER`, `AWS_EC2_PRIVATE_KEY`

## 11. Additional Features

### Authentication & Authorization (JWT)

*   **JWT Generation:** `JwtService` handles creation of tokens with user details and expiration.
*   **JWT Validation:** `JwtAuthFilter` intercepts requests, extracts the JWT, validates it against the `JwtService`, and sets the `Authentication` context in Spring Security.
*   **Role-Based Access:** `User` entity holds a `Set<Role>`. `@PreAuthorize("hasRole('ADMIN')")` or `hasAnyRole('USER', 'ADMIN')` annotations restrict access at the controller method level.

### Logging & Monitoring

*   **Logback Configuration:** `src/main/resources/logback-spring.xml` configures logging:
    *   Console output for development.
    *   Rolling file appender for production (daily rollover, max file size).
    *   Specific log levels for different packages (`com.alx.taskmgr` at DEBUG, Spring/Hibernate at INFO).
*   **SLF4J:** Used throughout the application for logging messages (e.g., `log.info(...)`).
*   **Monitoring (Conceptual):** For production, integrate Spring Boot Actuator with Micrometer to expose metrics, which can then be scraped by Prometheus and visualized in Grafana.

### Error Handling Middleware

*   **Global Exception Handler:** `GlobalExceptionHandler.java` (using `@RestControllerAdvice`) catches various exceptions (`ResourceNotFoundException`, `DuplicateResourceException`, `BadCredentialsException`, `AccessDeniedException`, validation errors, etc.) and translates them into standardized `ErrorResponse` DTOs with appropriate HTTP status codes.
*   **Custom Exceptions:** Specific runtime exceptions (`BadRequestException`, `DuplicateResourceException`, `ResourceNotFoundException`, `UnauthorizedException`, `TooManyRequestsException`) are defined to clearly indicate different error scenarios.

### Caching Layer

*   **Spring's Cache Abstraction:** `CachingConfig.java` enables and configures Spring's caching mechanism.
*   **Caffeine:** An in-memory, high-performance caching library.
*   `@Cacheable(value = "cacheName")`: Caches the result of a method call. Subsequent calls with the same arguments return the cached result.
*   `@CacheEvict(value = "cacheName", allEntries = true)`: Removes all entries from a cache. Used when underlying data changes to ensure cache consistency.

### Rate Limiting

*   **Bucket4j Integration:** `BucketProvider.java` defines the rate limiting policy (e.g., 10 requests per minute).
*   **Custom Interceptor:** `RateLimitInterceptor.java` is a Spring MVC interceptor that uses Bucket4j to check and consume tokens for incoming requests.
*   **Configuration:** `WebMvcConfig.java` registers the interceptor to apply rate limiting to `/api/v1/**` endpoints (excluding `/api/v1/auth/**`).
*   Clients exceeding the rate limit receive an HTTP `429 Too Many Requests` response.

## 12. ALX Precourse Focus

This project comprehensively addresses the ALX Software Engineering precourse materials:

*   **Programming Logic:** Evident in the clear, modular structure of services and controllers, logical flow of business operations, proper use of data structures (entities, DTOs, collections), and robust error handling.
*   **Algorithm Design:** While no complex graph or sorting algorithms are explicitly implemented (as it's a CRUD API), principles of efficient data access (via Spring Data JPA and indexing), resource management (caching, rate limiting), and correct application of logic are central. For instance, the `TaskService` methods demonstrate careful logic for authorization and data manipulation.
*   **Technical Problem Solving:** Demonstrated throughout the project in areas like:
    *   **Authentication/Authorization:** Solving the problem of secure user access.
    *   **Database Management:** Handling schema evolution with Flyway.
    *   **Environment Setup:** Using Docker/Docker Compose for reproducible environments.
    *   **Error Management:** Providing a consistent error handling mechanism.
    *   **Performance/Scalability:** Implementing caching and rate limiting.
    *   **Testing:** Ensuring software quality through various testing methodologies.

## 13. Contributing

Feel free to fork this repository and submit pull requests. For major changes, please open an issue first to discuss what you would like to change.

## 14. License

This project is licensed under the Apache 2.0 License. See the [LICENSE](LICENSE) file for details.
```