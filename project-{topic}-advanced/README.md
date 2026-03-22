```markdown
# ALX E-commerce System

## Comprehensive, Production-Ready E-commerce Solution

This project provides a full-scale, enterprise-grade e-commerce backend built with Spring Boot, PostgreSQL, Redis, and Spring Security (JWT). It is designed with modularity, scalability, and robust testing in mind, adhering to best practices in software engineering.

---

## Table of Contents

1.  [Features](#features)
2.  [Technology Stack](#technology-stack)
3.  [Project Structure](#project-structure)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Development Setup](#local-development-setup)
    *   [Running with Docker Compose](#running-with-docker-compose)
5.  [API Endpoints](#api-endpoints)
6.  [Testing](#testing)
7.  [CI/CD](#ci-cd)
8.  [Documentation](#documentation)
    *   [API Documentation](#api-documentation)
    *   [Architecture Documentation](#architecture-documentation)
    *   [Deployment Guide](#deployment-guide)
9.  [Contributing](#contributing)
10. [License](#license)

---

## 1. Features

This system encompasses a wide range of e-commerce functionalities:

*   **User Management:**
    *   User Registration (Customer role by default)
    *   User Authentication (JWT-based)
    *   User Profile Management (CRUD for user details)
    *   Role-Based Access Control (RBAC): `CUSTOMER`, `ADMIN` roles
*   **Product Catalog Management:**
    *   CRUD operations for Products (Admin only)
    *   CRUD operations for Categories (Admin only)
    *   Browsing products and categories (Public access)
    *   Product Search/Filtering (by category, name)
*   **Order Management:**
    *   Create orders (Customer)
    *   View own orders (Customer)
    *   View all orders, update order status (Admin)
    *   Basic Inventory Integration (stock decrease on order, re-stock on cancellation)
*   **Security:**
    *   JWT Authentication and Authorization
    *   Password Hashing (BCrypt)
    *   Global Exception Handling
    *   Rate Limiting to prevent abuse
*   **Performance & Scalability:**
    *   Caching with Redis for frequently accessed data
    *   Database indexing and query optimization
*   **Observability:**
    *   Structured Logging (SLF4J/Logback)
    *   Spring Boot Actuator for health checks and metrics (Prometheus endpoint exposed)
*   **Developer Experience:**
    *   Docker & Docker Compose for easy setup
    *   Flyway for database migrations
    *   OpenAPI 3 (Swagger UI) for interactive API documentation
    *   Comprehensive test suite (Unit, Integration)

---

## 2. Technology Stack

*   **Backend:** Java 17+, Spring Boot 3+
*   **Web Framework:** Spring Web MVC
*   **Data Access:** Spring Data JPA, Hibernate
*   **Database:** PostgreSQL
*   **Database Migrations:** Flyway
*   **Authentication/Authorization:** Spring Security, JSON Web Tokens (JWT)
*   **Caching:** Spring Cache with Redis
*   **Object Mapping:** Lombok, MapStruct
*   **Validation:** Spring Validation API (Jakarta Validation)
*   **Logging:** SLF4J, Logback
*   **API Documentation:** Springdoc OpenAPI (Swagger UI)
*   **Containerization:** Docker, Docker Compose
*   **Build Tool:** Apache Maven
*   **Testing:** JUnit 5, Mockito, Spring Boot Test, Testcontainers
*   **CI/CD:** GitHub Actions

---

## 3. Project Structure

The project follows a standard layered architecture for Spring Boot applications:

```
ecommerce-system/
├── src/
│   ├── main/
│   │   ├── java/com/alx/ecommerce/
│   │   │   ├── EcommerceApplication.java # Main Spring Boot app
│   │   │   ├── config/                   # Spring/Application configurations (Security, JWT, Redis, OpenAPI)
│   │   │   ├── controller/               # REST API endpoints (Auth, User, Product, Category, Order)
│   │   │   ├── model/                    # JPA Entities (User, Product, Category, Order, OrderItem, AuditBaseEntity)
│   │   │   ├── repository/               # Spring Data JPA repositories
│   │   │   ├── service/                  # Business logic and transaction management
│   │   │   ├── dto/                      # Data Transfer Objects for API requests/responses
│   │   │   ├── mapper/                   # MapStruct interfaces for DTO-Entity mapping
│   │   │   ├── exception/                # Custom exceptions and global exception handler
│   │   │   └── util/                     # Utility classes (e.g., RateLimiter)
│   │   └── resources/
│   │       ├── application.yml           # Spring Boot application properties
│   │       └── logback-spring.xml        # Logback configuration
│   └── test/                             # Unit and Integration tests
├── db/
│   ├── migration/                        # Flyway SQL migration scripts
├── docker/
│   └── docker-compose.yml                # Docker Compose setup for services
├── Dockerfile                            # Dockerfile for building the Spring Boot app image
├── pom.xml                               # Maven project configuration
├── .github/workflows/                    # GitHub Actions CI/CD workflows
├── README.md                             # This file
├── ARCHITECTURE.md                       # Detailed architecture overview
├── API_DOCS.md                           # Comprehensive API documentation
└── DEPLOYMENT.md                         # Guide for deployment to various environments
```

---

## 4. Setup and Installation

### Prerequisites

Before you begin, ensure you have the following installed:

*   **Java Development Kit (JDK) 17 or higher**
*   **Apache Maven 3.6.3 or higher**
*   **Docker Desktop** (includes Docker Engine and Docker Compose) for local development or containerized deployment.
*   (Optional but recommended) An IDE like **IntelliJ IDEA** or **VS Code** with Java extensions.

### Local Development Setup

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/alx-software-engineering/ecommerce-system.git
    cd ecommerce-system
    ```

2.  **Set up PostgreSQL Database:**
    You can run PostgreSQL locally or use Docker. For a quick local setup (without Docker Compose):
    *   Install PostgreSQL (e.g., `sudo apt install postgresql` on Ubuntu, or use an installer for Windows/macOS).
    *   Create a user and database:
        ```sql
        CREATE USER ecommerce_user WITH PASSWORD 'password';
        CREATE DATABASE ecommerce_db OWNER ecommerce_user;
        ```
    *   Ensure your `application.yml` has the correct `spring.datasource` properties. By default, `localhost:5432` with `ecommerce_user`/`password` is configured.

3.  **Set up Redis (Optional, for caching):**
    *   Install Redis locally (e.g., `sudo apt install redis-server` on Ubuntu).
    *   Or run it via Docker: `docker run --name ecommerce-redis -p 6379:6379 -d redis:7-alpine`
    *   Ensure your `application.yml` has the correct `spring.data.redis` properties.

4.  **Run Flyway Migrations:**
    Flyway migrations will run automatically when the Spring Boot application starts, if `spring.flyway.enabled=true` and `spring.flyway.baseline-on-migrate=true` (for initial setup) are configured.

5.  **Build and Run the Application:**
    ```bash
    mvn clean install # Builds the project and runs tests
    mvn spring-boot:run
    ```
    The application will start on `http://localhost:8080/api/v1`.
    Swagger UI will be available at `http://localhost:8080/api/v1/swagger-ui.html`.

### Running with Docker Compose

This is the recommended way to run the application and its dependencies locally.

1.  **Build the Docker Image for the Application:**
    From the root of the project (`ecommerce-system/`):
    ```bash
    docker build -t alx-ecommerce-app .
    ```
    This builds the Spring Boot application into a Docker image named `alx-ecommerce-app`.

2.  **Start Services with Docker Compose:**
    Navigate to the `docker` directory:
    ```bash
    cd docker
    docker compose up -d
    ```
    This command will:
    *   Start a PostgreSQL container (`ecommerce-db`).
    *   Start a Redis container (`ecommerce-redis`).
    *   Start the `alx-ecommerce-app` container, linking it to the database and Redis.
    *   The `-d` flag runs containers in detached mode.

3.  **Verify Services:**
    Check the logs to ensure all services started correctly:
    ```bash
    docker compose logs -f
    ```
    You should see logs from `ecommerce-db`, `ecommerce-redis`, and `ecommerce-app`. Flyway migrations will run automatically on the `ecommerce-db` when `ecommerce-app` starts.

4.  **Access the Application:**
    The application will be available at `http://localhost:8080/api/v1`.
    Swagger UI: `http://localhost:8080/api/v1/swagger-ui.html`.

5.  **Stop Services:**
    ```bash
    docker compose down
    ```
    This stops and removes the containers and networks created by `docker compose up`. If you want to also remove the database volume, use `docker compose down -v`.

---

## 5. API Endpoints

The API is fully documented with OpenAPI (Swagger UI). Once the application is running, navigate to `http://localhost:8080/api/v1/swagger-ui.html` to explore all available endpoints, request/response schemas, and try them out interactively.

**Key Endpoints (Examples):**

*   **Authentication:**
    *   `POST /api/v1/auth/register` - Register a new user.
    *   `POST /api/v1/auth/authenticate` - Authenticate and get JWT token.

*   **Users:**
    *   `GET /api/v1/users/me` - Get authenticated user's profile.
    *   `PUT /api/v1/users/me` - Update authenticated user's profile.
    *   `GET /api/v1/users/{id}` (ADMIN) - Get user by ID.
    *   `GET /api/v1/users` (ADMIN) - Get all users.
    *   `DELETE /api/v1/users/{id}` (ADMIN) - Delete user.

*   **Products:**
    *   `POST /api/v1/products` (ADMIN) - Create a new product.
    *   `GET /api/v1/products/{id}` - Get product by ID.
    *   `GET /api/v1/products` - Get all products (paginated).
    *   `GET /api/v1/products/category/{categoryId}` - Get products by category.
    *   `PUT /api/v1/products/{id}` (ADMIN) - Update product.
    *   `DELETE /api/v1/products/{id}` (ADMIN) - Delete product.

*   **Categories:**
    *   `POST /api/v1/categories` (ADMIN) - Create a new category.
    *   `GET /api/v1/categories/{id}` - Get category by ID.
    *   `GET /api/v1/categories` - Get all categories.
    *   `PUT /api/v1/categories/{id}` (ADMIN) - Update category.
    *   `DELETE /api/v1/categories/{id}` (ADMIN) - Delete category.

*   **Orders:**
    *   `POST /api/v1/orders` (AUTHENTICATED) - Create a new order.
    *   `GET /api/v1/orders/{orderId}` (OWNER/ADMIN) - Get order by ID.
    *   `GET /api/v1/orders/my-orders` (AUTHENTICATED) - Get current user's orders.
    *   `GET /api/v1/orders` (ADMIN) - Get all orders.
    *   `PATCH /api/v1/orders/{orderId}/status` (ADMIN) - Update order status.
    *   `DELETE /api/v1/orders/{orderId}` (OWNER(PENDING/CANCELLED)/ADMIN) - Delete order.

---

## 6. Testing

The project includes a comprehensive suite of tests:

*   **Unit Tests:** Focus on individual components (services, repositories) in isolation using JUnit 5 and Mockito. Achieves high code coverage.
    *   Run unit tests: `mvn test`
*   **Integration Tests:** Test the interaction between multiple components, including the database, using `@SpringBootTest` and Testcontainers for realistic environment simulation.
    *   Integration tests are run as part of `mvn clean install`.
*   **API Tests:** Tested via `MockMvc` in integration tests to simulate HTTP requests and verify API responses and status codes.
    *   The `ProductControllerIntegrationTest` is a good example.
*   **Performance Tests (Conceptual):** While not generating actual performance test scripts here, the design supports integration with tools like JMeter or Gatling. Key metrics are exposed via Spring Boot Actuator (`/actuator/prometheus`) for monitoring.

**Running Tests:**

To run all tests (unit and integration):
```bash
mvn clean install
```
This will generate JaCoCo code coverage reports in `target/site/jacoco/jacoco.xml` and `target/site/jacoco/index.html`.

---

## 7. CI/CD

The project includes a GitHub Actions workflow (`.github/workflows/ci-cd.yml`) to automate the build, test, and deployment process.

**Workflow Stages:**

1.  **`build-and-test`:**
    *   Checks out the code.
    *   Sets up JDK 17.
    *   Caches Maven dependencies.
    *   Builds the project and runs all unit and integration tests (`mvn clean install`).
    *   Uploads JaCoCo code coverage report to Codecov (if configured).

2.  **`docker-build-and-push`:**
    *   Depends on `build-and-test` succeeding.
    *   Logs into Docker Hub using provided secrets.
    *   Builds the Docker image for the Spring Boot application.
    *   Tags and pushes the image to Docker Hub with `latest` (for `main` branch) or `develop` (for `develop` branch) tags, and commit SHA tags.

3.  **`deploy-to-dev`:**
    *   Depends on `docker-build-and-push` succeeding.
    *   Triggered only for pushes to the `develop` branch.
    *   Uses SSH to connect to a development server.
    *   Pulls the latest `develop` Docker image.
    *   Restarts the Docker Compose services on the development server.

4.  **`deploy-to-prod`:**
    *   Depends on `docker-build-and-push` succeeding.
    *   Triggered only for pushes to the `main` branch.
    *   Uses SSH to connect to a production server.
    *   Pulls the latest `main`/`latest` Docker image.
    *   Restarts the Docker Compose services on the production server.

**Required GitHub Secrets:**

*   `DOCKER_USERNAME`: Your Docker Hub username.
*   `DOCKER_PASSWORD`: Your Docker Hub Access Token.
*   `CODECOV_TOKEN`: (Optional) Your Codecov repository token.
*   `DEV_SSH_HOST`: IP address or hostname of your development server.
*   `DEV_SSH_USER`: SSH username for your development server.
*   `DEV_SSH_KEY`: Private SSH key for accessing your development server (add as a multi-line secret).
*   `PROD_SSH_HOST`: IP address or hostname of your production server.
*   `PROD_SSH_USER`: SSH username for your production server.
*   `PROD_SSH_KEY`: Private SSH key for accessing your production server.

---

## 8. Documentation

### API Documentation

Refer to `API_DOCS.md` for a detailed, markdown-formatted overview of the API endpoints, including example requests and responses. For interactive exploration, use the Swagger UI at `http://localhost:8080/api/v1/swagger-ui.html`.

### Architecture Documentation

Refer to `ARCHITECTURE.md` for a deep dive into the system's design principles, architectural patterns (e.g., Layered Architecture, DDD concepts), component interactions, and choices behind the technology stack. This document will include diagrams and explanations of data flow, security mechanisms, and scalability considerations.

### Deployment Guide

Refer to `DEPLOYMENT.md` for comprehensive instructions on deploying the application to various environments (e.g., cloud platforms like AWS EC2, Kubernetes, or self-hosted servers). It will cover prerequisites, steps for setting up environment variables, database configuration, container orchestration, and monitoring setup.

---

## 9. Contributing

Contributions are welcome! If you'd like to contribute, please fork the repository, create a new branch, and submit a pull request. Ensure your code adheres to the project's coding standards and includes appropriate tests.

---

## 10. License

This project is licensed under the Apache 2.0 License. See the [LICENSE](LICENSE) file for details.
```