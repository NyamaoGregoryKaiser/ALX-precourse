```markdown
# Payment Processing System

A comprehensive, production-ready Payment Processing System built with C++ (Crow framework) backend, SQLite database, and supporting infrastructure.

## Table of Contents

1.  [Introduction](#1-introduction)
2.  [Features](#2-features)
3.  [Architecture](#3-architecture)
4.  [Prerequisites](#4-prerequisites)
5.  [Setup and Installation](#5-setup-and-installation)
    *   [Local Development (without Docker)](#local-development-without-docker)
    *   [Docker Compose (Recommended)](#docker-compose-recommended)
6.  [Configuration](#6-configuration)
7.  [Running the Application](#7-running-the-application)
8.  [API Endpoints](#8-api-endpoints)
9.  [Testing](#9-testing)
10. [Deployment](#10-deployment)
11. [Contribution](#11-contribution)
12. [License](#12-license)

---

### 1. Introduction

This project implements a full-scale payment processing backend system, demonstrating robust C++ development practices, modular design, and essential features required for enterprise-grade applications. It includes user authentication, merchant account management, and transaction processing.

### 2. Features

*   **User Management:**
    *   User registration and login.
    *   Role-based access control (Admin, Merchant, Viewer).
*   **Account Management:**
    *   Create, view, update, delete merchant accounts.
    *   Manage account balances and statuses.
*   **Transaction Processing:**
    *   Process various transaction types: Payments, Refunds, Withdrawals, Deposits.
    *   Track transaction status (Pending, Completed, Failed, Refunded, Cancelled).
    *   Support for external transaction IDs.
*   **Security:**
    *   JWT-based authentication.
    *   Password hashing (conceptual, integrate bcrypt/Argon2).
    *   Authorization checks for resource access.
*   **Observability:**
    *   Structured logging (`spdlog`).
    *   Comprehensive error handling middleware.
*   **Performance & Scalability:**
    *   Lightweight C++ web framework (`Crow`).
    *   Database connection pooling (if using a more robust DB, not explicit for SQLite).
    *   Rate limiting (conceptual).
    *   Caching layer (conceptual).
*   **Development Workflow:**
    *   `CMake` build system.
    *   `Docker` and `docker-compose` for containerization.
    *   CI/CD pipeline configuration (`GitHub Actions`).
    *   Unit, Integration, and API testing frameworks.
    *   Detailed documentation.

### 3. Architecture

Refer to `docs/ARCHITECTURE.md` for a detailed architectural overview, component breakdown, and data flow diagrams.

### 4. Prerequisites

*   **Git**
*   **C++ Compiler:** GCC/Clang (C++17 or newer)
*   **CMake:** Version 3.10 or higher
*   **SQLite3 Development Libraries:** `libsqlite3-dev` (Debian/Ubuntu) or equivalent.
*   **Docker & Docker Compose:** (Recommended for easier setup)
*   **`curl` or `Postman`:** For API testing.
*   **`python3` and `pip`:** For running integration test scripts (optional).

### 5. Setup and Installation

#### Local Development (without Docker)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/payment-processor.git
    cd payment-processor
    ```

2.  **Install system dependencies:**
    ```bash
    # For Debian/Ubuntu
    sudo apt-get update
    sudo apt-get install -y build-essential cmake git libsqlite3-dev

    # For macOS (using Homebrew)
    brew install cmake git sqlite3
    ```

3.  **Build the application:**
    ```bash
    mkdir build
    cd build
    cmake .. -DCMAKE_BUILD_TYPE=Release
    make
    # Or, if you want debug symbols and tests:
    # cmake .. -DCMAKE_BUILD_TYPE=Debug
    # make
    ```

4.  **Run migrations and seed data (optional, `DatabaseManager` handles initial tables):**
    The `DatabaseManager` automatically creates tables if they don't exist. For seeding, you can manually run the SQL.
    ```bash
    # Example: Manually run seed data
    # sqlite3 ../payment_processor.db < ../seed_data/seed.sql
    # Note: `payment_processor.db` is created when the app runs for the first time.
    # To run seed, you might need to run the app once to create the DB, then shut down, then seed.
    ```

#### Docker Compose (Recommended)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/payment-processor.git
    cd payment-processor
    ```

2.  **Build and run the containers:**
    ```bash
    docker-compose up --build -d
    ```
    This will:
    *   Build the `payment_app` image using `docker/Dockerfile.app`.
    *   Start the `payment_app` container.
    *   Map port `8080` from the container to `8080` on your host.
    *   Create Docker volumes for persistent database (`payment_data`) and logs (`payment_logs`).

3.  **Verify containers are running:**
    ```bash
    docker-compose ps
    ```
    You should see `payment_app` in a healthy state.

### 6. Configuration

The application reads its configuration from `config/app.config.json`.
You can override the path to this file using the `PAYMENT_CONFIG_PATH` environment variable.

Key configurable parameters:
*   `database_path`: Path to the SQLite database file (e.g., `payment_processor.db`).
*   `server_port`: The port the HTTP server listens on (default: `8080`).
*   `server_host`: The host address the HTTP server binds to (default: `0.0.0.0`).
*   `jwt_secret`: A strong, secret key for signing JWT tokens. **CRITICAL: Change this in production.**
*   `jwt_expiry_hours`: Duration for which JWT tokens are valid (default: 24 hours).
*   `default_currency`: Default currency for operations (e.g., "USD").

### 7. Running the Application

*   **Local (after building):**
    ```bash
    ./build/payment_processor [path/to/app.config.json]
    ```
    (If `path/to/app.config.json` is not provided, it defaults to `config/app.config.json`)

*   **Docker Compose:**
    ```bash
    docker-compose up -d
    # To view logs:
    docker-compose logs -f payment_app
    ```

The API will be available at `http://localhost:8080/api/v1`.

### 8. API Endpoints

Refer to `docs/API_REFERENCE.md` for detailed API documentation including endpoints, request/response formats, and authentication requirements.

### 9. Testing

The project includes various types of tests:

*   **Unit Tests:** Located in `tests/unit/`. Implemented using Google Test.
    *   To run: `cd build && ctest --output-on-failure` (if configured in CMake).
*   **Integration Tests:** Located in `tests/integration/`. Basic API tests using `curl` script.
    *   To run: Ensure the app is running (e.g., via Docker Compose), then `./tests/integration/test_api.sh`.
*   **API Tests:** Can be conducted using `Postman` with the provided `API_REFERENCE.md` or by extending the integration test scripts.
*   **Performance Tests:** Conceptual. Tools like `JMeter`, `ApacheBench (ab)`, or `wrk` can be used.

### 10. Deployment

Refer to `docs/DEPLOYMENT.md` for detailed instructions on deploying the application to a production environment. This includes considerations for:
*   Container orchestration (Kubernetes, Docker Swarm).
*   Database management (managed services like AWS RDS).
*   Monitoring and alerting.
*   Security best practices.

### 11. Contribution

Contributions are welcome! Please refer to the `CONTRIBUTING.md` (not provided, but would be standard) for guidelines.

### 12. License

This project is licensed under the MIT License - see the `LICENSE` file for details.
```