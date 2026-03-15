# ML Utilities System

## Comprehensive, Production-Ready Machine Learning Utilities System

This project is a full-scale, enterprise-grade Machine Learning Utilities System developed using Spring Boot 3.x (Java 17). It provides a robust backend for managing essential ML lifecycle components: datasets, features, and models. The system is designed with scalability, security, and maintainability in mind, incorporating various best practices and modern development tools.

### Features

1.  **Core Application (Java Spring Boot)**
    *   **Dataset Management:** CRUD operations for managing ML dataset metadata (name, description, file path, size, format, upload/modification timestamps).
    *   **Feature Management:** CRUD operations for defining and managing features (name, description, type, version, source dataset, transformation logic).
    *   **Model Registration:** CRUD operations for registering ML models (name, version, algorithm, path to model artifact, performance metrics, status, associated features, and training dataset).
    *   **Pagination & Sorting:** All `GET /api/{resource}` endpoints support pagination and sorting.
    *   **Robust Business Logic:** Validation, error handling, and transactional integrity for all operations.

2.  **Database Layer (PostgreSQL with Flyway & Spring Data JPA)**
    *   **Schema Definitions:** Well-defined relational schema for Users, Roles, Datasets, Features, and Models.
    *   **Migration Scripts:** Automated database schema management using Flyway.
    *   **Seed Data:** Initial roles and default users (admin, moderator, user) are seeded via Flyway.
    *   **ORM:** Efficient data access through Spring Data JPA with Hibernate.

3.  **Configuration & Setup**
    *   **Dependencies:** Managed via `pom.xml` (Maven).
    *   **Environment Configuration:** `application.yml` for database, server, JWT, and caching settings, with profile-specific configurations (e.g., `test` profile for H2).
    *   **Docker Setup:** `Dockerfile` for containerizing the Spring Boot application and `docker-compose.yml` for orchestrating the application with a PostgreSQL database.
    *   **CI/CD Pipeline:** Configured with GitHub Actions (`.github/workflows/main.yml`) for automated build, test, and deployment.

4.  **Testing & Quality**
    *   **Unit Tests:** JUnit 5 and Mockito for isolated testing of service layer business logic (aiming for 80%+ coverage).
    *   **Integration Tests:** `@SpringBootTest` with `MockMvc` for comprehensive testing of controllers, including authentication and authorization flows. Testcontainers are used for database integration tests in CI.
    *   **API Tests:** Covered by integration tests simulating HTTP requests.
    *   **Performance Tests:** (Conceptual) Methodology outlined in `ARCHITECTURE.md` for tools like JMeter/Gatling.
    *   **Code Coverage:** JaCoCo integrated into Maven build to enforce coverage thresholds.

5.  **Documentation**
    *   **Comprehensive README:** This document, covering setup, usage, and project overview.
    *   **API Documentation:** Interactive API docs using Springdoc OpenAPI (Swagger UI). Accessible at `/swagger-ui.html`.
    *   **Architecture Documentation:** `ARCHITECTURE.md` detailing the system design, components, and data flow.
    *   **Deployment Guide:** `DEPLOYMENT.md` outlining steps for local Docker deployment and conceptual CI/CD to production.

6.  **Additional Features**
    *   **Authentication/Authorization:** JWT-based authentication using Spring Security. Role-based authorization (`ROLE_USER`, `ROLE_MODERATOR`, `ROLE_ADMIN`) for granular access control.
    *   **Logging and Monitoring:** Configured with SLF4J/Logback for structured logging. Mentions integration points for external monitoring.
    *   **Error Handling Middleware:** Global exception handling using `@ControllerAdvice` for consistent API error responses.
    *   **Caching Layer:** Spring Cache with Caffeine for in-memory caching of frequently accessed data (e.g., `Dataset` by ID, paginated lists).
    *   **Rate Limiting:** Custom `RateLimitInterceptor` using Bucket4j to prevent abuse of API endpoints. Configurable per endpoint via `@RateLimited` annotation.

### Technologies Used

*   **Backend:** Java 17, Spring Boot 3.x
*   **Database:** PostgreSQL
*   **ORM:** Spring Data JPA, Hibernate
*   **Migrations:** Flyway
*   **Authentication:** Spring Security, JWT (jjwt)
*   **Caching:** Spring Cache, Caffeine
*   **Rate Limiting:** Bucket4j
*   **Testing:** JUnit 5, Mockito, Spring Boot Test, Testcontainers, JaCoCo
*   **API Documentation:** Springdoc OpenAPI (Swagger UI)
*   **Build Tool:** Maven
*   **Containerization:** Docker, Docker Compose
*   **CI/CD:** GitHub Actions
*   **Utilities:** Lombok

---

### Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

#### Prerequisites

*   Java 17 Development Kit (JDK)
*   Maven 3.x
*   Docker and Docker Compose (recommended for local database setup)
*   Git

#### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ml-utilities-system.git
cd ml-utilities-system
```

#### 2. Environment Configuration

The application uses `application.yml` for configuration. Sensitive information like database credentials and JWT secret are set via environment variables.

You can create a `.env` file in the project root for `docker-compose` to pick up:

```bash
# .env file
DB_NAME=ml_util_db
DB_USER=admin
DB_PASSWORD=password
JWT_SECRET=supersecretkeythatisatleast256bitlongforproductionenvironment # CHANGE THIS IN PRODUCTION!
JWT_EXPIRATION_MS=86400000 # 24 hours
```

#### 3. Run with Docker Compose (Recommended)

This will start both the PostgreSQL database and the Spring Boot application.

```bash
docker-compose up --build -d
```

*   The database will be available on `localhost:5432`.
*   The application will be available on `localhost:8080`.
*   Flyway migrations will run automatically on application startup to set up the schema and seed initial data (roles, admin/mod/user accounts).

#### 4. Run Locally (without Docker for the app, with Docker for DB)

If you prefer to run the Spring Boot app directly on your machine while still using a Dockerized database:

1.  **Start PostgreSQL with Docker Compose:**
    ```bash
    docker-compose up -d db
    ```
    Wait for the database to be healthy. You can check its logs: `docker logs ml-utilities-postgres`.

2.  **Run the Spring Boot Application:**
    Ensure your local environment variables match those in `.env` or `application.yml` for database connection and JWT.
    ```bash
    # Set environment variables (e.g., in your shell or IDE run configuration)
    export DB_HOST=localhost
    export DB_PORT=5432
    export DB_NAME=ml_util_db
    export DB_USER=admin
    export DB_PASSWORD=password
    export JWT_SECRET=supersecretkeythatisatleast256bitlongforproductionenvironment
    export JWT_EXPIRATION_MS=86400000

    # Build and run the application
    mvn spring-boot:run
    ```

#### 5. Access the Application

Once running (either via Docker Compose or locally):

*   **Frontend (minimal):** Open your browser to `http://localhost:8080/`. This provides links to Swagger UI and basic info.
*   **API Documentation (Swagger UI):** Open your browser to `http://localhost:8080/swagger-ui.html`.
    *   You'll need to authenticate first using the `/api/auth/signin` endpoint to get a JWT token.
    *   Default users:
        *   **Admin:** username `admin`, password `adminpass` (role: `ROLE_ADMIN`)
        *   **Moderator:** username `moderator`, password `modpass` (role: `ROLE_MODERATOR`)
        *   **User:** username `user`, password `userpass` (role: `ROLE_USER`)
    *   Click the "Authorize" button in Swagger UI, enter `Bearer YOUR_JWT_TOKEN`, and then you can test the secured endpoints.

---

### Running Tests

To run all unit and integration tests (using an in-memory H2 database by default for `test` profile):

```bash
mvn clean test
```

To include code coverage report generation with JaCoCo:

```bash
mvn clean verify
```

This will run tests and generate a JaCoCo report in `target/site/jacoco/index.html`. It will also enforce the coverage thresholds defined in `pom.xml`.

For integration tests that interact with a real PostgreSQL database (e.g., using Testcontainers, as configured in the CI pipeline for more robust scenarios), you would need to adjust the `application.yml` profile or setup accordingly. The provided `docker-compose.yml` for the `build-and-test` CI job demonstrates how `Testcontainers` (via `docker-compose` `db` service) could be used with specific integration tests. For local development, the `test` profile using H2 is faster.

---

### Project Structure

(See the detailed Project Structure Outline at the beginning of the overall response)

---

### Contributing

Please refer to `CONTRIBUTING.md` (not provided in this response, but would be a typical component).

---

### License

This project is licensed under the Apache 2.0 License - see the `LICENSE` file for details (not provided in this response).

---