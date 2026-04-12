# Enterprise-Grade C++ API Development System: Task Manager API

This project provides a comprehensive, production-ready API development system implemented in C++, focusing on a "Task Management" application. It's designed to showcase best practices in backend development, database management, testing, deployment, and documentation, adhering to ALX Software Engineering principles.

## Table of Contents
1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Technologies Used](#technologies-used)
4.  [Prerequisites](#prerequisites)
5.  [Setup and Installation](#setup-and-installation)
    *   [Local Development](#local-development)
    *   [Docker Setup](#docker-setup)
6.  [Running the Application](#running-the-application)
7.  [Database Management](#database-management)
    *   [Migrations](#migrations)
    *   [Seeding](#seeding)
8.  [Testing](#testing)
    *   [Unit Tests](#unit-tests)
    *   [Integration Tests](#integration-tests)
    *   [API Tests](#api-tests)
    *   [Performance Tests (Conceptual)](#performance-tests-conceptual)
9.  [API Documentation](#api-documentation)
10. [CI/CD](#ci-cd)
11. [Logging and Monitoring](#logging-and-monitoring)
12. [Error Handling](#error-handling)
13. [Caching](#caching)
14. [Rate Limiting](#rate-limiting)
15. [Authentication and Authorization](#authentication-and-authorization)
16. [Project Structure](#project-structure)
17. [ALX Software Engineering Focus](#alx-software-engineering-focus)
18. [Contributing](#contributing)
19. [License](#license)

## 1. Features

*   **Core Application (C++)**:
    *   Task Management functionality: Create, Read (all, by ID), Update, Delete tasks.
    *   User Management: Register, Login.
    *   Modular design with clear separation of concerns (Controllers, Services, Models, Database, Middleware).
    *   HTTP/REST API endpoints using the Pistache framework.
*   **Database Layer (SQLite)**:
    *   Schema definitions for Users and Tasks.
    *   C++-based migration system for schema evolution.
    *   C++-based seed data mechanism for initial population.
    *   Basic query optimization considerations (indexing, prepared statements).
*   **Configuration & Setup**:
    *   CMake for build management and dependency handling.
    *   Environment variables for sensitive configurations.
    *   Docker and Docker Compose for containerized development and deployment.
    *   GitHub Actions for CI/CD pipeline.
*   **Testing & Quality**:
    *   Unit tests using Google Test for core business logic (e.g., `AuthService`, `Task` model, `Cache`).
    *   Integration tests for database interactions and API endpoint validation.
    *   API tests verified via integration tests.
    *   Conceptual framework for performance testing.
*   **Documentation**:
    *   Comprehensive `README.md`.
    *   Detailed `API_DOCUMENTATION.md` (OpenAPI/Swagger style).
    *   High-level `ARCHITECTURE_DOCUMENTATION.md`.
    *   Step-by-step `DEPLOYMENT_GUIDE.md`.
*   **Additional Features**:
    *   **Authentication/Authorization**: JWT-based authentication, role-based authorization (admin/user).
    *   **Logging and Monitoring**: Custom file and console logger.
    *   **Error Handling Middleware**: Centralized exception handling, returning structured JSON error responses.
    *   **Caching Layer**: Simple in-memory cache for frequently accessed data.
    *   **Rate Limiting Middleware**: Fixed-window counter algorithm to protect API endpoints.

## 2. Architecture

The application follows a layered, modular architecture:

*   **Presentation Layer (Controllers)**: Handles HTTP requests, delegates to services, and formats responses.
*   **Business Logic Layer (Services)**: Contains the core business logic, interacts with models and the database.
*   **Data Access Layer (Models, DatabaseManager)**: Defines data structures and handles persistent storage operations.
*   **Middleware Layer**: Intercepts requests/responses for common tasks like authentication, logging, error handling, rate limiting.
*   **Utility Layer**: Common functionalities like JSON parsing, logging, caching, exception handling.

See `ARCHITECTURE_DOCUMENTATION.md` for more details.

## 3. Technologies Used

*   **Core Language**: C++17
*   **Web Framework**: [Pistache](https://pistache.io/)
*   **Database**: [SQLite3](https://www.sqlite.org/index.html)
*   **Database Wrapper**: [SQLiteC++](https://github.com/SRombauts/SQLiteCpp)
*   **JSON Handling**: [jsoncpp](https://github.com/open-source-parsers/jsoncpp)
*   **JWT**: [jwt-cpp](https://github.com/Thalhammer/jwt-cpp)
*   **Build System**: [CMake](https://cmake.org/)
*   **Testing Framework**: [Google Test](https://github.com/google/googletest)
*   **Containerization**: [Docker](https://www.docker.com/)
*   **CI/CD**: [GitHub Actions](https://github.com/features/actions)

## 4. Prerequisites

### For Local Development:

*   **C++ Compiler**: GCC (g++) or Clang (>= C++17 support)
*   **CMake**: Version 3.10 or higher
*   **Git**: For cloning the repository
*   **Libraries**:
    *   `libpistache-dev`
    *   `libsqlite3-dev`
    *   `libjsoncpp-dev`
    *   `libssl-dev` (for jwt-cpp)
    *   `libgtest-dev` (for testing)

### For Docker Development:

*   **Docker Engine**: Version 19.03 or higher
*   **Docker Compose**: Version 1.25 or higher

## 5. Setup and Installation

### Local Development

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/cpp-api-system.git
    cd cpp-api-system
    ```

2.  **Install system dependencies (Debian/Ubuntu example)**:
    ```bash
    sudo apt update
    sudo apt install -y build-essential cmake libpistache-dev libsqlite3-dev libjsoncpp-dev libssl-dev libgtest-dev
    ```
    *Note: `jwt-cpp` and `SQLiteCpp` are often included as submodules or built from source/vendored due to specific versions or integration needs. In this project, they are configured via `CMake` to be fetched or linked.*

3.  **Build the project**:
    ```bash
    mkdir build
    cd build
    cmake ..
    make
    ```
    This will compile the application and tests.

4.  **Database Setup (Local)**:
    *   The `database.db` file will be created in the `build/data` directory (or specified in `config.h`) upon first run if it doesn't exist.
    *   To run migrations and seed data:
        ```bash
        ./migrations
        ./seed
        ```
        (These are separate executables created by `CMake`).

### Docker Setup

1.  **Build Docker images**:
    ```bash
    docker-compose build
    ```

2.  **Run Docker containers**:
    ```bash
    docker-compose up -d
    ```
    This will start the API server in the background.

3.  **Database Setup (Docker)**:
    *   Once the containers are running, you can exec into the `app` container to run migrations and seeding:
        ```bash
        docker-compose exec app ./migrations
        docker-compose exec app ./seed
        ```
    *   The `database.db` will be located inside the container at `/app/data/database.db` (or as configured). A Docker volume is used to persist this data.

## 6. Running the Application

### Local

From the `build` directory:
```bash
./api_server
```
The API will be available at `http://localhost:9080`.

### Docker

If running with `docker-compose up -d`, the application is already running.
The API will be available at `http://localhost:9080` (port mapped from container).

## 7. Database Management

The project uses SQLite and provides C++-based scripts for managing the database schema.

### Migrations

Migrations are C++ programs that apply schema changes to the database. They ensure the database schema is up-to-date.

To run migrations:
```bash
# Local
./build/migrations

# Docker
docker-compose exec app ./migrations
```
Migrations are designed to be idempotent (safe to run multiple times).

### Seeding

Seeding populates the database with initial data (e.g., a default admin user, sample tasks).

To run seeders:
```bash
# Local
./build/seed

# Docker
docker-compose exec app ./seed
```
Seeding is also designed to be idempotent.

## 8. Testing

The project uses [Google Test](https://github.com/google/googletest) for unit and integration testing.

### To run tests:

From the `build` directory:
```bash
./run_tests
```
This executable runs all defined unit and integration tests.

### Unit Tests

Focus on individual components and their logic in isolation (e.g., `AuthService` functions, `Task` model data handling, `Cache` operations). Aim for 80%+ code coverage for core business logic.

*   `tests/unit/test_auth_service.cpp`
*   `tests/unit/test_task_model.cpp`
*   `tests/unit/test_cache.cpp`

### Integration Tests

Verify interactions between multiple components, especially with the database or simulated API calls.

*   `tests/integration/test_database.cpp`: Tests database connection, CRUD operations through `DatabaseManager`.
*   `tests/integration/test_api_tasks.cpp`: Simulates HTTP requests to API endpoints to verify full request-response cycles, including middleware and database interaction.

### API Tests

API tests are covered as part of the integration tests by simulating HTTP requests and validating responses. Tools like `curl` can be used manually to test endpoints.

**Example `curl` commands (after running the server):**

```bash
# Register a user
curl -X POST -H "Content-Type: application/json" -d '{"username": "testuser", "password": "password", "role": "user"}' http://localhost:9080/auth/register

# Login a user
curl -X POST -H "Content-Type: application/json" -d '{"username": "testuser", "password": "password"}' http://localhost:9080/auth/login
# (Save the 'token' from the response)

# Create a task (requires token)
TOKEN="YOUR_JWT_TOKEN"
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"title": "Buy groceries", "description": "Milk, eggs, bread", "status": "pending", "due_date": "2023-12-31"}' http://localhost:9080/tasks

# Get all tasks (requires token)
curl -X GET -H "Authorization: Bearer $TOKEN" http://localhost:9080/tasks

# Get task by ID (requires token)
TASK_ID="1" # Replace with actual task ID
curl -X GET -H "Authorization: Bearer $TOKEN" http://localhost:9080/tasks/$TASK_ID

# Update a task (requires token)
curl -X PUT -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"title": "Buy groceries", "description": "Milk, eggs, bread, coffee", "status": "completed", "due_date": "2023-12-31"}' http://localhost:9080/tasks/$TASK_ID

# Delete a task (requires token)
curl -X DELETE -H "Authorization: Bearer $TOKEN" http://localhost:9080/tasks/$TASK_ID
```

### Performance Tests (Conceptual)

For performance testing, you would typically use tools like:
*   **ApacheBench (ab)**: Simple tool for measuring HTTP server performance.
*   **JMeter**: More advanced, allows for complex test plans, multi-threaded load, and detailed reporting.
*   **k6**: Modern load testing tool that uses JavaScript for scripting.

**Example with ApacheBench:**
```bash
# Test 100 requests, 10 concurrent requests to a GET endpoint
ab -n 100 -c 10 http://localhost:9080/tasks
```
Performance tests would involve setting up realistic load scenarios and monitoring server metrics (CPU, memory, response times) to identify bottlenecks.

## 9. API Documentation

Comprehensive API documentation, including endpoints, request/response formats, authentication requirements, and error codes, is available in `API_DOCUMENTATION.md`. This documentation follows an OpenAPI/Swagger-like specification.

## 10. CI/CD

The project includes a basic GitHub Actions workflow (`.github/workflows/ci.yml`) for Continuous Integration.
This pipeline automates:
1.  **Build**: Compiles the C++ application and tests.
2.  **Test**: Runs all unit and integration tests.
3.  **Lint/Format Check**: (Placeholder, can be extended with `clang-format` or similar).

Upon successful completion, the application could be deployed using Continuous Deployment steps (e.g., pushing Docker images to a registry, deploying to a cloud service).

## 11. Logging and Monitoring

A custom `Logger` utility is implemented to provide structured logging to both console and a file (`logs/app.log`). Log levels (DEBUG, INFO, WARN, ERROR) are supported. For production, this could be integrated with external monitoring tools (e.g., Prometheus, Grafana, ELK stack).

## 12. Error Handling

A centralized `ErrorHandler` middleware intercepts exceptions thrown by the application logic. It transforms these exceptions into standardized JSON error responses, providing consistent feedback to API consumers. Custom exception types are defined for specific error scenarios (e.g., `NotFoundException`, `UnauthorizedException`).

## 13. Caching

A simple in-memory `Cache` layer is implemented using `std::unordered_map`. It's used to store frequently accessed but less frequently changing data (e.g., user roles, configuration settings) to reduce database load and improve response times.

## 14. Rate Limiting

A `RateLimiter` middleware is implemented to protect API endpoints from abuse. It uses a fixed-window counter algorithm to limit the number of requests a client can make within a specified time window. This helps prevent denial-of-service attacks and ensures fair usage.

## 15. Authentication and Authorization

*   **Authentication**: Implemented using JSON Web Tokens (JWT).
    *   Users register and log in to receive a JWT.
    *   This token must be included in the `Authorization` header (`Bearer <token>`) for protected routes.
    *   A `JwtMiddleware` verifies the token's validity and extracts user information.
*   **Authorization**: Role-based access control (RBAC) is implemented.
    *   Users can have roles like "user" or "admin".
    *   API endpoints can specify required roles. If a user's role does not match, an `UnauthorizedException` is thrown.
    *   Example: Deleting a task might require an "admin" role.

## 16. Project Structure

```
.
├── CMakeLists.txt              # Top-level CMake configuration
├── config/                     # Configuration files
│   ├── config.h                # General application configuration
│   └── .env.example            # Example for environment variables
├── src/                        # Source code for the application
│   ├── main.cpp                # Entry point of the application
│   ├── app.h / app.cpp         # Main application class, sets up server
│   ├── auth/                   # Authentication related components
│   │   ├── auth_service.h/cpp  # Business logic for auth (register, login)
│   │   └── jwt_middleware.h    # Middleware for JWT verification
│   ├── controllers/            # Handles HTTP requests, maps to services
│   │   ├── auth_controller.h/cpp
│   │   └── task_controller.h/cpp
│   ├── database/               # Database interaction layer
│   │   ├── database_manager.h/cpp # Manages DB connection, CRUD helpers
│   │   ├── migrations.cpp      # Executable for applying schema migrations
│   │   └── seed.cpp            # Executable for seeding initial data
│   ├── models/                 # Data structures (Task, User)
│   │   ├── task.h/cpp
│   │   └── user.h/cpp
│   ├── middleware/             # HTTP middleware components
│   │   ├── error_handler.h/cpp # Centralized error handling
│   │   ├── rate_limiter.h/cpp  # Request rate limiting
│   ├── utils/                  # General utility functions and classes
│   │   ├── logger.h/cpp        # Custom logging utility
│   │   ├── json_util.h         # Helper for JSON conversions
│   │   ├── exceptions.h        # Custom exception types
│   │   └── cache.h/cpp         # Simple in-memory cache
│   └── server.h/cpp            # HTTP server setup (Pistache wrapper)
├── tests/                      # Test suite (unit, integration)
│   ├── CMakeLists.txt          # CMake for tests
│   ├── unit/                   # Unit tests
│   │   ├── test_auth_service.cpp
│   │   ├── test_task_model.cpp
│   │   └── test_cache.cpp
│   ├── integration/            # Integration tests
│   │   ├── test_database.cpp
│   │   └── test_api_tasks.cpp
│   └── main_test.cpp           # Test runner entry point
├── build/                      # Build output directory (created by CMake)
├── data/                       # Directory for persistent data (e.g., database.db)
├── logs/                       # Directory for application logs
├── Dockerfile                  # Docker build instructions
├── docker-compose.yml          # Docker Compose configuration
├── .github/                    # GitHub Actions workflows
│   └── workflows/
│       └── ci.yml              # CI pipeline definition
├── .gitignore                  # Git ignore rules
├── API_DOCUMENTATION.md        # Comprehensive API reference
├── ARCHITECTURE_DOCUMENTATION.md # Project architecture overview
├── DEPLOYMENT_GUIDE.md         # Guide for deploying the application
└── requirements.txt            # Placeholder for Python-style dependency list (Not used for C++ build)
```

## 17. ALX Software Engineering Focus

This project directly addresses several key aspects emphasized in ALX Software Engineering precourse materials:

*   **Programming Logic**: Evident in the implementation of business rules (e.g., task status transitions), authentication flows, and data validation.
*   **Algorithm Design**: Demonstrated in the `RateLimiter` middleware (fixed-window counter algorithm) and the efficient data retrieval patterns in `DatabaseManager`.
*   **Technical Problem Solving**:
    *   **Resource Management**: Proper handling of database connections and memory.
    *   **Concurrency**: Pistache handles threading for requests, but careful design of shared resources (like `Cache`, `DatabaseManager`) is crucial.
    *   **Error Handling**: Robust, centralized exception management for graceful degradation.
    *   **Security**: Implementation of JWT for secure authentication and authorization.
    *   **Modularity**: Breaking down the system into distinct, manageable components (`controllers`, `services`, `models`, `middleware`, `utils`).
    *   **Testing**: Emphasizing different levels of testing (unit, integration) to ensure correctness and reliability.
    *   **Documentation**: Providing clear and comprehensive documentation for all aspects of the project.

The entire design promotes understanding complex systems by breaking them into smaller, interconnected, and testable parts, which is fundamental to robust software engineering.

## 18. Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature`).
3.  Make your changes.
4.  Write tests for your changes.
5.  Ensure all tests pass.
6.  Commit your changes (`git commit -am 'Add new feature'`).
7.  Push to the branch (`git push origin feature/your-feature`).
8.  Create a new Pull Request.

## 19. License

This project is licensed under the MIT License - see the LICENSE file for details. (For brevity, LICENSE file content is not included in this response, but would be present in a real project).
```