```markdown
# Scrapineer: Production-Ready Web Scraping Tools System

Scrapineer is a comprehensive, enterprise-grade web scraping platform built with Spring Boot (Java). It allows users to define web scraping targets, specify CSS selectors for data extraction, schedule scraping jobs, and store the extracted data in a structured format.

## Table of Contents

1.  [Features](#features)
2.  [Technologies Used](#technologies-used)
3.  [Project Structure](#project-structure)
4.  [Setup Instructions](#setup-instructions)
    *   [Prerequisites](#prerequisites)
    *   [Local Development (Non-Docker)](#local-development-non-docker)
    *   [Docker Setup (Recommended)](#docker-setup-recommended)
5.  [Running the Application](#running-the-application)
6.  [Accessing the API and Documentation](#accessing-the-api-and-documentation)
7.  [Authentication & Authorization](#authentication--authorization)
8.  [Database](#database)
9.  [Testing](#testing)
10. [CI/CD](#ci-cd)
11. [Monitoring & Logging](#monitoring--logging)
12. [Caching & Rate Limiting](#caching--rate-limiting)
13. [Architecture](#architecture)
14. [Deployment Guide](#deployment-guide)
15. [Contributing](#contributing)
16. [License](#license)

## Features

*   **Scraping Target Management:** Define URLs to scrape with associated metadata.
*   **Flexible Selector Definition:** Specify multiple CSS selectors for structured data extraction (text, attribute, HTML).
*   **Scraping Job Scheduling:** Create one-time or recurring jobs using CRON expressions.
*   **Asynchronous Scraping:** Jobs run in a dedicated thread pool to avoid blocking the API.
*   **Structured Result Storage:** Extracted data is stored as JSONB in PostgreSQL.
*   **RESTful API:** Full CRUD operations for targets, jobs, and results.
*   **User Authentication & Authorization:** Secure access using JWT (JSON Web Tokens) and Spring Security with role-based access control.
*   **Database Migrations:** Managed by Flyway for version control of database schema.
*   **Caching Layer:** Uses Spring Cache with Caffeine for improved performance on frequently accessed data.
*   **Rate Limiting:** Protects API endpoints from abuse using Bucket4j.
*   **Comprehensive Error Handling:** Global exception handling for consistent API responses.
*   **Logging & Monitoring:** SLF4J/Logback for logging, Spring Boot Actuator for health checks and metrics.
*   **Docker Support:** Containerized application and database for easy setup and deployment.
*   **CI/CD Pipeline:** Example GitHub Actions workflow for automated build, test, and deployment.
*   **API Documentation:** Interactive API documentation powered by OpenAPI (Swagger UI).
*   **Minimal UI:** A basic Thymeleaf home page for a friendly entry point.

## Technologies Used

*   **Backend:** Java 17, Spring Boot 3
    *   **Web Framework:** Spring Web MVC
    *   **Data Persistence:** Spring Data JPA, Hibernate
    *   **Security:** Spring Security, JWT (jjwt)
    *   **Web Scraping:** Jsoup
    *   **Scheduling:** Spring Task Scheduler
    *   **Caching:** Spring Cache, Caffeine
    *   **Rate Limiting:** Bucket4j
    *   **API Docs:** Springdoc-openapi (Swagger UI)
    *   **Utilities:** Lombok, Guava
*   **Database:** PostgreSQL
*   **Database Migration:** Flyway
*   **Containerization:** Docker, Docker Compose
*   **Testing:** JUnit 5, Mockito, Spring Boot Test, Testcontainers, RestAssured, JaCoCo
*   **CI/CD:** GitHub Actions

## Project Structure

```
├── .github/workflows/              # CI/CD workflows (GitHub Actions)
├── config/
│   └── flyway/                     # Database migration scripts
├── docs/                           # Architecture, API, and Deployment documentation
├── src/
│   ├── main/
│   │   ├── java/com/alx/scrapineer/ # Main Java source code
│   │   │   ├── api/                # REST Controllers, DTOs, Exceptions
│   │   │   ├── common/             # Global configurations, security, utilities, error handling
│   │   │   ├── data/               # JPA Entities, Repositories
│   │   │   ├── scheduler/          # Scheduled job logic
│   │   │   ├── scraper/            # Web scraping engine and strategies
│   │   │   └── service/            # Core business services
│   │   └── resources/              # Application properties, logging, static assets, templates
│   └── test/
│       ├── java/com/alx/scrapineer/ # Unit, Integration, and API tests
│       └── resources/              # Test-specific configurations
├── docker-compose.yml              # Docker Compose for local environment setup
├── Dockerfile                      # Dockerfile for Spring Boot application
├── pom.xml                         # Maven project file
└── README.md                       # This README
```

## Setup Instructions

### Prerequisites

*   Java 17 JDK
*   Maven 3.8+
*   Docker and Docker Compose (recommended for easy setup)
*   Git

### Local Development (Non-Docker)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/scrapineer.git
    cd scrapineer
    ```
2.  **Configure `application.yml`:**
    *   For H2 (in-memory database, default for `dev` profile), no special setup needed.
    *   For PostgreSQL:
        *   Install PostgreSQL locally.
        *   Create a database (e.g., `scrapineer_db`).
        *   Update `src/main/resources/application.yml` (or create `application-local.yml` and activate it) with your PostgreSQL credentials:
            ```yaml
            spring:
              datasource:
                url: jdbc:postgresql://localhost:5432/scrapineer_db
                username: your_postgres_user
                password: your_postgres_password
              jpa:
                hibernate:
                  ddl-auto: update # or 'validate' if Flyway handles all
              flyway:
                enabled: true
            ```
    *   **Important:** Set a strong JWT secret in `application.yml` or via environment variable. **Never commit production secrets.**
        ```yaml
        jwt:
          secret: your_very_secure_and_long_jwt_secret_key_that_is_at_least_32_characters_long
        ```
3.  **Build the project:**
    ```bash
    mvn clean install
    ```
4.  **Run Flyway migrations (if not `ddl-auto: update`):**
    If `ddl-auto` is set to `validate` or `none`, Flyway will manage schema.
    You can manually trigger Flyway if needed (though Spring Boot usually does it on startup).

### Docker Setup (Recommended)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/scrapineer.git
    cd scrapineer
    ```
2.  **Build the application JAR:**
    ```bash
    mvn clean package -DskipTests
    ```
    This creates `target/scrapineer-0.0.1-SNAPSHOT.jar`.
3.  **Ensure `docker-compose.yml` is correctly configured:**
    *   Check `JWT_SECRET` and database credentials under the `app` service. For local development, the defaults might be fine, but you should use stronger values for any non-local setup.
    *   The `config/flyway` directory is mounted to `/flyway/sql` in the `db` service to allow Flyway to find and apply migrations.
4.  **Start Docker Compose:**
    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: Rebuilds the application image.
    *   `-d`: Runs containers in detached mode.

    This will:
    *   Build the `scrapineer` application Docker image.
    *   Start a PostgreSQL database container.
    *   Start the `scrapineer` application container.
    *   Start `pgAdmin` (optional, accessible at `http://localhost:5050` with credentials `admin@scrapineer.com`/`admin_password`).

## Running the Application

*   **From JAR (Local, Non-Docker):**
    ```bash
    java -jar target/scrapineer-0.0.1-SNAPSHOT.jar
    # Or to run with a specific profile (e.g., dev):
    java -jar -Dspring.profiles.active=dev target/scrapineer-0.0.1-SNAPSHOT.jar
    ```
*   **With Docker Compose:**
    If you used `docker-compose up -d`, it's already running.
    To stop: `docker-compose down`

The application will be accessible at `http://localhost:8080`.

## Accessing the API and Documentation

*   **Home Page:** `http://localhost:8080/` (basic Thymeleaf UI)
*   **Swagger UI (API Documentation):** `http://localhost:8080/swagger-ui.html`
*   **OpenAPI JSON:** `http://localhost:8080/v3/api-docs`

## Authentication & Authorization

The API uses JWT for authentication.

1.  **Register a User:**
    *   Endpoint: `POST /api/auth/register`
    *   Body:
        ```json
        {
          "username": "myuser",
          "password": "mypassword",
          "roles": ["USER"]
        }
        ```
    *   This will return a JWT token.
2.  **Login User:**
    *   Endpoint: `POST /api/auth/login`
    *   Body:
        ```json
        {
          "username": "myuser",
          "password": "mypassword"
        }
        ```
    *   This will return a JWT token.
3.  **Use the Token:** Include the token in the `Authorization` header for subsequent API requests:
    `Authorization: Bearer <your_jwt_token>`

**Seed Data:**
The `V2__add_seed_data.sql` migration script inserts:
*   **Admin User:** `username: admin`, `password: adminpassword`
*   **Regular User:** `username: user`, `password: userpassword`

## Database

*   **Type:** PostgreSQL
*   **Migration Tool:** Flyway
*   **Schema:** Defined in `config/flyway/V1__initial_schema.sql`
    *   `users`: Stores user credentials and roles.
    *   `scraping_targets`: Defines websites/pages to scrape, associated with a user.
    *   `css_selectors`: Specifies how to extract data (e.g., title, price) from a target.
    *   `scraping_jobs`: Manages scheduled or manual scraping tasks.
    *   `scraping_results`: Stores the JSONB output of each scraping run.
*   **Seed Data:** `config/flyway/V2__add_seed_data.sql` provides initial `admin` and `user` accounts and some example targets/jobs.

## Testing

The project includes various levels of testing:

*   **Unit Tests:** Located in `src/test/java/**/service`, `src/test/java/**/util`. These mock external dependencies to test individual components.
*   **Repository Tests (DataJpaTest):** Located in `src/test/java/**/repository`. Use Spring Boot's `@DataJpaTest` to test JPA repositories with an in-memory H2 database.
*   **Integration Tests:** Located in `src/test/java/**/integration`. Use `@SpringBootTest` with `Testcontainers` to spin up a real PostgreSQL database, providing a full-stack test environment. These verify the interaction between multiple components.
*   **API Tests:** Utilizes `RestAssured` within integration tests to make actual HTTP requests against the running application.

**Running Tests:**
```bash
mvn clean test
```
**Code Coverage:**
The `pom.xml` is configured with `JaCoCo` to generate code coverage reports.
After `mvn clean test`, you can find the report at `target/site/jacoco/index.html`.
The CI pipeline also checks for a minimum coverage ratio (70% line, 60% branch).

## CI/CD

A conceptual CI/CD pipeline is provided using GitHub Actions in `.github/workflows/ci.yml`.

*   **`build-and-test` Job:**
    *   Triggers on `push` and `pull_request` to `main` and `develop` branches.
    *   Builds the Maven project.
    *   Runs all unit, integration, and API tests.
    *   Generates and uploads JaCoCo code coverage report.
    *   Publishes test results to GitHub Checks.
*   **`build-docker-image` Job:**
    *   Runs only if `build-and-test` passes on `main` or `develop` branches.
    *   Builds the Docker image for the application.
    *   Pushes the image to Docker Hub (requires `DOCKER_USERNAME` and `DOCKER_PASSWORD` secrets).
*   **`deploy` Job:**
    *   Runs only if `build-docker-image` passes and on `main` branch.
    *   Simulates deployment to a production server (replace with actual deployment commands). Requires `SSH_USERNAME` and `PRODUCTION_SERVER_HOST` secrets, potentially an SSH key.

## Monitoring & Logging

*   **Logging:** Configured with SLF4J and Logback.
    *   Logs are output to console and a file (`logs/scrapineer.log` in development, `/var/log/scrapineer/scrapineer.log` in production).
    *   Log levels are configurable via `application.yml` and `logback-spring.xml`.
*   **Monitoring (Actuator):** Spring Boot Actuator endpoints are enabled for monitoring application health and metrics.
    *   `http://localhost:8080/actuator`
    *   `http://localhost:8080/actuator/health`
    *   `http://localhost:8080/actuator/metrics`
    *   **Security Note:** In a production environment, `/actuator` endpoints should be secured, typically restricted to ADMIN users or specific monitoring tools.

## Caching & Rate Limiting

*   **Caching:** Spring Cache with Caffeine (in-memory) is configured.
    *   Annotations like `@Cacheable` and `@CacheEvict` are used in service layers (e.g., `ScrapingTargetService`, `ScrapingResultService`) to cache frequently accessed data.
    *   Caching helps reduce database load and improve API response times for read operations.
*   **Rate Limiting:** Implemented using a custom `RateLimitInterceptor` and the `Bucket4j` library.
    *   Applied to all `/api/**` endpoints (excluding `/api/auth/**`).
    *   Configuration parameters (`bucket-capacity`, `refill-tokens`, `refill-period-seconds`) are defined in `application.yml`.
    *   If the rate limit is exceeded, a `429 Too Many Requests` status is returned with a `Retry-After` header.

## Architecture

(See `docs/architecture.md` for a more detailed diagram)

The system follows a layered architecture, common in Spring Boot applications:

*   **Presentation Layer (API):** `com.alx.scrapineer.api.controller`
    *   Exposes RESTful endpoints for external interaction.
    *   Handles request/response mapping (DTOs), input validation.
    *   Uses Spring Security for authentication and authorization.
    *   `HomeController` provides a minimal Thymeleaf UI.
*   **Service/Business Logic Layer:** `com.alx.scrapineer.service`, `com.alx.scrapineer.scraper.service`
    *   Contains the core business rules and orchestrates operations.
    *   `AuthService`: User registration and login.
    *   `ScrapingTargetService`: CRUD for scraping targets.
    *   `ScrapingJobService`: CRUD and lifecycle management for scraping jobs.
    *   `ScrapingResultService`: Retrieval of scraping results.
    *   `ScrapingOrchestrationService`: Manages the execution flow of a single scraping task, interacting with `ScraperEngine`.
*   **Scraping Layer:** `com.alx.scrapineer.scraper.engine`, `com.alx.scrapineer.scraper.strategy`
    *   `ScraperEngine` interface defines the contract for scraping.
    *   `JsoupScraperEngine` is an implementation for static HTML content. More engines (e.g., Selenium for dynamic JS) can be added here.
*   **Scheduler Layer:** `com.alx.scrapineer.scheduler`
    *   `ScrapingJobScheduler`: Periodically checks for and triggers scheduled jobs.
*   **Data Access Layer (Repository):** `com.alx.scrapineer.data.repository`
    *   Defines interfaces for database operations using Spring Data JPA.
*   **Domain Layer (Entity):** `com.alx.scrapineer.data.entity`
    *   JPA entities representing the core data model (User, Target, Selector, Job, Result).
*   **Infrastructure/Cross-Cutting Concerns:** `com.alx.scrapineer.common`
    *   **Configuration:** `AppConfig`, `WebSecurityConfig`, `WebMvcConfig`.
    *   **Security:** JWT utilities, custom `UserPrincipal`, authentication filters.
    *   **Exception Handling:** `GlobalExceptionHandler` and custom exceptions.
    *   **Utilities:** Mappers (DTO <-> Entity), JWT token handler, Rate Limiting interceptor.

## Deployment Guide

Please refer to `docs/deployment.md` for detailed deployment instructions, including production considerations for Docker, environment variables, and security.

## Contributing

Feel free to fork the repository, open issues, and submit pull requests. Adhere to conventional commit messages.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
```