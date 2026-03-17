```markdown
# ALX Mobile Backend System

## Comprehensive, Production-Ready Mobile App Backend

This project provides a robust, scalable, and secure backend system designed for mobile applications, built with Spring Boot and Java 17. It incorporates best practices for enterprise-grade applications, including authentication (JWT), authorization (Spring Security), database management (PostgreSQL, Flyway), caching (Caffeine), rate limiting, comprehensive testing, and CI/CD pipeline configuration.

## Table of Contents

1.  [Features](#features)
2.  [Architecture Overview](#architecture-overview)
3.  [Prerequisites](#prerequisites)
4.  [Local Setup and Run](#local-setup-and-run)
5.  [API Endpoints](#api-endpoints)
6.  [Testing](#testing)
7.  [Docker Setup](#docker-setup)
8.  [CI/CD Configuration](#ci/cd-configuration)
9.  [Deployment Guide](#deployment-guide)
10. [Technologies Used](#technologies-used)
11. [Contributing](#contributing)
12. [License](#license)

## 1. Features

*   **Core Application (Java/Spring Boot):**
    *   RESTful API endpoints for Users, Products, Orders with full CRUD operations.
    *   Layered architecture: Controllers, Services, Repositories, DTOs.
    *   Business logic for user management, product catalog, and order processing (e.g., stock management).
*   **Database Layer (PostgreSQL):**
    *   Defined schema for `users`, `products`, `orders`, and `order_items`.
    *   Flyway for database migrations.
    *   Seed data for initial setup.
    *   Basic query optimization via indexing.
*   **Authentication & Authorization:**
    *   JWT-based authentication using Spring Security.
    *   Role-based authorization (`ROLE_USER`, `ROLE_ADMIN`) with `@PreAuthorize`.
*   **Logging & Monitoring:**
    *   SLF4J/Logback for structured logging.
    *   Spring Boot Actuator for health checks, metrics, and environment info.
*   **Error Handling:**
    *   Global exception handling with `@ControllerAdvice` for consistent API error responses.
    *   Custom exceptions (`ResourceNotFoundException`, `ValidationException`).
*   **Caching Layer:**
    *   Spring Cache with Caffeine for in-memory caching of frequently accessed data (users, products, orders).
*   **Rate Limiting:**
    *   Simple in-memory rate limiting filter using Google Guava to protect API endpoints from abuse.
*   **Testing:**
    *   Unit tests for services and repositories (Mockito, JUnit 5).
    *   Integration/API tests for controllers (Spring MockMvc, `@WebMvcTest`).
    *   Jacoco for code coverage reporting (configured for 80%+ line coverage goal).
*   **Configuration & Setup:**
    *   `pom.xml` with all necessary dependencies.
    *   Environment-specific `application.properties` (dev, prod profiles).
    *   Docker support with `Dockerfile` and `docker-compose.yml`.
    *   Basic CI/CD pipeline configuration using GitHub Actions.
*   **Documentation:**
    *   Comprehensive README.
    *   API documentation using Springdoc OpenAPI (Swagger UI).
    *   Architecture and Deployment guides.

## 2. Architecture Overview

The backend follows a standard N-tier architecture, commonly seen in Spring Boot applications:

*   **Presentation Layer (Controllers):** Handles incoming HTTP requests, performs input validation, and delegates to the Service Layer. Returns HTTP responses. Secured using Spring Security.
*   **Service Layer (Services):** Contains the core business logic. Interacts with the Repository Layer, orchestrates complex operations, and applies caching/transactional boundaries.
*   **Data Access Layer (Repositories):** Uses Spring Data JPA to abstract database interactions. Handles CRUD operations and custom queries.
*   **Domain Layer (Models):** JPA entities representing the database schema (User, Product, Order).
*   **DTO Layer:** Data Transfer Objects for requests and responses, ensuring separation of concerns between API contract and domain models.
*   **Security Layer:** Spring Security for authentication (JWT) and authorization (roles).
*   **Configuration Layer:** Manages application settings, database connections, security parameters, etc.
*   **Cross-Cutting Concerns:** Global exception handling, logging, caching, rate limiting.

**Data Flow:**
Mobile App <--> HTTPS <--> Load Balancer/API Gateway <--> Spring Boot Backend (Controllers -> Services -> Repositories) <--> PostgreSQL Database

## 3. Prerequisites

Before you begin, ensure you have the following installed:

*   **Java 17 JDK:** [Download from Oracle](https://www.oracle.com/java/technologies/downloads/) or [AdoptOpenJDK](https://adoptium.net/temurin/releases/)
*   **Maven 3.8+:** [Download Maven](https://maven.apache.org/download.cgi)
*   **PostgreSQL 15+:** [Download PostgreSQL](https://www.postgresql.org/download/) or use Docker.
*   **Docker & Docker Compose:** [Install Docker Engine](https://docs.docker.com/engine/install/)
*   **Git:** [Download Git](https://git-scm.com/downloads)

## 4. Local Setup and Run

### 4.1. Database Setup (Option 1: Manual PostgreSQL)

1.  **Install PostgreSQL:** If not already installed.
2.  **Create User and Database:**
    ```bash
    # Connect to default postgres user
    psql -U postgres

    # Create user with password
    CREATE USER alxuser WITH PASSWORD 'alxpassword';
    CREATE USER alxuser_dev WITH PASSWORD 'alxpassword_dev';

    # Create databases
    CREATE DATABASE alx_mobile_db WITH OWNER alxuser;
    CREATE DATABASE alx_mobile_db_dev WITH OWNER alxuser_dev;

    # Grant privileges
    GRANT ALL PRIVILEGES ON DATABASE alx_mobile_db TO alxuser;
    GRANT ALL PRIVILEGES ON DATABASE alx_mobile_db_dev TO alxuser_dev;

    \q
    ```
    *Note: The `V1__Initial_schema.sql` and `V2__Add_seed_data.sql` will be automatically applied by Flyway when the Spring Boot application starts.*

### 4.2. Run the Application (Spring Boot)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/my-mobile-backend.git
    cd my-mobile-backend
    ```
2.  **Build the project:**
    ```bash
    ./mvnw clean install -DskipTests
    ```
3.  **Run the application (Development Profile):**
    ```bash
    ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
    ```
    The application will start on `http://localhost:8080`.

    You can access Swagger UI at `http://localhost:8080/swagger-ui.html`.

## 5. API Endpoints

All API endpoints are prefixed with `/api/v1`.

### Authentication & Registration (`/api/v1/auth`)

*   `POST /api/v1/auth/register`
    *   **Description:** Register a new user.
    *   **Request Body:** `RegisterRequest` (username, email, password)
    *   **Response:** `AuthResponse` (JWT token, user details)
*   `POST /api/v1/auth/login`
    *   **Description:** Authenticate user and get JWT token.
    *   **Request Body:** `AuthRequest` (usernameOrEmail, password)
    *   **Response:** `AuthResponse` (JWT token, user details)

### User Management (`/api/v1/users`) - Requires `bearerAuth` (JWT)

*   `GET /api/v1/users/{id}`
    *   **Description:** Get user by ID. (ADMIN or owner)
    *   **Response:** `UserDto.UserResponse`
*   `GET /api/v1/users`
    *   **Description:** Get all users with pagination. (ADMIN only)
    *   **Query Params:** `page`, `size`, `sort`
    *   **Response:** `Page<UserDto.UserResponse>`
*   `PUT /api/v1/users/{id}`
    *   **Description:** Update a user by ID. (ADMIN or owner)
    *   **Request Body:** `UserDto.UserUpdateRequest`
    *   **Response:** `UserDto.UserResponse`
*   `DELETE /api/v1/users/{id}`
    *   **Description:** Delete a user by ID. (ADMIN only)
    *   **Response:** `204 No Content`

### Product Management (`/api/v1/products`) - Requires `bearerAuth` (JWT)

*   `POST /api/v1/products`
    *   **Description:** Create a new product. (ADMIN only)
    *   **Request Body:** `ProductDto.ProductCreateRequest`
    *   **Response:** `ProductDto.ProductResponse`
*   `GET /api/v1/products/{id}`
    *   **Description:** Get product by ID. (USER, ADMIN)
    *   **Response:** `ProductDto.ProductResponse`
*   `GET /api/v1/products`
    *   **Description:** Get all products with pagination. (USER, ADMIN)
    *   **Query Params:** `page`, `size`, `sort`
    *   **Response:** `Page<ProductDto.ProductResponse>`
*   `PUT /api/v1/products/{id}`
    *   **Description:** Update a product by ID. (ADMIN only)
    *   **Request Body:** `ProductDto.ProductUpdateRequest`
    *   **Response:** `ProductDto.ProductResponse`
*   `DELETE /api/v1/products/{id}`
    *   **Description:** Delete a product by ID. (ADMIN only)
    *   **Response:** `204 No Content`

### Order Management (`/api/v1/orders`) - Requires `bearerAuth` (JWT)

*   `POST /api/v1/orders`
    *   **Description:** Create a new order. (USER, ADMIN)
    *   **Request Body:** `OrderDto.OrderCreateRequest` (list of productId, quantity)
    *   **Response:** `OrderDto.OrderResponse`
*   `GET /api/v1/orders/{id}`
    *   **Description:** Get order by ID. (ADMIN or owner)
    *   **Response:** `OrderDto.OrderResponse`
*   `GET /api/v1/orders`
    *   **Description:** Get all orders with pagination. (ADMIN only)
    *   **Query Params:** `page`, `size`, `sort`
    *   **Response:** `Page<OrderDto.OrderResponse>`
*   `GET /api/v1/orders/user/{userId}`
    *   **Description:** Get all orders for a specific user with pagination. (ADMIN or owner of userId)
    *   **Query Params:** `page`, `size`, `sort`
    *   **Response:** `Page<OrderDto.OrderResponse>`
*   `PATCH /api/v1/orders/{id}/status`
    *   **Description:** Update order status by ID. (ADMIN only)
    *   **Request Body:** `OrderDto.OrderUpdateRequest` (status: PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED)
    *   **Response:** `OrderDto.OrderResponse`
*   `DELETE /api/v1/orders/{id}`
    *   **Description:** Delete an order by ID. (ADMIN or owner if order is PENDING)
    *   **Response:** `204 No Content`

## 6. Testing

The project includes Unit, Integration, and API tests to ensure quality and correctness.

1.  **Run all tests:**
    ```bash
    ./mvnw clean test
    ```
2.  **Generate JaCoCo test coverage report:**
    After running `mvnw clean install` (which includes `test` phase and `jacoco:report` goal), you can find the report at:
    `target/site/jacoco/index.html`
    Open this file in your browser to view detailed coverage statistics. The `pom.xml` is configured to fail the build if line coverage drops below 80%.

## 7. Docker Setup

### 7.1. Database Setup (Option 2: Docker Compose)

The `docker-compose.yml` file sets up a PostgreSQL database and the Spring Boot application.

1.  **Ensure Docker Desktop is running.**
2.  **Navigate to the project root directory.**
3.  **Start the services:**
    ```bash
    docker-compose up --build -d
    ```
    This will:
    *   Build the Docker image for the backend application.
    *   Start a PostgreSQL container.
    *   Run an initialization script to create `alx_mobile_db` and `alx_mobile_db_dev` databases with respective users.
    *   Start the Spring Boot application (configured to use `alx_mobile_db_dev` by default for local development).
    *   The `Dockerfile` contains a `prod` profile by default, but `docker-compose.yml` overrides it to `dev` for local use.

4.  **Verify services:**
    ```bash
    docker-compose ps
    ```
    You should see `alx-postgres` and `alx-mobile-backend` containers running.

5.  **Access the application:** `http://localhost:8080` (or Swagger UI at `http://localhost:8080/swagger-ui.html`).

6.  **Stop services:**
    ```bash
    docker-compose down
    ```
    To also remove volumes (database data), use:
    ```bash
    docker-compose down -v
    ```

## 8. CI/CD Configuration

A basic GitHub Actions workflow is provided in `.github/workflows/main.yml`.

**Current Workflow:**

*   **`build-and-test` job:**
    *   Triggers on `push` to `main` and `develop` branches, and `pull_request` to `main` and `develop`.
    *   Sets up Java 17.
    *   Starts a PostgreSQL service container for isolated testing.
    *   Builds the Maven project and runs all tests, including JaCoCo code coverage analysis.
    *   Uploads the JaCoCo report as an artifact.
    *   **Note:** The `pom.xml` is configured to enforce an 80% line coverage threshold; the build will fail if this is not met.

**Deployment Jobs (Commented Out):**
The workflow includes commented-out `deploy-dev` and `deploy-prod` jobs. These provide a template for:
*   Building and pushing Docker images to a container registry (e.g., Docker Hub, AWS ECR).
*   Deploying the application to a target environment (e.g., Kubernetes, AWS ECS) using appropriate CLI tools.
*   These jobs use environment variables (`DOCKER_USERNAME`, `DOCKER_PASSWORD`) and assume secrets are configured in GitHub.

**To enable deployment:**
1.  Uncomment the `deploy-dev` and `deploy-prod` jobs.
2.  Replace placeholder values (e.g., `yourdockerrepo`, `your-ecs-cluster`, `your-ecs-service`).
3.  Configure GitHub Secrets for `DOCKER_USERNAME`, `DOCKER_PASSWORD`, and any cloud provider credentials (e.g., `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).
4.  Set up GitHub Environments (e.g., `Development`, `Production`) if you need environment-specific protection rules or variables.

## 9. Deployment Guide

This section outlines general steps for deploying the backend to a production environment.

1.  **Prepare Production Environment:**
    *   **Server:** Provision a Linux server (e.g., AWS EC2, Google Cloud Compute, Azure VM) or a managed container service (e.g., Kubernetes, AWS ECS, Google Cloud Run).
    *   **Database:** Set up a managed PostgreSQL database service (e.g., AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL). Ensure it's secure and properly configured for backups.
    *   **Networking:** Configure security groups/firewalls to allow traffic only from necessary sources (e.g., load balancer, internal services).

2.  **Containerize and Publish Image:**
    *   Ensure your `Dockerfile` is optimized for production (e.g., multi-stage build for smaller image size, `SPRING_PROFILES_ACTIVE=prod`).
    *   Build the Docker image:
        ```bash
        docker build -t yourdockerrepo/my-mobile-backend:latest .
        ```
    *   Login to your container registry (e.g., Docker Hub, AWS ECR, GCR):
        ```bash
        docker login
        ```
    *   Push the image:
        ```bash
        docker push yourdockerrepo/my-mobile-backend:latest
        ```

3.  **Configure Environment Variables:**
    *   For the production deployment, ensure the following environment variables (defined in `application-prod.properties` and `Dockerfile`) are correctly set in your deployment environment (e.g., Kubernetes manifests, ECS task definitions, CI/CD pipeline):
        *   `SPRING_PROFILES_ACTIVE=prod`
        *   `DB_URL` (JDBC URL for your production PostgreSQL instance)
        *   `DB_USERNAME`
        *   `DB_PASSWORD`
        *   `JWT_SECRET` (Use a strong, unique secret, preferably managed by a secret manager like AWS Secrets Manager or Vault).

4.  **Database Migrations (Flyway):**
    *   Flyway is configured to run on application startup (`spring.flyway.enabled=true`). When the application starts in production, it will apply any pending migrations to the `alx_mobile_db` database.
    *   Ensure your database user has sufficient privileges to perform schema modifications during migrations.
    *   Consider managing Flyway migrations as a separate step in your CI/CD pipeline, especially in complex scenarios or for zero-downtime deployments.

5.  **Deployment to Target Environment:**
    *   **Kubernetes:** Create `Deployment` and `Service` manifests. Use `Ingress` for external access, integrating with a Load Balancer and potentially Cert-Manager for TLS.
    *   **AWS ECS/Fargate:** Define an `ECS Task Definition` referencing your Docker image and environment variables. Create or update an `ECS Service` to run and maintain the desired number of tasks. Use an `Application Load Balancer (ALB)` for external access.
    *   **Other PaaS (e.g., Heroku, Render):** Follow their specific deployment instructions, providing your Docker image or buildpack settings and environment variables.

6.  **Monitoring & Logging:**
    *   Integrate with a centralized logging solution (e.g., ELK Stack, Splunk, Datadog) to collect logs from your application instances.
    *   Set up monitoring tools (e.g., Prometheus/Grafana, Datadog, New Relic) to track application metrics (CPU, memory, request rates, error rates, cache hit ratios from Actuator endpoints).
    *   Configure alerts for critical issues.

7.  **Security Best Practices:**
    *   **TLS/SSL:** Always use HTTPS in production. Configure your load balancer or application server for TLS termination.
    *   **Secrets Management:** Never hardcode secrets. Use environment variables, secret management services (e.g., AWS Secrets Manager, Vault), or Kubernetes Secrets.
    *   **Least Privilege:** Grant the application only the necessary permissions to access databases and other resources.
    *   **Vulnerability Scanning:** Regularly scan your Docker images and dependencies for known vulnerabilities.
    *   **Backup & Recovery:** Implement a robust database backup strategy and test recovery procedures.

## 10. Technologies Used

*   **Backend:** Java 17, Spring Boot 3.2.5
*   **Web Framework:** Spring Web
*   **ORM:** Spring Data JPA, Hibernate
*   **Database:** PostgreSQL
*   **Database Migrations:** Flyway
*   **Authentication/Authorization:** Spring Security, JWT (jjwt)
*   **API Documentation:** Springdoc OpenAPI (Swagger UI)
*   **Dependency Management:** Maven
*   **Testing:** JUnit 5, Mockito, Spring Boot Test, Testcontainers, JaCoCo
*   **Caching:** Spring Cache, Caffeine
*   **Rate Limiting:** Google Guava RateLimiter
*   **Logging:** SLF4J, Logback
*   **Monitoring:** Spring Boot Actuator
*   **Containerization:** Docker, Docker Compose
*   **CI/CD:** GitHub Actions
*   **Code Quality:** Lombok

## 11. Contributing

Feel free to fork the repository, open issues, and submit pull requests.

## 12. License

This project is open-source and available under the [MIT License](LICENSE).
```