# ALX Web Scraping Tools System

This project is an enterprise-grade, full-scale web scraping tools system built with Java, Spring Boot, and PostgreSQL. It's designed to be production-ready, featuring robust architecture, comprehensive testing, secure authentication, caching, rate limiting, and extensive documentation.

## Table of Contents

1.  [Features](#features)
2.  [Core Technologies](#core-technologies)
3.  [Project Structure](#project-structure)
4.  [Prerequisites](#prerequisites)
5.  [Setup Instructions](#setup-instructions)
    *   [Local Development](#local-development)
    *   [Docker with Docker Compose](#docker-with-docker-compose)
6.  [API Documentation](#api-documentation)
7.  [Authentication & Authorization](#authentication--authorization)
8.  [Web Scraping Logic](#web-scraping-logic)
9.  [Testing](#testing)
    *   [Running Tests](#running-tests)
    *   [Code Coverage](#code-coverage)
    *   [Performance Testing (Conceptual)](#performance-testing-conceptual)
10. [Architecture Overview](#architecture-overview)
11. [Deployment Guide](#deployment-guide)
12. [CI/CD Pipeline](#cicd-pipeline)
13. [Logging and Monitoring](#logging-and-monitoring)
14. [Caching and Rate Limiting](#caching-and-rate-limiting)
15. [Error Handling](#error-handling)
16. [Future Enhancements](#future-enhancements)
17. [License](#license)

---

## 1. Features

*   **User Management:** Register, login, and manage user accounts with role-based access control (User, Admin).
*   **Scraping Job Management:**
    *   Create, retrieve, update, and delete scraping jobs.
    *   Define target URLs and multiple CSS selectors for data extraction.
    *   Configure multi-page scraping with a "next page" selector and maximum page limits.
    *   Start and stop scraping jobs asynchronously.
*   **Data Storage:** Persist scraped structured data in a PostgreSQL database.
*   **API Endpoints:** Full CRUD operations exposed via RESTful APIs.
*   **Authentication & Authorization:** Secure access using JWT (JSON Web Tokens) and Spring Security.
*   **Caching:** Improve performance with a Caffeine-based caching layer for fetched HTML documents and job data.
*   **Rate Limiting:** Protect API endpoints from abuse with an IP-based rate limiting mechanism.
*   **Error Handling:** Centralized exception handling for consistent API responses.
*   **Logging:** Comprehensive logging with Logback, configured for console and file output.
*   **Monitoring:** Basic monitoring capabilities via Spring Boot Actuator endpoints.
*   **Database Migrations:** Manage schema evolution with Flyway.
*   **Containerization:** Dockerize the application for easy deployment.
*   **CI/CD:** Basic GitHub Actions workflow for automated build, test, and Docker image creation.
*   **Testing:** Extensive unit, integration, and API tests with high code coverage.

## 2. Core Technologies

*   **Backend:** Java 17+, Spring Boot 3+
*   **Database:** PostgreSQL
*   **ORM:** Spring Data JPA, Hibernate
*   **Web Scraping:** [Jsoup](https://jsoup.org/)
*   **Security:** Spring Security, JWT
*   **Database Migrations:** [Flyway](https://flywaydb.org/)
*   **Testing:** JUnit 5, Mockito, Spring Boot Test, [Testcontainers](https://www.testcontainers.org/)
*   **API Documentation:** [Springdoc-openapi (Swagger UI)](https://springdoc.org/)
*   **Caching:** [Caffeine](https://github.com/ben-manes/caffeine)
*   **Containerization:** Docker, Docker Compose
*   **Build Tool:** Maven

## 3. Project Structure

```
.
├── .github/                      # GitHub Actions CI/CD workflows
│   └── workflows/
│       └── maven.yml             # CI/CD pipeline for build and test
├── .dockerignore                 # Files to ignore when building Docker image
├── .gitignore                    # Standard Git ignore file
├── Dockerfile                    # Docker build instructions for the application
├── docker-compose.yml            # Docker Compose configuration for app and database
├── pom.xml                       # Maven Project Object Model (dependencies, build config)
├── README.md                     # This documentation file
└── src/
    ├── main/
    │   ├── java/com/alx/scraper/   # Main application source code
    │   │   ├── ScraperApplication.java # Main Spring Boot entry point
    │   │   ├── config/             # Spring configurations (Security, OpenAPI, Cache)
    │   │   ├── controller/         # REST API endpoints
    │   │   ├── dto/                # Data Transfer Objects for API requests/responses
    │   │   ├── entity/             # JPA Entities (database models)
    │   │   ├── exception/          # Custom exceptions and global error handler
    │   │   ├── repository/         # Spring Data JPA repositories for database access
    │   │   ├── security/           # JWT and Spring Security components
    │   │   ├── service/            # Business logic and core scraping services
    │   │   └── util/               # Utility classes (Jsoup, Rate Limiting)
    │   └── resources/
    │       ├── application.properties    # Default application properties
    │       ├── application-dev.properties # Development-specific properties
    │       ├── db/migration/             # Flyway migration scripts
    │       │   ├── V1__initial_schema.sql  # Initial database schema
    │       │   └── V2__add_seed_data.sql   # Seed data (default users, roles)
    │       └── logback-spring.xml        # Logback configuration for logging
    └── test/
        ├── java/com/alx/scraper/   # Test source code
        │   ├── controller/         # Unit tests for controllers
        │   ├── integration/        # Integration tests (e.g., API, database, full flow)
        │   ├── repository/         # Unit tests for repositories
        │   ├── service/            # Unit tests for services
        │   └── util/               # Unit tests for utility classes
        └── resources/
            └── application-test.properties # Test-specific application properties
```

## 4. Prerequisites

Before you begin, ensure you have the following installed:

*   **Java Development Kit (JDK) 17 or higher**
*   **Maven 3.6.3 or higher**
*   **Docker Desktop** (includes Docker Engine and Docker Compose) - Required for Docker-based setup.
*   **PostgreSQL** (Optional, if running locally without Docker Compose)

## 5. Setup Instructions

You can run the application either locally (requires local PostgreSQL) or using Docker Compose (recommended for ease of setup).

### Local Development

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/alx/web-scraper-system.git # Replace with actual repo URL
    cd web-scraper-system
    ```

2.  **Set up PostgreSQL Database:**
    *   Ensure a PostgreSQL server is running locally (e.g., on port `5432`).
    *   Create a database named `scraper_db`.
    *   Create a user `scraper_user` with password `scraper_password` and grant privileges to `scraper_db`.
    *   Alternatively, you can modify `src/main/resources/application.properties` with your PostgreSQL credentials.

3.  **Run Flyway Migrations (Manual - if not relying on Spring Boot auto-run):**
    When Spring Boot starts, Flyway will automatically run the migrations defined in `src/main/resources/db/migration/`.

4.  **Build the application:**
    ```bash
    mvn clean install -DskipTests
    ```

5.  **Run the application:**
    ```bash
    mvn spring-boot:run
    ```
    The application will start on `http://localhost:8080`.

### Docker with Docker Compose (Recommended)

This method provides a fully containerized environment including the PostgreSQL database.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/alx/web-scraper-system.git # Replace with actual repo URL
    cd web-scraper-system
    ```

2.  **Build and run the containers:**
    ```bash
    docker-compose up --build
    ```
    This command will:
    *   Build the Docker image for the Spring Boot application.
    *   Start a PostgreSQL container (`db`).
    *   Start the Spring Boot application container (`app`).
    *   Flyway migrations will automatically run on the `app` container startup.

3.  **Verify services:**
    *   The PostgreSQL database will be accessible on `localhost:5432`.
    *   The Spring Boot application will be accessible on `http://localhost:8080`.

4.  **Stop and clean up (optional):**
    ```bash
    docker-compose down
    # To remove volumes (database data), add -v
    # docker-compose down -v
    ```

## 6. API Documentation

The API documentation is generated using Springdoc-openapi and is accessible via Swagger UI.

*   Once the application is running (either locally or via Docker), open your browser and navigate to:
    **`http://localhost:8080/swagger-ui.html`**

You can use the Swagger UI to explore all available API endpoints, their request/response schemas, and even test them directly (after authenticating to get a JWT token).

## 7. Authentication & Authorization

The system uses JWT (JSON Web Tokens) for authentication and Spring Security for authorization.

**Default Users (created by `V2__add_seed_data.sql`):**

*   **Admin User:**
    *   **Username:** `admin`
    *   **Password:** `adminpass`
    *   **Roles:** `ROLE_USER`, `ROLE_ADMIN`
*   **Regular User:**
    *   **Username:** `user`
    *   **Password:** `userpass`
    *   **Roles:** `ROLE_USER`

**Authentication Flow:**

1.  **Register:** Use `POST /api/auth/register` to create a new user.
2.  **Login:** Use `POST /api/auth/login` with username/email and password.
3.  **Get JWT:** The login endpoint will return a JWT `accessToken`.
4.  **Authorize Requests:** Include this token in the `Authorization` header of subsequent requests: `Authorization: Bearer <your_jwt_token>`.

**Roles:**
*   `ROLE_USER`: Can manage their own scraping jobs and view their scraped data.
*   `ROLE_ADMIN`: Can do everything a `ROLE_USER` can, plus access administrative endpoints (e.g., `/api/admin/users`).

## 8. Web Scraping Logic

The core scraping logic resides in `com.alx.scraper.service.ScraperService` and `com.alx.scraper.service.DataExtractionService`.

*   **`ScraperService`**: Handles fetching HTML documents using `Jsoup`, managing proxies, and coordinating multi-page scraping. It includes a polite delay (2 seconds) between page fetches to avoid overloading target servers.
*   **`DataExtractionService`**: Uses CSS selectors (provided in the `ScrapingJob`) to extract specific data fields from the `Jsoup.Document`.
*   **`JsoupUtil`**: A utility class wrapping common Jsoup operations.

**Example Scraping Job Configuration (in `ScrapingJobCreateDTO`):**

```json
{
  "jobName": "Books Scraper",
  "targetUrl": "https://books.toscrape.com/",
  "description": "Scrapes book titles and prices from a demo e-commerce site.",
  "selectors": {
    "bookTitle": "article.product_pod h3 a",
    "bookPrice": "article.product_pod .price_color",
    "availability": "article.product_pod .availability"
  },
  "maxPagesToScrape": 2,
  "nextPageSelector": "li.next a"
}
```

## 9. Testing

The project has a strong focus on testing to ensure quality and reliability.

*   **Unit Tests:** Focus on individual components (services, utilities, repositories) in isolation using Mockito. Aim for `80%+` code coverage.
*   **Integration Tests:** Test interactions between multiple components (e.g., API controllers with services and database). Uses Spring Boot Test and Testcontainers for a real database environment.
*   **API Tests:** Covered by the integration tests using `MockMvc` to simulate HTTP requests.

### Running Tests

To run all tests (unit, integration, and API tests) and generate a code coverage report:

```bash
mvn clean verify
```

### Code Coverage

After running `mvn clean verify`, a JaCoCo report will be generated. You can view it by opening:

`target/site/jacoco/index.html`

### Performance Testing (Conceptual)

While performance tests are not directly implemented within the Java codebase (except for potential JMH benchmarks for critical paths), the architecture is designed with performance considerations.

For comprehensive performance testing, you would typically use external tools:

*   **JMeter:** To simulate high load on API endpoints (login, job creation, data retrieval).
*   **k6 / Gatling:** For more modern script-based load testing.

Focus areas for performance testing would include:
*   API endpoint response times under various load conditions.
*   Database performance (query times, connection pooling).
*   Scalability of the asynchronous scraping task execution.

## 10. Architecture Overview

The application follows a layered, modular architecture common in Spring Boot applications:

*   **Presentation Layer (`controller`):** Exposes RESTful APIs, handles HTTP requests, and maps them to DTOs.
*   **Service Layer (`service`):** Contains the core business logic, orchestrates interactions between repositories and external services, and manages transactions. This includes `AuthService`, `ScrapingJobService`, `ScraperService`, `DataExtractionService`, and `UserService`.
*   **Data Access Layer (`repository`):** Handles persistence logic, interacting with the database via Spring Data JPA.
*   **Domain Layer (`entity`):** Defines the core business objects and their relationships (e.g., `User`, `ScrapingJob`, `ScrapedData`).
*   **Security Layer (`security`):** Implements authentication (JWT) and authorization (Spring Security).
*   **Configuration Layer (`config`):** Centralized configuration for various aspects like security, caching, and OpenAPI.
*   **Utility Layer (`util`):** Helper classes for common tasks (e.g., `JsoupUtil`, `RateLimitInterceptor`).

**Key Architectural Decisions:**

*   **Asynchronous Scraping:** Scraping jobs are executed in a separate `TaskExecutor` thread pool, preventing blocking of the main API threads.
*   **Stateless API:** JWT-based authentication ensures the API remains stateless, improving scalability.
*   **Database Schema Design:** Uses `JSONB` for flexible storage of `selectors` and `extractedData`, allowing dynamic scraping configurations without schema changes. Indexes are used for query optimization.
*   **Caching:** Leverages Spring's caching abstraction with Caffeine for improved performance of frequently accessed data (e.g., `htmlDocuments`, `scrapingJob` details).
*   **Rate Limiting:** A simple `HandlerInterceptor` provides basic API rate limiting per IP. For a highly scalable solution, this would typically involve an external store like Redis.

## 11. Deployment Guide

The application is containerized using Docker, making deployment straightforward.

1.  **Build the Docker Image:**
    ```bash
    docker build -t alx-scraper-system .
    ```
    This creates a Docker image tagged `alx-scraper-system:latest`. You can specify a version tag instead of `latest` (e.g., `alx-scraper-system:1.0.0`).

2.  **Push to Container Registry (Optional):**
    If deploying to a cloud environment (e.g., AWS ECR, Docker Hub, Google Container Registry), you'll need to tag the image and push it:
    ```bash
    docker tag alx-scraper-system:latest your_registry_url/alx-scraper-system:latest
    docker push your_registry_url/alx-scraper-system:latest
    ```
    (Replace `your_registry_url` with your actual registry address).

3.  **Deployment Options:**

    *   **Docker Compose (for single-server deployments or testing):**
        Use the provided `docker-compose.yml` file on your target server. Ensure `docker` and `docker-compose` are installed.
        ```bash
        docker-compose up -d # -d for detached mode
        ```

    *   **Kubernetes (for production, highly scalable environments):**
        You would create Kubernetes deployment and service YAMLs.
        *   **Deployment:** Define your application container (using the image pushed to a registry), resource limits, health probes, etc.
        *   **Service:** Expose your deployment internally or externally (e.g., LoadBalancer or NodePort).
        *   **Persistent Volume:** For the PostgreSQL database, ensure a Persistent Volume and Persistent Volume Claim are configured.
        *   **Secrets:** Manage sensitive information (like JWT secret, database credentials) using Kubernetes Secrets.
        *   **Ingress:** For external access with hostname routing and TLS.

        ```yaml
        # Example Kubernetes Deployment (simplified)
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: scraper-app
        spec:
          replicas: 3
          selector:
            matchLabels:
              app: scraper-app
          template:
            metadata:
              labels:
                app: scraper-app
            spec:
              containers:
              - name: scraper-app
                image: your_registry_url/alx-scraper-system:latest
                ports:
                - containerPort: 8080
                env:
                - name: SPRING_DATASOURCE_URL
                  value: jdbc:postgresql://db-service:5432/scraper_db # Assuming a 'db-service' K8s service for Postgres
                - name: SPRING_DATASOURCE_USERNAME
                  valueFrom:
                    secretKeyRef:
                      name: db-credentials
                      key: username
                - name: SPRING_DATASOURCE_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: db-credentials
                      key: password
                - name: APP_JWT_SECRET
                  valueFrom:
                    secretKeyRef:
                      name: app-secrets
                      key: jwt-secret
                # Add resource limits, liveness/readiness probes, etc.
        ---
        # Example Kubernetes Service (simplified)
        apiVersion: v1
        kind: Service
        metadata:
          name: scraper-app-service
        spec:
          selector:
            app: scraper-app
          ports:
            - protocol: TCP
              port: 80
              targetPort: 8080
          type: LoadBalancer # Or ClusterIP, NodePort
        ```
    *   **Cloud Platforms (AWS ECS, Google Cloud Run, Azure Container Apps):**
        These platforms provide managed container orchestration. You would push your Docker image to their respective registries and configure the service to run from there, handling scaling, networking, and environment variables.

## 12. CI/CD Pipeline

A basic GitHub Actions workflow (`.github/workflows/maven.yml`) is provided for Continuous Integration and Continuous Delivery.

**Workflow Steps:**

1.  **Checkout Code:** Retrieves the source code from the repository.
2.  **Setup JDK 17:** Configures the Java environment.
3.  **Build with Maven:** Compiles the project and packages it into a JAR file.
4.  **Run Unit and Integration Tests:** Executes all tests and fails the build if any test fails.
5.  **Collect JaCoCo Coverage Report:** Generates a code coverage report.
6.  **Upload JaCoCo report to Codecov (Optional):** Integrates with Codecov for coverage reporting (requires `CODECOV_TOKEN` secret).
7.  **Build Docker Image:** Creates a Docker image of the application.
8.  **Push Docker Image (Commented out):** Example step to push the Docker image to a container registry (requires Docker Hub credentials in GitHub Secrets).
9.  **Deploy to Server (Commented out):** Placeholder for a deployment step (e.g., via SSH to a server, or to a Kubernetes cluster).

**To enable Codecov integration:**
1.  Sign up for Codecov.
2.  Add a repository secret named `CODECOV_TOKEN` in your GitHub repository settings, with the token provided by Codecov.

## 13. Logging and Monitoring

*   **Logging:** The application uses SLF4J with Logback.
    *   `src/main/resources/logback-spring.xml` configures logging to the console, an `application-info.log` file, and an `application-error.log` file.
    *   Log levels can be configured in `application.properties` or `logback-spring.xml`.
*   **Monitoring:** Spring Boot Actuator is enabled to expose operational information.
    *   Access Actuator endpoints at `http://localhost:8080/actuator`.
    *   Key endpoints: `health`, `info`, `metrics`, `prometheus`, `caches`, `beans`.
    *   `prometheus` endpoint provides metrics in a format easily scraped by Prometheus, which can then be visualized with Grafana.

## 14. Caching and Rate Limiting

*   **Caching (`config/CacheConfig.java`, `@Cacheable`, `@CacheEvict`, `@CachePut`):**
    *   Uses Spring's caching abstraction with [Caffeine](https://github.com/ben-manes/caffeine) as the cache provider.
    *   **`htmlDocuments`:** Caches fetched HTML documents (`ScraperService.fetchDocument`) to avoid re-fetching the same URL within a short period.
    *   **`extractedData`:** Caches extracted data from a document if the same document hash is provided.
    *   **`scrapingJob`:** Caches individual scraping job details.
    *   **`allScrapingJobsForUser`:** Caches the list of jobs for a specific user.
    *   `@CacheEvict` annotations ensure caches are invalidated when data changes (e.g., job update/delete).

*   **Rate Limiting (`util/RateLimitInterceptor.java`):**
    *   A simple IP-based rate limiter is implemented as a Spring `HandlerInterceptor`.
    *   It allows `5` requests per `10` seconds per IP address to all `/api/**` endpoints.
    *   If the limit is exceeded, it returns `HTTP 429 Too Many Requests`.
    *   **Note:** For a truly production-ready, distributed rate limiting solution, consider using a shared store like Redis.

## 15. Error Handling

*   **`exception/GlobalExceptionHandler.java`:** This `@ControllerAdvice` class provides centralized error handling across the application.
    *   It catches specific exceptions (`ResourceNotFoundException`, `UnauthorizedException`, `MethodArgumentNotValidException`, `AccessDeniedException`, `AuthenticationException`) and generic `Exception`.
    *   It returns consistent JSON error responses with status codes and detailed messages, improving API robustness and user experience.

## 16. Future Enhancements

*   **Advanced Scheduling:** Integrate with a more robust scheduler (e.g., Quartz) for complex job scheduling (daily, weekly, specific times).
*   **Distributed Scraping:** For large-scale operations, integrate with a distributed queue (e.g., RabbitMQ, Kafka) and multiple worker instances.
*   **Headless Browser Support:** Integrate with Selenium or Playwright for scraping JavaScript-rendered content.
*   **CAPTCHA/Anti-Bot Bypass:** Implement strategies for handling CAPTCHAs, IP bans, and other anti-bot mechanisms.
*   **Proxy Health Checks:** Implement health checks and intelligent rotation for proxies.
*   **User Interface:** Develop a dedicated frontend (React, Angular, Vue.js) for a richer user experience.
*   **Notifications:** Add email/webhook notifications for job completion or failure.
*   **Data Export:** Allow exporting scraped data in various formats (CSV, JSON, Excel).
*   **Tenant Separation:** For multi-tenant applications, ensure strict data isolation between users.
*   **More Granular Rate Limiting:** Implement per-user or per-endpoint rate limiting using a distributed cache (e.g., Redis).
*   **Circuit Breaker:** Implement a circuit breaker pattern (e.g., Resilience4j) for external calls (like proxy services, target URLs) to prevent cascading failures.

## 17. License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
```