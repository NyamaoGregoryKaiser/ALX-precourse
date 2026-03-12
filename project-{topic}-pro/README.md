```markdown
# Payment Processing System (C++ / Pistache / PostgreSQL)

This project implements a comprehensive, production-ready payment processing system backend built with C++ using the Pistache web framework. It adheres to modern software engineering principles, emphasizing modularity, testability, and scalability.

## Table of Contents
1.  [Features](#features)
2.  [Technology Stack](#technology-stack)
3.  [Project Structure](#project-structure)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Development (without Docker)](#local-development-without-docker)
    *   [Docker Setup (Recommended)](#docker-setup-recommended)
5.  [Running the Application](#running-the-application)
6.  [Database Management](#database-management)
    *   [Migrations](#migrations)
    *   [Seed Data](#seed-data)
7.  [Testing](#testing)
8.  [Configuration](#configuration)
9.  [API Documentation](#api-documentation)
10. [Architecture Documentation](#architecture-documentation)
11. [Deployment Guide](#deployment-guide)
12. [Contributing](#contributing)
13. [License](#license)

## 1. Features

*   **User Management**: Register, login, manage users with different roles (Admin, Merchant, Customer).
*   **Account Management**: Create, view, update, and delete payment accounts for users.
*   **Transaction Processing**: Handle various transaction types (deposit, withdrawal, payment, refund).
*   **Security**: JWT-based authentication and authorization, password hashing.
*   **Database Integration**: PostgreSQL with `libpqxx` for robust data storage.
*   **Logging & Monitoring**: `spdlog` for detailed application logs.
*   **Configuration Management**: JSON-based configuration with environment variable overrides.
*   **API**: RESTful API endpoints for all core functionalities.
*   **Dockerization**: Containerized application and database for easy deployment.
*   **CI/CD**: GitHub Actions pipeline for automated testing and deployment.

## 2. Technology Stack

*   **Backend**: C++17/20
*   **Web Framework**: [Pistache](https://github.com/oktal/pistache)
*   **Database**: [PostgreSQL](https://www.postgresql.org/)
*   **Database Driver**: [libpqxx](https://libpqxx.readthedocs.io/en/7.7/)
*   **JSON Parsing**: [nlohmann/json](https://github.com/nlohmann/json)
*   **Logging**: [spdlog](https://github.com/gabime/spdlog)
*   **Testing**: [Google Test & Google Mock](https://github.com/google/googletest)
*   **Auth**: JWT (using [jwt-cpp](https://github.com/Thalhammer/jwt-cpp))
*   **Containerization**: [Docker](https://www.docker.com/)
*   **CI/CD**: [GitHub Actions](https://docs.github.com/en/actions)
*   **Build System**: [CMake](https://cmake.org/)

## 3. Project Structure

```
payment-processor/
├── src/                        # Core application source code
│   ├── main.cpp
│   ├── server/                 # HTTP server, controllers, middleware
│   ├── services/               # Business logic
│   ├── models/                 # Data structures
│   ├── repositories/           # Database access layer
│   ├── util/                   # Utilities (Config, Logger, Crypto, etc.)
│   ├── database/               # Database connection management
│   └── exceptions/             # Custom exception classes
├── tests/                      # Unit and integration tests
├── cmake/                      # CMake helper files
├── migrations/                 # Database schema migration scripts
├── seeds/                      # Initial database seed data
├── config/                     # Application configuration files
├── Dockerfile                  # Docker build instructions
├── docker-compose.yml          # Docker orchestration file
├── .github/                    # GitHub Actions CI/CD workflows
├── CMakeLists.txt              # CMake build configuration
├── README.md                   # This documentation
├── API.md                      # API endpoint details (OpenAPI/Swagger)
├── ARCHITECTURE.md             # High-level architecture overview
├── DEPLOYMENT.md               # Production deployment guide
```

## 4. Setup and Installation

### Prerequisites

*   Git
*   CMake (3.10+)
*   C++ Compiler (GCC 9+ or Clang 9+)
*   Docker & Docker Compose (Recommended)
*   PostgreSQL client development libraries (`libpq-dev`, `libpqxx-dev`)
*   Pistache development libraries (`libpistache-dev`)
*   spdlog development libraries (`libspdlog-dev`)
*   nlohmann/json development libraries (`libnlohmann-json-dev`)
*   OpenSSL development libraries (`libssl-dev`)
*   Google Test & Mock development libraries (`libgtest-dev`, `libgmock-dev`)
*   `jwt-cpp` (Can be installed manually or via CMake FetchContent/vcpkg/conan if not system-wide)

### Local Development (without Docker)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/payment-processor.git
    cd payment-processor
    ```

2.  **Install system dependencies (Ubuntu/Debian example):**
    ```bash
    sudo apt update
    sudo apt install build-essential cmake libpistache-dev libspdlog-dev libnlohmann-json-dev libpqxx-dev libpq-dev libssl-dev libgtest-dev libgmock-dev uuid-dev git
    # If jwt-cpp is not available via apt, build it manually:
    # git clone https://github.com/Thalhammer/jwt-cpp.git && cd jwt-cpp && mkdir build && cd build && cmake .. && make -j$(nproc) && sudo make install
    ```

3.  **Setup PostgreSQL Database:**
    *   Install PostgreSQL (if not already installed).
    *   Create a user and database:
        ```bash
        sudo -u postgres psql
        CREATE USER paymentuser WITH PASSWORD 'securepassword';
        CREATE DATABASE paymentdb OWNER paymentuser;
        \q
        ```
    *   Update `config/default.json` with your database credentials if different.

4.  **Build the application:**
    ```bash
    mkdir build
    cd build
    cmake ..
    make -j$(nproc)
    ```

### Docker Setup (Recommended)

1.  **Ensure Docker and Docker Compose are installed.**

2.  **Build and run the services:**
    ```bash
    docker-compose up --build -d
    ```
    This will:
    *   Build the `payment-processor-app` image based on the `Dockerfile`.
    *   Start a PostgreSQL container (`payment-processor-db`).
    *   Wait for the database to be healthy.
    *   Run database migrations and seed data (see `docker-entrypoint-initdb.d` in `docker-compose.yml`).
    *   Start the `payment-processor-app` container.

    You can check the status:
    ```bash
    docker-compose ps
    ```

## 5. Running the Application

*   **Locally (after build):**
    ```bash
    cd build
    ./PaymentProcessor ../config/default.json
    ```
*   **With Docker Compose:**
    ```bash
    docker-compose up -d payment-processor-app
    # View logs
    docker-compose logs -f payment-processor-app
    ```

The API will be available at `http://localhost:9080` (or the port specified in your config/environment).

## 6. Database Management

### Migrations

Migration scripts are located in the `migrations/` directory. They are applied in alphabetical order.

*   **With Docker Compose:** Migrations are automatically applied when the `payment-processor-db` container starts for the first time or when it's recreated.
*   **Locally:**
    ```bash
    ./migrations/run_migrations.sh
    ```
    Ensure `PGPASSWORD` environment variable is set or you'll be prompted for the password.

### Seed Data

Seed data for development and testing is in `seeds/seed_data.sql`.

*   **With Docker Compose:** Seed data is applied after migrations when the `payment-processor-db` container starts for the first time.
*   **Locally:**
    ```bash
    psql -h localhost -p 5432 -d paymentdb -U paymentuser -f seeds/seed_data.sql
    ```

## 7. Testing

The project includes unit and integration tests using Google Test/Mock.

*   **Run tests locally (after build):**
    ```bash
    cd build
    ./PaymentProcessorTests
    ```
*   **Run tests in Docker container:**
    ```bash
    docker run --rm payment-processor:latest ./PaymentProcessorTests
    ```
*   **CI/CD**: Tests are automatically run by GitHub Actions on every push/pull request.

## 8. Configuration

Configuration is managed via JSON files in the `config/` directory (e.g., `default.json`, `test.json`). Environment variables can override these settings.

*   `config/default.json`: Default settings for the application.
*   `config/test.json`: Specific settings for testing environments.

Example usage:
```bash
# Run with a specific config file
./PaymentProcessor config/production.json

# Override a setting via environment variable (if implemented in Config.cpp)
# For this project, environment variables are read by docker-compose, but not directly by Config.cpp.
# You would extend Config.cpp to read from env vars if needed at runtime.
# e.g., export APP_PORT=8080 && ./PaymentProcessor
```

## 9. API Documentation

Detailed API documentation, including all endpoints, request/response formats, and authentication requirements, can be found in `API.md`. It is recommended to use OpenAPI (Swagger) for a more interactive and standardized documentation.

## 10. Architecture Documentation

A high-level overview of the system's architecture, including its components, data flow, and design choices, is available in `ARCHITECTURE.md`.

## 11. Deployment Guide

Instructions for deploying the application to a production environment are outlined in `DEPLOYMENT.md`. This includes considerations for security, scalability, and monitoring.

## 12. Contributing

Contributions are welcome! Please follow the standard GitHub flow:
1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Implement your changes and write tests.
4.  Ensure all tests pass.
5.  Submit a pull request.

## 13. License

This project is licensed under the [MIT License](LICENSE).
```