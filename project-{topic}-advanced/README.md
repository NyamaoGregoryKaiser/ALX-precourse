```markdown
# Comprehensive Mobile App Backend (C++)

This project implements a full-scale, production-ready backend system for a mobile application, built entirely in C++. It features a robust architecture with multiple modules, comprehensive CRUD APIs, authentication/authorization, logging, caching, rate limiting, and extensive testing, following ALX Software Engineering principles.

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Cloning the Repository](#cloning-the-repository)
    *   [Setting up External Libraries](#setting-up-external-libraries)
    *   [Environment Configuration](#environment-configuration)
    *   [Building the Application](#building-the-application)
    *   [Running the Application](#running-the-application)
    *   [Running with Docker](#running-with-docker)
4.  [Testing](#testing)
    *   [Unit and Integration Tests](#unit-and-integration-tests)
    *   [API Tests](#api-tests)
    *   [Performance Tests](#performance-tests)
5.  [API Documentation](#api-documentation)
6.  [Deployment Guide](#deployment-guide)
7.  [CI/CD Pipeline](#cicd-pipeline)
8.  [Project Structure](#project-structure)
9.  [Contributing](#contributing)
10. [License](#license)

---

## 1. Features

*   **Core Application (C++)**:
    *   **Web Framework**: [Crow](https://github.com/ipkn/crow) - a fast, header-only C++ microframework.
    *   **Modular Design**: Clear separation of concerns into models, services, controllers, and utilities.
    *   **Business Logic**: Implemented within services for user management and task management.
    *   **API Endpoints**: Full CRUD operations for users and tasks.
*   **Database Layer (SQLite3)**:
    *   **Schema Definitions**: `users` and `tasks` tables with appropriate fields and constraints.
    *   **Migration Scripts**: Automatic table creation on startup.
    *   **Query Optimization**: Use of prepared statements for efficiency and security.
    *   **Concurrency**: Basic mutex-based protection for SQLite operations.
*   **Configuration & Setup**:
    *   **Build System**: CMake for managing compilation and dependencies.
    *   **Dependencies**: Explicitly listed (and guide for acquisition).
    *   **Environment Configuration**: Utilizes `.env` files (via `std::getenv`) for flexible environment-specific settings.
    *   **Docker**: Containerized setup for consistent build and deployment.
    *   **CI/CD**: GitHub Actions workflow for automated testing and Docker image building.
*   **Testing & Quality**:
    *   **Unit Tests**: Implemented using [Google Test](https://github.com/google/googletest) for core components (database, services, utilities) with high coverage.
    *   **Integration Tests**: Service-level tests verify interaction with the database.
    *   **API Tests**: Guidance on using `curl` or Postman.
    *   **Performance Tests**: Guidance on using tools like Apache JMeter or `wrk`.
*   **Documentation**:
    *   Comprehensive `README.md` (this file).
    *   `API_DOCS.md`: Detailed API endpoints with examples.
    *   `ARCHITECTURE.md`: Overview of the system design.
    *   Deployment guide within `README.md`.
*   **Additional Features**:
    *   **Authentication/Authorization**: JWT (JSON Web Tokens) based authentication using `jwt-cpp`. Middleware for token validation.
    *   **Logging and Monitoring**: Structured logging with [spdlog](https://github.com/gabime/spdlog), outputting to console and rotating files.
    *   **Error Handling Middleware**: Centralized custom exception handling for consistent API error responses.
    *   **Caching Layer**: Simple in-memory cache with configurable TTL (Time-To-Live) for frequently accessed data (users, tasks).
    *   **Rate Limiting**: IP-based request rate limiting middleware to protect against abuse.
    *   **CORS Support**: Configured using Crow's built-in CORS handler.

---

## 2. Architecture

The system follows a layered architecture, common in backend services, with clear separation of concerns:

*   **Presentation Layer (Controllers)**: Handles HTTP requests, parses input, calls appropriate service methods, and formats HTTP responses. Uses Crow routes.
*   **Business Logic Layer (Services)**: Contains the core business rules and orchestrates data operations. It interacts with the data layer and utility components.
*   **Data Access Layer (Database Utility)**: Provides an abstraction over the raw SQLite3 API, managing connections, queries, and transactions.
*   **Utility Layer**: Houses cross-cutting concerns like JWT management, logging, caching, and rate limiting middleware.
*   **Models**: Defines the data structures (`User`, `Task`) used across all layers.

**Data Flow Example (User Login):**

1.  **Request**: Mobile client sends `POST /auth/login` with `identifier` and `password`.
2.  **Rate Limiter Middleware**: Checks if the client's IP address has exceeded the request limit. If so, responds with 429.
3.  **Controller (`AuthController::login_user`)**: Receives the request, parses JSON body.
4.  **Service (`AuthService::login_user`)**:
    *   Retrieves user from `Database` by identifier.
    *   `AuthService::verify_password` hashes the provided password and compares it to the stored hash.
    *   If credentials are valid, `JwtManager::create_token` generates a JWT.
5.  **Controller**: Formats a 200 OK response with the JWT.
6.  **Response**: Returns the JWT to the client. Subsequent authenticated requests will include this token.

For authenticated routes:

1.  **Request**: Client sends request with `Authorization: Bearer <token>`.
2.  **Auth Middleware (`AuthMiddleware::before_handle`)**:
    *   Extracts token from header.
    *   `JwtManager::verify_token` validates the token.
    *   If valid, extracts `user_id` and adds it to the Crow request context.
    *   If invalid, responds with 401 Unauthorized.
3.  **Route Handler (e.g., `UserController::get_user_profile`)**: Accesses `user_id` from context, calls `UserService::get_user_by_id`.
4.  **Service (`UserService::get_user_by_id`)**:
    *   Checks `Cache` for user data.
    *   If not found, fetches from `Database`.
    *   Caches the user data.
5.  **Controller**: Formats a 200 OK response with user data.
6.  **Response**: Returns user data to the client.

Refer to `ARCHITECTURE.md` for a more detailed diagram and explanation.

---

## 3. Setup and Installation

### Prerequisites

*   **C++ Compiler**: GCC (g++) 10+ or Clang with C++17 support.
*   **CMake**: Version 3.10 or higher.
*   **Git**: For cloning the repository and managing submodules.
*   **SQLite3 Development Libraries**: `libsqlite3-dev` (Debian/Ubuntu) or equivalent.
*   **spdlog Development Libraries**: `libspdlog-dev` (Debian/Ubuntu) or equivalent.
*   **Google Test Development Libraries**: `libgtest-dev` (Debian/Ubuntu) or equivalent. Often requires building after install: `cd /usr/src/gtest && sudo cmake . && sudo make && sudo mv libgtest* /usr/lib/`.
*   **libssl-dev**: For `jwt-cpp`'s cryptographic operations.
*   **curl**: For downloading Crow header.
*   **Docker** (Optional, for containerized deployment).

### Cloning the Repository

```bash
git clone https://github.com/your-username/mobile-backend.git
cd mobile-backend
```

### Setting up External Libraries

Some libraries like Crow and jwt-cpp are header-only or included as submodules/copied for simplicity.

1.  **Crow**: Download the `crow_all.h` header file.
    ```bash
    mkdir -p libs
    curl -L https://raw.githubusercontent.com/ipkn/crow/master/crow_all.h -o libs/crow_all.h
    ```
2.  **jwt-cpp**: Clone the repository as a submodule or directly into `libs`.
    ```bash
    git clone https://github.com/Thalhammer/jwt-cpp.git libs/jwt-cpp
    ```
3.  **Other dependencies** (SQLite3, spdlog, Google Test): Ensure you have their development packages installed as per [Prerequisites](#prerequisites).

### Environment Configuration

Create a `.env` file in the project root based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` to configure:

*   `APP_PORT`: Port for the server (default: 18080)
*   `DATABASE_PATH`: Path to the SQLite database file (e.g., `./data/mobile_backend.db`)
*   `JWT_SECRET`: **CRITICAL!** A strong, unique secret key for JWT signing. Must be at least 32 characters.
*   `CACHE_TTL_SECONDS`: Default time-to-live for cache entries in seconds.
*   `RATE_LIMIT_MAX_REQUESTS`: Maximum requests allowed in `RATE_LIMIT_WINDOW_SECONDS`.
*   `RATE_LIMIT_WINDOW_SECONDS`: Time window for rate limiting in seconds.

### Building the Application

```bash
# Create a build directory
mkdir build
cd build

# Configure CMake
cmake -DCMAKE_BUILD_TYPE=Release \
      -DJWT_CPP_PATH=../libs/jwt-cpp \
      -DCROW_HEADERS_PATH=../libs \
      ..

# Build the application
cmake --build .
```

The executable `mobile_backend` will be created in the `build/` directory.

### Running the Application

Before running, ensure the `data` directory for the SQLite database exists:

```bash
mkdir -p data
```

Then, run the compiled executable, sourcing your `.env` file for environment variables:

```bash
cd build
# For Linux/macOS
source ../.env && ./mobile_backend

# For Windows (PowerShell)
# $env:APP_PORT=18080; $env:DATABASE_PATH='./data/mobile_backend.db'; $env:JWT_SECRET='your_secret'; $env:CACHE_TTL_SECONDS=600; $env:RATE_LIMIT_MAX_REQUESTS=100; $env:RATE_LIMIT_WINDOW_SECONDS=60; .\mobile_backend.exe
```

The server will start on the configured `APP_PORT`.

### Running with Docker

1.  **Build the Docker image**:
    ```bash
    docker build -t mobile-backend:latest .
    ```
2.  **Run the Docker container**:
    ```bash
    docker run -d \
      -p 18080:18080 \
      -e APP_PORT=18080 \
      -e DATABASE_PATH=/app/data/mobile_backend.db \
      -e JWT_SECRET="your_very_secret_jwt_key_that_is_at_least_32_characters_long_and_random" \
      -e CACHE_TTL_SECONDS=600 \
      -e RATE_LIMIT_MAX_REQUESTS=100 \
      -e RATE_LIMIT_WINDOW_SECONDS=60 \
      --name mobile_backend_app \
      mobile-backend:latest
    ```
    *   Remember to replace `JWT_SECRET` with a strong secret.
    *   You can optionally mount a volume for persistent database storage:
        ```bash
        -v $(pwd)/data:/app/data
        ```

---

## 4. Testing

### Unit and Integration Tests

The project includes extensive unit and integration tests using Google Test.

**To run tests:**

```bash
cd build
./mobile_backend_tests
```

**Coverage Goals**: The goal is 80%+ coverage for core logic (services, utilities). The provided tests aim to cover critical paths. Tools like `gcov` or `lcov` can be integrated with CMake to generate coverage reports.

### API Tests

You can use tools like `curl` (command-line), Postman, Insomnia, or browser developer tools to interact with the API.

1.  **Start the server** (see [Running the Application](#running-the-application)).
2.  **Register a user**:
    ```bash
    curl -X POST -H "Content-Type: application/json" -d '{"username":"testuser", "email":"test@example.com", "password":"password123"}' http://localhost:18080/auth/register
    ```
3.  **Login and get JWT token**:
    ```bash
    curl -X POST -H "Content-Type: application/json" -d '{"identifier":"testuser", "password":"password123"}' http://localhost:18080/auth/login
    ```
    *   Copy the `token` from the response.
4.  **Access an authenticated endpoint (e.g., get user profile)**:
    ```bash
    TOKEN="<YOUR_JWT_TOKEN_HERE>"
    curl -X GET -H "Authorization: Bearer $TOKEN" http://localhost:18080/users/me
    ```
Refer to `API_DOCS.md` for a full list of endpoints and example requests.

### Performance Tests

For performance testing, you can use:

*   **Apache JMeter**: A powerful tool for load testing web applications.
*   **`wrk`**: A modern HTTP benchmarking tool capable of generating significant load.
*   **`ab` (ApacheBench)**: A simple command-line tool for basic load testing.

**Example `wrk` command (after starting the server):**

```bash
# Test / (root endpoint)
wrk -t4 -c20 -d30s http://localhost:18080/

# Test an authenticated endpoint (requires a valid token)
# Make sure your JWT token is long-lived or refreshed for extended tests.
# You might need to script `wrk` with Lua for dynamic token injection or use JMeter.
# Example with hardcoded token (for short bursts):
wrk -t4 -c20 -d30s --header "Authorization: Bearer <YOUR_JWT_TOKEN>" http://localhost:18080/users/me
```

Analyze metrics like requests per second, latency, and error rates.

---

## 5. API Documentation

Detailed API documentation, including all available endpoints, request/response formats, authentication requirements, and example usage, is provided in `API_DOCS.md`.

## 6. Deployment Guide

### Local Deployment (Manual)

1.  Follow [Setup and Installation](#setup-and-installation) and [Building the Application](#building-the-application) to get the `mobile_backend` executable.
2.  Create a `data` directory in your desired application root: `mkdir -p /path/to/app/data`.
3.  Create a `.env` file in the same directory, customizing variables for your production environment (especially `JWT_SECRET`).
4.  Run the application:
    ```bash
    cd /path/to/app
    source .env && ./build/mobile_backend # Or copy the executable to /path/to/app
    ```
5.  Consider using a process manager like `systemd`, `Supervisor`, or `pm2` (if you have Node.js installed) to keep the application running, restart on crashes, and manage logs.

### Docker Deployment

Docker is the recommended deployment method for production due to its consistency and ease of management.

1.  Ensure you have built and pushed your Docker image to a registry (e.g., Docker Hub, AWS ECR, Google Container Registry).
    *   The CI/CD pipeline is configured to push to Docker Hub automatically on `main` branch pushes.
    *   Replace `yourdockerhubusername` in `.github/workflows/main.yml` and `Dockerfile` with your actual Docker Hub username.
2.  On your server, pull the image:
    ```bash
    docker pull yourdockerhubusername/mobile-backend:latest
    ```
3.  Run the container:
    ```bash
    docker run -d \
      --restart=always \
      -p 80:18080 \
      -e APP_PORT=18080 \
      -e DATABASE_PATH=/app/data/mobile_backend.db \
      -e JWT_SECRET="YOUR_STRONG_PROD_JWT_SECRET_HERE" \
      -e CACHE_TTL_SECONDS=600 \
      -e RATE_LIMIT_MAX_REQUESTS=100 \
      -e RATE_LIMIT_WINDOW_SECONDS=60 \
      -v /var/lib/mobile-backend/data:/app/data \
      --name mobile_backend_prod \
      yourdockerhubusername/mobile-backend:latest
    ```
    *   `-p 80:18080`: Maps external port 80 to container's port 18080. Adjust as needed.
    *   `-v /var/lib/mobile-backend/data:/app/data`: **Crucial for persistent data!** Mounts a host directory for the SQLite database.
    *   **Always use a strong, unique `JWT_SECRET` in production.**
    *   Consider using a secrets management system (e.g., AWS Secrets Manager, HashiCorp Vault) for `JWT_SECRET` instead of direct environment variables in production.
4.  **Logging**: The application logs to `stdout` (which Docker captures) and to `logs/mobile_backend.log` inside the container. You can use `docker logs mobile_backend_prod` to view logs or mount a volume for logs: `-v /var/log/mobile-backend:/app/logs`.
5.  **Reverse Proxy**: For public-facing deployments, it's highly recommended to place a reverse proxy (like Nginx or Caddy) in front of the Docker container for SSL/TLS termination, advanced load balancing, and additional security features.

---

## 7. CI/CD Pipeline

A GitHub Actions workflow (`.github/workflows/main.yml`) is configured to automate the following:

1.  **On Push/Pull Request to `main` branch**:
    *   **Build**: Compiles the C++ application and tests using CMake on an `ubuntu-latest` runner.
    *   **Test**: Runs all Google Test unit and integration tests.
2.  **On Push to `main` branch (after successful build & test)**:
    *   **Docker Build & Push**: Builds the Docker image and pushes it to Docker Hub.
        *   Requires `DOCKER_USERNAME` and `DOCKER_PASSWORD` to be set as GitHub Secrets in your repository settings.
        *   The image will be tagged `yourdockerhubusername/mobile-backend:latest`.

This pipeline ensures that changes are automatically tested and a deployable Docker image is created upon successful integration into the `main` branch.

---

## 8. Project Structure

```
.
├── .github/                     # GitHub Actions CI/CD workflows
│   └── workflows/
│       └── main.yml             # CI/CD pipeline configuration
├── src/
│   ├── controllers/             # API endpoint handlers (Auth, User, Task)
│   ├── models/                  # Data structures (User, Task)
│   ├── services/                # Business logic (Auth, User, Task Services)
│   ├── utils/                   # Utility functions and middlewares
│   │   ├── auth_middleware.h    # JWT authentication middleware
│   │   ├── cache.h              # In-memory caching layer
│   │   ├── database.h           # SQLite database wrapper
│   │   ├── error_middleware.h   # Custom exception handling & middleware
│   │   ├── jwt_manager.h        # JWT token creation and verification
│   │   ├── logger.h             # spdlog configuration
│   │   └── rate_limiter.h       # IP-based rate limiting
│   └── main.cpp                 # Main application entry point, Crow app setup
├── tests/                       # Google Test unit and integration tests
├── CMakeLists.txt               # CMake build configuration
├── Dockerfile                   # Docker setup for building and running
├── .env.example                 # Example environment variables
├── API_DOCS.md                  # API documentation (OpenAPI/Swagger format can be generated from this)
├── ARCHITECTURE.md              # Architecture overview
└── README.md                    # Comprehensive project README (this file)
```

---

## 9. Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix (`git checkout -b feature/your-feature-name`).
3.  Implement your changes, adhering to the coding style.
4.  Write comprehensive tests for your changes.
5.  Ensure all existing tests pass (`./build/mobile_backend_tests`).
6.  Commit your changes (`git commit -m 'feat: Add new feature'`).
7.  Push to your fork (`git push origin feature/your-feature-name`).
8.  Create a Pull Request to the `main` branch of this repository.

---

## 10. License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
```