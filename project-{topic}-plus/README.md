# Secure Auth System

A comprehensive, production-ready authentication and authorization system built with Spring Boot, JWT, and PostgreSQL. It features robust user management, role-based access control, caching, rate limiting, and extensive testing, packaged with Docker and configured for CI/CD.

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Prerequisites](#prerequisites)
4.  [Getting Started](#getting-started)
    *   [Local Setup with Docker Compose](#local-setup-with-docker-compose)
    *   [Manual Local Setup (without Docker for App)](#manual-local-setup-without-docker-for-app)
5.  [API Documentation](#api-documentation)
6.  [Authentication & Authorization](#authentication--authorization)
7.  [Testing](#testing)
8.  [CI/CD](#cicd)
9.  [Configuration](#configuration)
10. [Database](#database)
11. [Logging & Monitoring](#logging--monitoring)
12. [Contributing](#contributing)
13. [License](#license)

---

## 1. Features

*   **User Management:** Register, login, retrieve, update, and delete users.
*   **Role Management:** Create, assign, and manage roles for users (ADMIN only).
*   **JWT Authentication:** Secure token-based authentication for API access.
*   **Role-Based Authorization:** Granular access control based on user roles (`ROLE_USER`, `ROLE_ADMIN`).
*   **Password Hashing:** Secure storage of passwords using BCrypt.
*   **Data Validation:** Input validation using Jakarta Bean Validation.
*   **Database Management:** PostgreSQL with Flyway for schema migrations and seed data.
*   **Caching:** In-memory caching (Caffeine) for frequently accessed data (e.g., user details).
*   **Rate Limiting:** Basic in-memory rate limiting for authentication endpoints to prevent brute-force attacks.
*   **Centralized Error Handling:** Global exception handling for consistent API responses.
*   **Logging & Monitoring:** Structured logging with Logback and Spring Boot Actuator.
*   **API Documentation:** OpenAPI (Swagger UI) for interactive API exploration.
*   **Dockerization:** Containerized application and database for easy setup and deployment.
*   **CI/CD:** GitHub Actions workflow for automated build, test, and deployment.
*   **Comprehensive Testing:** Unit, integration, and API tests with high coverage goals.

## 2. Architecture

The application follows a layered architecture typical of Spring Boot applications:

*   **Presentation Layer (Controllers):** Handles HTTP requests, maps them to service methods, and returns API responses. Uses Spring MVC.
*   **Service Layer (Services):** Contains the core business logic, orchestrates interactions with repositories, and applies domain-specific rules.
*   **Persistence Layer (Repositories):** Interacts with the database using Spring Data JPA.
*   **Domain Layer (Models):** JPA entities representing the core data structures (User, Role).
*   **Security Layer:** Spring Security for authentication and authorization, JWT for stateless token management.
*   **Infrastructure Layer:** Configuration, utilities, global exception handling, caching, rate limiting.

See [ARCHITECTURE.md](ARCHITECTURE.md) for a detailed overview.

## 3. Prerequisites

Before you begin, ensure you have met the following requirements:

*   **Java 17 or higher:** [Download & Install Java JDK 17](https://www.oracle.com/java/technologies/downloads/)
*   **Maven 3.6.3 or higher:** [Download & Install Maven](https://maven.apache.org/download.cgi)
*   **Docker & Docker Compose:** [Download & Install Docker Desktop](https://www.docker.com/products/docker-desktop)
*   (Optional for manual setup) **PostgreSQL 15 or higher:** [Download & Install PostgreSQL](https://www.postgresql.org/download/)

## 4. Getting Started

Choose your preferred setup method:

### Local Setup with Docker Compose

This is the recommended way to get the entire application (app + database) running quickly.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/alx-examples/secure-auth-system.git
    cd secure-auth-system
    ```

2.  **Build and run with Docker Compose:**
    ```bash
    # Navigate to the directory containing docker-compose.yml
    cd docker 
    docker-compose up --build -d
    ```
    *   `--build`: Builds the Docker image for the application from the `Dockerfile`.
    *   `-d`: Runs the containers in detached mode (in the background).

3.  **Verify services are running:**
    ```bash
    docker-compose ps
    ```
    You should see `secure-auth-app` and `auth-postgres-db` containers in `Up` status.

4.  **Application is ready!**
    The Spring Boot application will be accessible at `http://localhost:8080`.

    *   **Swagger UI (API Docs):** `http://localhost:8080/swagger-ui.html`
    *   **Actuator Health:** `http://localhost:8080/actuator/health`

5.  **Stop services:**
    ```bash
    docker-compose down
    ```
    This will stop and remove the containers and network. To also remove volumes: `docker-compose down --volumes`.

### Manual Local Setup (without Docker for App)

This method runs the Spring Boot application directly on your machine, but still uses Docker for the PostgreSQL database.

1.  **Start the PostgreSQL database with Docker Compose:**
    ```bash
    # Navigate to the directory containing docker-compose.yml
    cd docker
    docker-compose up db -d
    ```
    Verify it's running: `docker-compose ps`.

2.  **Build the Spring Boot application:**
    ```bash
    # Navigate back to the project root
    cd ..
    mvn clean install -DskipTests
    ```

3.  **Run the Spring Boot application:**
    You need to set environment variables for the database connection.

    ```bash
    # On Linux/macOS
    export DB_HOST=localhost
    export DB_PORT=5432
    export DB_NAME=auth_db
    export DB_USERNAME=admin
    export DB_PASSWORD=password
    export JWT_SECRET_KEY=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
    java -jar target/secure-auth-system-0.0.1-SNAPSHOT.jar

    # On Windows (Command Prompt)
    set DB_HOST=localhost
    set DB_PORT=5432
    set DB_NAME=auth_db
    set DB_USERNAME=admin
    set DB_PASSWORD=password
    set JWT_SECRET_KEY=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
    java -jar target/secure-auth-system-0.0.1-SNAPSHOT.jar

    # On Windows (PowerShell)
    $env:DB_HOST="localhost"
    $env:DB_PORT="5432"
    $env:DB_NAME="auth_db"
    $env:DB_USERNAME="admin"
    $env:DB_PASSWORD="password"
    $env:JWT_SECRET_KEY="404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970"
    java -jar target/secure-auth-system-0.0.1-SNAPSHOT.jar
    ```

4.  **Application is ready!**
    The Spring Boot application will be accessible at `http://localhost:8080`.

    *   **Swagger UI (API Docs):** `http://localhost:8080/swagger-ui.html`
    *   **Actuator Health:** `http://localhost:8080/actuator/health`

5.  **Stop services:**
    *   Stop the Java application (Ctrl+C).
    *   Stop the PostgreSQL container: Navigate to `docker` directory and run `docker-compose down db`.

## 5. API Documentation

Interactive API documentation is available via Swagger UI.

*   **Swagger UI:** `http://localhost:8080/swagger-ui.html`
*   **OpenAPI JSON:** `http://localhost:8080/v3/api-docs`

See [API.md](API.md) for a detailed list of endpoints and their usage.

## 6. Authentication & Authorization

The system uses **JWT (JSON Web Tokens)** for stateless authentication and **Spring Security** for authorization.

### Default Users (seeded by Flyway)

*   **Admin User:**
    *   **Username:** `admin`
    *   **Password:** `password123!A`
    *   **Roles:** `ROLE_USER`, `ROLE_ADMIN`
*   **Regular User:**
    *   **Username:** `testuser`
    *   **Password:** `Userpass1!`
    *   **Roles:** `ROLE_USER`

### Flow

1.  **Register (`/api/auth/register`):** Create a new user account. Returns a JWT.
2.  **Login (`/api/auth/login`):** Authenticate with username/password. Returns a JWT.
3.  **Access Secured Endpoints:** Include the JWT in the `Authorization` header of subsequent requests: `Authorization: Bearer <YOUR_JWT_TOKEN>`.

### Authorization

*   **Role-Based Access Control (RBAC):**
    *   Endpoints are protected using `@PreAuthorize` annotations and Spring Security configuration.
    *   `ROLE_ADMIN` has full access to user and role management endpoints.
    *   `ROLE_USER` can access their own user profile data.
*   **Rate Limiting:** Login and registration endpoints are rate-limited per IP address to prevent brute-force attacks (default: 5 requests per second).

## 7. Testing

The project emphasizes high-quality testing:

*   **Unit Tests:** Focus on individual components (services, utilities) in isolation using Mockito (aiming for 80%+ coverage).
*   **Integration Tests:** Verify interactions between multiple layers (controller, service, repository) using Spring Boot's testing utilities and Testcontainers for a real database environment.
*   **API Tests:** Covered conceptually and can be implemented with tools like Postman or RestAssured (see [API.md](API.md) for scenarios).
*   **Performance Tests:** Described conceptually, suggesting tools like JMeter or Gatling for load, stress, and scalability testing.

To run tests:

```bash
mvn test
```

To run tests and generate a JaCoCo coverage report:

```bash
mvn clean test jacoco:report
```
The coverage report will be generated in `target/site/jacoco/index.html`.

## 8. CI/CD

A GitHub Actions workflow (`.github/workflows/ci-cd.yml`) is configured for Continuous Integration and Continuous Deployment.

*   **Build & Test:** On every `push` or `pull_request` to `main` or `develop` branches:
    *   Builds the project with Maven.
    *   Runs all unit and integration tests.
    *   Generates JaCoCo test coverage reports.
    *   (Optional) Integrates with SonarCloud for static code analysis.
*   **Docker Image Build & Push:** On `push` to `main` or `develop`:
    *   Builds a Docker image of the application.
    *   Pushes the image to Docker Hub (or any configured registry).
*   **Deployment (Conceptual):** The workflow includes a commented-out section for a simple SSH-based deployment to a server. In a production scenario, this would involve deploying to Kubernetes, AWS ECS, Azure App Service, etc.

**Required GitHub Secrets for CI/CD:**

*   `DOCKER_USERNAME`: Your Docker Hub username.
*   `DOCKER_PASSWORD`: Your Docker Hub access token or password.
*   `SONAR_TOKEN`: (Optional, for SonarCloud) SonarCloud token.
*   `SSH_HOST`, `SSH_USERNAME`, `SSH_PRIVATE_KEY`: (Optional, for deployment) SSH credentials for your deployment server.
*   `PROD_DB_HOST`, `PROD_DB_USERNAME`, `PROD_DB_PASSWORD`, `PROD_JWT_SECRET_KEY`: (Optional, for deployment) Production database/JWT configuration.

## 9. Configuration

Application configuration is managed via `src/main/resources/application.yml` and environment variables.

Key configurable aspects:

*   **Database:** `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`
*   **JWT:** `JWT_SECRET_KEY` (critical for security, **must be a strong, random 256-bit base64-encoded string in production**), `jwt.expiration`
*   **Caching:** Caffeine cache specifications (e.g., `expireAfterAccess`, `maximumSize`).
*   **Rate Limiting:** Requests per second for auth endpoints.
*   **Logging:** Configured in `logback-spring.xml` for console and file output, with different levels for various packages.

## 10. Database

*   **Type:** PostgreSQL
*   **Migration:** [Flyway](https://flywaydb.org/) is used for database schema evolution. Migration scripts are located in `src/main/resources/db/migration/`.
    *   `V1__initial_schema.sql`: Creates `users`, `roles`, and `user_roles` tables.
    *   `V2__seed_data.sql`: Inserts default roles (`ROLE_USER`, `ROLE_ADMIN`) and initial `admin` and `testuser` accounts.

## 11. Logging & Monitoring

*   **Logging:** Configured using `logback-spring.xml` for structured logging to console and files (info and error logs).
    *   Logs can be found in the `logs/` directory (created at runtime).
*   **Monitoring:** Spring Boot Actuator endpoints are exposed for basic monitoring and health checks:
    *   `/actuator/health`: Application health status.
    *   `/actuator/info`: Application info.
    *   `/actuator/metrics`: Various application metrics.
    *   `/actuator/prometheus`: Prometheus-compatible metrics endpoint.

## 12. Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix (`git checkout -b feature/your-feature-name`).
3.  Make your changes and write tests.
4.  Ensure all tests pass and code coverage is maintained.
5.  Commit your changes (`git commit -m 'feat: Add new feature'`).
6.  Push to your fork (`git push origin feature/your-feature-name`).
7.  Create a Pull Request to the `develop` branch of the original repository.

## 13. License

This project is licensed under the [MIT License](LICENSE).
```

#### `ARCHITECTURE.md`

```markdown