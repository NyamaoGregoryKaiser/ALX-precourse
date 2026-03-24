# Product Management System - Enterprise DevOps Automation Project

This project implements a comprehensive, production-ready DevOps automation system around a Java Spring Boot backend application. It focuses on demonstrating end-to-end software development lifecycle practices, including core application development, database management, robust configuration, testing, security, monitoring, and a fully automated CI/CD pipeline.

## Table of Contents

1.  [Project Overview](#1-project-overview)
2.  [Features](#2-features)
3.  [Technology Stack](#3-technology-stack)
4.  [Getting Started](#4-getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Local Setup (Docker Compose)](#local-setup-docker-compose)
    *   [Running the Application](#running-the-application)
    *   [Accessing the Frontend](#accessing-the-frontend)
    *   [Accessing API Documentation (Swagger UI)](#accessing-api-documentation-swagger-ui)
5.  [Key API Endpoints](#5-key-api-endpoints)
6.  [Authentication & Authorization](#6-authentication--authorization)
7.  [Testing](#7-testing)
8.  [CI/CD Pipeline](#8-cicd-pipeline)
9.  [Configuration & Customization](#9-configuration--customization)
10. [Logging & Monitoring](#10-logging--monitoring)
11. [Caching](#11-caching)
12. [Rate Limiting](#12-rate-limiting)
13. [Further Documentation](#13-further-documentation)
14. [Contributing](#14-contributing)
15. [License](#15-license)

## 1. Project Overview

This project provides a full-stack Product Management System, exposing a RESTful API for managing product categories and products. It serves as a practical example for implementing modern DevOps principles:

*   **Java Spring Boot Backend:** Robust and scalable API with business logic.
*   **PostgreSQL Database:** Persistent data storage with Flyway for migrations.
*   **Docker & Docker Compose:** Containerization for consistent environments.
*   **Spring Security (JWT):** Secure user authentication and authorization.
*   **Testing:** Unit, Integration, and API tests for quality assurance.
*   **CI/CD (GitHub Actions):** Automated build, test, and Docker image publishing.
*   **Monitoring & Logging:** Spring Boot Actuator, custom Logback.
*   **Additional Features:** Caching, Rate Limiting, Global Error Handling.
*   **Documentation:** Comprehensive guides for setup, API, architecture, and deployment.

## 2. Features

*   **Product Management:**
    *   Create, Read, Update, Delete (CRUD) products.
    *   Associate products with categories.
    *   Search products by name or description.
*   **Category Management:**
    *   Create, Read, Update, Delete (CRUD) categories.
*   **User Authentication & Authorization:**
    *   User registration and login using JWT.
    *   Role-based access control (RBAC): `ROLE_USER` can view, `ROLE_ADMIN` can perform all CRUD operations.
*   **Data Persistence:** PostgreSQL with Flyway database migrations.
*   **Caching:** In-memory caching with Caffeine for frequently accessed data (products, categories).
*   **Rate Limiting:** Protects API endpoints from excessive requests.
*   **Robust Error Handling:** Global exception handling for consistent API responses.
*   **Logging:** Structured logging with Logback.
*   **Monitoring:** Spring Boot Actuator endpoints for application health and metrics.
*   **Containerization:** Dockerfiles and Docker Compose for easy setup and deployment.
*   **Automated CI/CD:** GitHub Actions workflow for build, test, and Docker image publishing.
*   **User Interface:** A simple HTML/JavaScript frontend to interact with the API.

## 3. Technology Stack

*   **Backend:**
    *   Java 17
    *   Spring Boot 3.x
    *   Spring Data JPA (Hibernate)
    *   Spring Security (JWT)
    *   Lombok
    *   Caffeine (Caching)
    *   Springdoc-openapi (Swagger UI)
*   **Database:**
    *   PostgreSQL
    *   Flyway (Database Migrations)
*   **Containerization:**
    *   Docker
    *   Docker Compose
*   **Frontend:**
    *   HTML, CSS, JavaScript (Vanilla JS for simplicity)
*   **Testing:**
    *   JUnit 5
    *   Mockito
    *   Spring Boot Test
    *   Testcontainers (for integration tests with real DB)
    *   JaCoCo (Code Coverage)
*   **CI/CD:**
    *   GitHub Actions
*   **Build Tool:**
    *   Maven

## 4. Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

*   **Java 17 JDK:** [Download from Oracle](https://www.oracle.com/java/technologies/downloads/) or your preferred distribution.
*   **Maven:** [Download and install](https://maven.apache.org/download.cgi).
*   **Docker & Docker Compose:** [Download Docker Desktop](https://www.docker.com/products/docker-desktop).
*   **Git:** [Download Git](https://git-scm.com/downloads).
*   **(Optional) cURL or Postman/Insomnia:** For API testing.

### Local Setup (Docker Compose)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/alx-devops-product-service.git
    cd alx-devops-product-service
    ```

2.  **Create a `.env` file:**
    Copy the `.env.example` (or create a new `.env` file) in the root directory of the project and fill in the environment variables. This file is excluded from git for security.

    ```bash
    # .env
    DB_NAME=productdb
    DB_USERNAME=user
    DB_PASSWORD=password
    JWT_SECRET=thisIsAVerySecureAndLongRandomKeyForYourJwtTokensAlxDevOpsProjectEnsureItIsOver256Bits
    ```
    **IMPORTANT:** For `JWT_SECRET`, generate a strong, random string (e.g., 32-64 characters long) for production environments.

3.  **Build and run with Docker Compose:**
    This command will build the Spring Boot application Docker image, create a PostgreSQL container, and start both services. Flyway will automatically run migrations and seed data.

    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: Rebuilds images (useful after code changes).
    *   `-d`: Runs containers in detached mode (in the background).

4.  **Verify services are running:**
    ```bash
    docker-compose ps
    ```
    You should see `app` and `db` services with `Up` status.

### Running the Application (without Docker for backend)

If you prefer to run the Spring Boot application directly on your host machine while still using the Dockerized PostgreSQL:

1.  **Start only the database with Docker Compose:**
    ```bash
    docker-compose up -d db
    ```

2.  **Run Flyway migrations directly (optional, if you want to use a local DB setup):**
    If you're running Spring Boot outside Docker, ensure `application.yml` points to `localhost:5432` for the database and you have a PostgreSQL instance running locally. Then, Maven will trigger Flyway during application startup.

3.  **Run the Spring Boot application:**
    ```bash
    ./mvnw spring-boot:run
    ```

### Accessing the Frontend

Once the `app` service is running (either via Docker Compose or directly):

Open your web browser and navigate to:
[http://localhost:8080](http://localhost:8080)

You will see a simple HTML/JS dashboard to:
1.  Register a new user.
2.  Log in with existing credentials.
    *   **Initial User:** You can register a user with `ROLE_USER` using the "Register" form. To get an `ADMIN` user, you would need to manually update their role in the database or expose an admin-only registration endpoint. For testing purposes, you might register a user, then log in to the database and manually assign `ROLE_ADMIN` to them in the `user_roles` table.
    *   **Example Admin Manual Setup (after registering a user named 'adminuser' with email 'admin@example.com'):**
        ```sql
        -- Connect to your PostgreSQL database (e.g., using pgAdmin or psql)
        \c productdb user

        INSERT INTO roles (name) VALUES ('ROLE_ADMIN') ON CONFLICT (name) DO NOTHING;
        INSERT INTO roles (name) VALUES ('ROLE_USER') ON CONFLICT (name) DO NOTHING;

        -- Find the user_id for 'adminuser'
        SELECT id FROM users WHERE username = 'adminuser';
        -- Let's say it returns 1

        -- Find the role_id for 'ROLE_ADMIN'
        SELECT id FROM roles WHERE name = 'ROLE_ADMIN';
        -- Let's say it returns 2

        -- Assign the ADMIN role to 'adminuser'
        INSERT INTO user_roles (user_id, role_id) VALUES (1, 2) ON CONFLICT (user_id, role_id) DO NOTHING;
        ```
3.  Perform CRUD operations on Products and Categories (depending on your role).

### Accessing API Documentation (Swagger UI)

Open your web browser and navigate to:
[http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)

This provides interactive API documentation where you can explore endpoints, request/response schemas, and even try out API calls directly (after authenticating using the "Authorize" button with a JWT token).

## 5. Key API Endpoints

All endpoints are prefixed with `/api`.

### Authentication
*   `POST /api/auth/register`: Register a new user.
    *   Body: `{ "username": "...", "email": "...", "password": "..." }`
*   `POST /api/auth/login`: Authenticate a user and get a JWT token.
    *   Body: `{ "username": "...", "password": "..." }`
    *   Response: `{ "accessToken": "...", "tokenType": "Bearer" }`

### Categories (Requires `Authorization: Bearer <JWT_TOKEN>`)
*   `GET /api/categories`: Get all categories. (`ROLE_USER`, `ROLE_ADMIN`)
*   `GET /api/categories/{id}`: Get category by ID. (`ROLE_USER`, `ROLE_ADMIN`)
*   `POST /api/categories`: Create a new category. (`ROLE_ADMIN` only)
    *   Body: `{ "name": "...", "description": "..." }`
*   `PUT /api/categories/{id}`: Update an existing category. (`ROLE_ADMIN` only)
    *   Body: `{ "name": "...", "description": "..." }`
*   `DELETE /api/categories/{id}`: Delete a category. (`ROLE_ADMIN` only)

### Products (Requires `Authorization: Bearer <JWT_TOKEN>`)
*   `GET /api/products`: Get all products. (`ROLE_USER`, `ROLE_ADMIN`)
*   `GET /api/products?search={keyword}`: Search products by name or description. (`ROLE_USER`, `ROLE_ADMIN`)
*   `GET /api/products/{id}`: Get product by ID. (`ROLE_USER`, `ROLE_ADMIN`)
*   `POST /api/products`: Create a new product. (`ROLE_ADMIN` only)
    *   Body: `{ "name": "...", "description": "...", "price": ..., "stockQuantity": ..., "categoryId": ... }`
*   `PUT /api/products/{id}`: Update an existing product. (`ROLE_ADMIN` only)
    *   Body: `{ "name": "...", "description": "...", "price": ..., "stockQuantity": ..., "categoryId": ... }`
*   `DELETE /api/products/{id}`: Delete a product. (`ROLE_ADMIN` only)

## 6. Authentication & Authorization

The system uses JSON Web Tokens (JWT) for stateless authentication.
*   Upon successful login, the `/api/auth/login` endpoint returns a JWT.
*   This token must be included in the `Authorization` header of subsequent requests: `Authorization: Bearer <YOUR_JWT_TOKEN>`.
*   Spring Security is configured with role-based access control (`@PreAuthorize`) to restrict access to certain endpoints:
    *   `ROLE_USER`: Can view (GET) products and categories.
    *   `ROLE_ADMIN`: Can perform all CRUD operations on products and categories.

## 7. Testing

The project includes a robust testing suite:

*   **Unit Tests (`src/test/java/.../service`):**
    *   Focus on individual components (e.g., `ProductService`).
    *   Uses Mockito to mock dependencies.
    *   Aims for 80%+ code coverage for business logic.
*   **Integration Tests (`src/test/java/.../repository`):**
    *   Tests the interaction between components (e.g., `ProductRepository` with the database).
    *   Uses `@DataJpaTest` and **Testcontainers** to spin up a real PostgreSQL instance for each test run, ensuring reliable and isolated database testing without needing a local DB setup beforehand.
*   **API Tests (`src/test/java/.../controller`):**
    *   Tests the REST API endpoints via `MockMvc`.
    *   Mocks the service layer to isolate the controller logic.
    *   Verifies HTTP status codes, response bodies, and authorization rules.
*   **Code Coverage:** JaCoCo Maven plugin is configured to enforce a minimum of 80% line and branch coverage during the `install` phase of Maven build.

To run all tests:
```bash
./mvnw clean verify
```

## 8. CI/CD Pipeline

The project utilizes **GitHub Actions** for its Continuous Integration and Continuous Deployment pipeline, defined in `.github/workflows/main.yml`.

**Workflow Steps:**

1.  **`build-and-test` Job:**
    *   **Checkout code:** Retrieves the latest code from the repository.
    *   **Set up JDK 17:** Configures the Java environment.
    *   **Start PostgreSQL with Testcontainers:** Uses `docker-compose` to spin up a PostgreSQL container for integration tests that might not use Testcontainers within the app. (Note: `ProductRepositoryTest` *does* use Testcontainers directly within the Java test, but having a `db` service running might be useful for other forms of integration tests or local development.)
    *   **Build with Maven and Run Tests:** Compiles the application, runs all unit and integration tests (which dynamically start PostgreSQL via Testcontainers), and generates JaCoCo code coverage reports.
    *   **Upload JaCoCo Code Coverage Report:** Archives the `jacoco.xml` report.
    *   **Generate full JaCoCo HTML report (optional):** Creates an HTML report for easier human readability.
    *   **Upload JaCoCo HTML Report:** Archives the HTML report.

2.  **`docker-build-and-push` Job:**
    *   **Depends on `build-and-test`:** This job only runs if the `build-and-test` job passes.
    *   **Conditional Execution:** Only triggered on `push` to the `main` branch.
    *   **Checkout code:** Retrieves the latest code.
    *   **Set up Docker Buildx:** Enables advanced Docker build features.
    *   **Log in to Docker Hub:** Authenticates with Docker Hub using GitHub secrets.
    *   **Build and push Docker image:** Builds the application's Docker image and pushes it to Docker Hub with multiple tags (`latest`, `commit-SHA`, `timestamp`).

**GitHub Secrets Required:**

To enable the `docker-build-and-push` job, you need to configure the following secrets in your GitHub repository settings:
*   `DOCKER_USERNAME`: Your Docker Hub username.
*   `DOCKER_PASSWORD`: Your Docker Hub Access Token (recommended over password for automation).
*   `DB_NAME`: Database name (e.g., `productdb`). Used in Testcontainers setup within CI.
*   `DB_USERNAME`: Database username (e.g., `user`). Used in Testcontainers setup within CI.
*   `DB_PASSWORD`: Database password (e.g., `password`). Used in Testcontainers setup within CI.
*   `JWT_SECRET`: A strong, random key for JWT (should match the one in `.env` and `application.yml`). Used for local testing and within the Docker image if needed.

## 9. Configuration & Customization

*   **`application.yml`**: Main Spring Boot configuration. Adjust database settings, JWT secret, logging levels, caching parameters, and rate limiting thresholds here.
*   **`.env`**: Used by Docker Compose to set environment variables for database credentials and JWT secret. **Do not commit this file to Git.**
*   **`Dockerfile`**: Customize the Docker image build process.
*   **`docker-compose.yml`**: Adjust service configurations, exposed ports, and volumes for local development and testing.

## 10. Logging & Monitoring

*   **Logging:** The application uses SLF4J with Logback (`logback-spring.xml`) for structured and configurable logging.
    *   Logs are output to both console and a rolling file (`logs/product-service.log`).
    *   Log levels can be adjusted in `application.yml` or `logback-spring.xml`.
*   **Monitoring:** Spring Boot Actuator is enabled, providing production-ready endpoints:
    *   Health Check: `http://localhost:8080/actuator/health`
    *   Application Info: `http://localhost:8080/actuator/info`
    *   Metrics: `http://localhost:8080/actuator/metrics`
    *   Prometheus Endpoint: `http://localhost:8080/actuator/prometheus` (integrates with Prometheus for metrics collection).

## 11. Caching

The application uses Spring's caching abstraction with **Caffeine** as the in-memory cache provider.
*   **`CacheConfig.java`**: Configures Caffeine with a maximum size and expiration policy (`maximumSize=1000,expireAfterWrite=60s`).
*   **`@Cacheable`**: Used on `ProductService` and `CategoryService` methods (e.g., `getAllProducts()`, `getProductById()`) to cache method results.
*   **`@CacheEvict`**: Used on write operations (create, update, delete) to invalidate relevant cache entries, ensuring data consistency.

## 12. Rate Limiting

A custom `HandlerInterceptor` (`RateLimitingInterceptor.java`) is implemented to limit the number of requests to the API endpoints.
*   **Configuration:** `rate-limiting.limit` (max requests) and `rate-limiting.duration-seconds` (time window) in `application.yml`.
*   **Default:** Configured for 10 requests per 60 seconds globally for authenticated API paths.
*   If the limit is exceeded, subsequent requests will receive an HTTP 429 Too Many Requests response.

## 13. Further Documentation

*   **`ARCHITECTURE.md`**: Provides a detailed overview of the system architecture, components, and data flow.
*   **`API.md`**: Detailed API specifications (alternatively, use the generated Swagger UI).
*   **`DEPLOYMENT.md`**: Guides on deploying the application to various environments, including cloud providers.

## 14. Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature`).
3.  Make your changes.
4.  Write comprehensive tests for your changes.
5.  Ensure all tests pass and code coverage remains high.
6.  Commit your changes (`git commit -am 'feat: Add new feature'`).
7.  Push to the branch (`git push origin feature/your-feature`).
8.  Create a new Pull Request.

## 15. License

This project is licensed under the MIT License. See the `LICENSE` file for details (if a LICENSE file is provided separately).