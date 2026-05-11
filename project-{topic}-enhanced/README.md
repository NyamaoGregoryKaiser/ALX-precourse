# Database Optimization System (DBO)

The Database Optimization System (DBO) is an enterprise-grade C++ application designed to provide comprehensive tools for monitoring, analyzing, and optimizing PostgreSQL databases. It aims to improve database performance by detecting slow queries, suggesting index improvements, identifying schema issues, and offering a robust API for integration.

## Features

*   **HTTP/JSON API**: RESTful API for all functionalities, built with Boost.Beast.
*   **Database Interaction**: PostgreSQL integration using `libpqxx` with a connection pool.
*   **Query Analysis**: Monitors and analyzes query logs to identify performance bottlenecks and suggest index recommendations.
*   **Schema Analysis**: Detects common schema issues (e.g., missing foreign keys, suboptimal data types).
*   **Authentication & Authorization**: JWT-based authentication with role-based access control.
*   **Configuration Management**: `.env` file for easy environment configuration.
*   **Logging**: Structured logging using `spdlog`.
*   **Error Handling**: Centralized error handling for API responses.
*   **Caching Layer**: In-memory caching for frequently accessed data (e.g., recommendations).
*   **Rate Limiting**: Protects API endpoints from abuse.
*   **Migrations**: Custom SQL migration system for database schema evolution.
*   **Containerization**: Docker support for easy deployment and isolation.
*   **CI/CD**: GitHub Actions pipeline for automated build, test, and deployment.
*   **Comprehensive Testing**: Unit, Integration, and API tests.
*   **Minimal Web UI**: A simple HTML/CSS frontend served directly by the C++ backend.

## Architecture

The DBO system follows a layered architecture:

1.  **Presentation Layer (API/Web)**: Handles HTTP requests, routing, authentication, and serves minimal static assets/HTML. Built on Boost.Beast.
2.  **Application/Service Layer**: Contains the core business logic, orchestrating interactions between repositories and external services (e.g., `QueryAnalyzerService`, `AuthService`).
3.  **Domain/Model Layer**: Defines data structures and business objects (`User`, `QueryLog`, `IndexRecommendation`, etc.).
4.  **Data Access Layer (Repository)**: Abstracts database operations, providing an interface for CRUD operations on models (`UserRepository`, `QueryLogRepository`). Uses `libpqxx` for PostgreSQL.
5.  **Infrastructure Layer**: Handles cross-cutting concerns like logging (`spdlog`), configuration, and connection pooling.

**Database**: PostgreSQL is used as the primary data store.

## Getting Started

### Prerequisites

*   **Docker** & **Docker Compose**: For containerized development and deployment.
*   **C++ Toolchain**:
    *   C++17 compatible compiler (g++ or clang++)
    *   CMake (3.10+)
    *   Boost (1.70+ components: system, program_options, asio, json)
    *   libpqxx (PostgreSQL C++ client library)
    *   nlohmann/json (JSON library)
    *   spdlog (logging library)
    *   Crypto++ (for password hashing, optional if using simpler hash)
    *   Google Test (for running tests)

    *Self-note: Using `vcpkg` or `Conan` is highly recommended for C++ dependency management.*

### Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/database-optimizer.git
    cd database-optimizer
    ```

2.  **Configure Environment Variables:**
    Copy the example environment file and populate it with your settings.
    ```bash
    cp .env.example .env
    # Open .env and fill in your DB credentials, JWT_SECRET, etc.
    # Ensure JWT_SECRET is a strong, random string at least 32 characters long.
    ```

3.  **Build and Run with Docker Compose:**
    This will build the C++ application image, start a PostgreSQL container, and run the DBO application.
    ```bash
    docker-compose up --build -d
    ```
    Wait for the services to start. You can check their status:
    ```bash
    docker-compose ps
    docker-compose logs -f db # Check DB logs for 'database system is ready to accept connections'
    docker-compose logs -f app # Check app logs for 'HTTP Server listening on 0.0.0.0:8080'
    ```

4.  **Access the Application:**
    *   **API**: `http://localhost:8080/api/v1/...`
    *   **Minimal Web UI**: `http://localhost:8080/`

    The default admin user created by the seed script is `admin` with password `admin_password_secure`. **Change this immediately in a production environment!**

### Manual Build (without Docker)

If you prefer to build natively:

1.  **Install Dependencies:**
    Refer to your OS package manager for `cmake`, `libboost-dev`, `libpqxx-dev`, `libssl-dev`, `spdlog`, `nlohmann-json-dev` (package names may vary).
    For Crypto++, you might need to build from source:
    ```bash
    wget https://www.cryptopp.com/cryptopp890.zip
    unzip cryptopp890.zip
    cd cryptopp890
    make -j$(nproc)
    sudo make install
    ```

2.  **Build the Project:**
    ```bash
    mkdir build
    cd build
    cmake ..
    make -j$(nproc)
    ```

3.  **Run Migrations & Seed Data (Manual DB Setup):**
    If running without Docker, you'll need a local PostgreSQL instance.
    *   Create the database and user as specified in your `.env`.
    *   Run migrations:
        ```bash
        psql -h <DB_HOST> -p <DB_PORT> -U <DB_USER> -d <DB_NAME> -f ../database/migrations/V1__create_initial_tables.sql
        psql -h <DB_HOST> -p <DB_PORT> -U <DB_USER> -d <DB_NAME> -f ../database/migrations/V2__add_index_recommendations_table.sql
        psql -h <DB_HOST> -p <DB_PORT> -U <DB_USER> -d <DB_NAME> -f ../database/migrations/V3__add_schema_issues_table.sql
        ```
    *   Run seed data:
        ```bash
        psql -h <DB_HOST> -p <DB_PORT> -U <DB_USER> -d <DB_NAME> -f ../database/seed/seed_data.sql
        ```
    *Note*: The C++ application's `MigrationManager` will handle this automatically if it connects to an empty database, but manual seeding might still be desired for base data.

4.  **Run the Application:**
    ```bash
    ./DatabaseOptimizer
    ```

## Testing

### Unit and Integration Tests

The project uses Google Test for C++ unit and integration tests.

1.  **Build Tests:**
    If you built manually, the test executable will be in the `build/tests/` directory.
    If using Docker Compose, the `build-and-test` stage of the CI/CD pipeline demonstrates how to run them.

2.  **Run Tests:**
    ```bash
    # If built manually:
    ./build/tests/DatabaseOptimizerTests

    # Via Docker Compose (after starting services with 'docker-compose up -d'):
    docker-compose exec app /app/build/tests/DatabaseOptimizerTests
    ```
    The integration tests require a running PostgreSQL instance and the DBO application.

### API Tests

API tests are performed using `curl` or similar HTTP clients, often automated in CI/CD.

```bash
# Example: Login (default admin user)
curl -X POST -H "Content-Type: application/json" -d '{"username": "admin", "password": "admin_password_secure"}' http://localhost:8080/api/v1/auth/login

# Example: Get recommendations (requires JWT token from login)
ADMIN_TOKEN="<paste_your_jwt_token_here>"
curl -H "Authorization: Bearer ${ADMIN_TOKEN}" http://localhost:8080/api/v1/recommendations
```

### Performance Tests

For performance testing, tools like `JMeter`, `Locust`, or `wrk` can be used to simulate load on the API.

*   **wrk example**:
    ```bash
    wrk -t4 -c100 -d30s http://localhost:8080/api/v1/recommendations -H "Authorization: Bearer ${ADMIN_TOKEN}"
    ```
    (Ensure you replace `${ADMIN_TOKEN}` with a valid JWT obtained from a login.)

## Contributing

Contributions are welcome! Please fork the repository, create a new branch, and submit a pull request.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
```