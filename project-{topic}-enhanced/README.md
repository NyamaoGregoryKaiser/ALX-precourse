```markdown
# Project Management System (PMS) - DevOps Automation

This is a comprehensive, production-ready DevOps automation system for a **Project Management System (PMS)**. It allows users to manage projects, create tasks within projects, and assign tasks to other users. The system is built with Java Spring Boot for the backend and integrated with various DevOps tools and practices, focusing on automation, testing, security, and observability.

## Table of Contents

1.  [Features](#features)
2.  [Technologies Used](#technologies-used)
3.  [Architecture](#architecture)
4.  [Setup Instructions (Local Development)](#setup-instructions-local-development)
    *   [Prerequisites](#prerequisites)
    *   [Running with Docker Compose](#running-with-docker-compose)
    *   [Running Locally (without Docker Compose for App)](#running-locally-without-docker-compose-for-app)
5.  [API Documentation (Swagger UI)](#api-documentation-swagger-ui)
6.  [Testing](#testing)
    *   [Running Tests](#running-tests)
    *   [Code Coverage](#code-coverage)
    *   [Performance Considerations](#performance-considerations)
7.  [CI/CD Pipeline](#cicd-pipeline)
8.  [Deployment Guide](#deployment-guide)
9.  [Security](#security)
10. [Logging and Monitoring](#logging-and-monitoring)
11. [Caching](#caching)
12. [Rate Limiting](#rate-limiting)
13. [Database Layer & Migrations](#database-layer--migrations)
14. [Contributing](#contributing)
15. [License](#license)

## 1. Features

*   **User Management:**
    *   User registration and login (JWT-based authentication).
    *   Retrieve, update, and delete user profiles (authorized access).
    *   Admin roles for elevated privileges.
*   **Project Management:**
    *   Create, retrieve, update, and delete projects.
    *   Projects are owned by a single user.
    *   Authorized access to projects (only owner or admin can manage).
*   **Task Management:**
    *   Create, retrieve, update, and delete tasks within a project.
    *   Assign tasks to other registered users.
    *   Track task status (TO_DO, IN_PROGRESS, DONE, BLOCKED).
    *   Authorized access to tasks (only project owner or admin can manage).
*   **Authentication & Authorization:**
    *   Spring Security with JSON Web Tokens (JWT) for stateless authentication.
    *   Role-based authorization (`@PreAuthorize`).
*   **Error Handling:**
    *   Global exception handling with custom error responses.
    *   Specific exceptions for resource not found, validation errors, unauthorized access, etc.
*   **Data Validation:**
    *   Input validation using Jakarta Bean Validation.
*   **Logging:**
    *   Structured logging with Logback, configured for console and JSON file output.
*   **Monitoring:**
    *   Spring Boot Actuator endpoints for health, metrics, and application info.
*   **Caching:**
    *   In-memory caching with Caffeine for frequently accessed data (users, projects, tasks) to reduce database load.
*   **Rate Limiting:**
    *   API rate limiting implemented via a custom Spring `OncePerRequestFilter` using Bucket4j to prevent abuse.
*   **Database Migrations:**
    *   Flyway for managing database schema evolution.
*   **Containerization:**
    *   Docker and Docker Compose for easy setup and deployment.
*   **CI/CD:**
    *   Automated build, test, Docker image creation, and deployment using GitHub Actions.
*   **API Documentation:**
    *   Integrated Swagger UI using Springdoc OpenAPI for interactive API exploration.

## 2. Technologies Used

*   **Backend:** Java 17, Spring Boot 3.2.x
*   **Database:** PostgreSQL 16
*   **Build Tool:** Apache Maven 3.x
*   **Containerization:** Docker, Docker Compose
*   **CI/CD:** GitHub Actions
*   **Testing:** JUnit 5, Mockito, Spring Boot Test, Testcontainers
*   **Security:** Spring Security, JJWT (Java JWT)
*   **API Documentation:** Springdoc OpenAPI (Swagger UI)
*   **Database Migrations:** Flyway
*   **Caching:** Caffeine
*   **Rate Limiting:** Bucket4j (via Guava Cache for buckets)
*   **Code Quality:** JaCoCo (for code coverage reporting)
*   **Utility:** Lombok (for boilerplate reduction)

## 3. Architecture

The system follows a layered architecture typical for Spring Boot applications:

*   **Controller Layer (`com.alx.pms.*.controller`):** Handles incoming HTTP requests, performs basic input validation, and delegates to the service layer.
*   **Service Layer (`com.alx.pms.*.service`):** Contains the core business logic, orchestrates data operations, and applies transaction management. This layer also implements caching.
*   **Repository Layer (`com.alx.pms.*.repository`):** Interacts with the database using Spring Data JPA, abstracting database operations.
*   **Model Layer (`com.alx.pms.model`):** Defines the JPA entities that map to database tables.
*   **DTO Layer (`com.alx.pms.*.dto`):** Data Transfer Objects used for request/response bodies, ensuring loose coupling between API and internal entities.
*   **Security Layer (`com.alx.pms.config`, `com.alx.pms.security`):** Configures Spring Security, JWT authentication, and authorization rules.
*   **Configuration Layer (`com.alx.pms.config`):** Contains general application configurations, including caching and rate limiting.
*   **Exception Handling Layer (`com.alx.pms.exception`):** Provides a centralized mechanism for handling exceptions across the application.

**High-Level Diagram:**

```
+----------------+       +-------------------+       +--------------------+       +--------------------+
| Frontend/User  |------>| Rate Limiting     |------>| Spring Security    |------>| API Controllers    |
| (e.g., Browser,|       | (RateLimitingFilter)|       | (JWT Auth Filter,  |       |                    |
| Postman, cURL) |       |                   |       | @PreAuthorize)     |       |                    |
+----------------+       +-------------------+       +--------------------+       +---------+----------+
                                                                                           |
                                                                                           v
                                                                                   +-------+-------+
                                                                                   | Service Layer |
                                                                                   | (Business Logic, |
                                                                                   | Caching, Tx Mgmt) |
                                                                                   +-------+-------+
                                                                                           |
                                                                                           v
                                                                                   +-------+-------+
                                                                                   | Repository    |
                                                                                   | Layer (JPA)   |
                                                                                   +-------+-------+
                                                                                           |
                                                                                           v
                                                                                   +-------+-------+
                                                                                   | Database      |
                                                                                   | (PostgreSQL)  |
                                                                                   +---------------+
                                                                                     ^           ^
                                                                                     |           |
                                                                                     +-- Flyway ---+
```

## 4. Setup Instructions (Local Development)

### Prerequisites

Before you begin, ensure you have the following installed:

*   **Java Development Kit (JDK) 17** or higher
*   **Apache Maven 3.x** or higher
*   **Docker Desktop** (includes Docker Engine and Docker Compose)
*   (Optional but recommended) An IDE like IntelliJ IDEA or VS Code.

### Running with Docker Compose

This is the recommended way to run the application and its dependencies locally.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/project-management-system.git
    cd project-management-system
    ```

2.  **Build the Docker image for the application:**
    ```bash
    docker build -t pms-app .
    ```
    *(Alternatively, `docker-compose up --build` will also build the image)*

3.  **Start the application and database using Docker Compose:**
    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: Rebuilds the images (useful if you made changes to the `Dockerfile` or source code).
    *   `-d`: Runs the services in detached mode (in the background).

4.  **Verify that containers are running:**
    ```bash
    docker-compose ps
    ```
    You should see `pms-db` and `pms-app` running.

5.  **Access the application:**
    *   The application will be available at `http://localhost:8080`.
    *   Swagger UI (API Documentation) will be at `http://localhost:8080/swagger-ui.html`.
    *   Spring Boot Actuator endpoints (e.g., health check) will be at `http://localhost:8080/actuator/health`.

6.  **Stop the services:**
    ```bash
    docker-compose down
    ```
    This will stop and remove the containers and networks. Add `-v` (`docker-compose down -v`) to also remove the data volume for the database (use with caution, as it deletes your data).

### Running Locally (without Docker Compose for App)

If you prefer to run the Spring Boot application directly on your machine while still using a Dockerized database:

1.  **Start only the PostgreSQL database using Docker Compose:**
    ```bash
    docker-compose up db -d
    ```

2.  **Wait for the database to be ready.** You can check its health:
    ```bash
    docker-compose ps
    docker logs pms-db # Look for messages indicating readiness
    ```

3.  **Build the Spring Boot application (Maven):**
    ```bash
    mvn clean install
    ```

4.  **Run the Spring Boot application:**
    ```bash
    mvn spring-boot:run
    ```
    The application will start on `http://localhost:8080`.

    *Note: Ensure your `application.properties` (or environment variables) correctly point to the Dockerized PostgreSQL database (`jdbc:postgresql://localhost:5432/pms_db`).*

## 5. API Documentation (Swagger UI)

The API is fully documented using Springdoc OpenAPI, which generates Swagger UI.

*   Access the Swagger UI at: `http://localhost:8080/swagger-ui.html`

You can use this interface to:
*   View all available endpoints.
*   Understand request and response schemas.
*   Test API calls directly from the browser (requires obtaining a JWT token via the `/api/v1/auth/login` endpoint and authenticating in Swagger UI using the "Authorize" button, Bearer token type).

**Initial Test Credentials (from `V2__insert_seed_data.sql`):**

| Username | Email             | Password     | Roles         |
| :------- | :---------------- | :----------- | :------------ |
| `user1`  | `user1@example.com` | `password123`  | `ROLE_USER`   |
| `user2`  | `user2@example.com` | `password123`  | `ROLE_USER`   |
| `admin`  | `admin@example.com` | `admin123`   | `ROLE_USER, ROLE_ADMIN` |

## 6. Testing

The project includes a comprehensive suite of tests:

*   **Unit Tests:** Focus on individual components (services, repositories, controllers) in isolation using Mockito.
*   **Integration Tests:** Test the interaction between multiple components, including the database using `@DataJpaTest` and `@SpringBootTest` with Testcontainers.
*   **API Tests:** Use `MockMvc` within Spring Boot integration tests to simulate HTTP requests and verify API responses and behavior.

### Running Tests

To run all tests (unit, integration, and API tests):

```bash
mvn test
```

### Code Coverage

JaCoCo is integrated to measure code coverage. The `pom.xml` is configured to fail the build if line coverage falls below 80% and branch coverage below 70% (excluding DTOs, models, and config classes).

After running `mvn test`, a coverage report will be generated. You can view it by opening:

`target/site/jacoco/index.html` (open this file in your web browser)

### Performance Considerations

While full-scale performance testing requires dedicated tools (JMeter, k6), the application has been designed with performance considerations:

*   **Caching:** Caffeine is used for in-memory caching of frequently accessed user, project, and task data to reduce database round-trips.
*   **Database Indexing:** Appropriate indexes are defined in `V1__create_initial_schema.sql` to speed up common queries.
*   **Lazy Loading:** JPA relationships are configured for lazy loading where appropriate to avoid N+1 problems.
*   **Optimized Queries:** Spring Data JPA's derived query methods are efficient. For complex queries, `@Query` annotations or more advanced JPA features would be used.
*   **Rate Limiting:** Protects the API from abusive traffic.

For production, consider:
*   **Profiling:** Use tools like JProfiler or VisualVM to identify performance bottlenecks.
*   **Load Testing:** Simulate high user loads with tools like JMeter or k6 to find breaking points.
*   **Distributed Caching:** For multi-instance deployments, switch from in-memory Caffeine to a distributed cache like Redis.

## 7. CI/CD Pipeline

A GitHub Actions workflow (`.github/workflows/main.yml`) is configured to automate the build, test, and deployment process.

**Pipeline Steps:**

1.  **`build-and-test` job:**
    *   **Checkout code:** Fetches the latest code from the repository.
    *   **Setup JDK 17:** Configures the Java environment.
    *   **Build and run tests:** Executes `mvn clean install`, which runs all unit and integration tests.
    *   **Collect JaCoCo coverage report:** Generates the `jacoco.xml` report.
    *   **Upload JaCoCo coverage report to Codecov:** Integrates with Codecov for detailed coverage analysis and historical trends.
2.  **`docker-build-and-push` job:**
    *   **Log in to GitHub Container Registry (GHCR):** Authenticates with GHCR to push images.
    *   **Extract metadata:** Determines Docker image tags (e.g., `latest`, `sha-<commit_sha>`).
    *   **Build and push Docker image:** Builds the application Docker image and pushes it to `ghcr.io/${{ github.repository }}`.
3.  **`deploy` job:**
    *   **Conditional Execution:** Runs only on pushes to the `main` branch.
    *   **Deploy to production server via SSH:** Uses `appleboy/ssh-action` to connect to a remote server.
    *   **Deployment Script:**
        *   Logs in to GHCR on the remote server.
        *   Navigates to the deployment directory.
        *   Pulls the latest Docker image.
        *   Restarts the application using `docker-compose up -d --remove-orphans`.
        *   Cleans up old Docker images to manage disk space.

## 8. Deployment Guide

The CI/CD pipeline automates deployment to a target server. Here's a conceptual guide for manual deployment or setting up the target server:

**Server Setup (Example: Ubuntu Server)**

1.  **Install Docker and Docker Compose:**
    ```bash
    sudo apt update
    sudo apt install apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install docker-ce docker-ce-cli containerd.io
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    sudo usermod -aG docker $USER # Add your user to the docker group
    newgrp docker # Apply group changes
    ```

2.  **Create a deployment directory:**
    ```bash
    sudo mkdir -p /opt/pms-deployment
    sudo chown $USER:$USER /opt/pms-deployment # Give your user ownership
    cd /opt/pms-deployment
    ```

3.  **Place `docker-compose.yml` in the deployment directory:**
    Copy the `docker-compose.yml` from this repository to `/opt/pms-deployment` on your server.

4.  **Set up environment variables:**
    *   Ensure that the `application.properties` or equivalent environment variables (as seen in `docker-compose.yml`) for `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, and `APPLICATION_SECURITY_JWT_SECRET_KEY` are correctly configured for your production database.
    *   For the JWT secret, generate a strong, random key.

**First-Time Deployment (Manual or via CI/CD):**

1.  **Pull the Docker image:**
    ```bash
    docker pull ghcr.io/your-username/project-management-system:latest
    ```
    *   You might need to log in to GHCR first:
        ```bash
        echo YOUR_GITHUB_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
        ```

2.  **Start the services:**
    ```bash
    cd /opt/pms-deployment
    docker-compose up -d
    ```

**Subsequent Deployments (Automated by CI/CD):**

The GitHub Actions `deploy` job handles this automatically. It will:
1.  SSH into your server.
2.  Navigate to `/opt/pms-deployment`.
3.  Execute `docker-compose pull app`.
4.  Execute `docker-compose up -d --remove-orphans`.
5.  Clean up old Docker images.

## 9. Security

*   **Authentication:** JWT-based authentication allows for stateless, scalable authentication.
*   **Authorization:** Spring Security's `@PreAuthorize` is used to implement fine-grained, method-level authorization (e.g., only project owner can update a project, only admin can view all users).
*   **Password Hashing:** Passwords are securely stored using BCrypt.
*   **Input Validation:** All API endpoints perform input validation using Jakarta Bean Validation to prevent common injection attacks and ensure data integrity.
*   **HTTPS:** For production environments, ensure that the application is served over HTTPS using a reverse proxy (e.g., Nginx, Apache) to encrypt communication.
*   **Sensitive Configuration:** JWT `secret-key` should be stored securely as environment variables or Docker secrets in production, not directly in source code.

## 10. Logging and Monitoring

*   **Structured Logging:** Configured with Logback to output logs in JSON format to `logs/pms-app.log`. This makes logs easier to parse and analyze with tools like ELK Stack (Elasticsearch, Logstash, Kibana) or Splunk.
*   **Log Levels:** Configured to `DEBUG` for application packages (`com.alx.pms`) for detailed insights during development and `INFO` for production.
*   **Spring Boot Actuator:** Provides various endpoints for monitoring and managing the application:
    *   `/actuator/health`: Application health status.
    *   `/actuator/metrics`: Detailed metrics (JVM, HTTP requests, system).
    *   `/actuator/info`: Custom application info.
    *   `/actuator/caches`: Cache usage and statistics.
    *   `/actuator/logfile`: View the application log file.
    *   `/actuator/loggers`: View and change log levels at runtime.
    These endpoints are exposed by default in `application.properties`. Access them by appending to your base URL (e.g., `http://localhost:8080/actuator/health`).

## 11. Caching

An in-memory caching layer is implemented using **Caffeine** and managed by Spring's `@Cacheable`, `@CachePut`, and `@CacheEvict` annotations.

*   **Cache Configuration:** `CacheConfig.java` defines cache managers and eviction policies (e.g., expire after 10 minutes of inactivity).
*   **Usage:**
    *   `UserService`: Caches user details by username (`loadUserByUsername`) and by ID (`getUserById`).
    *   `ProjectService`: Caches project details by ID (`getProjectById`).
    *   `TaskService`: Caches task details by ID (`getTaskById`).
*   **Benefits:** Reduces the load on the database for frequently requested data, improving response times.
*   **Scalability:** For horizontally scaled deployments (multiple instances of the application), consider replacing Caffeine with a distributed cache solution like Redis or Memcached to ensure cache consistency across instances.

## 12. Rate Limiting

A custom `RateLimitingFilter` is implemented to protect the API from excessive requests from a single client.

*   **Mechanism:** Uses the `Bucket4j` library to create token buckets for each client IP address.
*   **Policy:** Allows 10 requests per minute per IP address. If the limit is exceeded, a `429 Too Many Requests` status is returned with a `Retry-After` header.
*   **Exclusions:** Swagger UI and Actuator endpoints are excluded from rate limiting to facilitate testing and monitoring.
*   **IP Resolution:** Tries to use the `X-Forwarded-For` header for IP address resolution, falling back to `request.getRemoteAddr()`.

## 13. Database Layer & Migrations

*   **Database:** PostgreSQL is used as the relational database.
*   **Schema Definition:** JPA entities (`User`, `Project`, `Task`) define the database schema.
*   **Migrations:** **Flyway** is used for database schema migrations.
    *   `V1__create_initial_schema.sql`: Defines the initial tables and indexes.
    *   `V2__insert_seed_data.sql`: Populates the database with initial users, projects, and tasks for testing and demonstration.
*   **Query Optimization:** Basic indexing is applied on foreign keys and frequently queried columns to improve read performance. Further optimization would involve analyzing query plans and adding more specific indexes as needed.

## 14. Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature`).
3.  Make your changes and write tests.
4.  Ensure all tests pass and code coverage remains high.
5.  Commit your changes (`git commit -am 'Add new feature'`).
6.  Push to the branch (`git push origin feature/your-feature`).
7.  Create a new Pull Request.

## 15. License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
```