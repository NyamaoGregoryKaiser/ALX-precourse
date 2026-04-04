# Task Manager System - Enterprise Grade Backend (C++)

This project implements a comprehensive, production-ready backend system for a Task Manager application, built with C++ and focusing on modern software engineering practices, security, and scalability. It serves as an example of a full-stack project adhering to ALX Software Engineering principles covering programming logic, algorithm design, and technical problem solving.

## Features

### Core Application
*   **C++ Backend:** High-performance RESTful API using the `Crow` microframework.
*   **Modular Design:** Separate modules for Authentication, Users, and Tasks.
*   **CRUD Operations:** Full Create, Read, Update, Delete operations for Users and Tasks.
*   **Layered Architecture:** Clear separation of concerns (Controller, Service, Repository).

### Database Layer
*   **SQLite3:** Embedded database for simplified setup in this example (easily swappable with PostgreSQL/MySQL).
*   **Schema Definitions:** `users` and `tasks` tables with appropriate fields and relations.
*   **Migration System:** Automated database schema management on startup.
*   **Seed Data:** Initial data (e.g., admin user, sample tasks) populated on first run.
*   **Query Optimization:** Use of prepared statements for security and performance.

### Configuration & Setup
*   **CMake:** Modern C++ build system.
*   **`config.json`:** Externalized configuration for environment-specific settings.
*   **Docker:** Containerization for consistent development and deployment environments.
*   **Docker Compose:** Orchestration for running the application easily.
*   **CI/CD Configuration:** GitHub Actions workflow for automated testing and building.

### Security Implementations
*   **Authentication (JWT):** JSON Web Tokens for stateless API authentication.
*   **Authorization (RBAC):** Role-Based Access Control (Admin, User roles).
*   **Password Hashing:** Strong, salted password hashing (conceptually Argon2/bcrypt).
*   **Rate Limiting:** IP-based request rate limiting to prevent abuse.
*   **Error Handling:** Centralized, structured error responses for API calls.
*   **Input Validation:** Basic validation on DTOs and service layers.
*   **Secure API Design:** Use of HTTPS (assumed at deployment via proxy), parameterized queries to prevent SQL injection.

### Additional Features
*   **Logging & Monitoring:** Structured logging using `spdlog` to files and console.
*   **Caching Layer:** Simple in-memory LRU cache for frequently accessed, non-sensitive data.
*   **Health Check Endpoint:** (Conceptual, can be added for Docker health checks).

### Testing & Quality
*   **Unit Tests:** Using Google Test for individual component validation (aiming for high coverage).
*   **Integration Tests:** Testing interactions between components (e.g., service with repository).
*   **API Tests:** End-to-end tests for API endpoints.
*   **Code Quality:** Static analysis (via compiler flags), adherence to C++ best practices.

## Prerequisites

*   **CMake:** Version 3.10 or higher
*   **C++ Compiler:** GCC/Clang with C++17/C++20 support
*   **Git**
*   **Docker & Docker Compose** (for containerized setup)
*   **Libraries:**
    *   `Crow` (Web Framework)
    *   `jsoncpp` (JSON handling)
    *   `sqlite3` (Database)
    *   `jwt-cpp` (JWT)
    *   `spdlog` (Logging)
    *   `Google Test` (for running tests)
    *   `OpenSSL` (dependency for `jwt-cpp`)

    *Note: For simplicity in this example, some libraries are assumed to be installed system-wide or cloned into a `vendor/` directory and linked via `CMakeLists.txt` include paths. In a real project, consider using a package manager like `Conan` or `vcpkg` for C++ dependency management.*

## Setup and Installation

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/your-username/task-manager-system.git
    cd task-manager-system
    ```

2.  **Install C++ Libraries (Manual/System-wide - adjust for your OS):**
    *   **Ubuntu/Debian:**
        ```bash
        sudo apt update
        sudo apt install -y build-essential cmake libssl-dev libjsoncpp-dev libsqlite3-dev libgtest-dev
        # For jwt-cpp and spdlog, you might clone them into `vendor/` or install via system if available
        # Example for jwt-cpp (assuming it's not pre-packaged):
        mkdir -p vendor && cd vendor
        git clone https://github.com/Thalhammer/jwt-cpp.git
        git clone https://github.com/gabime/spdlog.git
        cd ..
        ```
    *   **macOS (with Homebrew):**
        ```bash
        brew install cmake jsoncpp sqlite3 openssl google-test
        # For jwt-cpp and spdlog, clone into vendor/ as above
        ```

3.  **Build using CMake:**
    ```bash
    mkdir build
    cd build
    cmake .. -DCMAKE_BUILD_TYPE=Release # Or Debug for development
    make
    ```
    This will create the executable `task_manager_app` in the `build/` directory.

4.  **Run the Application (Native):**
    ```bash
    # Ensure config.json is in the project root or accessible
    # Create data and logs directories
    mkdir -p ../data ../logs
    # Copy config.json if not in CWD or build dir
    cp ../config.json .

    ./task_manager_app
    ```
    The API server will start on port 8080 (or as configured in `config.json`).

## Docker Setup

For a consistent and isolated environment, use Docker:

1.  **Build Docker Image:**
    ```bash
    docker-compose build
    ```

2.  **Run with Docker Compose:**
    ```bash
    docker-compose up -d
    ```
    The application will be accessible at `http://localhost:8080`.
    Logs will be in `./logs` and database in `./data` on your host machine.

3.  **Stop Docker Compose:**
    ```bash
    docker-compose down
    ```

## Testing

1.  **Build Tests:**
    Ensure you've built the project using CMake (`make` in the `build/` directory).
    The `test_runner` executable will be created in `build/test/`.

2.  **Run Tests:**
    ```bash
    cd build/test
    ./test_runner
    ```
    This will execute all unit, integration, and API (if configured to hit local server) tests.

    For detailed test output:
    ```bash
    ./test_runner --gtest_output="xml:test_results.xml" --gtest_brief=0
    ```

## API Documentation

Refer to `docs/api.md` for detailed API endpoint specifications.

## Architecture Documentation

Refer to `docs/architecture.md` for an overview of the system design, layered architecture, and component interactions.

## Deployment Guide

Refer to `docs/deployment.md` for detailed instructions on deploying the application to various environments (e.g., bare metal, cloud VMs, Kubernetes).

## Security Considerations

*   **JWT Secret:** **Crucially**, change `jwt_secret` in `config.json` and in `docker-compose.yml` environment variables to a very strong, randomly generated string (at least 32 characters, ideally 64 bytes). Do not hardcode it in production. Use environment variables or a secrets manager.
*   **HTTPS:** Always deploy behind a reverse proxy (e.g., Nginx, Caddy) to enable HTTPS. The C++ application itself serves HTTP for simplicity, but production must use HTTPS.
*   **Password Hashing:** The `Hasher` utility uses a placeholder. In a real-world scenario, integrate a robust library like `argon2` or `bcrypt` (e.g., `libargon2` or `libbcrypt` C++ wrappers). These are computationally intensive and resistant to brute-force attacks.
*   **Input Validation:** Implement comprehensive input validation beyond basic checks to prevent XSS, injection attacks.
*   **Error Handling:** Detailed error messages should not be exposed to end-users in production. Standardized, generic error messages are preferred.
*   **Logging:** Ensure sensitive information (passwords, JWTs) is never logged.
*   **Least Privilege:** Run the application with the minimum necessary privileges, especially in Docker containers. The `docker-compose.yml` includes `no-new-privileges` and `cap_drop` directives.
*   **Dependency Management:** Regularly update C++ libraries to patch security vulnerabilities.

---