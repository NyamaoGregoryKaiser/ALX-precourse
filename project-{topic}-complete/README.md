```markdown
# Task Management API (C++)

This project implements a comprehensive, production-ready API for a task management system, built primarily in C++ following modern software engineering principles. It covers core application logic, database interactions, authentication, logging, error handling, caching, rate limiting, and a robust CI/CD and deployment strategy using Docker.

## Table of Contents

1.  [Architecture Overview](#1-architecture-overview)
2.  [Features](#2-features)
3.  [Prerequisites](#3-prerequisites)
4.  [Setup and Installation](#4-setup-and-installation)
    *   [Local Development Setup](#local-development-setup)
    *   [Docker Setup](#docker-setup)
5.  [Database Layer](#5-database-layer)
    *   [Schema](#schema)
    *   [Migrations](#migrations)
    *   [Seed Data](#seed-data)
6.  [API Documentation](#6-api-documentation)
    *   [Authentication](#authentication)
    *   [User Endpoints](#user-endpoints)
    *   [Project Endpoints](#project-endpoints)
    *   [Task Endpoints](#task-endpoints)
    *   [Comment Endpoints](#comment-endpoints)
7.  [Testing](#7-testing)
    *   [Unit Tests](#unit-tests)
    *   [Integration Tests](#integration-tests)
    *   [API Tests](#api-tests)
    *   [Performance Tests (Conceptual)](#performance-tests-conceptual)
8.  [Configuration](#8-configuration)
9.  [Additional Features](#9-additional-features)
    *   [Authentication/Authorization (JWT)](#authenticationauthorization-jwt)
    *   [Logging and Monitoring](#logging-and-monitoring)
    *   [Error Handling Middleware](#error-handling-middleware)
    *   [Caching Layer](#caching-layer)
    *   [Rate Limiting](#rate-limiting)
10. [CI/CD Pipeline](#10-cicd-pipeline)
11. [Deployment Guide](#11-deployment-guide)
12. [ALX Software Engineering Principles](#12-alx-software-engineering-principles)

---

## 1. Architecture Overview

The application follows a layered architecture, promoting separation of concerns and maintainability:

```
+------------------------------------+
|            HTTP Client             |
+------------------------------------+
              | Request
              v
+------------------------------------+
|            Crow Server             |
|  (main.cpp)                        |
|    +----------------------------+  |
|    |     Middleware Chain       |  |
|    |  (Logger -> RateLimiter -> |  |
|    |   Auth -> ErrorHandler)    |  |
|    +----------------------------+  |
|              | Request             |
|              v                     |
|    +----------------------------+  |
|    |        Controllers         |  |
|    | (Auth, User, Project, Task)|  |
|    |  - Parse Request, Validate |  |
|    |  - Call Services           |  |
|    +----------------------------+  |
|              |                     |
|              v                     |
|    +----------------------------+  |
|    |         Services         |  |
|    | (Auth, User, Project, Task)|  |
|    |  - Business Logic          |  |
|    |  - Orchestrate Repositories|  |
|    |  - Apply Caching/Validation|  |
|    +----------------------------+  |
|              |                     |
|              v                     |
|    +----------------------------+  |
|    |       Repositories       |  |
|    | (User, Project, Task)      |  |
|    |  - Interact with Database  |  |
|    |  - Map Models to DB Rows   |  |
|    +----------------------------+  |
|              |                     |
|              v                     |
+------------------------------------+
|            Database (SQLite)       |
+------------------------------------+
```

*   **Controllers:** Handle HTTP requests, parse inputs, call appropriate services, and format HTTP responses.
*   **Services:** Encapsulate business logic, orchestrate interactions between multiple repositories, and enforce domain rules. This is where caching and more complex validations reside.
*   **Repositories:** Abstract database interactions, providing a clean interface for CRUD operations on specific entities (e.g., `UserRepository`, `ProjectRepository`).
*   **Models:** Plain C++ structs representing the database entities, often with methods for JSON serialization/deserialization.
*   **DTOs (Data Transfer Objects):** Separate structs for request and response payloads, ensuring controlled data transfer and hiding internal model details.
*   **Middleware:** Functions that process requests before they reach the controllers (e.g., logging, authentication, error handling, rate limiting).
*   **Utilities:** Helper functions for common tasks like JSON manipulation, password hashing, JWT generation/validation.
*   **Configuration:** Centralized settings for database paths, JWT secrets, etc.

## 2. Features

*   **Core Application:**
    *   C++ backend with `Crow` microframework.
    *   Modular design: `User`, `Project`, `Task`, `Comment` modules.
    *   RESTful API endpoints with full CRUD operations.
    *   Comprehensive business logic for task and project management.
*   **Database Layer:**
    *   SQLite database (easily swappable with PostgreSQL/MySQL).
    *   SQL schema definitions for `users`, `projects`, `tasks`, `comments`.
    *   Migration scripts for database evolution.
    *   Seed data for initial setup.
*   **Configuration & Setup:**
    *   `vcpkg.json` for C++ dependency management.
    *   `CMakeLists.txt` for build system.
    *   Environment configuration for sensitive data and settings.
    *   `Dockerfile` for containerized deployment.
    *   `docker-compose.yml` for local multi-service orchestration.
*   **Testing & Quality:**
    *   Unit tests with Google Test (aiming for 80%+ coverage).
    *   Integration tests for database interactions.
    *   API tests using `curl` scripts.
    *   Conceptual outline for performance testing.
*   **Documentation:**
    *   Comprehensive `README.md` (this file).
    *   Detailed API documentation.
    *   Architecture documentation.
    *   Deployment guide.
*   **Additional Features:**
    *   JWT-based Authentication and Authorization (role-based).
    *   Structured logging with `spdlog`.
    *   Global error handling middleware with custom exceptions.
    *   In-memory caching layer for performance optimization.
    *   Simple token-bucket rate limiting.

## 3. Prerequisites

*   **C++ Compiler:** C++17 compatible (e.g., GCC 9+, Clang 9+, MSVC 2019+).
*   **CMake:** Version 3.16 or higher.
*   **Vcpkg:** C++ package manager.
    *   [Installation Guide](https://vcpkg.io/en/getting-started.html)
*   **Docker & Docker Compose:** For containerized development and deployment.
*   **Git:** For cloning the repository.
*   **SQLite Client:** (Optional, for inspecting the DB)

## 4. Setup and Installation

### Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/task-management-api.git
    cd task-management-api
    ```

2.  **Install C++ Dependencies using Vcpkg:**
    Vcpkg will automatically download and build the required libraries (`crow`, `nlohmann/json`, `sqlite3`, `jwt-cpp`, `spdlog`, `cryptopp`, `googletest`). This might take some time on the first run.
    ```bash
    # For Linux/macOS
    cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE=$(vcpkg integrate install | grep toolchain)
    # For Windows (PowerShell)
    cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE=$(vcpkg integrate install | Select-String -Pattern "toolchain")
    ```

3.  **Build the application:**
    ```bash
    cmake --build build
    ```
    This will compile the `task_management_api` executable and `task_management_api_tests` executable in the `build/` directory.

4.  **Setup Database:**
    ```bash
    ./scripts/setup_db.sh
    ```
    This script will:
    *   Create the `database/` directory.
    *   Apply `migrations/001_initial_schema.sql` to create tables.
    *   Apply `migrations/seed_data.sql` to populate with initial users and data.

5.  **Run the application:**
    ```bash
    ./build/task_management_api
    ```
    The API server will start on `http://localhost:18080` (or the port defined in `src/config/AppConfig.h`).

### Docker Setup

For a fully containerized setup, Docker is provided.

1.  **Build Docker images:**
    ```bash
    docker-compose build
    ```

2.  **Run the application with Docker Compose:**
    ```bash
    docker-compose up
    ```
    This will:
    *   Build and start the C++ API container.
    *   Run the database setup script within the container.
    *   Expose the API on `http://localhost:18080`.

3.  **Stop Docker Compose:**
    ```bash
    docker-compose down
    ```

## 5. Database Layer

The application uses SQLite for simplicity, but the `Database.h` interface is designed to be adaptable to other SQL databases.

### Schema

Defined in `migrations/001_initial_schema.sql`.

*   **`users`**: Stores user information, including roles and hashed passwords.
    ```sql
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user' NOT NULL, -- 'user' or 'admin'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    ```
*   **`projects`**: Stores project details.
    ```sql
    CREATE TABLE projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        owner_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );
    ```
*   **`tasks`**: Stores task details, linked to projects and assigned to users.
    ```sql
    CREATE TABLE tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'TODO' NOT NULL, -- 'TODO', 'IN_PROGRESS', 'DONE'
        priority TEXT DEFAULT 'MEDIUM' NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH'
        assigned_to_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE SET NULL
    );
    ```
*   **`comments`**: Stores comments made on tasks.
    ```sql
    CREATE TABLE comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    ```

### Migrations

The `scripts/setup_db.sh` script applies migration files found in the `migrations/` directory. Each `.sql` file represents a schema change. For a real production system, a more sophisticated migration tool (like `flyway`, `liquibase` or custom C++ migration framework) would manage versions.

### Seed Data

`migrations/seed_data.sql` populates the database with an initial admin user, a regular user, a project, and some tasks/comments. This is useful for development and testing.

## 6. API Documentation

The API uses JWT for authentication. All protected endpoints require a valid JWT in the `Authorization: Bearer <token>` header.

**Base URL:** `http://localhost:18080`

### Authentication

*   **`POST /auth/register`**
    *   **Description:** Register a new user.
    *   **Request Body:**
        ```json
        {
          "username": "newuser",
          "email": "newuser@example.com",
          "password": "password123"
        }
        ```
    *   **Response (201 Created):**
        ```json
        {
          "message": "User registered successfully",
          "user_id": 3
        }
        ```
*   **`POST /auth/login`**
    *   **Description:** Authenticate a user and receive a JWT.
    *   **Request Body:**
        ```json
        {
          "email": "admin@example.com",
          "password": "adminpassword"
        }
        ```
    *   **Response (200 OK):**
        ```json
        {
          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          "user": {
            "id": 1,
            "username": "admin",
            "email": "admin@example.com",
            "role": "admin"
          }
        }
        ```

### User Endpoints

Requires `Authorization: Bearer <token>`. Role-based authorization applies.

*   **`GET /users`** (Admin only)
    *   **Description:** Get a list of all users.
    *   **Response (200 OK):** `[ { "id": 1, "username": "admin", ... }, ... ]`
*   **`GET /users/{id}`** (Admin or self)
    *   **Description:** Get details of a specific user.
    *   **Response (200 OK):** `{ "id": 1, "username": "admin", ... }`
*   **`PUT /users/{id}`** (Admin or self)
    *   **Description:** Update user details. Password cannot be updated via this endpoint.
    *   **Request Body:** `{ "username": "updated_username", "email": "updated@example.com" }`
    *   **Response (200 OK):** `{ "message": "User updated successfully" }`
*   **`DELETE /users/{id}`** (Admin only)
    *   **Description:** Delete a user.
    *   **Response (200 OK):** `{ "message": "User deleted successfully" }`

### Project Endpoints

Requires `Authorization: Bearer <token>`.

*   **`POST /projects`**
    *   **Description:** Create a new project.
    *   **Request Body:** `{ "name": "New Project", "description": "Description of the project" }`
    *   **Response (201 Created):** `{ "message": "Project created successfully", "project_id": 1 }`
*   **`GET /projects`**
    *   **Description:** Get a list of all projects owned by the authenticated user.
    *   **Response (200 OK):** `[ { "id": 1, "name": "My First Project", ... }, ... ]`
*   **`GET /projects/{id}`**
    *   **Description:** Get details of a specific project.
    *   **Response (200 OK):** `{ "id": 1, "name": "My First Project", ... }`
*   **`PUT /projects/{id}`**
    *   **Description:** Update a project.
    *   **Request Body:** `{ "name": "Updated Project Name", "description": "Updated Description" }`
    *   **Response (200 OK):** `{ "message": "Project updated successfully" }`
*   **`DELETE /projects/{id}`**
    *   **Description:** Delete a project.
    *   **Response (200 OK):** `{ "message": "Project deleted successfully" }`

### Task Endpoints

Requires `Authorization: Bearer <token>`.

*   **`POST /projects/{project_id}/tasks`**
    *   **Description:** Create a new task within a project.
    *   **Request Body:** `{ "title": "Implement Feature X", "description": "Details here", "status": "TODO", "priority": "HIGH", "assigned_to_id": 2 }`
    *   **Response (201 Created):** `{ "message": "Task created successfully", "task_id": 1 }`
*   **`GET /projects/{project_id}/tasks`**
    *   **Description:** Get all tasks for a specific project.
    *   **Response (200 OK):** `[ { "id": 1, "title": "Implement Feature X", ... }, ... ]`
*   **`GET /tasks/{id}`**
    *   **Description:** Get details of a specific task.
    *   **Response (200 OK):** `{ "id": 1, "title": "Implement Feature X", ... }`
*   **`PUT /tasks/{id}`**
    *   **Description:** Update a task.
    *   **Request Body:** `{ "title": "Updated Task Title", "status": "IN_PROGRESS", "priority": "MEDIUM" }`
    *   **Response (200 OK):** `{ "message": "Task updated successfully" }`
*   **`DELETE /tasks/{id}`**
    *   **Description:** Delete a task.
    *   **Response (200 OK):** `{ "message": "Task deleted successfully" }`

### Comment Endpoints

Requires `Authorization: Bearer <token>`.

*   **`POST /tasks/{task_id}/comments`**
    *   **Description:** Add a comment to a task.
    *   **Request Body:** `{ "content": "This is a new comment." }`
    *   **Response (201 Created):** `{ "message": "Comment added successfully", "comment_id": 1 }`
*   **`GET /tasks/{task_id}/comments`**
    *   **Description:** Get all comments for a specific task.
    *   **Response (200 OK):** `[ { "id": 1, "content": "Initial comment", "user_id": 1, ... }, ... ]`
*   **`PUT /comments/{id}`**
    *   **Description:** Update a comment (only by the user who created it).
    *   **Request Body:** `{ "content": "Updated comment content." }`
    *   **Response (200 OK):** `{ "message": "Comment updated successfully" }`
*   **`DELETE /comments/{id}`**
    *   **Description:** Delete a comment (only by the user who created it or an admin).
    *   **Response (200 OK):** `{ "message": "Comment deleted successfully" }`

## 7. Testing

The project includes unit, integration, and API tests to ensure quality and correctness.

### Running Tests

```bash
./scripts/run_tests.sh
```
This script builds the test executable and runs all tests.

### Unit Tests

Located in `tests/unit/`. These tests focus on isolated components (e.g., utility functions, individual service methods without database interaction). They use Google Test.

*   `CryptoUtils_test.cpp`: Tests password hashing and verification.
*   `JwtUtils_test.cpp`: Tests JWT token creation and validation.
*   `UserService_test.cpp`: Tests business logic in `UserService` using mocked dependencies (if applicable, or in-memory data for simple cases).

### Integration Tests

Located in `tests/integration/`. These tests verify interactions between components, primarily focusing on the database layer. They use a dedicated test database to avoid interfering with development data.

*   `UserRepository_integration_test.cpp`: Tests `UserRepository` CRUD operations against a real (temporary) SQLite database.

### API Tests

Located in `tests/api/`. `run_api_tests.sh` provides a basic example of testing endpoints using `curl`. For a more robust solution, a dedicated API testing framework (like Postman/Newman, k6, or custom Python scripts) would be used.

### Performance Tests (Conceptual)

While not implemented with specific scripts, a production-ready system requires performance testing.

*   **Tools:** Apache JMeter, k6, Locust, or wrk.
*   **Metrics:**
    *   **Throughput:** Requests per second (RPS).
    *   **Latency:** Average, p90, p95, p99 response times.
    *   **Error Rate:** Percentage of failed requests.
    *   **Resource Utilization:** CPU, memory, network I/O of the server and database.
*   **Scenarios:**
    *   **Load Testing:** Simulating expected user load to check system behavior.
    *   **Stress Testing:** Exceeding normal load to find breaking points.
    *   **Soak Testing:** Sustaining average load over a long period to check for memory leaks or degradation.

## 8. Configuration

Application configuration is managed through `src/config/AppConfig.h` for compile-time constants and environment variables for sensitive or runtime-flexible settings.

*   `AppConfig.h`:
    *   `DB_PATH`: Path to the SQLite database file.
    *   `JWT_SECRET`: Secret key for signing JWT tokens.
    *   `SERVER_PORT`: HTTP server listening port.
    *   `CACHE_TTL_SECONDS`: Time-to-live for cached items.

**Environment Variables:**
For Docker and CI/CD, these values are typically passed as environment variables.
*   `APP_ENV`: (e.g., `development`, `test`, `production`) can influence logging levels or DB paths.
*   `JWT_SECRET`: Essential for production.
*   `DATABASE_URL`: Could be used for external databases (e.g., `postgres://user:pass@host:port/dbname`).

## 9. Additional Features

### Authentication/Authorization (JWT)

*   **JSON Web Tokens (JWT):** Used for stateless authentication.
    *   Users log in or register, receive a JWT.
    *   Subsequent requests include the JWT in the `Authorization: Bearer <token>` header.
    *   The `AuthMiddleware` verifies the token's signature and expiration.
*   **Role-Based Access Control (RBAC):**
    *   Users have `role` (`user` or `admin`).
    *   The `AuthMiddleware` extracts the user's role from the JWT payload.
    *   Controllers then check the role to determine access rights (e.g., `GET /users` is admin-only).
*   **Implementation:** `jwt-cpp` library for token generation and validation.

### Logging and Monitoring

*   **Structured Logging:** `spdlog` is used for efficient and flexible logging.
    *   Logs are written to console (and could be configured for files or external log aggregators).
    *   Different log levels (`info`, `warn`, `error`, `debug`) are used.
*   **`LoggerMiddleware.h`:** Logs incoming requests and their processing time.
*   **Monitoring:** While full-fledged monitoring (e.g., Prometheus, Grafana) is beyond this scope, the robust logging foundation is crucial. Metrics like API response times, error rates, and resource utilization would be collected and visualized.

### Error Handling Middleware

*   **`ErrorHandler.h`:** A global middleware catches exceptions thrown by controllers or services.
*   **Custom Exceptions:** `src/shared/AppExceptions.h` defines custom exceptions (e.g., `NotFoundException`, `UnauthorizedException`, `BadRequestException`) which map to specific HTTP status codes and error messages.
*   Ensures consistent JSON error responses for the API client.

### Caching Layer

*   **`src/utils/Cache.h`:** A simple in-memory key-value cache (`std::unordered_map`) with a configurable Time-To-Live (TTL).
*   **Usage Example:** `UserService` could cache frequently accessed user profiles after their first retrieval from the database.
*   **Mechanism:** When a cache hit occurs, data is returned instantly without a database query, improving response times.
*   **Limitations:** This is a basic single-instance cache. For distributed or persistent caching, solutions like Redis or Memcached would be used.

### Rate Limiting

*   **`middleware/RateLimiter.h`:** Implements a simple fixed-window rate limiter.
*   **Mechanism:** Each IP address (or authenticated user) is allowed a certain number of requests within a defined time window. If the limit is exceeded, an `HTTP 429 Too Many Requests` error is returned.
*   **Configuration:** `AppConfig.h` defines `RATE_LIMIT_WINDOW_SECONDS` and `RATE_LIMIT_MAX_REQUESTS`.
*   **Benefits:** Protects the API from abuse, brute-force attacks, and ensures fair resource usage.

## 10. CI/CD Pipeline

A GitHub Actions workflow (`.github/workflows/ci.yml`) is provided for Continuous Integration and Continuous Deployment.

**Stages:**

1.  **Build:**
    *   Checks out the code.
    *   Installs `vcpkg`.
    *   Configures CMake with `vcpkg` toolchain.
    *   Builds the C++ application and test executables.
2.  **Test:**
    *   Runs unit and integration tests.
    *   (Optional: Runs API tests if the application can be temporarily deployed).
3.  **Docker Build & Push (on `main` branch push):**
    *   Builds the Docker image for the application.
    *   Tags the image.
    *   Pushes the image to a container registry (e.g., GitHub Container Registry, Docker Hub).

This pipeline ensures that every code change is automatically built, tested, and ready for deployment if it passes all checks.

## 11. Deployment Guide

### Docker-based Deployment

The recommended deployment method is using Docker containers for consistency and scalability.

1.  **Build and Push Docker Image (CI/CD handles this):**
    Ensure your CI/CD pipeline is set up to build and push the Docker image to a registry.

2.  **Server Setup:**
    *   Provision a Linux server (e.g., AWS EC2, DigitalOcean Droplet, Azure VM).
    *   Install Docker and Docker Compose on the server.

3.  **Environment Configuration:**
    *   Create a `.env` file on your server (e.g., `/app/.env`) or configure environment variables directly for your Docker container/orchestration tool.
    *   Crucially, set `JWT_SECRET` to a strong, random string.
    *   Consider externalizing the database (e.g., using PostgreSQL instead of SQLite) for better scalability and durability. In this case, `DB_PATH` in `AppConfig.h` would be replaced by a `DATABASE_URL` environment variable and a different `Repository` implementation.

4.  **Deployment with Docker Compose (for single server):**
    *   On the server, create a `docker-compose.prod.yml` (or similar) that uses the pre-built image from your registry.
    *   Example `docker-compose.prod.yml`:
        ```yaml
        version: '3.8'
        services:
          api:
            image: your-registry/task-management-api:latest # Replace with your image
            container_name: task_api
            restart: always
            ports:
              - "80:18080" # Map host port 80 to container port 18080
            environment:
              # Set sensitive environment variables here, or load from .env file
              - JWT_SECRET=${JWT_SECRET}
              - APP_ENV=production
            volumes:
              - /var/lib/task_management_api/data:/app/database # Persistent storage for SQLite DB
        ```
    *   Run: `docker-compose -f docker-compose.prod.yml up -d`

5.  **Scaling (beyond Docker Compose):**
    For high availability and scalability, integrate with container orchestration platforms like Kubernetes, AWS ECS, Google GKE, or Azure AKS. These platforms can manage multiple instances of your API, load balancing, and auto-scaling.

6.  **Reverse Proxy & SSL:**
    It's highly recommended to place a reverse proxy (e.g., Nginx, Caddy) in front of your Docker container.
    *   Handles SSL termination (HTTPS).
    *   Can perform load balancing if you have multiple API instances.
    *   Provides additional security features and request routing.

## 12. ALX Software Engineering Principles

This project has been developed with a strong emphasis on principles covered in ALX Software Engineering precourse materials:

*   **Programming Logic:** Clear, readable C++ code with well-defined functions and control flow structures. Algorithms like password hashing, JWT encoding/decoding, and rate limiting are implemented with careful logical design.
*   **Algorithm Design:**
    *   **Rate Limiting:** Implements a fixed-window counter algorithm for basic rate limiting.
    *   **Caching:** Uses a hash map with a time-based eviction strategy.
    *   **Data Structures:** Leverages standard C++ containers (`std::vector`, `std::string`, `std::unordered_map`) appropriately for efficiency.
*   **Technical Problem Solving:**
    *   **Modular Design:** Breaking down the complex API into smaller, manageable modules (controllers, services, repositories, models) to solve the problem systematically.
    *   **Error Handling:** Implementing custom exceptions and a global error handling middleware to provide robust and informative error responses.
    *   **Concurrency (Crow):** The `Crow` framework inherently handles network I/O concurrency, allowing the application to process multiple requests efficiently.
    *   **Security:** Addressing authentication (JWT), authorization (roles), and basic protection against common web vulnerabilities (rate limiting, secure password storage).
    *   **Testability:** Designing components to be easily testable in isolation (unit tests) and in conjunction (integration tests).
    *   **Scalability & Maintainability:** Using Docker for consistent environments, a layered architecture for easier modifications, and clear documentation.

This project serves as a robust foundation for building and deploying enterprise-grade C++ APIs.
```