# E-Commerce C++ Solution System

This project provides a comprehensive, production-ready e-commerce solution with a C++ core application. It features a robust backend API, a console-based C++ client, a PostgreSQL database, Docker containerization, CI/CD setup, extensive testing, and critical enterprise-grade features like authentication, logging, caching, and rate limiting.

The architecture emphasizes modularity, clean code, and adherence to software engineering best practices, focusing on programming logic, algorithm design, and technical problem-solving.

## Table of Contents

1.  [Introduction](#introduction)
2.  [Architecture](#architecture)
    *   [High-Level Diagram](#high-level-diagram)
    *   [Core Modules](#core-modules)
    *   [Technology Stack](#technology-stack)
3.  [Features](#features)
4.  [Setup Instructions](#setup-instructions)
    *   [Prerequisites](#prerequisites)
    *   [Local Development Setup (without Docker)](#local-development-setup-without-docker)
    *   [Docker Setup](#docker-setup)
5.  [Running the Application](#running-the-application)
    *   [Running the Backend](#running-the-backend)
    *   [Running the Client](#running-the-client)
6.  [Database Layer](#database-layer)
    *   [Schema](#schema)
    *   [Migrations & Seeding](#migrations--seeding)
    *   [Query Optimization](#query-optimization)
7.  [Configuration & Environment](#configuration--environment)
8.  [Testing & Quality](#testing--quality)
    *   [Unit Tests](#unit-tests)
    *   [Integration Tests](#integration-tests)
    *   [API Tests](#api-tests)
    *   [Performance Testing (Conceptual)](#performance-testing-conceptual)
9.  [Documentation](#documentation)
    *   [API Documentation](#api-documentation)
    *   [Architecture Documentation](#architecture-documentation)
    *   [Deployment Guide](#deployment-guide)
10. [Additional Features](#additional-features)
    *   [Authentication & Authorization](#authentication--authorization)
    *   [Logging & Monitoring](#logging--monitoring)
    *   [Error Handling](#error-handling)
    *   [Caching Layer](#caching-layer)
    *   [Rate Limiting](#rate-limiting)
11. [CI/CD Pipeline](#cicd-pipeline)
12. [Future Enhancements](#future-enhancements)
13. [Contributing](#contributing)
14. [License](#license)

## 1. Introduction

This project aims to provide a robust foundation for an e-commerce platform using C++. The backend is built with the Crow C++ web framework, interacting with a PostgreSQL database. A console-based C++ client demonstrates API interaction. The solution covers essential aspects of modern software development, including containerization, automated testing, and comprehensive documentation.

## 2. Architecture

### High-Level Diagram

```
+------------------+     +------------------+
| C++ Console Client | <-> | C++ Backend (Crow) |
|   (User Interface) |     | (API Endpoints)  |
+------------------+     +--------+---------+
                                  |
                                  | HTTP/TCP
                                  |
                           +------+---------+
                           |  PostgreSQL DB |
                           | (Data Storage) |
                           +----------------+

Components:
- C++ Console Client: User-facing interface (command-line) for interacting with the e-commerce system.
- C++ Backend (Crow): Handles business logic, API routing, authentication, data validation, and database interactions.
- PostgreSQL DB: Persistent storage for users, products, orders, and other e-commerce data.

Additional Features Integrated into Backend:
- Authentication (JWT)
- Authorization (Role-based, simple for demo)
- Logging (spdlog)
- Error Handling Middleware
- Caching (In-memory)
- Rate Limiting (In-memory per IP)
```

### Core Modules

*   **User Management:** Registration, login, profile management.
*   **Product Management:** CRUD operations for products (admins), browsing (users).
*   **Shopping Cart:** Add/remove items, view cart.
*   **Order Management:** Place orders, view order history.
*   **Authentication & Authorization:** Secure access to API endpoints.

### Technology Stack

*   **Core Application Language:** C++17/20
*   **Backend Framework:** [Crow](https://github.com/ipkn/crow) (C++ Web Framework)
*   **Database:** [PostgreSQL](https://www.postgresql.org/)
*   **Database Driver:** [Pqxx](https://github.com/jtv/pqxx) (C++ client for PostgreSQL)
*   **JSON Handling:** [Nlohmann/json](https://github.com/nlohmann/json) (C++ JSON library)
*   **Logging:** [spdlog](https://github.com/gabime/spdlog) (Fast C++ logging library)
*   **HTTP Client (for C++ Client):** [libcurl](https://curl.se/libcurl/)
*   **Dependency Management:** [vcpkg](https://vcpkg.io/en/index.html) (C++ package manager)
*   **Build System:** [CMake](https://cmake.org/)
*   **Testing Framework:** [Google Test](https://github.com/google/googletest)
*   **Containerization:** [Docker](https://www.docker.com/)
*   **CI/CD:** [GitHub Actions](https://docs.github.com/en/actions)
*   **API Documentation:** [OpenAPI (Swagger)](https://swagger.io/specification/)

## 3. Features

### Core E-commerce Functionality

*   User Registration & Login
*   Product Listing & Detail View
*   Shopping Cart management (add, remove, update quantity)
*   Order Placement
*   View Order History
*   Admin features: Add/Update/Delete Products (simplified for demo)

### Enterprise-Grade Features

*   **Authentication:** JWT-based user authentication.
*   **Authorization:** Role-based access control (Admin/User).
*   **Logging:** Structured logging for request tracing and error diagnostics.
*   **Error Handling:** Centralized error handling middleware for consistent API responses.
*   **Caching:** In-memory caching for frequently accessed data (e.g., product listings).
*   **Rate Limiting:** Protects API endpoints from abuse.
*   **Configuration:** Environment variable-based configuration.
*   **Dockerization:** Easy setup and deployment using Docker.
*   **CI/CD:** Automated build, test, and potentially deployment workflows.
*   **Comprehensive Testing:** Unit, integration, and API tests.

## 4. Setup Instructions

### Prerequisites

*   Git
*   CMake (>= 3.15)
*   C++ Compiler (GCC >= 9 or Clang >= 9, MSVC >= 2019)
*   `vcpkg` (Follow official [installation instructions](https://vcpkg.io/en/getting-started.html))
    *   Set `VCPKG_ROOT` environment variable to your vcpkg installation directory.
*   PostgreSQL (for local dev without Docker)
*   Docker & Docker Compose (for Docker setup)

### Local Development Setup (without Docker)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/ecommerce-cpp.git
    cd ecommerce-cpp
    ```

2.  **Install C++ Dependencies using vcpkg:**
    ```bash
    # Ensure VCPKG_ROOT is set, e.g., export VCPKG_ROOT=/path/to/vcpkg
    vcpkg install --triplet=$(vcpkg_target_triplet) # e.g., x64-linux, x64-windows
    ```
    *Note: `vcpkg_target_triplet` will automatically detect your system's triplet. You might need to specify it manually, e.g., `vcpkg install --triplet x64-linux`.*

3.  **Set up PostgreSQL Database:**
    *   Install PostgreSQL if you don't have it.
    *   Create a new database and a user.
        ```sql
        CREATE USER ecommerce_user WITH PASSWORD 'ecommerce_password';
        CREATE DATABASE ecommerce_db OWNER ecommerce_user;
        GRANT ALL PRIVILEGES ON DATABASE ecommerce_db TO ecommerce_user;
        ```
    *   Apply the schema and seed data:
        ```bash
        psql -h localhost -U ecommerce_user -d ecommerce_db -f db/schema.sql
        psql -h localhost -U ecommerce_user -d ecommerce_db -f db/seed.sql
        ```

4.  **Configure Environment Variables:**
    *   Copy `config/.env.example` to `config/.env` and update with your database credentials.
        ```
        DB_HOST=localhost
        DB_PORT=5432
        DB_NAME=ecommerce_db
        DB_USER=ecommerce_user
        DB_PASSWORD=ecommerce_password
        APP_PORT=8080
        JWT_SECRET=your_super_secret_jwt_key_here_at_least_32_chars
        ```

5.  **Build the Project:**
    ```bash
    mkdir build
    cd build
    cmake .. -DCMAKE_TOOLCHAIN_FILE=$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake
    cmake --build .
    ```

### Docker Setup

1.  **Build Docker Images:**
    ```bash
    docker-compose build
    ```

2.  **Run Services:**
    ```bash
    docker-compose up -d
    ```
    This will start the PostgreSQL database and the C++ backend application. The database will be initialized and seeded automatically (see `docker-entrypoint-initdb.d` in `Dockerfile`).

## 5. Running the Application

### Running the Backend (Local Dev)

From the `build` directory:
```bash
cd build
./src/backend/ecommerce_backend # Or `.\Debug\src\backend\ecommerce_backend.exe` on Windows
```
The backend will start on the port specified in `config/.env` (default 8080).

### Running the Client (Local Dev)

From the `build` directory:
```bash
cd build
./src/client/ecommerce_client # Or `.\Debug\src\client\ecommerce_client.exe` on Windows
```
The client will connect to the backend running on `localhost:8080` (or `APP_PORT` from `.env`).

## 6. Database Layer

### Schema

The `db/schema.sql` file defines the tables and their relationships:

*   **`users`**: Stores user information, including roles (customer, admin).
    *   `id`, `username`, `email`, `password_hash`, `role`, `created_at`, `updated_at`
*   **`products`**: Stores product details.
    *   `id`, `name`, `description`, `price`, `stock`, `image_url`, `created_at`, `updated_at`
*   **`orders`**: Stores order information.
    *   `id`, `user_id`, `total_amount`, `status`, `created_at`, `updated_at`
*   **`order_items`**: Stores individual items within an order.
    *   `id`, `order_id`, `product_id`, `quantity`, `price`
*   **`carts`**: Stores user's active shopping cart. (One cart per user)
    *   `id`, `user_id`, `created_at`, `updated_at`
*   **`cart_items`**: Stores products within a shopping cart.
    *   `id`, `cart_id`, `product_id`, `quantity`

### Migrations & Seeding

*   `db/schema.sql`: Contains `CREATE TABLE` statements for all necessary tables.
*   `db/seed.sql`: Contains `INSERT` statements to populate the database with initial users and products for testing.
    *   Default Admin User: `admin@example.com` / `password123`
    *   Default Customer User: `user@example.com` / `password123`

When running with Docker, these scripts are automatically executed during container startup. For local development, they need to be run manually as described in the [setup section](#local-development-setup-without-docker).

### Query Optimization

*   **Indexes:** Necessary indexes are defined in `schema.sql` (e.g., `users.email`, `products.name`, foreign keys).
*   **Parameterized Queries:** All database interactions use `pqxx::connection::exec_params` to prevent SQL injection and allow the database to cache query plans.
*   **Efficient Joins:** Queries are designed to use efficient joins when retrieving related data (e.g., `orders` with `order_items` and `products`).
*   **Batch Operations:** For future high-throughput scenarios, batch `INSERT`/`UPDATE` operations could be implemented.
*   **Caching:** An in-memory cache is implemented for frequently accessed product data to reduce database load.

## 7. Configuration & Environment

*   **`config/.env`**: Stores sensitive information and dynamic configuration (database credentials, application port, JWT secret). Loaded by the backend at startup.
*   **`config/crow_config.json`**: Can be used for Crow-specific configurations (e.g., thread pool size, SSL settings). (Currently a placeholder, default Crow settings used).
*   **`vcpkg.json`**: Manifest file for vcpkg, listing all C++ dependencies.

## 8. Testing & Quality

The project employs a multi-layered testing strategy using Google Test for C++ code.

### Unit Tests

Focus on individual functions, classes, and components in isolation.
*   Located in `tests/unit/`.
*   Aims for 80%+ coverage on core business logic services (e.g., `AuthService`, `ProductService`).
*   Mocks database interactions where appropriate to ensure true isolation.

To run unit tests:
```bash
cd build
./tests/unit/ecommerce_unit_tests # Or `.\Debug\tests\unit\ecommerce_unit_tests.exe` on Windows
```

### Integration Tests

Verify the interaction between different components, especially the backend services with the actual PostgreSQL database.
*   Located in `tests/integration/`.
*   These tests require a running PostgreSQL instance (either local or via Docker).
*   They perform actual CRUD operations against a test database or a clean instance of the main database.

To run integration tests:
```bash
cd build
./tests/integration/ecommerce_integration_tests # Or `.\Debug\tests\integration\ecommerce_integration_tests.exe` on Windows
```

### API Tests

These tests verify the behavior of the API endpoints, ensuring they return correct data and status codes.
*   Not implemented directly in C++ within the `tests` directory.
*   Can be performed using tools like `curl`, Postman, or a simple Python script (`api_test.py` provided as an example outside the C++ codebase).

Example `api_test.py`:
```python
# api_test.py (outside C++ source, for demonstration)
import requests
import json

BASE_URL = "http://localhost:8080/api/v1"

def test_register_and_login():
    print("--- Register User ---")
    register_data = {"username": "testuser", "email": "test@example.com", "password": "testpassword"}
    r = requests.post(f"{BASE_URL}/auth/register", json=register_data)
    print(f"Register Status: {r.status_code}, Response: {r.json()}")
    assert r.status_code == 201 or "User with this email already exists" in r.json().get("message", "") # Handle existing user

    print("\n--- Login User ---")
    login_data = {"email": "test@example.com", "password": "testpassword"}
    r = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    print(f"Login Status: {r.status_code}, Response: {r.json()}")
    assert r.status_code == 200
    token = r.json()["token"]
    print(f"Obtained Token: {token}")
    return token

def test_admin_login():
    print("\n--- Admin Login ---")
    login_data = {"email": "admin@example.com", "password": "password123"}
    r = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    print(f"Admin Login Status: {r.status_code}, Response: {r.json()}")
    assert r.status_code == 200
    admin_token = r.json()["token"]
    print(f"Obtained Admin Token: {admin_token}")
    return admin_token

def test_products(token, admin_token):
    headers = {"Authorization": f"Bearer {token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    print("\n--- Get Products (User) ---")
    r = requests.get(f"{BASE_URL}/products", headers=headers)
    print(f"Get Products Status: {r.status_code}, Response: {r.json()}")
    assert r.status_code == 200

    print("\n--- Add Product (Admin) ---")
    product_data = {"name": "Test Product", "description": "A product for testing", "price": 99.99, "stock": 10}
    r = requests.post(f"{BASE_URL}/products", json=product_data, headers=admin_headers)
    print(f"Add Product Status: {r.status_code}, Response: {r.json()}")
    assert r.status_code == 201
    new_product_id = r.json()["id"]

    print("\n--- Get Product by ID (User) ---")
    r = requests.get(f"{BASE_URL}/products/{new_product_id}", headers=headers)
    print(f"Get Product by ID Status: {r.status_code}, Response: {r.json()}")
    assert r.status_code == 200

    print("\n--- Update Product (Admin) ---")
    update_data = {"name": "Updated Test Product", "price": 109.99}
    r = requests.put(f"{BASE_URL}/products/{new_product_id}", json=update_data, headers=admin_headers)
    print(f"Update Product Status: {r.status_code}, Response: {r.json()}")
    assert r.status_code == 200

    print("\n--- Delete Product (Admin) ---")
    r = requests.delete(f"{BASE_URL}/products/{new_product_id}", headers=admin_headers)
    print(f"Delete Product Status: {r.status_code}, Response: {r.json()}")
    assert r.status_code == 204 # No Content

def run_all_api_tests():
    user_token = test_register_and_login()
    admin_token = test_admin_login()
    test_products(user_token, admin_token)
    print("\nAll API tests completed.")

if __name__ == "__main__":
    run_all_api_tests()
```

### Performance Testing (Conceptual)

While not implemented with code, performance testing would involve:
*   **Load Testing:** Using tools like ApacheBench (`ab`), JMeter, or `k6` to simulate high user traffic and measure response times, throughput, and error rates.
*   **Stress Testing:** Pushing the system beyond its normal operating limits to find breaking points.
*   **Scalability Testing:** Observing how the system performs as resources (CPU, RAM, database connections) are added or removed.
*   **Monitoring:** Using tools like Prometheus/Grafana or cloud-native monitoring solutions to observe system metrics during tests.

Key metrics to monitor:
*   Response Latency (P95, P99)
*   Requests Per Second (RPS)
*   Error Rate
*   CPU/Memory Utilization
*   Database Connection Pool usage

## 9. Documentation

### API Documentation

The `openapi.yaml` file defines the RESTful API using the OpenAPI Specification (Swagger). It details endpoints, request/response schemas, authentication methods, and error responses.

*   You can use tools like Swagger UI or Postman to visualize and interact with the API based on this specification.

### Architecture Documentation

This `README.md` serves as the primary architecture documentation, detailing the system's structure, components, data flow, and key design decisions.

### Deployment Guide

The `Dockerfile` and `docker-compose.yml` provide a clear deployment guide for containerized environments.

**Steps for Docker Deployment:**

1.  **Ensure Docker and Docker Compose are installed** on your deployment server.
2.  **Clone the repository:** `git clone https://github.com/your-username/ecommerce-cpp.git && cd ecommerce-cpp`
3.  **Create a `.env` file** in the `config/` directory with production-ready credentials for your database and a strong JWT secret.
    ```
    DB_HOST=db       # 'db' because it's the service name in docker-compose
    DB_PORT=5432
    DB_NAME=ecommerce_db
    DB_USER=ecommerce_user
    DB_PASSWORD=your_secure_db_password
    APP_PORT=8080
    JWT_SECRET=a_very_long_and_complex_secret_for_jwt_in_production
    ```
4.  **Build and run the containers:**
    ```bash
    docker-compose -f docker-compose.yml up --build -d
    ```
    *   `--build`: Rebuilds images if changes were made. Omit if images are already built and up-to-date.
    *   `-d`: Runs containers in detached mode.
5.  **Verify services:**
    ```bash
    docker-compose ps
    ```
    You should see `ecommerce_backend` and `ecommerce_db` running.
6.  **Access the API:** The backend will be accessible on port `8080` of the host machine (or the port you configured).
    ```bash
    curl http://localhost:8080/api/v1/health
    ```
    (Replace `localhost` with your server's IP if deployed remotely).

**Scaling Considerations:**
*   For horizontal scaling, use an orchestrator like Kubernetes to manage multiple instances of the `ecommerce_backend` service behind a load balancer.
*   The database (`ecommerce_db`) would typically be managed as a separate, highly available service (e.g., AWS RDS, Azure Database for PostgreSQL, or a self-managed cluster with replication).

## 10. Additional Features

### Authentication & Authorization

*   **JWT (JSON Web Tokens):** Used for stateless authentication.
    *   On successful login, a JWT containing `user_id`, `email`, `role`, and `exp` (expiration) claims is issued.
    *   Clients include this token in the `Authorization: Bearer <token>` header for subsequent requests.
*   **`AuthMiddleware`**: Intercepts requests, validates the JWT, extracts user information, and sets it in the request context.
*   **Role-Based Authorization:** Endpoints are protected based on user roles (`admin`, `customer`). For example, product creation/update/deletion is restricted to `admin` users.

### Logging & Monitoring

*   **`spdlog`**: Integrated for structured and efficient logging.
*   **`LoggingMiddleware`**: Logs incoming requests and their key details (method, path, IP, user ID, status code, duration).
*   **Log Levels**: Supports `debug`, `info`, `warn`, `error`, `critical`.
*   **Output**: Logs are written to `stdout` and can be configured for file output or external log aggregators (e.g., ELK stack, Splunk).
*   **Error Logging**: Uncaught exceptions or explicit error conditions are logged with `error` or `critical` levels.

### Error Handling

*   **`ErrorHandlingMiddleware`**: Catches exceptions thrown by route handlers or other middleware.
*   **Standardized Error Responses**: Returns consistent JSON error objects (`{"message": "Error description", "code": 400}`).
*   **Specific Error Types**: Custom exception classes for common errors (e.g., `NotFoundException`, `UnauthorizedException`, `ValidationException`).

### Caching Layer

*   **In-Memory Cache**: A simple `std::unordered_map`-based cache is implemented in `CacheManager` for frequently accessed data.
*   **TTL (Time-To-Live)**: Items in the cache can have an expiration time.
*   **Use Case**: Currently applied to `ProductService` for `get_all_products` and `get_product_by_id` to reduce database load.

### Rate Limiting

*   **`RateLimitMiddleware`**: Implements a simple sliding window counter per IP address.
*   **Configuration**: Configurable request limits (e.g., 100 requests per minute).
*   **Response**: Sends a `429 Too Many Requests` status code with a `Retry-After` header when limits are exceeded.
*   **Storage**: Uses an in-memory `std::unordered_map` to track request counts for demonstration. For production, a distributed cache like Redis would be used.

## 11. CI/CD Pipeline

A `.github/workflows/ci-cd.yml` file defines a GitHub Actions workflow for Continuous Integration and Continuous Deployment.

**Workflow Stages:**

1.  **Build:** Compiles the C++ backend and client applications.
2.  **Test:** Runs unit and integration tests.
3.  **Containerize (Optional/Conceptual):** Builds Docker images (can be extended to push to a container registry).
4.  **Deploy (Conceptual):** (Placeholder) Demonstrates where deployment steps would go (e.g., deploying new Docker images to a Kubernetes cluster or a VM).

This ensures that every code change is automatically built and tested, maintaining code quality and preventing regressions.

## 12. Future Enhancements

*   **Web-based Frontend:** Implement a modern web frontend using React, Vue, Angular, or a server-side rendered C++ framework like Wt.
*   **Payment Gateway Integration:** Integrate with Stripe, PayPal, etc.
*   **Search & Filtering:** Advanced product search, filtering, and sorting capabilities.
*   **Recommendations Engine:** Implement a basic product recommendation system.
*   **Admin Dashboard:** A dedicated web interface for administrators.
*   **Asynchronous Operations:** Use Boost.ASIO or similar for non-blocking I/O in the backend.
*   **Distributed Caching:** Integrate Redis for a shared, persistent cache.
*   **Message Queues:** Use Kafka or RabbitMQ for decoupled processing (e.g., order fulfillment, notifications).
*   **Observability:** More advanced metrics collection (Prometheus), distributed tracing (OpenTelemetry).
*   **Full Text Search:** Integrate with Elasticsearch or PostgreSQL's built-in FTS.
*   **Shopping Cart Persistence (Anonymous):** Allow unauthenticated users to maintain a cart.

## 13. Contributing

Feel free to fork the repository, make improvements, and submit pull requests.

## 14. License

This project is licensed under the MIT License. See the `LICENSE` file for details (not included in this response, but would be in a real project).