# Mobile Backend System (C++ with Drogon)

This repository contains a comprehensive, production-ready backend system for a mobile application, built using C++ and the Drogon web framework. It demonstrates an enterprise-grade architecture with multiple modules, full CRUD APIs, authentication, database management, testing, and deployment configurations.

## Table of Contents

1.  [Features](#features)
2.  [Technologies Used](#technologies-used)
3.  [Project Structure](#project-structure)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Development (without Docker)](#local-development-without-docker)
    *   [Docker Compose (Recommended)](#docker-compose-recommended)
5.  [Running the Application](#running-the-application)
6.  [Testing](#testing)
    *   [Unit Tests](#unit-tests)
    *   [Integration Tests](#integration-tests)
    *   [API Tests](#api-tests)
    *   [Performance Tests](#performance-tests)
7.  [API Documentation](#api-documentation)
8.  [Architecture](#architecture)
9.  [Deployment](#deployment)
10. [CI/CD](#cicd)
11. [Logging and Monitoring](#logging-and-monitoring)
12. [Error Handling](#error-handling)
13. [Caching](#caching)
14. [Rate Limiting](#rate-limiting)
15. [Contributing](#contributing)
16. [License](#license)

## 1. Features

*   **User Management**: Register, Login, Get Profile, (Admin) CRUD for users.
*   **Product Catalog**: View all products, view single product, (Admin) CRUD for products, update product stock.
*   **Order Processing**: Create orders, view user's orders, cancel orders, (Admin) update order status, (Admin) delete orders.
*   **Authentication & Authorization**: JWT-based authentication, role-based authorization (user/admin).
*   **Database Integration**: PostgreSQL with detailed schema, migrations, and seed data.
*   **Configuration Management**: External JSON configuration.
*   **Logging**: Structured logging with `spdlog`.
*   **Caching**: Redis integration for high-speed data retrieval.
*   **Robust Error Handling**: Standardized API error responses.
*   **Containerization**: Docker and Docker Compose for easy setup and deployment.
*   **Testing**: Unit, Integration, and API tests using Catch2.
*   **CI/CD**: Basic GitHub Actions workflow.

## 2. Technologies Used

*   **Backend**: C++17
*   **Web Framework**: [Drogon](https://github.com/drogonframework/drogon)
*   **Database**: [PostgreSQL](https://www.postgresql.org/)
*   **Caching**: [Redis](https://redis.io/)
*   **JSON Handling**: [jsoncpp](https://github.com/open-source-parsers/jsoncpp) (integrated with Drogon)
*   **JWT**: [jwt-cpp](https://github.com/Thalhammer/jwt-cpp)
*   **Logging**: [spdlog](https://github.com/gabime/spdlog)
*   **Testing**: [Catch2](https://github.com/catchorg/Catch2)
*   **Build System**: CMake
*   **Containerization**: Docker, Docker Compose

## 3. Project Structure

```
.
├── CMakeLists.txt          # Main CMake configuration for the project
├── docker-compose.yml      # Defines multi-container Docker application
├── Dockerfile              # Docker build instructions for the C++ backend
├── .gitignore              # Git ignore file
├── .github                 # GitHub Actions CI/CD workflows
│   └── workflows
│       └── ci.yml
├── config
│   └── app_config.json     # Application configuration (DB creds, JWT secret, etc.)
├── database
│   ├── schema.sql          # SQL DDL for database schema
│   └── seed.sql            # SQL INSERT statements for initial data
├── docs                    # Project documentation
│   ├── README.md           # This file
│   ├── api.md              # API endpoint specifications and examples
│   ├── architecture.md     # High-level architecture overview
│   └── deployment.md       # Deployment guide
├── src                     # Core application source code
│   ├── main.cc             # Application entry point, Drogon setup
│   ├── controllers         # API endpoint handlers (e.g., AuthController, UserController)
│   ├── middleware          # HTTP middleware (e.g., AuthMiddleware, ErrorHandler)
│   ├── models              # Data Transfer Objects (DTOs) and data structures
│   ├── repositories        # Database interaction logic (CRUD operations)
│   ├── services            # Business logic and orchestration
│   └── utils               # Utility classes (e.g., AppConfig, JwtManager, CryptoUtils, RedisManager)
└── tests                   # Unit and integration tests
    ├── CMakeLists.txt      # CMake configuration for tests
    ├── unit                # Unit tests for individual components
    └── integration         # Integration tests (e.g., repository interactions with DB)
```

## 4. Setup and Installation

### Prerequisites

*   **Git**: For cloning the repository.
*   **Docker & Docker Compose**: (Recommended) For easy setup of the backend, database, and Redis.
*   **C++ Development Tools**: (If not using Docker for development)
    *   CMake (>= 3.10)
    *   C++17 capable compiler (g++ or clang++)
    *   Drogon (v1.8.0 or later)
    *   jwt-cpp
    *   jsoncpp
    *   spdlog
    *   hiredis (Redis client library)
    *   libpq (PostgreSQL client library)

### Local Development (without Docker)

**Note**: This method requires manual installation and management of all dependencies (Drogon, PostgreSQL, Redis, etc.), which can be complex. Docker Compose is highly recommended.

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/mobile-backend.git
    cd mobile-backend
    ```
2.  **Install Drogon and other C++ dependencies**:
    Follow Drogon's official installation guide ([Drogon Docs](https://drogon.org/doc/index.html)) for your OS. Ensure you also install `jwt-cpp`, `spdlog`, `jsoncpp`, `hiredis`, `libpq-dev`.
    *   Example for Debian/Ubuntu:
        ```bash
        sudo apt-get update
        sudo apt-get install -y cmake build-essential git libjsoncpp-dev libuuid-dev libssl-dev zlib1g-dev libbrotli-dev libhiredis-dev libpq-dev libspdlog-dev
        # Install Drogon (recommended to build from source for specific version)
        git clone --depth 1 -b v1.8.0 https://github.com/drogonframework/drogon.git
        cd drogon
        git submodule update --init
        cmake -B build -DCMAKE_BUILD_TYPE=Release
        sudo cmake --build build --target install
        sudo ldconfig
        cd ..
        # Install jwt-cpp (build from source)
        git clone --depth 1 https://github.com/Thalhammer/jwt-cpp.git
        cd jwt-cpp
        cmake -B build -DCMAKE_BUILD_TYPE=Release
        sudo cmake --build build --target install
        sudo ldconfig
        cd ..
        ```
3.  **Set up PostgreSQL and Redis**:
    *   Install PostgreSQL and create a database `mobile_app_db` with user `user` and password `password`.
    *   Apply the `database/schema.sql` and `database/seed.sql` to your PostgreSQL instance.
    *   Install and start Redis.
4.  **Configure `config/app_config.json`**:
    Adjust database credentials, JWT secret, and Redis connection details to match your local setup.
5.  **Build the application**:
    ```bash
    mkdir build
    cd build
    cmake ..
    cmake --build .
    ```

### Docker Compose (Recommended)

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/mobile-backend.git
    cd mobile-backend
    ```
2.  **Ensure Docker and Docker Compose are installed.**
3.  **Build and run the services**:
    ```bash
    docker-compose up --build -d
    ```
    This command will:
    *   Build the `backend` service using the `Dockerfile`.
    *   Start a PostgreSQL container (`db`), apply `schema.sql` and `seed.sql`.
    *   Start a Redis container (`redis`).
    *   Start the `backend` application, connecting to `db` and `redis` services by their names defined in `docker-compose.yml`.
    *   `-d` runs services in detached mode (in the background).

## 5. Running the Application

*   **With Docker Compose**: The application starts automatically after `docker-compose up -d`. It will be accessible on `http://localhost:8080`.
    To check logs: `docker-compose logs -f backend`
    To stop: `docker-compose down`
*   **Locally (without Docker)**:
    ```bash
    cd build
    ./MobileBackend
    ```
    The application will listen on `http://127.0.0.1:8080` (or as configured in `app_config.json`).

## 6. Testing

### Unit Tests

Unit tests are written using `Catch2` and focus on individual components (utilities, services).

1.  **Build the tests (if not already done by `cmake ..`):**
    ```bash
    cd build
    cmake --build . --target UnitTests
    ```
2.  **Run unit tests**:
    ```bash
    ./tests/UnitTests
    # Or using CTest
    ctest -L unit
    ```

### Integration Tests

Integration tests are also written using `Catch2` and verify the interaction between components, especially with the database.

**Note**: Integration tests require a running PostgreSQL database configured as per `app_config.json`. If using Docker Compose, the `db` service should be healthy.

1.  **Build the tests:**
    ```bash
    cd build
    cmake --build . --target IntegrationTests
    ```
2.  **Run integration tests**:
    ```bash
    ./tests/IntegrationTests
    # Or using CTest
    ctest -L integration
    ```

### API Tests

API tests ensure that the HTTP endpoints function correctly. A `curl` script is provided for basic smoke testing.

1.  Ensure the backend is running.
2.  Execute the API test script:
    ```bash
    cd docs
    chmod +x api_tests.sh
    ./api_tests.sh
    ```
    (Requires `jq` for pretty printing JSON, but will work without it).

### Performance Tests

For performance testing, external tools are recommended:

*   **`ab` (Apache Bench)**: Simple tool for basic load testing.
    ```bash
    # Example: 1000 requests, 10 concurrent
    ab -n 1000 -c 10 http://localhost:8080/products
    ```
*   **JMeter**: More comprehensive tool for various protocols and complex scenarios.
*   **K6 / Locust**: Scriptable load testing tools (JavaScript/Python respectively).

**Strategy**:
1.  Identify critical endpoints (e.g., `/login`, `/products`, `/orders`).
2.  Simulate typical user flows (login -> browse products -> add to cart -> checkout).
3.  Monitor system resources (CPU, Memory, Disk I/O, Network) during tests.
4.  Analyze response times, throughput, and error rates.

## 7. API Documentation

Detailed API endpoints, request/response formats, and authentication requirements are documented in `docs/api.md`.

## 8. Architecture

An overview of the system's architecture, including diagrams and component interactions, is available in `docs/architecture.md`.

## 9. Deployment

The recommended deployment method is using Docker containers. The `docker-compose.yml` provides a local development and simple single-server deployment setup. For production, consider Kubernetes or other container orchestration platforms.

Refer to `docs/deployment.md` for more details.

## 10. CI/CD

A basic GitHub Actions workflow (`.github/workflows/ci.yml`) is provided. This workflow automatically builds the Docker image and runs tests upon push to `main` and pull requests.

**Workflow Stages:**
1.  **Build**: Compiles the C++ application inside a Docker container.
2.  **Test**: Runs unit and integration tests.
3.  **Optional Deploy**: (Placeholder) Can be extended to push Docker images to a registry and deploy to a cloud environment.

## 11. Logging and Monitoring

*   **Logging**: The application uses `spdlog` for structured, categorized logging. Logs are output to `stdout` (visible in Docker logs) and a rotating file (`logs/backend.log`).
*   **Monitoring**: For production, integrate with monitoring solutions like Prometheus (for metrics) and Grafana (for dashboards). Drogon can expose metrics via an endpoint, and `spdlog` can be configured to send logs to a centralized log management system (e.g., ELK stack, Splunk).

## 12. Error Handling

The system employs a global `ErrorHandler` middleware that catches exceptions (custom `ApiError` exceptions and generic C++ exceptions) and returns standardized JSON error responses.

*   `400 Bad Request` for invalid input.
*   `401 Unauthorized` for missing or invalid authentication tokens.
*   `403 Forbidden` for insufficient permissions.
*   `404 Not Found` for non-existent resources.
*   `409 Conflict` for unique constraint violations (e.g., duplicate username).
*   `500 Internal Server Error` for unexpected server-side issues.

## 13. Caching

Redis is integrated as a caching layer. The `RedisManager` utility provides `set`, `get`, and `del` operations. While not extensively used in the current controller examples, it's available for caching frequently accessed data (e.g., product lists, user profiles) to reduce database load.

**Example Use Case**: Caching product listings that don't change frequently.

## 14. Rate Limiting

Drogon provides built-in mechanisms for rate limiting using filters. For this example, a dedicated `RateLimiter` middleware is not explicitly implemented but would typically:

*   Track requests per IP address or authenticated user ID.
*   Use a token bucket or fixed window algorithm.
*   Store rate limiting data in Redis for distributed systems.
*   Return `429 Too Many Requests` when limits are exceeded.

## 15. Contributing

Contributions are welcome! Please fork the repository, create a feature branch, and submit a pull request. Ensure your code adheres to the project's coding standards and includes appropriate tests.

## 16. License

This project is licensed under the MIT License. See the `LICENSE` file for details (not included in this response, but implied).