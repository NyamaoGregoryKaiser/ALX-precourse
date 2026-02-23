# Task Management Platform

## Project Overview

This is a comprehensive, production-ready Task Management Platform built with Spring Boot. It provides a secure RESTful API for managing users, projects, and tasks, incorporating various enterprise-grade features and a robust DevOps pipeline.

**Core Features:**

*   **User Management:** Register, authenticate (JWT), view, update, and delete users. Role-based access control (USER, ADMIN).
*   **Project Management:** Create, retrieve, update, and delete projects. Assign users to projects.
*   **Task Management:** Create, retrieve, update, and delete tasks within projects. Assign tasks to users, set status and priority.
*   **Authentication & Authorization:** Secure JWT-based authentication and method-level authorization with Spring Security.
*   **Data Persistence:** PostgreSQL database managed with Flyway migrations.
*   **Caching:** In-memory caching with Caffeine to improve API response times for frequently accessed data.
*   **Rate Limiting:** Protects API endpoints from abuse with a custom rate-limiting filter.
*   **Comprehensive Testing:** Includes Unit, Integration, and API tests with high coverage.
*   **CI/CD Pipeline:** Automated build, test, Docker image creation, and deployment using GitHub Actions.
*   **Dockerization:** Application and database are containerized for easy setup and deployment.
*   **API Documentation:** Self-generating interactive OpenAPI (Swagger UI) documentation.
*   **Logging & Monitoring:** Structured logging with Logback and Spring Boot Actuator for health checks and metrics.
*   **Error Handling:** Global exception handling for consistent error responses.

## Technologies Used

*   **Backend:** Java 17, Spring Boot 3.2.x
*   **Database:** PostgreSQL 15
*   **ORM:** Spring Data JPA, Hibernate
*   **Security:** Spring Security, JWT (jjwt)
*   **Caching:** Spring Cache, Caffeine
*   **Database Migrations:** Flyway
*   **Containerization:** Docker, Docker Compose
*   **CI/CD:** GitHub Actions
*   **Testing:** JUnit 5, Mockito, Spring Boot Test, Testcontainers, JaCoCo (for coverage)
*   **API Docs:** Springdoc-openapi (Swagger UI)
*   **Build Tool:** Maven

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

*   **Java Development Kit (JDK) 17 or higher**
*   **Maven 3.6.x or higher**
*   **Docker Desktop** (includes Docker Engine and Docker Compose)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/task-management-platform.git
cd task-management-platform
```

### 2. Environment Configuration

The application uses `application.yml` for configuration, with environment variables for sensitive data like database credentials and JWT secret.

Create a `.env` file in the root directory for local Docker Compose setup:

```
# .env
DB_NAME=taskmanager
DB_USERNAME=user
DB_PASSWORD=password
JWT_SECRET=your_super_secret_jwt_key_that_is_at_least_32_chars_long_and_random # CHANGE THIS IN PRODUCTION!
```

**Note:** For local development, `application.yml` has default values. These are overridden by environment variables, which Docker Compose will provide.

### 3. Build the Application

Build the Spring Boot application using Maven. This will compile the code, run tests, and package it into a JAR file.

```bash
mvn clean install
```
This command will also execute unit and integration tests and generate a JaCoCo coverage report in `target/site/jacoco/index.html`.

### 4. Run with Docker Compose (Recommended for Local Development)

Docker Compose will set up both the PostgreSQL database and the Spring Boot application.

```bash
docker compose up --build -d
```

*   `--build`: Rebuilds images if changes are detected.
*   `-d`: Runs containers in detached mode (in the background).

Wait a few moments for the database to initialize and the application to start. You can check the logs:

```bash
docker compose logs -f
```

The application will be accessible at `http://localhost:8080`.

### 5. Running without Docker Compose (Local Development - Requires Manual DB Setup)

If you prefer to run the Spring Boot app directly:

1.  **Start a PostgreSQL database:** You can use Docker for just the database:
    ```bash
    docker run --name taskmanager-db-local -e POSTGRES_DB=taskmanager -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15-alpine
    ```
2.  **Run Flyway migrations:**
    ```bash
    mvn flyway:migrate
    ```
3.  **Run the Spring Boot application:**
    ```bash
    java -jar target/task-management-platform-0.0.1-SNAPSHOT.jar
    ```
    Or via Maven:
    ```bash
    mvn spring-boot:run
    ```

### 6. Accessing the Application

*   **API Base URL:** `http://localhost:8080/api`
*   **Swagger UI (API Documentation):** `http://localhost:8080/swagger-ui.html`
*   **Spring Boot Actuator (Monitoring):** `http://localhost:8080/actuator` (Requires ADMIN role for access)

## API Endpoints (via Swagger UI)

Navigate to `http://localhost:8080/swagger-ui.html` in your browser.

**Initial Users (seeded by `V2__Add_seed_data.sql`):**

*   **Admin User:**
    *   Username: `admin`
    *   Password: `adminpass`
*   **Regular User:**
    *   Username: `testuser`
    *   Password: `userpass`

**To interact with protected endpoints:**

1.  Go to `http://localhost:8080/swagger-ui.html`.
2.  Click on the "Authorize" button (usually a lock icon) or "Auth" section.
3.  Use the `/api/auth/login` endpoint to get a JWT token.
    *   Provide `username` and `password`.
    *   Copy the `token` value from the response.
4.  In the Authorize dialog, paste the token in the format `Bearer <YOUR_JWT_TOKEN>` (e.g., `Bearer eyJhbGciOi...`).
5.  Click "Authorize" and then "Close".
6.  You can now execute requests against protected endpoints.

### Example cURL commands:

**1. Register a new user:**
```bash
curl -X POST "http://localhost:8080/api/auth/register" \
-H "Content-Type: application/json" \
-d '{
  "username": "john.doe",
  "email": "john.doe@example.com",
  "password": "strongpassword",
  "roles": ["user"]
}'
```

**2. Login to get JWT token:**
```bash
curl -X POST "http://localhost:8080/api/auth/login" \
-H "Content-Type: application/json" \
-d '{
  "username": "admin",
  "password": "adminpass"
}' | jq '.token'
# Copy the token from the output
```

**3. Get all projects (requires JWT):**
Replace `YOUR_JWT_TOKEN` with the actual token obtained from login.
```bash
curl -X GET "http://localhost:8080/api/projects" \
-H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**4. Create a new project (requires JWT):**
```bash
curl -X POST "http://localhost:8080/api/projects" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_JWT_TOKEN" \
-d '{
  "name": "New Awesome Project",
  "description": "This is a detailed description of the new project.",
  "assignedUserIds": [2] # Assuming user with ID 2 exists, e.g., 'testuser'
}'
```

**5. Create a new task (requires JWT):**
```bash
curl -X POST "http://localhost:8080/api/tasks" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_JWT_TOKEN" \
-d '{
  "title": "Implement Feature X",
  "description": "Detailed description for Feature X implementation.",
  "status": "OPEN",
  "priority": "HIGH",
  "dueDate": "2024-12-31T23:59:59",
  "projectId": 1, # Assuming project with ID 1 exists
  "assigneeId": 2 # Assuming user with ID 2 exists
}'
```

## Running Tests

To run all unit and integration tests (configured in `pom.xml`):

```bash
mvn test
```

To run tests and generate a JaCoCo code coverage report:

```bash
mvn clean verify
```
The report will be available at `target/site/jacoco/index.html`. The `pom.xml` is configured to fail the build if line coverage drops below 80%.

## CI/CD Pipeline

The project uses GitHub Actions for Continuous Integration and Continuous Deployment.
*   **`.github/workflows/ci-cd.yml`**: Defines the CI/CD workflow.
*   **On push to `main` or pull request to `main`:**
    1.  **`build-and-test` job:**
        *   Checks out code.
        *   Sets up JDK 17.
        *   Builds the project with Maven, runs all tests, and checks JaCoCo code coverage.
        *   Uploads JaCoCo report and Surefire test results as artifacts.
    2.  **`docker-build-and-push` job (only on `main` branch push):**
        *   Logs into Docker Hub using secrets.
        *   Builds the Docker image for the application.
        *   Pushes the image to Docker Hub (e.g., `your-dockerhub-username/task-management-platform:latest`).
    3.  **`deploy` job (only on `main` branch push):**
        *   Connects to an EC2 instance via SSH using secrets.
        *   Stops and removes existing Docker containers.
        *   Pulls the latest Docker image from Docker Hub.
        *   Starts new containers using `docker compose up -d`.

**To set up CI/CD:**

1.  Fork this repository to your GitHub account.
2.  Go to your repository settings -> `Secrets and variables` -> `Actions` -> `New repository secret`.
3.  Add the following secrets:
    *   `DOCKER_USERNAME`
    *   `DOCKER_PASSWORD` (Docker Hub Access Token)
    *   `EC2_HOST`
    *   `EC2_USERNAME`
    *   `EC2_SSH_KEY` (Your private SSH key for EC2)
    *   `DB_NAME` (for production DB)
    *   `DB_USERNAME` (for production DB)
    *   `DB_PASSWORD` (for production DB)
    *   `JWT_SECRET` (A strong, random secret for JWT in production)
4.  Ensure your EC2 instance has Docker and Docker Compose installed and your SSH key is authorized.

## Contributing

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## License

Distributed under the MIT License. See `LICENSE` for more information.

---
**ALX Software Engineering Precourse Focus:**
This project heavily utilizes `programming logic` in service layers (business rules, data manipulation), `algorithm design` (implicitly in database querying and caching strategies), and extensive `technical problem solving` across the entire stack, from secure API design to robust deployment automation.