```markdown
# Product Management System (ALX DevOps Automation Project)

This project implements a comprehensive, production-ready DevOps automation system around a Java Spring Boot backend application. It focuses on demonstrating best practices across development, testing, deployment, and operations.

## Table of Contents

1.  [Introduction](#1-introduction)
2.  [Features](#2-features)
3.  [Architecture](#3-architecture)
4.  [Prerequisites](#4-prerequisites)
5.  [Local Setup](#5-local-setup)
    *   [Running with Maven](#running-with-maven)
    *   [Running with Docker Compose](#running-with-docker-compose)
6.  [API Documentation](#6-api-documentation)
7.  [Testing](#7-testing)
8.  [CI/CD Pipeline](#8-cicd-pipeline)
9.  [Monitoring and Logging](#9-monitoring-and-logging)
10. [Deployment](#10-deployment)
11. [Contributing](#11-contributing)
12. [License](#12-license)

---

## 1. Introduction

The Product Management System is a backend application designed to manage products and categories, including user authentication and authorization. It serves as a practical example for implementing a full-scale DevOps automation system, adhering to principles learned in ALX Software Engineering precourse materials.

## 2. Features

**Core Application (Java Spring Boot):**
*   **RESTful API:** Full CRUD operations for Products and Categories.
*   **Data Models:** `Product`, `Category`, `User`, `Role` entities.
*   **Business Logic:** Services for product and category management, including search, filtering, and pagination.
*   **Authentication & Authorization:** JWT-based security with Spring Security, supporting `ROLE_USER`, `ROLE_MANAGER`, `ROLE_ADMIN`.
*   **Error Handling:** Global exception handling for consistent API error responses.
*   **Logging:** Configured with Logback for structured logging.
*   **Caching:** Spring Cache with Caffeine for product and category data.
*   **Rate Limiting:** Simple in-memory rate limiting using Bucket4j for API endpoints.

**Database Layer:**
*   **PostgreSQL:** Relational database management.
*   **Flyway:** Database migration tool for schema version control.
*   **Seed Data:** Initial data for roles, users, categories, and products.

**Configuration & Setup:**
*   **Maven:** Project build and dependency management.
*   **Environment Configuration:** Externalized configuration using `application.yml` and environment variables.
*   **Docker:** Containerization of the application and database for consistency across environments.
*   **Docker Compose:** Orchestration for local development environment (app, db, Prometheus, Grafana, Adminer).
*   **CI/CD Pipeline:** GitHub Actions workflow for automated build, test, and Docker image publishing.

**Testing & Quality:**
*   **Unit Tests:** JUnit 5 and Mockito for isolated component testing (e.g., services).
*   **Integration Tests:** Spring Boot Test and Testcontainers for testing interactions with a real PostgreSQL database.
*   **API Tests:** MockMvc used to test REST endpoints.
*   **Code Coverage:** JaCoCo integrated to enforce a minimum of 80% line coverage.

**Documentation:**
*   **README:** Comprehensive project overview, setup, and guides.
*   **API Documentation:** OpenAPI 3.0 via SpringDoc OpenAPI for Swagger UI.
*   **Architecture Documentation:** High-level system design.
*   **Deployment Guide:** Instructions for deploying the application.

**Monitoring:**
*   **Spring Boot Actuator:** Exposes application metrics.
*   **Prometheus:** Time-series monitoring system for collecting metrics.
*   **Grafana:** Dashboarding and visualization tool for metrics.

## 3. Architecture

The system follows a typical layered architecture for the backend application and integrates various DevOps tools.

*   **Frontend (Optional/Simple):** A basic HTML/JS client interacts with the REST API. For this project, a simple `index.html` and `script.js` are provided within the Spring Boot application's static resources.
*   **Backend (Product Management API):**
    *   **Spring Boot:** Framework for building the REST API.
    *   **Spring Data JPA:** For database interaction (ORM).
    *   **Spring Security + JWT:** For authentication and authorization.
    *   **Caffeine:** In-memory caching.
    *   **Bucket4j:** For rate limiting.
*   **Database:** PostgreSQL, managed by Flyway.
*   **Containerization:** Docker for isolating services.
*   **Orchestration (Local):** Docker Compose for running multiple containers.
*   **CI/CD:** GitHub Actions for automated workflows.
*   **Monitoring:** Prometheus for metrics collection, Grafana for visualization.

A detailed architecture overview is available in [ARCHITECTURE.md](ARCHITECTURE.md).

## 4. Prerequisites

Before you begin, ensure you have the following installed:

*   **Java 17 JDK:** [Download from Oracle](https://www.oracle.com/java/technologies/downloads/) or [Adoptium](https://adoptium.net/)
*   **Maven 3.8+:** [Download from Apache Maven](https://maven.apache.org/download.cgi)
*   **Docker Engine:** [Install Docker](https://docs.docker.com/get-docker/)
*   **Docker Compose:** Usually comes with Docker Desktop, or [install standalone](https://docs.docker.com/compose/install/)
*   (Optional for IDE) **IntelliJ IDEA Ultimate** or **Eclipse STS**

## 5. Local Setup

You can run the application either directly via Maven or using Docker Compose.

### Running with Maven

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/product-management-system.git
    cd product-management-system
    ```

2.  **Start a local PostgreSQL database:**
    You can use Docker to easily spin up a PostgreSQL instance.
    ```bash
    docker run --name product_db_local -e POSTGRES_DB=product_db -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=adminpass -p 5432:5432 -d postgres:15-alpine
    ```
    Wait a few seconds for the database to initialize.

3.  **Run Flyway migrations:**
    ```bash
    ./mvnw flyway:migrate -Dspring.datasource.url=jdbc:postgresql://localhost:5432/product_db -Dspring.datasource.username=admin -Dspring.datasource.password=adminpass
    ```
    This will create the schema and seed initial data.

4.  **Build and run the Spring Boot application:**
    ```bash
    ./mvnw spring-boot:run
    ```
    The application will start on `http://localhost:8080`.

### Running with Docker Compose

This is the recommended way to run the entire system locally, including the database, application, and monitoring tools.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/product-management-system.git
    cd product-management-system
    ```

2.  **Build and start all services:**
    ```bash
    docker-compose up --build -d
    ```
    This command will:
    *   Build the Docker image for the Spring Boot application.
    *   Pull images for PostgreSQL, Prometheus, Grafana, and Adminer.
    *   Start all services in detached mode.
    *   Flyway migrations will run automatically when the Spring Boot application starts.

3.  **Verify services:**
    Check the status of your containers:
    ```bash
    docker-compose ps
    ```
    You should see `product_management_app`, `product_db`, `prometheus`, `grafana`, and `adminer` running.

4.  **Access the applications:**
    *   **Product Management API:** `http://localhost:8080` (or `http://localhost:8080/index.html` for a basic UI)
    *   **Swagger UI:** `http://localhost:8080/swagger-ui.html`
    *   **Prometheus:** `http://localhost:9090`
    *   **Grafana:** `http://localhost:3000` (Default login: `admin`/`admin`)
    *   **Adminer (DB GUI):** `http://localhost:8081` (Server: `db`, Username: `admin`, Password: `adminpass`, Database: `product_db`)

## 6. API Documentation

The API documentation is generated using SpringDoc OpenAPI and is accessible via Swagger UI.

*   **Swagger UI:** `http://localhost:8080/swagger-ui.html`
*   **OpenAPI JSON:** `http://localhost:8080/v3/api-docs`

A simplified overview of key endpoints and example requests can be found in [API_DOCS.md](API_DOCS.md).

## 7. Testing

The project includes a comprehensive testing suite:

*   **Unit Tests:** Located in `src/test/java/**/service/*Test.java`. These test individual components in isolation using Mockito.
*   **API (Controller) Tests:** Located in `src/test/java/**/controller/*Test.java`. These test the REST API endpoints using Spring's `MockMvc` and `WithMockUser` for security context.
*   **Integration Tests:** Located in `src/test/java/**/repository/*Test.java`. These use Spring Boot Test and Testcontainers to spin up a real PostgreSQL database for testing data layer interactions.

### Running Tests

To run all tests (unit, integration, API) and generate code coverage reports:

```bash
./mvnw clean verify
```

The JaCoCo plugin is configured in `pom.xml` to enforce **80% line coverage**. The coverage report will be generated under `target/site/jacoco/index.html`.

### Performance Tests (Conceptual)

While full-scale performance testing requires dedicated infrastructure and tools like JMeter, a conceptual JMeter test plan (`performance-tests/product_api_test.jmx`) is provided. This file outlines a basic test scenario for the product API.

To run this, you would typically:
1.  Install Apache JMeter.
2.  Open `product_api_test.jmx` in JMeter.
3.  Configure thread groups, ramp-up periods, and assertions.
4.  Run the test to simulate concurrent users.

For continuous performance testing, these scripts would be integrated into a separate pipeline stage or scheduled jobs.

## 8. CI/CD Pipeline

The project uses **GitHub Actions** for its CI/CD pipeline, defined in `.github/workflows/ci-cd.yml`.

The pipeline consists of the following stages:

1.  **`build-and-test`**:
    *   Checks out code.
    *   Sets up Java 17.
    *   Starts a PostgreSQL container using `docker-compose-test.yml` for integration tests (via Testcontainers).
    *   Builds the Spring Boot application and runs all unit, integration, and API tests.
    *   Generates JaCoCo code coverage report and JUnit test results.
    *   Publishes test results and coverage reports as artifacts.
    *   Stops the test database.
    *   **Trigger:** Push or Pull Request to `main` branch.

2.  **`docker-build-and-push`**:
    *   **Dependency:** `build-and-test` job must pass.
    *   Logs into Docker Hub using secrets.
    *   Builds the Docker image for the application.
    *   Pushes the image to Docker Hub with the `latest` tag.
    *   **Trigger:** Push to `main` branch only.

3.  **`deploy`**:
    *   **Dependency:** `docker-build-and-push` job must pass.
    *   Simulates a deployment to a production environment. In a real-world scenario, this would involve deploying to cloud platforms (AWS EC2/EKS, Azure App Service/AKS, Google Cloud Run/GKE) or on-premise servers.
    *   **Trigger:** Push to `main` branch only.

**Secrets Configuration:**
For the CI/CD pipeline to function correctly, you need to configure the following secrets in your GitHub repository (`Settings > Secrets and variables > Actions > New repository secret`):

*   `DOCKER_USERNAME`: Your Docker Hub username.
*   `DOCKER_PASSWORD`: Your Docker Hub Access Token (recommended) or password.
*   `JWT_SECRET`: A strong, random secret key for JWT token signing. This should match `alx.app.jwtSecret` in `application.yml` or be provided as an environment variable in production.

## 9. Monitoring and Logging

The application is configured for robust monitoring and logging:

*   **Logging:**
    *   Configured using `logback-spring.xml` for console output and rolling file logs (`logs/product-management-system.log`).
    *   Logs include timestamps, log level, thread info, logger name, and message.
    *   Application-specific logs (`com.alx.pm`) are set to `DEBUG` for detailed insights, while `root` is `INFO`.
    *   SQL queries and parameters are logged for debugging and optimization.
*   **Monitoring (Metrics):**
    *   **Spring Boot Actuator:** Provides endpoints like `/actuator/health`, `/actuator/info`, `/actuator/prometheus`.
    *   **Prometheus:** Scrapes metrics from the `/actuator/prometheus` endpoint of the `product_management_app` service. Accessible at `http://localhost:9090`.
    *   **Grafana:** Visualizes the metrics collected by Prometheus. Accessible at `http://localhost:3000`. It comes pre-provisioned with a basic Spring Boot dashboard (conceptual).

To access Grafana after `docker-compose up`, use default credentials: `admin`/`admin`.

## 10. Deployment

This project demonstrates a containerized deployment strategy using Docker and Docker Compose for local environments, and a conceptual CI/CD pipeline for cloud deployment.

A detailed deployment guide is provided in [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md). It covers manual steps and how the CI/CD pipeline automates the process for a production environment.

## 11. Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -am 'feat: Add new feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Create a new Pull Request.

Ensure your code adheres to the project's coding standards and includes appropriate tests.

## 12. License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
```