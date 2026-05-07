# AppInsight: Production-Ready Performance Monitoring System

AppInsight is a robust, full-stack application designed to monitor the performance of various client applications. It allows for the definition of custom metrics, ingestion of time-series data, and retrieval for analysis. Built with Spring Boot, PostgreSQL, and a touch of modern web frontend, it emphasizes enterprise-grade features like security, scalability, and maintainability.

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Technologies Used](#technologies-used)
4.  [Prerequisites](#prerequisites)
5.  [Setup and Installation](#setup-and-installation)
    *   [Local Development (Docker Compose)](#local-development-docker-compose)
    *   [Manual Setup](#manual-setup)
6.  [Running the Application](#running-the-application)
7.  [API Endpoints](#api-endpoints)
8.  [Authentication & Authorization](#authentication--authorization)
9.  [Frontend Usage](#frontend-usage)
10. [Testing](#testing)
11. [CI/CD](#cicd)
12. [Contributing](#contributing)
13. [License](#license)

## 1. Features

*   **Application Management**: CRUD operations for `MonitoredApplication` entities.
*   **Metric Definition**: CRUD operations for `Metric` entities tied to applications.
*   **Metric Data Ingestion**: Secure API for external systems to push `MetricData`.
*   **Metric Data Retrieval**: Query historical `MetricData` by time range or paginated.
*   **Authentication**: JWT-based authentication for API access.
*   **Authorization**: Role-based access control (`ADMIN`, `USER`) using Spring Security's `@PreAuthorize`.
*   **Logging**: Structured logging with Logback, configured for console and rolling file appenders.
*   **Error Handling**: Centralized global exception handling with consistent error responses.
*   **Caching**: In-memory caching with Caffeine for frequently accessed application/metric data.
*   **Rate Limiting**: API rate limiting using Bucket4j to prevent abuse.
*   **Database Migrations**: Flyway for managing database schema evolution.
*   **Containerization**: Docker and Docker Compose for easy setup and deployment.
*   **Testing**: Comprehensive Unit, Integration, and API tests.
*   **Frontend**: A simple HTML/JavaScript interface for basic interaction.
*   **Monitoring**: Spring Boot Actuator endpoints for operational insights.

## 2. Architecture

AppInsight follows a standard N-tier architecture:

*   **Presentation Layer (Frontend)**: A basic static HTML/JS application served by the Spring Boot backend.
*   **API Layer (Controllers)**: RESTful endpoints exposed by Spring Boot, handling request/response mapping and delegating to services.
*   **Service Layer (Services)**: Contains the core business logic, orchestrates data access, applies validation, caching, and rate limiting.
*   **Persistence Layer (Repositories)**: Spring Data JPA interfaces interacting with the PostgreSQL database.
*   **Database Layer (PostgreSQL)**: Stores all application, metric, and metric data.
*   **Security Layer**: Integrated Spring Security with JWT for authentication and authorization.

## 3. Technologies Used

*   **Backend**: Java 17, Spring Boot 3.2.x
*   **Database**: PostgreSQL
*   **ORM**: Spring Data JPA, Hibernate
*   **Migrations**: Flyway
*   **Authentication**: Spring Security, JWT (jjwt)
*   **Caching**: Caffeine
*   **Rate Limiting**: Bucket4j
*   **Logging**: SLF4j, Logback
*   **Build Tool**: Maven
*   **Containerization**: Docker, Docker Compose
*   **Testing**: JUnit 5, Mockito, Spring Boot Test, Testcontainers
*   **Frontend**: HTML, CSS, JavaScript (minimal)

## 4. Prerequisites

*   Java Development Kit (JDK) 17 or higher
*   Maven 3.x
*   Docker and Docker Compose (recommended for easy setup)
*   A text editor or IDE (e.g., IntelliJ IDEA, VS Code)

## 5. Setup and Installation

### Local Development (Docker Compose) - Recommended

This is the quickest way to get the entire stack (PostgreSQL + Spring Boot app) running.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/appinsight.git
    cd appinsight
    ```

2.  **Build the Docker image for the Spring Boot application:**
    ```bash
    docker build -t appinsight-backend .
    ```
    (The `docker-compose.yml` also includes `build: .`, so `docker compose up` will build if the image doesn't exist, but it's good practice to build explicitly first if you change code.)

3.  **Start the services using Docker Compose:**
    ```bash
    docker compose up -d
    ```
    This will:
    *   Start a PostgreSQL database container.
    *   Apply Flyway database migrations.
    *   Start the AppInsight Spring Boot backend application.
    *   Mount a `logs` directory from your host into the container for easy log access.

4.  **Verify services are running:**
    ```bash
    docker compose ps
    ```
    You should see `appinsight_db` and `appinsight_backend` in a healthy state.

The backend application will be accessible at `http://localhost:8080`.
The frontend `index.html` is served directly from the Spring Boot app at `http://localhost:8080`.

### Manual Setup (without Docker Compose for backend)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/appinsight.git
    cd appinsight
    ```

2.  **Set up PostgreSQL Database:**
    *   Install PostgreSQL (if not already installed).
    *   Create a database: `appinsight_db`
    *   Create a user: `appinsight_user` with password: `password`
    *   Grant necessary privileges to the user on the database.
    *   Alternatively, run *only* the PostgreSQL container from `docker-compose.yml`:
        ```bash
        docker compose up -d db
        ```

3.  **Configure `application.yml`:**
    *   Update `src/main/resources/application.yml` with your PostgreSQL connection details if they differ from the defaults (`localhost:5432`, `appinsight_db`, `appinsight_user`, `password`).
    *   Ensure `JWT_SECRET` is set in your environment variables or directly in `application.yml` for production (a very strong, long, random string).

4.  **Run Flyway Migrations:**
    *   Flyway migrations are automatically applied by Spring Boot on startup if `spring.flyway.enabled=true`.
    *   If you encounter issues, ensure `hibernate.ddl-auto` is set to `none` in `application.yml`.

5.  **Build the Spring Boot application:**
    ```bash
    mvn clean install -DskipTests
    ```

6.  **Run the Spring Boot application:**
    ```bash
    java -jar target/appinsight-0.0.1-SNAPSHOT.jar
    ```

## 6. Running the Application

Once setup is complete:

*   **Backend API**: `http://localhost:8080/api`
*   **Frontend UI**: `http://localhost:8080/index.html` (or simply `http://localhost:8080`)
*   **Swagger UI**: `http://localhost:8080/swagger-ui.html`
*   **Spring Boot Actuator**: `http://localhost:8080/actuator`

## 7. API Endpoints

All API endpoints are prefixed with `/api`.

### Authentication

*   `POST /api/auth/register` - Register a new user.
    *   Request Body: `{"username": "...", "password": "...", "email": "...", "roles": ["USER"]}`
*   `POST /api/auth/login` - Authenticate and get a JWT token.
    *   Request Body: `{"username": "...", "password": "..."}`
    *   Response: `{"jwt": "..."}`

### Monitored Applications

*   `GET /api/applications` - Get all monitored applications. (Roles: ADMIN, USER)
*   `GET /api/applications/{id}` - Get a single application by ID. (Roles: ADMIN, USER)
*   `POST /api/applications` - Create a new application. (Role: ADMIN)
    *   Request Body: `{"name": "...", "description": "..."}`
*   `PUT /api/applications/{id}` - Update an existing application. (Role: ADMIN)
    *   Request Body: `{"name": "...", "description": "..."}`
*   `DELETE /api/applications/{id}` - Delete an application. (Role: ADMIN)

### Metrics

*   `GET /api/applications/{applicationId}/metrics` - Get all metrics for a specific application. (Roles: ADMIN, USER)
*   `GET /api/applications/{applicationId}/metrics/{metricId}` - Get a single metric by ID. (Roles: ADMIN, USER)
*   `POST /api/applications/{applicationId}/metrics` - Create a new metric for an application. (Role: ADMIN)
    *   Request Body: `{"name": "...", "description": "...", "type": "GAUGE"}` (Type can be GAUGE, COUNTER, HISTOGRAM, SUMMARY)
*   `PUT /api/applications/{applicationId}/metrics/{metricId}` - Update an existing metric. (Role: ADMIN)
    *   Request Body: `{"name": "...", "description": "...", "type": "GAUGE"}`
*   `DELETE /api/applications/{applicationId}/metrics/{metricId}` - Delete a metric. (Role: ADMIN)

### Metric Data

*   `POST /api/metric-data/ingest` - Ingest metric data points from an external application. (Requires `X-API-KEY` header)
    *   Headers: `X-API-KEY: <application_api_key>`
    *   Request Body: `[{"metricName": "...", "value": 123.45, "timestamp": "ISO_DATE_TIME", "tags": "..."}]`
*   `GET /api/metric-data/{metricId}` - Get historical metric data for a specific metric within a time range. (Roles: ADMIN, USER)
    *   Query Params: `startTime=ISO_DATE_TIME`, `endTime=ISO_DATE_TIME`
*   `GET /api/metric-data/{metricId}/paginated` - Get paginated metric data. (Roles: ADMIN, USER)
    *   Query Params: `page=0`, `size=100`

For detailed API documentation, refer to the [API Documentation](#api-documentation) section.

## 8. Authentication & Authorization

*   **Login Credentials (default seed data):**
    *   **Admin User:** `username: admin`, `password: adminpass`
    *   **Regular User:** `username: user`, `password: userpass`
*   **JWT Tokens:** After successful login, a JWT token is returned. This token must be included in the `Authorization` header of subsequent requests in the format `Bearer <YOUR_JWT_TOKEN>`.
*   **Role-Based Access Control:**
    *   **ADMIN**: Can perform all CRUD operations on Applications and Metrics, view all data.
    *   **USER**: Can view Applications, Metrics, and Metric Data. Cannot create, update, or delete.
    *   **MONITORING_AGENT**: (Currently not tied to JWT, uses API Key for data ingestion). Can only ingest data via the `X-API-KEY` header.

## 9. Frontend Usage

The simple frontend (`index.html` and `script.js`) demonstrates basic interaction with the backend:

1.  Open `http://localhost:8080` in your browser.
2.  **Register/Login**: Use the forms to register a new user or log in with the default `admin`/`adminpass` or `user`/`userpass`.
3.  **Manage Applications**: After logging in, you can create new applications and view existing ones. Note their generated API Keys.
4.  **Manage Metrics**: Click "View Metrics" for an application to define new metrics for it.
5.  **Ingest & View Data**: For a specific metric, you can use the "Ingest Sample Metric Data" form (it uses the associated application's API Key) and view recent historical data.

This frontend is a minimal demonstration. For a production-grade UI, a dedicated frontend framework like React, Angular, or Vue.js would be used, consuming these APIs.

## 10. Testing

The project includes various types of tests to ensure quality:

*   **Unit Tests**: Located in `src/test/java/.../service` and `src/test/java/.../util`. These focus on individual components (e.g., business logic in services, utility functions like `JwtUtil`) in isolation using Mockito for dependencies. Target: 80%+ coverage.
*   **Integration Tests**: Located in `src/test/java/.../repository` and `src/test/java/.../controller`.
    *   **Repository Tests**: Use `@DataJpaTest` with `Testcontainers` (PostgreSQL) to verify database interactions.
    *   **Controller Tests**: Use `@WebMvcTest` to test REST endpoints, including authentication and authorization flows, with `MockMvc`.
*   **API Tests**: (Conceptual) A Postman collection or `curl` scripts would be used to test the full API endpoints from an external perspective.
*   **Performance Tests**: (Conceptual) Using tools like JMeter or Gatling to simulate high load on the system, focusing on `POST /api/metric-data/ingest` and `GET /api/metric-data/{metricId}` endpoints.

To run all tests:
```bash
mvn clean test
```
To generate a JaCoCo coverage report (usually run after `mvn install` to ensure code is built):
```bash
mvn jacoco:report
# Report will be in target/site/jacoco/index.html
```

## 11. CI/CD

A basic GitHub Actions workflow (`.github/workflows/main.yml`) is provided:

*   **Triggers**: On `push` and `pull_request` to `main` branch.
*   **Steps**:
    1.  Checkout code.
    2.  Set up JDK 17.
    3.  Build the project with Maven (`mvn clean install`).
    4.  Run unit and integration tests (`mvn test`).
    5.  Generate JaCoCo test coverage report.
    6.  Build a Docker image for the application.
    7.  (On `main` branch push): Log in to Docker Hub and push the image.
    8.  (On `main` branch push): Placeholder for deployment to a staging/production environment.

**Note**: For production CI/CD, you would replace the deployment placeholder with actual deployment steps (e.g., Kubernetes deployment with Helm, cloud provider deployment tools, blue/green deployments, etc.) and use secure secrets management.

## 12. Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Write comprehensive tests for your changes.
5.  Ensure all tests pass and code coverage is maintained.
6.  Commit your changes (`git commit -m 'feat: Add new feature X'`).
7.  Push to the branch (`git push origin feature/your-feature-name`).
8.  Open a Pull Request.

## 13. License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details (not included in this response, but implied).