```markdown
# Task Management System - Secure C++ Backend API

This project implements a secure, production-ready backend API for a Task Management System using C++ and the Crow microframework. It focuses heavily on security best practices, robust architecture, and a full development lifecycle, adhering to ALX Software Engineering principles.

## Table of Contents

1.  [Features](#features)
2.  [Technology Stack](#technology-stack)
3.  [Project Structure](#project-structure)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Development](#local-development)
    *   [Docker Deployment](#docker-deployment)
5.  [Database](#database)
    *   [Schema](#schema)
    *   [Migrations & Seeding](#migrations--seeding)
6.  [API Documentation](#api-documentation)
7.  [Testing](#testing)
    *   [Unit Tests](#unit-tests)
    *   [API Integration Tests](#api-integration-tests)
    *   [Performance Tests](#performance-tests)
8.  [Configuration](#configuration)
9.  [Security Implementations](#security-implementations)
10. [Logging & Monitoring](#logging--monitoring)
11. [Caching](#caching)
12. [Rate Limiting](#rate-limiting)
13. [Architecture](#architecture)
14. [Deployment Guide](#deployment-guide)
15. [Contributing](#contributing)
16. [License](#license)

## Features

*   **User Management:** Register, Login, View Profile, Update Profile, Delete Account.
*   **Task Management:** Create, Read (all, specific, by user), Update, Delete tasks.
*   **Authentication:** JWT (JSON Web Tokens) for stateless authentication.
*   **Authorization:** Role-Based Access Control (RBAC) - `admin` and `user` roles.
*   **Password Hashing:** Secure password storage using SHA256 with salt (recommending Argon2/Bcrypt for production).
*   **Input Validation:** Basic server-side validation for API endpoints.
*   **Error Handling:** Centralized, graceful error handling with meaningful HTTP status codes.
*   **Logging:** Structured logging for application events and security audits.
*   **Caching:** In-memory caching for frequently accessed data.
*   **Rate Limiting:** IP-based request rate limiting to prevent abuse.
*   **Configuration:** Environment variable driven configuration.
*   **Containerization:** Docker support for easy deployment.
*   **Comprehensive Testing:** Unit and integration tests.

## Technology Stack

*   **Backend:** C++17
*   **Web Framework:** [Crow](https://github.com/ipkn/crow)
*   **Database:** [SQLite3](https://www.sqlite.org/index.html)
*   **Logging:** [spdlog](https://github.com/gabime/spdlog)
*   **Build System:** CMake
*   **Testing:** [Google Test](https://github.com/google/googletest)
*   **Containerization:** Docker, Docker Compose

## Project Structure

Refer to the `Project Structure` section at the top of this document for a detailed file and directory layout.

## Setup and Installation

### Prerequisites

*   A C++17 compatible compiler (e.g., g++ 7.x+ or Clang 5.x+).
*   CMake 3.10+.
*   Git.
*   SQLite3 development libraries.
*   spdlog development libraries.
*   Docker and Docker Compose (for containerized deployment).
*   `curl` (for API testing).

**For Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y build-essential cmake libsqlite3-dev libspdlog-dev libssl-dev git
# For Crow, it's typically header-only. You can clone it:
# git clone https://github.com/ipkn/crow.git /usr/local/include/crow
```

### Local Development

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-repo/task-management-system.git
    cd task-management-system
    ```

2.  **Prepare Crow (if not system-installed):**
    If Crow isn't installed globally or via a package manager, you might need to manually place its headers. A simple approach is:
    ```bash
    mkdir -p lib
    git clone https://github.com/ipkn/crow.git lib/crow
    # Ensure your CMakeLists.txt includes `lib/crow` in `include_directories`
    ```
    *(Note: The provided `CMakeLists.txt` assumes Crow headers are found in `/usr/local/include/crow` or similar standard path, or via `find_package` if installed with vcpkg. Adjust `CMakeLists.txt` if you put it in `lib/crow`)*

3.  **Configure Environment Variables:**
    Copy the example environment file and fill in your details.
    ```bash
    cp .env.example config/.env
    # Open config/.env and set your JWT_SECRET_KEY, ADMIN_PASSWORD, etc.
    # Ensure JWT_SECRET_KEY is strong and unique (at least 32 characters).
    ```

4.  **Build the application:**
    ```bash
    mkdir build
    cd build
    cmake ..
    make
    ```

5.  **Initialize Database and Seed Data:**
    ```bash
    cd .. # Back to project root
    ./db/migrations.sh
    ```

6.  **Run the application:**
    ```bash
    ./build/TaskManagementSystem
    ```
    The API should now be running on `http://localhost:18080`.

### Docker Deployment

1.  **Configure Environment Variables:**
    Create a `config/.env` file from `config/.env.example` and fill in the necessary values, especially `JWT_SECRET_KEY`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD`.
    ```bash
    cp .env.example config/.env
    # Edit config/.env
    ```

2.  **Build and run with Docker Compose:**
    ```bash
    docker-compose up --build -d
    ```
    This will build the Docker image, create the `app_data` and `app_logs` volumes, apply database migrations, and start the application in the background.

3.  **Verify (optional):**
    ```bash
    docker-compose ps
    docker-compose logs app
    docker-compose exec app /app/TaskManagementSystem --health # Example health check from inside container
    ```
    The API should be accessible at `http://localhost:18080`.

## Database

The project uses SQLite3 for simplicity and portability.

### Schema (`db/schema.sql`)

*   **`users` table:** Stores user information including `id`, `username`, `password_hash`, `email`, `role` (`user` or `admin`), `created_at`, `updated_at`.
*   **`tasks` table:** Stores task details including `id`, `user_id` (foreign key to `users`), `title`, `description`, `status` (`pending`, `in_progress`, `completed`), `created_at`, `updated_at`.

### Migrations & Seeding (`db/migrations.sh`, `db/seed.sql`)

The `db/migrations.sh` script is responsible for:
1.  Creating the database file if it doesn't exist.
2.  Applying the schema defined in `db/schema.sql`.
3.  Seeding initial data (e.g., an admin user) from `db/seed.sql`. This script ensures that the `admin` user specified in `.env` is created/updated on application start if run via Docker.

## API Documentation

Refer to `docs/api.md` for detailed information on available endpoints, request/response formats, and authentication requirements.

## Testing

### Unit Tests

Unit tests are written using Google Test and cover core logic components like cryptographic utilities, authentication service logic, and model validations.

**To run unit tests:**
```bash
cd build
make test
# Or specifically:
# ./tests/unit/TaskManagementSystem_unit_tests
```
*(Note: 80%+ coverage is a target for a full production system. For this example, key components are tested to demonstrate the approach.)*

### API Integration Tests

API tests are shell scripts (`tests/api/api_tests.sh`) that use `curl` to interact with the running API, covering common scenarios like user registration, login, task CRUD operations, and testing authorization/rate limiting.

**To run API tests:**
1.  Ensure the application is running (locally or via Docker).
2.  Navigate to the project root.
3.  ```bash
    ./tests/api/api_tests.sh
    ```

### Performance Tests

While no specific performance test suite is included, the setup is ready for tools like Apache JMeter, k6, or `hey`.

**Example with `hey` (install `hey` first):**
```bash
# Test 1000 requests with 10 concurrent users to a public endpoint
hey -n 1000 -c 10 http://localhost:18080/health

# Test a protected endpoint after obtaining a JWT
# TOKEN=$(curl -s -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"adminpassword123"}' http://localhost:18080/auth/login | jq -r .token)
# hey -n 1000 -c 10 -H "Authorization: Bearer $TOKEN" http://localhost:18080/api/v1/tasks
```

## Configuration

The application is configured using environment variables, loaded via `src/config/Config.hpp/.cpp`. This approach promotes Twelve-Factor App principles and keeps sensitive information out of the codebase. See `.env.example` for available configuration options.

## Security Implementations

*   **Authentication (JWT):**
    *   JSON Web Tokens are used for stateless authentication after successful user login.
    *   Tokens are signed using HMAC-SHA256 with a strong, secret key.
    *   Tokens have a configurable expiration time (`JWT_EXPIRATION_SECONDS`).
    *   Implemented in `src/auth/JwtManager.hpp/.cpp` and `src/middleware/AuthMiddleware.hpp/.cpp`.
*   **Authorization (RBAC):**
    *   Users are assigned roles (`user`, `admin`).
    *   Middleware checks the user's role from the JWT payload to restrict access to specific API endpoints or operations.
    *   Implemented in `src/middleware/AuthMiddleware.hpp/.cpp` and within controllers.
*   **Password Hashing:**
    *   User passwords are never stored in plain text.
    *   They are hashed using SHA256 with a unique salt for each user.
    *   **NOTE:** For production-grade systems, `Argon2` or `Bcrypt` are highly recommended over SHA256 due to their resistance to brute-force and rainbow table attacks. SHA256 is used here for simpler demonstration within the scope of this project.
    *   Implemented in `src/utils/CryptoUtils.hpp/.cpp`.
*   **Secure Input Handling:**
    *   Basic input validation is performed in controllers to prevent common vulnerabilities like SQL injection (SQLite parameterized queries help here) and malformed data.
*   **Error Handling:**
    *   A global error handling middleware (`src/middleware/ErrorHandlerMiddleware.hpp/.cpp`) catches exceptions and returns standardized JSON error responses with appropriate HTTP status codes, avoiding sensitive information leakage.
*   **Secure Configuration:**
    *   Environment variables are used to manage sensitive data like `JWT_SECRET_KEY` and database paths, preventing hardcoding.
*   **Dependency Security:**
    *   Using `CMake` and specified versions helps manage dependencies. In a real-world scenario, regular vulnerability scanning of dependencies would be crucial.

## Logging & Monitoring

*   **Structured Logging:**
    *   Uses `spdlog` for efficient and flexible logging.
    *   Logs are output to both console and a file (`./logs/app.log`).
    *   Configurable log levels (`LOG_LEVEL` in `.env`).
    *   Implemented in `src/logger/Logger.hpp/.cpp`.
*   **Monitoring:**
    *   The `docker-compose.yml` includes a basic `healthcheck` to monitor the application's availability.
    *   Structured logs provide data for potential log aggregation and monitoring systems (e.g., ELK stack, Prometheus/Grafana).

## Caching

*   **In-Memory Cache:**
    *   A simple thread-safe, in-memory cache (`src/services/CacheService.hpp/.cpp`) is implemented using `std::map` with a time-to-live (TTL) mechanism.
    *   Useful for caching frequently accessed, less dynamic data like configuration settings or recent user profiles.
    *   Configurable TTL (`CACHE_TTL_SECONDS` in `.env`).
    *   **NOTE:** For distributed, high-scale applications, external caching solutions like Redis or Memcached are recommended.

## Rate Limiting

*   **Fixed-Window Rate Limiter:**
    *   An IP-based fixed-window rate-limiting middleware (`src/middleware/RateLimitMiddleware.hpp/.cpp`) is implemented.
    *   It tracks the number of requests from each IP address within a defined time window.
    *   Configurable limits (`RATE_LIMIT_REQUESTS`, `RATE_LIMIT_WINDOW_SECONDS` in `.env`).
    *   Helps protect against brute-force attacks and denial-of-service (DoS) attempts.

## Architecture

Refer to `docs/architecture.md` for a detailed explanation of the system's architecture, including its modular design, data flow, and component interactions.

## Deployment Guide

Refer to `docs/deployment.md` for detailed instructions on deploying the application to a production environment, including considerations for reverse proxies, database management, and scaling.

## Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature`).
3.  Make your changes and ensure tests pass.
4.  Commit your changes (`git commit -am 'Add new feature'`).
5.  Push to the branch (`git push origin feature/your-feature`).
6.  Create a new Pull Request.

## License

This project is licensed under the [MIT License](LICENSE).
```