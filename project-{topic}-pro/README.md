```markdown
# VizFlow: Enterprise Data Visualization System

VizFlow is a comprehensive, production-ready data visualization platform designed to empower users to connect to various data sources, create datasets, build interactive visualizations, and assemble them into dynamic dashboards.

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Technologies Used](#technologies-used)
4.  [Prerequisites](#prerequisites)
5.  [Setup Instructions](#setup-instructions)
    *   [Backend (Java/Spring Boot)](#backend-javaspring-boot)
    *   [Frontend (React)](#frontend-react)
    *   [Docker Compose (Recommended)](#docker-compose-recommended)
6.  [Running the Application](#running-the-application)
7.  [API Documentation](#api-documentation)
8.  [Testing](#testing)
9.  [CI/CD](#cicd)
10. [Deployment Guide](#deployment-guide)
11. [Configuration](#configuration)
12. [Contributing](#contributing)
13. [License](#license)

---

## 1. Features

*   **Secure User Management:** JWT-based authentication and Role-Based Access Control (RBAC).
*   **Data Source Management:** Define connections to various data sources (e.g., PostgreSQL, internal data).
*   **Dataset Management:** Create datasets from data sources, including defining schema and transformation logic (filtering, aggregation, renaming).
*   **Interactive Visualizations:** Develop and configure various chart types (bar, line, pie, scatter, etc.).
*   **Dynamic Dashboards:** Group multiple visualizations into interactive dashboards.
*   **Robust Error Handling:** Centralized exception handling with informative error responses.
*   **Logging & Monitoring:** Structured logging with Logback, easily integrable with monitoring tools.
*   **Caching:** Local caching (Caffeine) for frequently accessed data to improve performance.
*   **Rate Limiting:** IP-based rate limiting to protect against abuse.
*   **API Documentation:** Self-documenting API using Springdoc-OpenAPI (Swagger UI).

## 2. Architecture

The system follows a microservice-lite architecture with a clear separation of concerns:

*   **Frontend:** A React application providing the user interface.
*   **Backend:** A Spring Boot application handling business logic, data processing, security, and API exposure.
*   **Database:** PostgreSQL for persistent storage of user data, data source configurations, datasets, visualizations, and dashboards.

**Key Modules/Components:**

*   **`vizflow-backend`**:
    *   **Controllers**: REST API endpoints for user interaction.
    *   **Services**: Core business logic, data processing (e.g., `DatasetService` for fetching and transforming data), and security operations.
    *   **Repositories**: JPA interfaces for database interaction.
    *   **Models**: JPA Entities representing database tables.
    *   **DTOs**: Data Transfer Objects for clean API contracts.
    *   **Security**: Spring Security with JWT authentication and custom filters.
    *   **Configuration**: Global settings, caching, Swagger.
    *   **Error Handling**: Global exception handler.
    *   **Rate Limiting**: Custom filter for API protection.
*   **`vizflow-frontend`**: (Basic structure provided)
    *   **Components**: Reusable UI elements (e.g., Chart components, forms).
    *   **Pages**: Top-level views (e.g., Dashboard, Dataset list, Login).
    *   **Services**: Client-side logic for interacting with the backend API.

## 3. Technologies Used

**Backend:**
*   **Java 17**
*   **Spring Boot 3.2.5**
*   **Spring Data JPA**
*   **Spring Security** (JWT Authentication)
*   **PostgreSQL**
*   **Flyway** (Database Migrations)
*   **Lombok**
*   **Google Guava RateLimiter** (for simple rate limiting)
*   **Caffeine** (Local Caching)
*   **Springdoc-OpenAPI** (Swagger UI)
*   **Maven** (Build Tool)

**Frontend:** (Basic setup)
*   **React 18**
*   **React Router DOM**
*   **Axios** (HTTP Client)
*   **ECharts** / **Chart.js** / **D3.js** (Recommended for visualizations, ECharts for example)
*   **npm / yarn** (Package Manager)

**Infrastructure:**
*   **Docker**
*   **Docker Compose**
*   **GitHub Actions** (CI/CD)

## 4. Prerequisites

Before you begin, ensure you have the following installed:

*   **Java Development Kit (JDK) 17 or higher**
*   **Maven 3.6+**
*   **Node.js 18+ and npm/yarn** (for frontend development, if running separately)
*   **Docker Desktop** (or Docker Engine and Docker Compose)

## 5. Setup Instructions

The easiest way to get VizFlow up and running is using Docker Compose.

### Docker Compose (Recommended)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/vizflow.git
    cd vizflow
    ```
    *(Replace `your-username` with your actual GitHub username or the repository URL)*

2.  **Configure Environment Variables (Optional but Recommended):**
    Create a `.env` file in the root `vizflow/` directory (where `docker-compose.yml` is located) with the following content. If not provided, defaults from `docker-compose.yml` will be used.

    ```dotenv
    # Database Configuration
    DB_NAME=vizflow
    DB_USER=vizflow_user
    DB_PASSWORD=vizflow_password

    # JWT Configuration (Crucial for production - use strong, random values)
    JWT_SECRET=a_very_long_and_secure_random_string_for_your_jwt_secret_vizflow
    JWT_EXPIRATION_MS=86400000 # 24 hours

    # Rate Limiting
    RATE_LIMIT_ENABLED=true
    RATE_LIMIT_RPS=10 # Requests per second

    # Frontend API URL (usually points to the backend service)
    REACT_APP_API_BASE_URL=http://localhost:8080/api
    ```

3.  **Build and Start with Docker Compose:**
    Navigate to the root `vizflow/` directory and run:
    ```bash
    docker compose up --build -d
    ```
    *   `--build`: Builds the Docker images for backend and frontend.
    *   `-d`: Runs the services in detached mode (in the background).

    This will:
    *   Pull the PostgreSQL image.
    *   Build the `vizflow-backend` image.
    *   Build the `vizflow-frontend` image (placeholder).
    *   Create a PostgreSQL container and apply Flyway migrations, including seed data.
    *   Start the Spring Boot backend on `http://localhost:8080`.
    *   Start the React frontend (Nginx serving static files) on `http://localhost:3000`.

### Backend (Java/Spring Boot) - Manual Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd vizflow/vizflow-backend
    ```
2.  **Configure `application.yml`:**
    Modify `src/main/resources/application.yml` with your PostgreSQL database connection details. Ensure the `jwt.secret` and `jwt.expiration` properties are set.
    ```yaml
    spring:
      datasource:
        url: jdbc:postgresql://localhost:5432/vizflow # Or your remote DB
        username: vizflow_user
        password: vizflow_password
    jwt:
      secret: YOUR_SECURE_AND_LONG_SECRET_KEY_HERE_MIN_32_CHARS_FOR_HS256
      expiration: 86400000 # 24 hours in milliseconds
    ```
3.  **Run Flyway Migrations (if not using Docker Compose):**
    Ensure PostgreSQL is running locally and accessible. You can run migrations manually:
    ```bash
    mvn flyway:migrate
    ```
4.  **Build the project:**
    ```bash
    mvn clean install -DskipTests
    ```
5.  **Run the application:**
    ```bash
    java -jar target/vizflow-backend-0.0.1-SNAPSHOT.jar
    ```
    The backend will start on `http://localhost:8080`.

### Frontend (React) - Manual Setup (Placeholder)

1.  **Navigate to the frontend directory:**
    ```bash
    cd vizflow/vizflow-frontend
    ```
2.  **Install dependencies:**
    ```bash
    npm install # or yarn install
    ```
3.  **Configure API endpoint:**
    Create a `.env` file in the `vizflow-frontend` directory:
    ```dotenv
    REACT_APP_API_BASE_URL=http://localhost:8080/api
    ```
4.  **Start the development server:**
    ```bash
    npm start # or yarn start
    ```
    The frontend will be available at `http://localhost:3000`.

## 6. Running the Application

*   **Backend:** After starting via Docker Compose or manually, it will be available at `http://localhost:8080`.
*   **Frontend:** After starting via Docker Compose or manually, it will be available at `http://localhost:3000`.

**Default Credentials (from seed data):**
*   **Admin User:** `username: admin`, `password: admin123`
*   **Regular User:** `username: user`, `password: user123`

## 7. API Documentation

The backend exposes API documentation via Swagger UI. Once the backend is running, navigate to:

`http://localhost:8080/swagger-ui/index.html`

Here you can explore all available endpoints, their request/response formats, and even test them directly (after authenticating via the `/api/auth/login` endpoint and adding the JWT token to the `Bearer` authorization header).

## 8. Testing

The backend project includes comprehensive tests:

*   **Unit Tests:** Located in `src/test/java/.../service/` for business logic, aiming for 80%+ line coverage.
*   **Repository Integration Tests:** Located in `src/test/java/.../repository/` using `@DataJpaTest` and Testcontainers for real database interaction.
*   **API Integration Tests:** Located in `src/test/java/.../controller/` using `@SpringBootTest` and `MockMvc` to simulate HTTP requests.

To run all tests:
```bash
cd vizflow/vizflow-backend
mvn clean test
```
The `pom.xml` is configured with `jacoco-maven-plugin` to generate test coverage reports in `target/site/jacoco/index.html` after running `mvn clean install` or `mvn clean test`.

**Performance Tests:**
Conceptual examples for JMeter and Gatling are provided in the `postman_collections/` or `deployment.md` sections, demonstrating how to set up performance tests. Actual scripts are not included as executable files.

## 9. CI/CD

A basic GitHub Actions workflow is provided in `.github/workflows/ci-cd.yml`. This workflow automates:

*   **Build:** Compiling the Java backend and building Docker images.
*   **Test:** Running all backend unit and integration tests.
*   **Linting/Static Analysis:** (Can be extended with SonarQube, Checkstyle, SpotBugs).
*   **Docker Image Push:** Pushing built images to a container registry (e.g., Docker Hub, GitHub Container Registry) on successful merges to `main`.
*   **Deployment:** (Placeholder for actual deployment to cloud providers like AWS, Azure, GCP).

## 10. Deployment Guide

See [deployment.md](./deployment.md) for detailed deployment instructions, including cloud-specific considerations.

## 11. Configuration

All configurable properties are managed via `application.yml` (backend) and `.env` files (frontend, docker-compose). Sensitive information like `JWT_SECRET` and database credentials should be managed via environment variables in production.

## 12. Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature`).
3.  Make your changes and ensure tests pass.
4.  Commit your changes (`git commit -am 'Add new feature'`).
5.  Push to the branch (`git push origin feature/your-feature`).
6.  Create a new Pull Request.

## 13. License

This project is licensed under the [MIT License](LICENSE).
```