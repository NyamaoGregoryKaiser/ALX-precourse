```markdown
# WebScraperX - Comprehensive Web Scraping Tools System

![Java](https://img.shields.io/badge/Java-17-blue.svg)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-green.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-lightgrey.svg)
![Jsoup](https://img.shields.io/badge/Jsoup-orange.svg)
![JWT](https://img.shields.io/badge/JWT-black.svg)
![Docker](https://img.shields.io/badge/Docker-blue.svg)
![CI/CD](https://img.shields.io/badge/CI/CD-GitHub%20Actions-blueviolet.svg)
![Code Coverage](https://codecov.io/gh/your-username/web-scraper-x/branch/main/graph/badge.svg?token=YOUR_CODECOV_TOKEN)

WebScraperX is an enterprise-grade, full-stack web scraping application built with Java (Spring Boot) backend, PostgreSQL database, and a simple vanilla JavaScript frontend. It provides a robust and extensible platform for defining, scheduling, executing, and managing web scraping tasks.

This project emphasizes clean architecture, comprehensive testing, security, and scalability, following best practices for production-ready software.

## Table of Contents

1.  [Features](#1-features)
2.  [Architecture Overview](#2-architecture-overview)
3.  [Technology Stack](#3-technology-stack)
4.  [Prerequisites](#4-prerequisites)
5.  [Setup and Installation](#5-setup-and-installation)
    *   [Local Setup (without Docker)](#51-local-setup-without-docker)
    *   [Docker Compose Setup](#52-docker-compose-setup)
6.  [Running the Application](#6-running-the-application)
7.  [API Documentation (Swagger UI)](#7-api-documentation-swagger-ui)
8.  [Frontend Usage](#8-frontend-usage)
9.  [Authentication & Authorization](#9-authentication--authorization)
10. [Scheduled Tasks](#10-scheduled-tasks)
11. [Caching](#11-caching)
12. [Rate Limiting](#12-rate-limiting)
13. [Error Handling](#13-error-handling)
14. [Logging & Monitoring](#14-logging--monitoring)
15. [Testing](#15-testing)
16. [CI/CD](#16-cicd)
17. [Deployment Guide](#17-deployment-guide)
18. [ALX Software Engineering Principles](#18-alx-software-engineering-principles)
19. [Future Enhancements](#19-future-enhancements)
20. [Contributing](#20-contributing)
21. [License](#21-license)

## 1. Features

*   **Scraping Task Management (CRUD):** Define web pages to scrape, specify data fields using CSS selectors, and manage tasks.
*   **Scheduled Scraping:** Use cron expressions to schedule tasks for automatic execution.
*   **Manual Trigger:** Manually initiate a scraping task execution.
*   **Data Storage:** Persist scraped data in a PostgreSQL database.
*   **User Authentication & Authorization (JWT):** Secure API endpoints, allowing only authenticated and authorized users to manage their tasks.
*   **Role-Based Access Control:** Differentiate between `USER` and `ADMIN` roles (though `ADMIN` features are not fully exposed in this frontend, the backend supports it).
*   **Global Error Handling:** Consistent and informative error responses.
*   **Caching Layer:** Improve API performance for frequently accessed task details.
*   **Rate Limiting:** Protect the backend from abuse and ensure fair usage.
*   **Comprehensive Logging:** Detailed logs for debugging and operational insights.
*   **Health & Metrics Monitoring:** Spring Boot Actuator endpoints for application health, metrics (Prometheus format supported).
*   **Database Migrations:** Manage schema changes with Flyway.
*   **Docker Support:** Containerized setup for easy deployment and development.
*   **CI/CD Pipeline:** Basic GitHub Actions workflow for automated build and test.
*   **API Documentation:** Interactive API documentation using Swagger UI (Springdoc OpenAPI).
*   **Frontend:** A basic HTML/JS frontend to demonstrate core functionalities.

## 2. Architecture Overview

The application follows a standard layered architecture for a Spring Boot application:

*   **Presentation Layer (Frontend/Controllers):**
    *   **Frontend:** Simple HTML/CSS/JS client consuming the REST API.
    *   **Controllers (`com.alx.webscraper.controller`):** REST endpoints exposing the application's functionality. They receive HTTP requests, validate input, and delegate to the service layer.
*   **Service Layer (`com.alx.webscraper.service`):**
    *   Contains the core business logic. It orchestrates operations, interacts with multiple repositories, and manages transactions. This layer includes `ScrapingTaskService`.
*   **Scraper Layer (`com.alx.webscraper.scraper`):**
    *   Dedicated module for web scraping logic.
    *   `ScraperStrategy`: Interface for different scraping methods (currently `HtmlScraper` using Jsoup).
    *   `ScraperService`: High-level service to execute a scraping task using a chosen strategy and persist results.
    *   `ScraperScheduler`: Manages the scheduling and execution of cron-based tasks.
*   **Data Access Layer (Repositories):**
    *   **Repositories (`com.alx.webscraper.repository`):** Spring Data JPA interfaces for interacting with the database. They abstract away the details of persistence.
*   **Domain Model Layer (`com.alx.webscraper.model`):**
    *   **Entities:** JPA entities representing the database schema (`ScrapingTask`, `ScrapedData`, `User`).
    *   **DTOs:** Data Transfer Objects for request/response bodies, ensuring data validation and controlled exposure of entity data.
*   **Infrastructure/Cross-Cutting Concerns:**
    *   **Configuration (`com.alx.webscraper.config`):** Spring Security, caching, rate limiting, OpenAPI.
    *   **Auth (`com.alx.webscraper.auth`):** JWT-based authentication and authorization.
    *   **Exception Handling (`com.alx.webscraper.exception`):** Global exception handling using `@ControllerAdvice`.
    *   **Logging:** Configured with SLF4J and Logback.

```mermaid
graph TD
    A[Frontend/API Client] -- HTTP Requests --> B(Spring Boot Backend)

    subgraph "Spring Boot Backend"
        B --> C[Controller Layer]
        C --> D[Service Layer]
        D --> E[Scraper Layer]
        D -- Persists --> F[Repository Layer]
        E -- Persists --> F
        F -- Interacts With --> G((PostgreSQL Database))
        B -- Security/Auth --> H[Spring Security/JWT]
        B -- Rate Limiting --> I[Rate Limiting Interceptor]
        B -- Caching --> J[Caffeine Cache]
        B -- Error Handling --> K[Global Exception Handler]
        B -- Scheduling --> L[Spring Scheduler]
        L -- Triggers --> E
        L -- Updates --> F
    end

    subgraph "Scraper Layer"
        E1[ScraperService] --> E2[ScraperStrategy (e.g., Jsoup)]
    end

    subgraph "Data Access Layer"
        F1[ScrapingTaskRepository]
        F2[ScrapedDataRepository]
        F3[UserRepository]
        F --> F1 & F2 & F3
    end
```

## 3. Technology Stack

*   **Backend:**
    *   Java 17
    *   Spring Boot 3.2.5
    *   Spring Data JPA
    *   Spring Security (JWT)
    *   Jsoup 1.17.2 (Web Scraping)
    *   Lombok
    *   Caffeine (Local Cache)
    *   Springdoc OpenAPI (Swagger UI)
*   **Database:**
    *   PostgreSQL
    *   Flyway (Database Migrations)
*   **Build Tool:**
    *   Maven
*   **Containerization:**
    *   Docker, Docker Compose
*   **Testing:**
    *   JUnit 5
    *   Mockito
    *   Spring Boot Test
    *   Testcontainers (for integration tests with real DB)
    *   WireMock (for HTTP mocking in scraper tests)
*   **Frontend:**
    *   HTML, CSS, Vanilla JavaScript (fetch API)
*   **CI/CD:**
    *   GitHub Actions

## 4. Prerequisites

*   Java 17 JDK
*   Maven 3.6+
*   Docker & Docker Compose (optional, but highly recommended)
*   PostgreSQL (if running locally without Docker)
*   A text editor or IDE (IntelliJ IDEA, VS Code, Eclipse)

## 5. Setup and Installation

You can run the application either directly on your machine or using Docker Compose.

### 5.1. Local Setup (without Docker)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/web-scraper-x.git
    cd web-scraper-x
    ```

2.  **Set up PostgreSQL:**
    *   Install PostgreSQL (if not already installed).
    *   Create a database: `webscraperdb`
    *   Create a user: `webscraper` with password `webscraperpass`
    ```sql
    CREATE USER webscraper WITH PASSWORD 'webscraperpass';
    CREATE DATABASE webscraperdb OWNER webscraper;
    ```
    *   (Optional) Update `src/main/resources/application.yml` if your database credentials are different.

3.  **Run Flyway migrations:**
    ```bash
    mvn flyway:migrate
    ```
    This will apply `V1__Initial_schema.sql` and `V2__Add_users_roles_data.sql`.

4.  **Build the project:**
    ```bash
    mvn clean install -DskipTests
    ```

5.  **Run the application:**
    ```bash
    mvn spring-boot:run
    ```
    or
    ```bash
    java -jar target/web-scraper-x-0.0.1-SNAPSHOT.jar
    ```

### 5.2. Docker Compose Setup (Recommended)

This is the easiest way to get the entire system (backend + database) up and running.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/web-scraper-x.git
    cd web-scraper-x
    ```

2.  **Build and run with Docker Compose:**
    ```bash
    docker-compose up --build
    ```
    *   `--build` ensures the Docker image for the Spring Boot app is built from the `Dockerfile`.
    *   This will start both the PostgreSQL database and the Spring Boot application.
    *   The database migrations will run automatically on application startup (managed by Spring Boot and Flyway).

## 6. Running the Application

Once the application is running (either locally or via Docker Compose), the backend will be accessible at `http://localhost:8080`.

The frontend `index.html` will also be served from `http://localhost:8080/`.

## 7. API Documentation (Swagger UI)

Access the interactive API documentation at:
**`http://localhost:8080/swagger-ui.html`**

This documentation provides details on all API endpoints, request/response models, and allows you to test the APIs directly.

**Authentication in Swagger UI:**
To test secured endpoints (almost all of them):
1.  Click the "Authorize" button (usually a lock icon) in the top right.
2.  Enter a valid JWT token in the "Value" field (prefix with `Bearer `).
    *   You can obtain a token by using the `/api/v1/auth/login` endpoint with credentials (e.g., `username: testuser`, `password: testpass`).
    *   Example: `Bearer eyJhbGciOiJIUzI1NiJ9...`
3.  Click "Authorize" and then "Close".
Now you can try out the secured endpoints.

## 8. Frontend Usage

The frontend is a simple HTML/CSS/JS application served by the Spring Boot backend at `http://localhost:8080/`.

1.  **Open your browser:** Navigate to `http://localhost:8080/`.
2.  **Register/Login:**
    *   Use the "Register" tab to create a new user.
    *   Use the "Login" tab to log in with existing users (e.g., `testuser` / `testpass` from seed data or a newly registered user).
    *   Upon successful login, a JWT token is stored in local storage, and you'll be redirected to the "Tasks" page.
3.  **Tasks Page:**
    *   View your existing scraping tasks.
    *   Click "Create New Task" to define a new task:
        *   **Name:** A descriptive name for your task.
        *   **Target URL:** The URL to scrape (e.g., `https://example.com/products`).
        *   **Cron Expression (Optional):** A standard cron expression for scheduling (e.g., `0 0 12 * * ?` for daily at 12 PM). If empty, the task is pending and can be triggered manually.
        *   **Data Fields:** Define what to extract:
            *   **Field Name:** Logical name for the data (e.g., `productName`, `price`).
            *   **CSS Selector:** Jsoup-compatible CSS selector to find the element (e.g., `.product-item h2.name`).
            *   **Attribute (Optional):** If you want to extract an attribute instead of text (e.g., `href`, `src`). Leave empty for text.
    *   **Actions:**
        *   **👁️ View Data:** See the scraped data for a task (paginated).
        *   **▶️ Trigger Now:** Manually run the scraping task once.
        *   **✏️ Edit:** Modify task details, including cron and status.
        *   **🗑️ Delete:** Remove a task and all its scraped data.

## 9. Authentication & Authorization

*   **Mechanism:** JSON Web Tokens (JWT) are used for stateless authentication.
*   **Flow:**
    1.  User registers (`/api/v1/auth/register`) or logs in (`/api/v1/auth/login`).
    2.  Upon successful authentication, the server returns a JWT.
    3.  The client stores this token (e.g., in `localStorage`).
    4.  For subsequent requests to protected API endpoints, the client includes the JWT in the `Authorization` header as `Bearer <token>`.
    5.  Spring Security intercepts the request, validates the JWT, and authenticates the user.
*   **Roles:** Users are assigned `USER` or `ADMIN` roles. All task-related operations are authorized based on task ownership (a user can only manage their own tasks). The `/api/v1/admin/**` endpoints (if any) would be restricted to `ADMIN` users.

## 10. Scheduled Tasks

*   Tasks can be scheduled by providing a valid cron expression during creation or update.
*   The `ScraperScheduler` component monitors tasks with `SCHEDULED` status and valid cron expressions, using Spring's `@Scheduled` and `TaskScheduler` to execute them.
*   Tasks can be stopped/disabled by changing their status via the `PUT /api/v1/tasks/{id}` endpoint.
*   A task can also be manually triggered at any time using `POST /api/v1/tasks/{id}/trigger`.

**Example Cron Expressions:**
*   `0 0 12 * * ?` : Every day at 12:00 PM (noon).
*   `0 */5 * * * ?` : Every 5 minutes.
*   `0 0 0 L * ?` : Last day of every month at midnight.

## 11. Caching

*   **Mechanism:** Caffeine (a high-performance caching library) integrated with Spring's `@Cacheable`, `@CachePut`, and `@CacheEvict` annotations.
*   **Configuration:** See `src/main/java/com/alx/webscraper/config/CacheConfig.java` and `application.yml`.
*   **Usage:**
    *   `ScrapingTaskService.getTaskById(id, user)`: Results are cached. Subsequent requests for the same task ID by the same user will hit the cache, improving response time and reducing database load.
    *   `ScrapingTaskService.updateTask(id, ...)`: Updates the cached entry.
    *   `ScrapingTaskService.deleteTask(id, ...)`: Evicts the task from the cache.

## 12. Rate Limiting

*   **Mechanism:** A custom Spring `HandlerInterceptor` (`RateLimitingInterceptor`) applies a rate limit based on the client's IP address.
*   **Configuration:** The rate limit is hardcoded for this demo (e.g., 5 requests per 10 seconds). In a real application, this would be configurable via `application.yml` or a dedicated service.
*   **Behavior:** If a client exceeds the rate limit, they receive an HTTP 429 (Too Many Requests) response.
*   **Applicability:** Applied globally to all API endpoints by `WebConfig`.

## 13. Error Handling

*   **Mechanism:** A global exception handler (`GlobalExceptionHandler`) using Spring's `@ControllerAdvice`.
*   **Benefits:** Ensures consistent JSON error responses across the API, regardless of the underlying exception.
*   **Handled Exceptions:**
    *   `ResourceNotFoundException` (404 Not Found)
    *   `MethodArgumentNotValidException` (400 Bad Request - for `@Valid` DTOs)
    *   `HttpMessageNotReadableException` (400 Bad Request - for malformed JSON)
    *   `BadCredentialsException` (401 Unauthorized - for login failures)
    *   `AccessDeniedException` (403 Forbidden - for unauthorized access)
    *   `CustomRateLimitException` (429 Too Many Requests)
    *   `IOException` (500 Internal Server Error - specific to scraping failures)
    *   Generic `Exception` (500 Internal Server Error)

## 14. Logging & Monitoring

*   **Logging:**
    *   Uses SLF4J with Logback.
    *   Configured via `src/main/resources/logback-spring.xml` and `application.yml`.
    *   Logs are written to console and a file (`logs/webscraperx.log`).
    *   Detailed logging levels (`INFO`, `DEBUG`) are configured for different packages.
*   **Monitoring:**
    *   Spring Boot Actuator provides production-ready features for monitoring and managing the application.
    *   Access Actuator endpoints (e.g., health, info, metrics) at `http://localhost:8080/actuator`.
    *   `health`: Check application health (`http://localhost:8080/actuator/health`).
    *   `metrics`: View various application metrics (`http://localhost:8080/actuator/metrics`).
    *   `prometheus`: Metrics exposed in Prometheus format (`http://localhost:8080/actuator/prometheus`).
    *   These endpoints are crucial for integration with external monitoring systems like Prometheus and Grafana.

## 15. Testing

The project includes a comprehensive suite of tests to ensure quality and reliability:

*   **Unit Tests:**
    *   Focus on individual components (services, repositories, scraper logic) in isolation.
    *   Use Mockito for mocking dependencies.
    *   Aim for high code coverage (target: 80%+).
    *   Example: `ScrapingTaskServiceTest`, `HtmlScraperTest`.
*   **Integration Tests:**
    *   Verify interactions between multiple components (e.g., controller to service to repository).
    *   Uses `@SpringBootTest` to load a partial or full application context.
    *   Uses `Testcontainers` to provide a real PostgreSQL database instance for repository tests, ensuring database interactions are tested against an actual database environment.
    *   Uses `MockMvc` for simulating HTTP requests to controllers without starting a full HTTP server.
    *   Example: `ScrapingTaskControllerTest`, `ScrapingTaskRepositoryTest`.
*   **API Tests:**
    *   Part of integration tests (using `MockMvc`) to verify API endpoint behavior, request/response formats, and status codes.
    *   Swagger UI also acts as an interactive API testing tool.
*   **Performance Tests:**
    *   While full-fledged performance test scripts (e.g., JMeter, Gatling) are beyond the scope of this single response, the system is designed with performance considerations:
        *   Caching layer.
        *   Efficient database queries (JPA, indexing).
        *   Asynchronous processing for scraping (though not fully implemented as a separate thread pool for simplicity in this example, it's an easy extension).
        *   Rate limiting for protection.
    *   **To perform manually:** Use tools like Apache JMeter, Gatling, or k6 to send concurrent requests to the API and monitor response times, throughput, and error rates.

## 16. CI/CD

A basic GitHub Actions workflow (`.github/workflows/ci.yml`) is provided for Continuous Integration:

*   **Trigger:** Runs on `push` to `main` or `develop` branches, and on `pull_request`.
*   **Steps:**
    1.  **Checkout Code:** Clones the repository.
    2.  **Set up JDK 17:** Configures the Java environment.
    3.  **Cache Maven dependencies:** Speeds up builds.
    4.  **Set up PostgreSQL:** Starts a temporary PostgreSQL instance for integration tests.
    5.  **Build with Maven:** Compiles the project and runs `mvn clean install -DskipTests`.
    6.  **Run Tests:** Executes unit and integration tests (`mvn test`).
    7.  **Generate JaCoCo Coverage Report:** Generates a code coverage report.
    8.  **Upload Codecov Report:** Publishes the coverage report to Codecov (requires `CODECOV_TOKEN` secret).

This pipeline ensures that every code change is automatically built and tested, maintaining code quality. For Continuous Deployment, additional steps would be added to build and push Docker images to a registry, and then deploy to a cloud provider (e.g., Kubernetes, AWS ECS, Azure Container Apps).

## 17. Deployment Guide

This project is designed for containerized deployment, making it highly portable.

1.  **Container Registry:**
    *   After the CI pipeline, you would typically add a step to build the Docker image and push it to a container registry (e.g., Docker Hub, GitHub Container Registry, AWS ECR, Google Container Registry).
    ```bash
    # Example for pushing to Docker Hub
    docker build -t your-docker-hub-username/web-scraper-x:latest .
    docker login
    docker push your-docker-hub-username/web-scraper-x:latest
    ```

2.  **Environment Variables:**
    *   In a production environment, never hardcode sensitive information. Use environment variables.
    *   `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`: For database connection.
    *   `JWT_SECRET`: A strong, randomly generated secret for JWT signing.
    *   `SERVER_PORT`: The port the application listens on.
    *   `SECURITY_DEFAULT_USER`, `SECURITY_DEFAULT_PASSWORD`: Consider disabling default Spring Security user in production or ensuring strong credentials are set.

3.  **Orchestration (Kubernetes/ECS/Container Apps):**
    *   **Kubernetes:** Define `Deployment`, `Service`, and `Ingress` resources. Use `Secrets` for sensitive data and `ConfigMaps` for non-sensitive configurations.
    *   **AWS ECS/Fargate:** Define a `Task Definition` for your Docker image and deploy it as a `Service` in an ECS cluster.
    *   **Azure Container Apps/App Service:** Deploy your Docker image directly and configure environment variables.

4.  **Database Management:**
    *   Ensure your PostgreSQL database is a managed service (e.g., AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL) for high availability, backups, and scaling.
    *   Flyway will handle migrations on application startup. Ensure your database user has sufficient permissions for `ALTER TABLE` operations during migration.

5.  **Monitoring & Logging:**
    *   Integrate Actuator metrics with Prometheus and Grafana.
    *   Centralize logs from Docker containers using a logging solution like ELK stack (Elasticsearch, Logstash, Kibana) or cloud-native services (CloudWatch Logs, Azure Monitor, Google Cloud Logging).

6.  **Scalability:**
    *   The application can be scaled horizontally by running multiple instances behind a load balancer.
    *   The `ScraperScheduler` currently runs on a single instance. For high-availability scheduling, consider externalizing cron jobs to a dedicated scheduler (e.g., AWS EventBridge, Kubernetes CronJobs) or using distributed locking mechanisms (e.g., Redis, Zookeeper) to ensure only one instance of `ScraperScheduler` is active at any time.

## 18. ALX Software Engineering Principles

This project has been developed with strong adherence to ALX Software Engineering principles:

*   **Programming Logic:** Clear, modular code with well-defined functions and methods. Business logic in services, scraping logic in a dedicated module.
*   **Algorithm Design:**
    *   **Scraping Logic:** The `HtmlScraper` uses Jsoup's efficient DOM traversal and CSS selector matching algorithms. The logic for handling multiple elements per selector is a simple iteration, which scales linearly with the number of elements.
    *   **Scheduling:** The `ScraperScheduler` utilizes Spring's built-in `CronTrigger` for efficient calculation of next execution times, avoiding busy-waiting.
*   **Technical Problem Solving:**
    *   **Concurrency:** Spring's `@Scheduled` tasks run in a thread pool, allowing concurrent task execution. The `ScraperScheduler` carefully manages `ScheduledFuture` objects for cancellation.
    *   **Data Consistency:** `@Transactional` annotations ensure atomic database operations.
    *   **Robustness:** Global error handling, input validation (`@Valid`), and explicit exception management (e.g., `IOException` for scraping failures).
    *   **Security:** JWT-based authentication, password hashing (`BCrypt`), and authorization checks protect the API.
    *   **Scalability:** Layered architecture, caching, and rate limiting prepare the application for horizontal scaling.
    *   **Maintainability:** Clean code, DTOs, `MappingUtil`, clear naming conventions, and extensive documentation contribute to high maintainability.
    *   **Extensibility:** The `ScraperStrategy` interface allows easy addition of new scraping methods (e.g., Selenium for JavaScript-rendered content) without modifying core logic.

## 19. Future Enhancements

*   **Advanced Scraping:**
    *   Integrate Selenium for JavaScript-rendered websites.
    *   Proxy rotation for avoiding IP bans.
    *   CAPTCHA solving integration.
    *   More advanced data parsing (e.g., JSON extraction from script tags).
*   **Frontend Improvements:**
    *   Migrate to a modern JavaScript framework (React, Vue, Angular) for a more interactive and robust UI.
    *   Real-time updates using WebSockets for task status/scraped data.
    *   User-friendly cron expression builder.
*   **Backend Enhancements:**
    *   Asynchronous task execution with dedicated thread pools and message queues (e.g., Kafka, RabbitMQ) for higher throughput and resilience.
    *   Distributed Caching (e.g., Redis) for multi-instance deployments.
    *   Externalize scheduler (e.g., using Quartz, Apache Airflow) for distributed, highly available scheduling.
    *   Webhooks for task completion notifications.
    *   More granular authorization (e.g., sharing tasks between users).
    *   Support for multiple scraping strategies per task (e.g., fallback from Jsoup to Selenium).
*   **Monitoring & Alerting:**
    *   Integrate with an alerting system (e.g., PagerDuty, Opsgenie) for task failures.
    *   Dashboard with Grafana for visualizing metrics and task statuses.

## 20. Contributing

Contributions are welcome! If you have suggestions or improvements, please:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature`).
3.  Make your changes.
4.  Write tests for your changes.
5.  Ensure all tests pass.
6.  Commit your changes (`git commit -am 'Add new feature'`).
7.  Push to the branch (`git push origin feature/your-feature`).
8.  Create a new Pull Request.

## 21. License

This project is licensed under the MIT License - see the `LICENSE` file for details.
```