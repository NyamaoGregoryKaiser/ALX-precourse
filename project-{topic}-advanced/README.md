```markdown
# ALX Project Management API (C++ Edition)

A comprehensive, production-ready API for managing projects, tasks, and users. This project demonstrates a full-scale C++ backend application with modern software engineering practices, including database management, authentication, authorization, logging, caching, rate limiting, Dockerization, and CI/CD.

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Setup & Installation](#setup--installation)
    - [Prerequisites](#prerequisites)
    - [Local Development Setup](#local-development-setup)
    - [Docker Setup](#docker-setup)
- [Running the Application](#running-the-application)
- [Database Management](#database-management)
- [API Documentation](#api-documentation)
    - [Authentication](#authentication)
    - [Users](#users)
    - [Projects](#projects)
    - [Tasks](#tasks)
- [Testing](#testing)
- [Deployment Guide](#deployment-guide)
- [CI/CD Pipeline](#cicd-pipeline)
- [Additional Features](#additional-features)
- [License](#license)

---

## Project Overview

This API provides a robust backend for a Project Management system. It allows users to:
- Register and authenticate (JWT-based).
- Manage their profile.
- Create, view, update, and delete projects.
- Create, assign, update, and delete tasks within projects.
- Admins have elevated privileges to manage all users and projects.

## Architecture

The application follows a layered architecture pattern (Controller-Service-Repository/DatabaseManager) to ensure separation of concerns, maintainability, and testability.

```
+------------------+
|    Client Apps   |
+--------+---------+
         | HTTP/JSON
+--------v---------+
|     Crow App     |
| (Web Framework)  |
+------------------+
|  RateLimitMW     |
|  AuthMiddleware  |
+------------------+
|  Controllers     | <-------- HTTP Requests
|  (Auth, User,    |          (Routing, Input Validation, AuthZ)
|   Project, Task) |
+--------+---------+
         |
+--------v---------+
|     Services     | <-------- Business Logic, Data Orchestration
|  (Auth, User,    |
|   Project, Task) |
+--------+---------+
         |
+--------v---------+
|  Database Layer  | <-------- Data Access (CRUD)
|  (SQLiteManager) |
+--------+---------+
         | SQLite
+--------v---------+
|   SQLite DB      |
+------------------+

[Utils/Shared]
- Logger
- JWTManager
- CachingManager
- PasswordUtils
- JSONConverter
- ErrorHandler
- CustomExceptions
- AppConfig
```

**Key Architectural Decisions:**
-   **C++ for Backend:** Chosen for performance, memory control, and to demonstrate proficiency in system-level programming.
-   **Crow Microframework:** Lightweight and efficient for building RESTful APIs in C++.
-   **SQLite:** Chosen for its simplicity and file-based nature, making setup easy for development and testing without requiring an external database server. For production, a more robust database like PostgreSQL or MySQL would be recommended.
-   **Dependency Injection (Manual):** Services and managers are explicitly passed to controllers and other services, promoting loose coupling and testability.
-   **Middleware Pattern:** Authentication and Rate Limiting are implemented as Crow middleware to apply cross-cutting concerns cleanly.
-   **Nlohmann/json:** A modern C++ library for JSON serialization/deserialization.

## Features

-   **User Management:**
    -   Registration, Login (JWT-based authentication).
    -   User profile retrieval, update, deletion (admin-only for others).
    -   Role-based access control (User, Admin).
-   **Project Management:**
    -   CRUD operations for projects.
    -   Project ownership tracking.
-   **Task Management:**
    -   CRUD operations for tasks.
    -   Assign tasks to projects and users.
    -   Task status tracking (TODO, IN_PROGRESS, DONE).
-   **Security:**
    -   JWT-based Authentication.
    -   Role-based Authorization.
    -   Basic password hashing (placeholder for Argon2/Bcrypt).
-   **API Utilities:**
    -   Structured Logging.
    -   Centralized Error Handling.
    -   In-memory Caching.
    -   Request Rate Limiting.
-   **Database:**
    -   SQLite database.
    -   Schema definitions.
    -   Migration scripts (`db/migrations`).
    -   Seed data (`db/seed`).
-   **Deployment:**
    -   Dockerized application.
    -   `Dockerfile` and `docker-compose.yml` for easy setup.
-   **Quality:**
    -   Unit and Integration tests using Google Test.
    -   CI/CD pipeline configuration (GitHub Actions).

## Technology Stack

-   **Backend:** C++17
-   **Web Framework:** [Crow](https://github.com/ipkn/crow)
-   **JSON Library:** [nlohmann/json](https://github.com/nlohmann/json)
-   **JWT Library:** [jwt-cpp](https://github.com/Thalhammer/jwt-cpp)
-   **Database:** [SQLite3](https://www.sqlite.org/index.html)
-   **Build System:** CMake
-   **Testing Framework:** [Google Test](https://github.com/google/googletest)
-   **Containerization:** Docker
-   **CI/CD:** GitHub Actions

## Setup & Installation

### Prerequisites

*   A C++17 compatible compiler (e.g., GCC 9+ or Clang 9+).
*   CMake (version 3.10 or higher).
*   Git.
*   `libsqlite3-dev` (or equivalent for your OS).
*   Docker and Docker Compose (if using containerized setup).

**Install SQLite3 development files (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install libsqlite3-dev
```

### Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/alx-project-management-api.git
    cd alx-project-management-api
    ```

2.  **Install Crow Framework:**
    Crow is fetched by CMake using `FetchContent` in some cases (like nlohmann/json and jwt-cpp), but for Crow itself, it's often easiest to clone it into a known location or install it system-wide.
    For this setup, the `CMakeLists.txt` and `Dockerfile` assume it's available at `/usr/local/include/crow` or similar.
    ```bash
    sudo git clone https://github.com/ipkn/crow.git /usr/local/include/crow
    # Alternatively, you might just build it from source and install.
    ```

3.  **Create `.env` file:**
    Copy the example environment file and adjust as needed.
    ```bash
    cp .env.example ./.env
    # Open ./.env and modify values if necessary, especially `JWT_SECRET`
    ```

4.  **Build the application:**
    ```bash
    mkdir build
    cd build
    cmake .. -DCROW_INCLUDE_DIR=/usr/local/include/crow -DJSON_EXTERNAL_BUILD=ON -DJWT_CPP_EXTERNAL_BUILD=ON
    make
    ```
    *(Note: `DCROW_INCLUDE_DIR` might be adjusted based on where you cloned Crow. If it's system-installed, you might not need this flag.)*

5.  **Initialize the Database:**
    The `init_db` executable will create tables and seed initial data.
    ```bash
    ./init_db
    ```

### Docker Setup

1.  **Build the Docker image:**
    ```bash
    docker-compose build
    ```

2.  **Run the application with Docker Compose:**
    ```bash
    docker-compose up -d
    ```
    This will start the API container, create a persistent volume for the database (`./data/db`) and logs (`./data/logs`), and expose port `18080`. The database will be initialized automatically on container startup (check logs for confirmation).

## Running the Application

**Locally (after building):**
```bash
cd build
./ALXProjectManagementAPI
```
The API will start on the port specified in your `.env` file (default: `18080`).

**With Docker (after `docker-compose up -d`):**
The API will be running in the background. You can check its logs:
```bash
docker-compose logs -f api
```
Access the API at `http://localhost:18080`.

## Database Management

The database is SQLite, stored at `db/alx_project_management.db` (or `data/db/alx_project_management.db` when using Docker Compose).

-   **Migrations:** SQL scripts in `db/migrations/`.
-   **Seed Data:** SQL script in `db/seed/`.
-   **Initialization:** The `scripts/init_db.cpp` utility handles applying migrations and seed data. It's run automatically by Docker Compose `ENTRYPOINT`. If running locally, you must run `./init_db` from the `build` directory before running the API.

**Query Optimization:**
-   Indexes are defined on common lookup fields (`username`, `email`, `owner_id`, `project_id`, `assigned_user_id`, `status`).
-   Foreign key constraints are enabled (`PRAGMA foreign_keys = ON;`) to ensure data integrity.
-   `ON DELETE CASCADE` and `ON DELETE SET NULL` rules are used for relationships.
-   Triggers are added to automatically update `updated_at` timestamps.

## API Documentation

The API adheres to RESTful principles and returns JSON responses.

**Base URL:** `http://localhost:18080/api/v1`

### Authentication

**1. Register User**
-   **URL:** `/api/v1/auth/register`
-   **Method:** `POST`
-   **Body:**
    ```json
    {
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "securepassword123"
    }
    ```
-   **Response (201 Created):**
    ```json
    {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "user": {
            "id": 1,
            "username": "newuser",
            "email": "newuser@example.com",
            "role": "USER"
        }
    }
    ```
-   **Example `curl`:**
    ```bash
    curl -X POST http://localhost:18080/api/v1/auth/register \
         -H "Content-Type: application/json" \
         -d '{"username": "testuser", "email": "test@example.com", "password": "password123"}'
    ```

**2. Login User**
-   **URL:** `/api/v1/auth/login`
-   **Method:** `POST`
-   **Body:**
    ```json
    {
        "username": "testuser",
        "password": "password123"
    }
    ```
-   **Response (200 OK):** (Same as register response, including JWT token)
-   **Example `curl`:**
    ```bash
    curl -X POST http://localhost:18080/api/v1/auth/login \
         -H "Content-Type: application/json" \
         -d '{"username": "testuser", "password": "password123"}'
    ```
    *Save the `token` from the response to use in subsequent authenticated requests via `Authorization: Bearer <token>` header.*

### Users

**Authentication Required**

**1. Get All Users (Admin Only)**
-   **URL:** `/api/v1/users`
-   **Method:** `GET`
-   **Response (200 OK):**
    ```json
    [
        { "id": 1, "username": "admin", "email": "admin@example.com", "role": "ADMIN" },
        { "id": 2, "username": "john.doe", "email": "john.doe@example.com", "role": "USER" }
    ]
    ```
-   **Example `curl`:**
    ```bash
    # Replace <ADMIN_TOKEN> with a valid JWT token for an admin user
    curl -X GET http://localhost:18080/api/v1/users \
         -H "Authorization: Bearer <ADMIN_TOKEN>"
    ```

**2. Create User (Admin Only)**
-   **URL:** `/api/v1/users`
-   **Method:** `POST`
-   **Body:** (Same as register, optionally include `"role": "ADMIN"|"USER"`)
    ```json
    {
        "username": "newadmin",
        "email": "newadmin@example.com",
        "password": "adminpassword",
        "role": "ADMIN"
    }
    ```
-   **Response (201 Created):** (User object)

**3. Get User by ID (Admin or Self)**
-   **URL:** `/api/v1/users/:id`
-   **Method:** `GET`
-   **Response (200 OK):** (Single User object)
-   **Example `curl`:**
    ```bash
    # Replace <USER_TOKEN> with a valid JWT token (can be admin or the user themselves)
    curl -X GET http://localhost:18080/api/v1/users/1 \
         -H "Authorization: Bearer <USER_TOKEN>"
    ```

**4. Update User by ID (Admin or Self)**
-   **URL:** `/api/v1/users/:id`
-   **Method:** `PUT`
-   **Body:** (Any combination of `username`, `email`, `password`, `role`. Non-admin users cannot change `role`.)
    ```json
    {
        "username": "updated_username",
        "email": "updated@example.com"
        // "password": "newpassword",
        // "role": "ADMIN" (Admin only)
    }
    ```
-   **Response (200 OK):** (Updated User object)

**5. Delete User by ID (Admin Only)**
-   **URL:** `/api/v1/users/:id`
-   **Method:** `DELETE`
-   **Response (204 No Content)**

### Projects

**Authentication Required**

**1. Get All Projects**
-   **URL:** `/api/v1/projects`
-   **Method:** `GET`
-   **Response (200 OK):** Array of Project objects.
-   **Example `curl`:**
    ```bash
    # Replace <USER_TOKEN> with a valid JWT token
    curl -X GET http://localhost:18080/api/v1/projects \
         -H "Authorization: Bearer <USER_TOKEN>"
    ```

**2. Create Project**
-   **URL:** `/api/v1/projects`
-   **Method:** `POST`
-   **Body:**
    ```json
    {
        "name": "New Project Name",
        "description": "A detailed description of the new project.",
        "owner_id": 1 // Optional. If omitted, authenticated user is owner. Admin can specify any owner.
    }
    ```
-   **Response (201 Created):** (New Project object)

**3. Get Project by ID**
-   **URL:** `/api/v1/projects/:id`
-   **Method:** `GET`
-   **Response (200 OK):** (Single Project object)

**4. Update Project by ID (Owner or Admin Only)**
-   **URL:** `/api/v1/projects/:id`
-   **Method:** `PUT`
-   **Body:** (Any combination of `name`, `description`, `owner_id`. Admin only to change `owner_id` or set to `null`.)
    ```json
    {
        "name": "Updated Project Name",
        "description": "The description has been changed.",
        "owner_id": 2 // Admin only, or set to null with admin privileges
    }
    ```
-   **Response (200 OK):** (Updated Project object)

**5. Delete Project by ID (Owner or Admin Only)**
-   **URL:** `/api/v1/projects/:id`
-   **Method:** `DELETE`
-   **Response (204 No Content)**

### Tasks

**Authentication Required**

**1. Get All Tasks**
-   **URL:** `/api/v1/tasks`
-   **Method:** `GET`
-   **Response (200 OK):** Array of Task objects.

**2. Get Tasks by Project ID**
-   **URL:** `/api/v1/projects/:projectId/tasks`
-   **Method:** `GET`
-   **Response (200 OK):** Array of Task objects belonging to the specified project.

**3. Create Task for a Project (Project Owner or Admin Only)**
-   **URL:** `/api/v1/projects/:projectId/tasks`
-   **Method:** `POST`
-   **Body:**
    ```json
    {
        "title": "Implement Feature X",
        "description": "Details about implementing feature X.",
        "status": "TODO", // Optional, defaults to "TODO". Can be "IN_PROGRESS", "DONE".
        "assigned_user_id": 2 // Optional. User must exist. Set to null to unassign.
    }
    ```
-   **Response (201 Created):** (New Task object)

**4. Get Task by ID**
-   **URL:** `/api/v1/tasks/:id`
-   **Method:** `GET`
-   **Response (200 OK):** (Single Task object)

**5. Update Task by ID (Project Owner or Admin Only)**
-   **URL:** `/api/v1/tasks/:id`
-   **Method:** `PUT`
-   **Body:** (Any combination of `title`, `description`, `status`, `assigned_user_id`, `project_id`. `project_id` update requires privileges on both old and new projects.)
    ```json
    {
        "title": "Revised Task Title",
        "status": "IN_PROGRESS",
        "assigned_user_id": 3 // Or set to null to unassign
    }
    ```
-   **Response (200 OK):** (Updated Task object)

**6. Delete Task by ID (Project Owner or Admin Only)**
-   **URL:** `/api/v1/tasks/:id`
-   **Method:** `DELETE`
-   **Response (204 No Content)**

---

## Testing

The project uses [Google Test](https://github.com/google/googletest) for unit and integration testing.

**Running Tests Locally:**

1.  **Build the project** (if you haven't already from [Local Development Setup](#local-development-setup)).
2.  Navigate to the `build` directory:
    ```bash
    cd build
    ```
3.  **Run the tests:**
    ```bash
    ./run_tests
    ```
    This will execute all unit and integration tests. Test coverage is aimed for 80%+, focusing on core logic, database interactions, and utility functions.

**Test Coverage:**
-   **AuthService:** Registration, login, duplicate checks, password verification.
-   **JWTManager:** Token generation, validation, expiry.
-   **SQLiteDatabaseManager:** Full CRUD operations for Users, Projects, Tasks; foreign key constraints; migration execution.
-   **CachingManager:** Set, get, remove, expiry logic.
-   **UserService, ProjectService, TaskService:** Business logic, validation, error handling.
-   **Integration Tests:** User registration -> Project creation -> Task assignment, Admin management.

## Deployment Guide

This guide assumes you have a server with Docker installed.

1.  **Prepare your server:**
    Ensure your server has Docker and Docker Compose installed.

2.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/alx-project-management-api.git
    cd alx-project-management-api
    ```

3.  **Configure `.env` for production:**
    Edit the `.env` file for production environment. **Crucially, change `JWT_SECRET` to a very strong, unique secret.** Adjust `LOG_LEVEL` to `INFO` or `WARNING` for production, `DATABASE_PATH` might point to a specific persistent volume.

4.  **Create persistent data directories:**
    Ensure the directories for your database and logs exist and have proper permissions. The `docker-compose.yml` maps `./data/db` and `./data/logs` to `/app/db` and `/app/logs` inside the container.
    ```bash
    mkdir -p data/db data/logs
    ```

5.  **Build and Run with Docker Compose:**
    ```bash
    docker-compose -f docker-compose.yml up -d --build
    ```
    -   `-f docker-compose.yml`: Specifies the Compose file.
    -   `up`: Creates and starts containers.
    -   `-d`: Runs containers in detached mode (in the background).
    -   `--build`: Rebuilds images even if they already exist, ensuring you have the latest code.

6.  **Verify Deployment:**
    Check if the container is running:
    ```bash
    docker ps
    ```
    View logs:
    ```bash
    docker-compose logs -f api
    ```
    Access the health endpoint: `http://your_server_ip:18080/health`

## CI/CD Pipeline

The project includes a GitHub Actions workflow (`.github/workflows/ci-cd.yml`) that defines a Continuous Integration/Continuous Deployment pipeline.

**Pipeline Steps:**

1.  **`build-and-test` Job:**
    -   Triggered on `push` to `main` or `develop` and `pull_request` to `main` or `develop`.
    -   Checks out code.
    -   Installs system dependencies (SQLite, CMake, Git).
    -   Clones Crow framework.
    -   Configures and builds the C++ application using CMake.
    -   **Runs Unit and Integration Tests** using `run_tests` executable, configuring a temporary database for testing.
    -   Uploads test results as an artifact.

2.  **`build-docker-image` Job:**
    -   **Depends on `build-and-test`** (only runs if tests pass).
    -   Logs into Docker Hub using secrets.
    -   Builds the Docker image for the application.
    -   Verifies the image build.
    -   *(Note: This job does not `push` to Docker Hub directly; the `deploy` job handles that.)*

3.  **`deploy` Job:**
    -   **Depends on `build-docker-image`** (only runs if the image builds successfully).
    -   **Conditional:** Only runs on `push` to the `main` branch.
    -   Logs into Docker Hub.
    -   Builds and **pushes** the Docker image to Docker Hub (e.g., `your_docker_username/alx-project-management-api:latest`).
    -   **Deploys to a remote server via SSH:** (This is an example placeholder). It pulls the latest image, stops and removes the old container, and starts a new one with persistent volumes and environment variables.
    -   **Secrets Used:** `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `SSH_HOST`, `SSH_USERNAME`, `SSH_PRIVATE_KEY`, `PROD_JWT_SECRET`. These must be configured in your GitHub repository's `Settings -> Secrets -> Actions`.

## Additional Features

-   **Authentication/Authorization:** JWT-based authentication for secure API access. Role-based authorization (`USER`, `ADMIN`) restricts access to certain endpoints and operations. Implemented via `AuthMiddleware`.
-   **Logging and Monitoring:** Integrated `Logger` utility provides structured logging to console and file, with configurable log levels (`DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`).
-   **Error Handling Middleware:** Custom exception hierarchy (`CustomExceptions.hpp`) and a generic `try_catch_handler` (within `ErrorHandler.hpp`) catch exceptions in controllers and return standardized JSON error responses with appropriate HTTP status codes.
-   **Caching Layer:** An in-memory `CachingManager` (using `std::unordered_map`) is provided for fast retrieval of frequently accessed data (e.g., user profiles or configuration settings). Configurable TTL for cached items.
-   **Rate Limiting:** Implemented with `RateLimiter` and `RateLimitMiddleware` to prevent abuse by limiting the number of requests a single client (identified by IP address) can make within a specified time window.

---

## License

This project is open-source and available under the [MIT License](LICENSE).
```