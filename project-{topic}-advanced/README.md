# ALX Production-Ready Authentication System

This project is a comprehensive, production-ready authentication system built with Spring Boot, Spring Security, JWT, and PostgreSQL. It demonstrates best practices for building a secure, scalable, and maintainable backend service.

## Table of Contents

1.  [Features](#features)
2.  [Architecture Overview](#architecture-overview)
3.  [Technology Stack](#technology-stack)
4.  [Prerequisites](#prerequisites)
5.  [Setup and Installation](#setup-and-installation)
    *   [Local Development](#local-development)
    *   [Docker with Docker Compose](#docker-with-docker-compose)
6.  [Running the Application](#running-the-application)
7.  [API Endpoints (Swagger UI)](#api-endpoints-swagger-ui)
8.  [Testing](#testing)
    *   [Unit Tests](#unit-tests)
    *   [Integration Tests](#integration-tests)
    *   [Performance Tests (Conceptual)](#performance-tests-conceptual)
9.  [CI/CD (Conceptual)](#ci-cd-conceptual)
10. [Database Layer](#database-layer)
11. [Configuration & Environment Variables](#configuration--environment-variables)
12. [Additional Features](#additional-features)
13. [Frontend (Conceptual)](#frontend-conceptual)
14. [Contributing](#contributing)
15. [License](#license)

## 1. Features

*   **User Management**: Register new users, user login, retrieve user profile, update user profile, retrieve all users (admin only), retrieve user by ID (admin only), delete user (admin only).
*   **Authentication**: Secure JWT (JSON Web Token) based authentication for stateless API interactions.
*   **Authorization**: Role-Based Access Control (RBAC) with `USER` and `ADMIN` roles using Spring Security's `@PreAuthorize`.
*   **Security**:
    *   Password hashing with BCrypt.
    *   JWT token generation, validation, and parsing.
    *   CSRF protection disabled for stateless APIs (appropriate for JWT).
    *   CORS configuration for frontend integration.
*   **Database Management**: PostgreSQL database with Flyway for robust schema migrations and versioning.
*   **RESTful API**: Clean and consistent API endpoints.
*   **Data Validation**: Input validation using `jakarta.validation` annotations.
*   **Global Error Handling**: Consistent error responses using `@ControllerAdvice` for various exceptions (e.g., 400, 401, 403, 404, 409, 429, 500).
*   **Structured Logging**: Configured with Logback for clear and configurable logging.
*   **Caching**: In-memory caching with Caffeine for performance optimization (e.g., role lookups).
*   **Rate Limiting**: Simple in-memory rate limiting per IP address to prevent API abuse (5 requests/second).
*   **API Documentation**: Automated API documentation with Swagger UI (OpenAPI 3).
*   **Containerization**: Docker and Docker Compose for easy setup, deployment, and environment consistency.
*   **Testing**: Comprehensive suite of Unit, Integration, and API tests with high coverage goals (80%+).

## 2. Architecture Overview

The system follows a layered architecture, common in Spring Boot applications:

*   **Presentation Layer (Controller)**: Handles HTTP requests, marshals/unmarshals DTOs, and delegates to the service layer.
*   **Service Layer (Business Logic)**: Contains the core business logic, orchestrates data operations, and applies domain rules.
*   **Data Access Layer (Repository)**: Abstracts database interactions, using Spring Data JPA for persistence.
*   **Security Layer**: Intercepts requests, validates JWT tokens, manages authentication and authorization contexts.
*   **Configuration Layer**: Manages application-wide settings, security configurations, and bean definitions.

Data flow for a typical request:
`Client Request -> RateLimitInterceptor -> JwtAuthenticationFilter -> Spring Security Filter Chain -> Controller -> Service -> Repository -> Database`

## 3. Technology Stack

*   **Backend**:
    *   Java 17
    *   Spring Boot 3.2.x
    *   Spring Security 6.2.x
    *   JJWT (Java JWT) 0.12.x
    *   Lombok (for boilerplate code reduction)
    *   Caffeine (in-memory caching)
    *   Guava (RateLimiter)
*   **Database**: PostgreSQL
*   **Database Migration**: Flyway
*   **Build Tool**: Maven
*   **API Documentation**: Springdoc OpenAPI (Swagger UI)
*   **Containerization**: Docker, Docker Compose
*   **Testing**: JUnit 5, Mockito, Spring Boot Test, Testcontainers, JaCoCo (for code coverage)
*   **Logging**: SLF4J with Logback

## 4. Prerequisites

Before you begin, ensure you have the following installed:

*   **Java 17 JDK**
*   **Maven 3.8+**
*   **Docker Desktop** (includes Docker Engine and Docker Compose)

## 5. Setup and Installation

You have two primary ways to set up and run this project:

### Local Development (without Docker for DB)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/authentication-system.git
    cd authentication-system
    ```

2.  **Install PostgreSQL locally:**
    Ensure you have a PostgreSQL server running. Create a database named `auth_db` and a user `admin` with password `password`.
    ```sql
    CREATE USER admin WITH PASSWORD 'password';
    CREATE DATABASE auth_db OWNER admin;
    ```
    (You may need to `ALTER USER admin WITH SUPERUSER;` or grant specific permissions for Flyway to work if you encounter issues, though typically just `CREATE DATABASE` and `OWNER` are enough).

3.  **Update `application.yml` (if needed):**
    If your local PostgreSQL credentials or port differ, update `src/main/resources/application.yml`.

4.  **Build the project:**
    ```bash
    mvn clean install -DskipTests
    ```

5.  **Run the application:**
    ```bash
    mvn spring-boot:run
    ```
    Alternatively, you can run the `AuthenticationSystemApplication.java` directly from your IDE.

### Docker with Docker Compose (Recommended for consistency)

This is the recommended way to run the application as it sets up both the Spring Boot app and the PostgreSQL database in isolated containers.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/authentication-system.git
    cd authentication-system
    ```

2.  **Build and run the containers:**
    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: Builds the Docker image for the Spring Boot application (only needed the first time or after code changes).
    *   `-d`: Runs the containers in detached mode (in the background).

3.  **Verify containers are running:**
    ```bash
    docker-compose ps
    ```
    You should see `auth_postgres_db` and `auth_spring_app` listed as `Up`.

## 6. Running the Application

Once the application is running (either locally or via Docker Compose), it will be accessible at:

*   **Application Root**: `http://localhost:8080`
*   **API Documentation (Swagger UI)**: `http://localhost:8080/swagger-ui.html`
*   **OpenAPI 3 JSON**: `http://localhost:8080/v3/api-docs`

## 7. API Endpoints (Swagger UI)

The API is fully documented using Swagger UI. Navigate to `http://localhost:8080/swagger-ui.html` in your browser.

You can use Swagger UI to:
*   View all available endpoints.
*   See request/response schemas.
*   **Try out API calls directly**:
    1.  Click the "Authorize" button (usually a lock icon).
    2.  Enter your JWT token in the format `Bearer <YOUR_JWT_TOKEN>` (e.g., `Bearer eyJhbGciOiJIUzI1Ni...`). You get this token from the `/api/v1/auth/authenticate` or `/api/v1/auth/register` endpoints.
    3.  Execute protected endpoints.

**Example Endpoints:**

*   **Register User**: `POST /api/v1/auth/register`
    *   Body: `{ "firstname": "Alice", "lastname": "Smith", "email": "alice@example.com", "password": "password123" }`
*   **Authenticate User**: `POST /api/v1/auth/authenticate`
    *   Body: `{ "email": "admin@example.com", "password": "adminpass" }` (Use `admin@example.com` / `adminpass` or `user@example.com` / `userpass` from `V2__Seed_Data.sql`)
*   **Get My Profile**: `GET /api/v1/users/me` (Requires JWT)
*   **Update My Profile**: `PUT /api/v1/users/me` (Requires JWT)
    *   Body: `{ "firstname": "Alicia", "newPassword": "newsecurepass" }`
*   **Get All Users (ADMIN ONLY)**: `GET /api/v1/users` (Requires ADMIN JWT)
*   **Delete User by ID (ADMIN ONLY)**: `DELETE /api/v1/users/{id}` (Requires ADMIN JWT)

## 8. Testing

The project has a robust testing strategy:

### Unit Tests

*   Located in `src/test/java/.../service/` and `src/test/java/.../controller/` (for controller mocks).
*   Uses JUnit 5 and Mockito to test individual components in isolation.
*   **Run unit tests:**
    ```bash
    mvn test
    ```

### Integration Tests

*   Located in `src/test/java/.../controller/`.
*   Uses Spring Boot's `@SpringBootTest` and `MockMvc` to test the full request lifecycle from controller to database.
*   Leverages **Testcontainers** to spin up a real PostgreSQL database for tests, ensuring a production-like environment.
*   `application-test.yml` configures the test environment.
*   **Run integration tests (along with unit tests):**
    ```bash
    mvn clean verify
    ```
*   **Code Coverage (JaCoCo):** After `mvn clean verify`, a JaCoCo report will be generated. You can view it by opening `target/site/jacoco/index.html` in your browser. The `pom.xml` aims for 80%+ line and branch coverage.

### Performance Tests (Conceptual)

A conceptual JMeter test plan (`performance-tests/jmeter-plan.jmx`) is provided to outline how performance testing would be approached.

To execute actual performance tests:
1.  Download and install [Apache JMeter](https://jmeter.apache.org/download_jmeter.cgi).
2.  Ensure your application is running (preferably via `docker-compose up -d`).
3.  Open JMeter, load the `jmeter-plan.jmx` file.
4.  Configure user variables (host, port, number of users, ramp-up, loops).
5.  Run the tests and analyze the results in JMeter's listeners (Summary Report, Aggregate Report, View Results Tree).

## 9. CI/CD (Conceptual)

A conceptual `jenkins-pipeline.groovy` is provided in the `ci-cd/` directory. This file outlines a typical Jenkins declarative pipeline structure for this project.

**Stages of a typical CI/CD pipeline:**
1.  **Checkout**: Get the latest code from the repository.
2.  **Build**: Compile the application and package it into a JAR.
3.  **Test**: Run unit, integration, and API tests. Generate code coverage reports.
4.  **Security Scan**: (Placeholder) Integrate tools like SonarQube, Snyk, OWASP Dependency-Check.
5.  **Build Docker Image**: Create a Docker image for the application.
6.  **Push Docker Image**: Push the image to a container registry (e.g., Docker Hub, AWS ECR).
7.  **Deploy to Staging**: Deploy the application to a staging environment (e.g., Kubernetes, AWS ECS, bare metal with Docker Compose).
8.  **Automated End-to-End Tests**: Run more extensive end-to-end tests on the staging environment.
9.  **Manual Approval**: (Optional) For critical deployments.
10. **Deploy to Production**: Deploy the validated application to the production environment.

**Note**: A fully functional CI/CD pipeline requires an actual CI server (like Jenkins, GitLab CI, GitHub Actions) and environment setup, which is beyond the scope of this single project response.

## 10. Database Layer

*   **Database**: PostgreSQL is used.
*   **Migrations**: Flyway handles schema evolution. Migration scripts are located in `src/main/resources/db/migration/`.
    *   `V1__Initial_Schema.sql`: Creates the `_user` table.
    *   `V2__Seed_Data.sql`: Inserts default `ADMIN` (`admin@example.com`/`adminpass`) and `USER` (`user@example.com`/`userpass`) accounts.
*   **JPA**: Spring Data JPA is used for ORM, simplifying database interactions.
*   **Query Optimization**: Indexes are added to frequently queried columns (e.g., `email` in `_user` table) in migration scripts. Spring Data JPA's derived query methods are efficient. For complex queries, `@Query` annotations or native SQL can be used.

## 11. Configuration & Environment Variables

*   **`application.yml`**: Main configuration file for Spring Boot settings, database, JWT, logging, caching, and Swagger.
*   **Environment Variables**: Key configurations (like database credentials, JWT secret) can be overridden by environment variables, which is crucial for Docker deployments and different environments (dev, prod).
    *   Example: `SPRING_DATASOURCE_URL`, `APPLICATION_SECURITY_JWT_SECRET_KEY`.
*   **Logging (`logback-spring.xml`)**: Configures console and rolling file appenders, log levels for different packages.

## 12. Additional Features

*   **Authentication/Authorization**: Implemented using JWT and Spring Security, with `ROLE_USER` and `ROLE_ADMIN` permissions. `@PreAuthorize` annotations control access to controller methods.
*   **Logging and Monitoring**: SLF4J with Logback for structured logging. Spring Boot Actuator is included (`pom.xml`) for monitoring endpoints like `/actuator/health`, `/actuator/info`, etc. For full-scale monitoring, integration with tools like Prometheus/Grafana or an ELK stack would be recommended.
*   **Error Handling Middleware**: A global `@ControllerAdvice` (`GlobalExceptionHandler.java`) provides consistent JSON error responses for various exceptions, including validation errors and custom exceptions.
*   **Caching Layer**: Configured with Spring Cache and Caffeine (`CacheConfig.java`). `@Cacheable` is used in `RoleRepository` as an example.
*   **Rate Limiting**: An in-memory `RateLimitInterceptor` (`RateLimitInterceptor.java`) limits requests to 5 per second per IP address. This is a simple solution; for distributed systems, dedicated gateways (like NGINX, API Gateway) or external services (like Redis-backed rate limiters) are preferred.

## 13. Frontend (Conceptual)

A basic `client/index.html` file is provided to demonstrate how a simple HTML/JavaScript client would interact with the backend API. It includes examples for registration, login, and accessing a protected endpoint.

```html