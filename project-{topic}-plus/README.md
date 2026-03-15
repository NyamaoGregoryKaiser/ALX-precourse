# Enterprise-Grade C++ DevOps Automation System

This project provides a comprehensive, production-ready DevOps automation system with a C++ backend. It features a RESTful API, a robust database layer, extensive testing, CI/CD pipelines, Dockerization, and advanced enterprise features like authentication, logging, caching, and rate limiting.

## Table of Contents

1.  [Project Overview](#1-project-overview)
2.  [Features](#2-features)
3.  [Prerequisites](#3-prerequisites)
4.  [Local Setup & Development](#4-local-setup--development)
    *   [Building the Application](#building-the-application)
    *   [Running with Docker Compose](#running-with-docker-compose)
    *   [Interacting with the API](#interacting-with-the-api)
5.  [Testing](#5-testing)
    *   [Unit Tests](#unit-tests)
    *   [Integration Tests](#integration-tests)
    *   [API Tests](#api-tests)
    *   [Performance Tests](#performance-tests)
6.  [Database Management](#6-database-management)
7.  [CI/CD Pipeline](#7-cicd-pipeline)
8.  [Documentation](#8-documentation)
9.  [Architecture](#9-architecture)
10. [Deployment](#10-deployment)
11. [License](#11-license)

## 1. Project Overview

This system demonstrates a full-stack approach with a focus on backend development using modern C++ principles. It aims to provide a boilerplate for enterprise-grade applications, emphasizing maintainability, scalability, and automated processes.

The core application manages `Users`, `Products`, and `Orders` through a RESTful API.

## 2. Features

*   **C++ Backend:**
    *   RESTful API using `CrowCpp`.
    *   CRUD operations for Users, Products.
    *   Modular design (Models, Services, Controllers).
    *   JSON-based request/response.
*   **Database:**
    *   SQLite (via `SQLiteCpp`) for simplicity in local setup.
    *   Schema definition and seed data.
    *   Basic migration mechanism.
*   **Authentication & Authorization:**
    *   JWT-based authentication using `jwt-cpp`.
    *   Middleware for protected routes.
    *   Simple role-based authorization.
*   **Logging:**
    *   Structured logging with `spdlog`.
    *   Log levels and file rotation.
*   **Error Handling:**
    *   Centralized exception handling middleware.
    *   Consistent JSON error responses.
*   **Caching:**
    *   In-memory cache with Time-To-Live (TTL).
*   **Rate Limiting:**
    *   Fixed-window rate limiting middleware to protect endpoints.
*   **Containerization:**
    *   `Dockerfile` for the C++ application.
    *   `docker-compose.yml` for local development orchestration.
*   **CI/CD:**
    *   GitHub Actions workflow for automated build, test, and deployment.
*   **Testing:**
    *   Unit tests (Google Test).
    *   Integration tests (Google Test, interacting with a test DB).
    *   API tests (`curl` scripts).
    *   Performance tests (`hey` / `ab` scripts).
*   **Documentation:**
    *   Comprehensive `README.md`.
    *   Detailed `API_DOCS.md`.
    *   `ARCHITECTURE.md` for system overview.
    *   `DEPLOYMENT.md` for deployment guidance.

## 3. Prerequisites

*   **Git:** For cloning the repository.
*   **Docker & Docker Compose:** For containerized development and deployment.
*   **CMake (>= 3.10):** If building natively.
*   **Conan (Optional, for native build):** C/C++ package manager.
*   **C++ Compiler (GCC/Clang supporting C++17/20):** If building natively.
*   **`hey` or `ab` (Apache Bench):** For performance testing.

## 4. Local Setup & Development

### Clone the Repository

```bash
git clone https://github.com/your-username/cpp-devops-system.git
cd cpp-devops-system
```

### Environment Variables

Copy the example environment file and fill in your details.
```bash
cp .env.example .env
```
Edit `.env` as needed.

### Building the Application (Natively - Optional, Docker recommended)

This project uses `CMake` for building the C++ application and `Conan` for dependency management.

1.  **Install Conan (if not already installed):**
    ```bash
    pip install conan
    ```
2.  **Add Conan remotes (if necessary):**
    ```bash
    conan remote add conancenter https://center.conan.io
    ```
3.  **Create build directory and configure CMake:**
    ```bash
    cd app
    mkdir build && cd build
    conan install .. --build=missing -s build_type=Release # Or Debug
    cmake .. -DCMAKE_BUILD_TYPE=Release # Or Debug
    ```
4.  **Build the application:**
    ```bash
    cmake --build .
    ```
    The executable `cpp_devops_system_app` will be in `app/build/bin`.

5.  **Run the application (natively, without Docker):**
    Make sure you have an `app.db` initialized in the `db/` directory, or provide the path to `main.cpp`.
    ```bash
    # From project-root
    ./app/build/bin/cpp_devops_system_app
    ```

### Running with Docker Compose (Recommended)

Docker Compose simplifies setting up the application and its database.

1.  **Build and start services:**
    ```bash
    docker-compose up --build -d
    ```
    This will:
    *   Build the `cpp-app` Docker image based on `Dockerfile`.
    *   Start the `cpp-app` container.
    *   Initialize the `app.db` using `schema.sql` and `seed.sql`.
    *   Expose the application on port `8080`.

2.  **Verify services are running:**
    ```bash
    docker-compose ps
    ```

3.  **Stop services:**
    ```bash
    docker-compose down
    ```

### Interacting with the API

Once the application is running (e.g., via Docker Compose), you can interact with it using `curl` or any API client. The API will be available at `http://localhost:8080`.

Refer to `API_DOCS.md` for a complete list of endpoints and request/response formats.

**Example: Register a user**

```bash
curl -X POST -H "Content-Type: application/json" -d '{"username": "testuser", "email": "test@example.com", "password": "password123", "role": "USER"}' http://localhost:8080/auth/register
```

**Example: Login and get JWT token**

```bash
curl -X POST -H "Content-Type: application/json" -d '{"username": "testuser", "password": "password123"}' http://localhost:8080/auth/login
```

**Example: Access a protected route (e.g., get products) using the obtained token**

```bash
# Replace <YOUR_JWT_TOKEN> with the actual token
curl -X GET -H "Authorization: Bearer <YOUR_JWT_TOKEN>" http://localhost:8080/products
```

## 5. Testing

The project includes various types of tests to ensure quality and reliability.

### Unit Tests

Unit tests focus on individual components and business logic. They are written using Google Test.

1.  **Build tests (natively):**
    ```bash
    cd app/build # Assuming you're in the build directory
    cmake --build . --target run_tests
    ```
    (Or `cmake --build .` and then manually run the `cpp_devops_system_tests` executable)

2.  **Run tests (natively):**
    ```bash
    ./bin/cpp_devops_system_tests
    ```
    (If built with `cmake --build . --target run_tests`, it will run automatically)

### Integration Tests

Integration tests verify interactions between different components, e.g., controllers with services and the database.

*   These are included in the Google Test suite (`cpp_devops_system_tests`). They typically use an in-memory or a dedicated test database to ensure isolation.

### API Tests

API tests validate the external behavior of the API endpoints.

```bash
cd app/tests/api
chmod +x api_test.sh
./api_test.sh
```
*Note: Ensure the application is running (e.g., via `docker-compose up`) before running API tests.*

### Performance Tests

Performance tests help identify bottlenecks and ensure the API can handle expected load.

```bash
cd app/tests/performance
chmod +x performance_test.sh
./performance_test.sh
```
*Note: Ensure the application is running before running performance tests. You might need to install `hey` (`go install github.com/rakyll/hey@latest`) or `ab` (`sudo apt-get install apache2-utils`).*

## 6. Database Management

The `db/` directory contains:
*   `schema.sql`: Defines the database tables and their structure.
*   `seed.sql`: Populates the database with initial data for development/testing.
*   `migrations/`: Contains example migration scripts. For SQLite, migrations are typically managed manually or with simple scripts. For production, consider dedicated migration tools with PostgreSQL/MySQL.

During `docker-compose up`, `schema.sql` and `seed.sql` are automatically applied to the `app.db` volume.

## 7. CI/CD Pipeline

The project uses GitHub Actions for CI/CD. The workflow is defined in `.github/workflows/ci-cd.yml`.

**Pipeline Steps:**
1.  **Build:** Compiles the C++ application.
2.  **Test:** Runs unit, integration, and API tests.
3.  **Docker Build & Push:** Builds the Docker image and pushes it to a container registry (e.g., Docker Hub or GitHub Container Registry).
4.  **Deploy:** (Placeholder) Triggers deployment to a production environment.

Refer to `.github/workflows/ci-cd.yml` for details.

## 8. Documentation

*   **`README.md`**: You are reading it! Comprehensive setup and usage guide.
*   **`API_DOCS.md`**: Detailed OpenAPI/Swagger-style documentation for all API endpoints.
*   **`ARCHITECTURE.md`**: High-level overview of the system architecture, design choices, and component interactions.
*   **`DEPLOYMENT.md`**: Guide for deploying the application to various environments (e.g., Docker, Kubernetes, cloud VMs).

## 9. Architecture

The system follows a layered, modular architecture:

*   **Presentation Layer (Controllers):** Handles incoming HTTP requests, validates input, and delegates to the service layer.
*   **Service Layer (Services):** Contains core business logic, orchestrates data operations, and interacts with the database layer.
*   **Data Access Layer (Models/Database Utility):** Manages data persistence, converts between C++ objects and database records.
*   **Utilities:** Provides common functionalities like logging, JWT handling, error handling, caching, and rate limiting.

Further details can be found in `ARCHITECTURE.md`.

## 10. Deployment

The primary deployment strategy focuses on Docker containers. The `DEPLOYMENT.md` file provides guidance on how to deploy the Docker image to various cloud environments or Kubernetes clusters.

## 11. License

This project is open-source and available under the [MIT License](LICENSE).