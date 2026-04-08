```markdown
# DB-Optimizer: Production-Ready Database Optimization System

## Overview
DB-Optimizer is a comprehensive, enterprise-grade database optimization system designed to monitor, analyze, and recommend performance improvements for PostgreSQL databases. Built with C++, it provides a robust backend API for managing monitored databases, users, and optimization reports.

**Key Features:**
*   **Database Monitoring:** Connects to external PostgreSQL databases to collect query statistics (via `pg_stat_statements`) and execution plans (`EXPLAIN ANALYZE`).
*   **Query Analysis:** Parses SQL queries to identify tables, columns, and clauses involved in filtering, sorting, grouping, and joining.
*   **Index Recommendation:** Suggests optimal B-tree indexes based on workload analysis, slow queries, and sequential scan detection.
*   **RESTful API:** Provides full CRUD operations for users, monitored databases, query logs, and optimization reports.
*   **Authentication & Authorization:** Secure user management with JWT-based authentication and role-based access control.
*   **Logging & Monitoring:** Integrates `spdlog` for comprehensive logging and basic internal monitoring.
*   **Error Handling:** Centralized error handling middleware for API requests.
*   **Caching:** Simple in-memory caching layer for frequently accessed data.
*   **Rate Limiting:** Basic rate-limiting mechanism to protect API endpoints.
*   **Containerization:** Full Docker support for easy deployment and scalability.
*   **CI/CD Integration:** GitHub Actions workflow for automated testing and Docker image building.
*   **Comprehensive Testing:** Unit, integration, and API tests to ensure high quality and reliability.

## Architecture
(See `docs/ARCHITECTURE.md` for a detailed breakdown)

## Getting Started

### Prerequisites
*   Git
*   Docker & Docker Compose (recommended for local development)
*   CMake (if building natively)
*   C++ Compiler (GCC/Clang supporting C++17)
*   Poco C++ Libraries (dev packages)
*   spdlog (dev package)
*   jwt-cpp (dev package)
*   libpq-dev (PostgreSQL client library)

### Setup with Docker Compose (Recommended)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/db-optimizer.git
    cd db_optimizer
    ```

2.  **Create `.env` file:**
    Copy the example environment variables:
    ```bash
    cp .env.example .env
    # You can edit .env to customize ports, passwords, etc.
    ```

3.  **Build and run the services:**
    This will start:
    *   `db_optimizer_postgres`: The PostgreSQL database for the DB-Optimizer itself.
    *   `db_optimizer_app`: The C++ DB-Optimizer application.
    *   `target_postgres_db`: A mock PostgreSQL database (on port 5433) that the DB-Optimizer can monitor. This database has `pg_stat_statements` enabled and some sample tables/data.
    ```bash
    docker-compose up --build -d
    ```
    Wait for all services to become healthy. You can check their status with `docker-compose ps`. The `db_optimizer_app` container's logs will show migration and seeding progress, and then `Application running. Press CTRL+C to exit.` once ready.

4.  **Verify services:**
    Open your browser or use `curl`:
    ```bash
    curl http://localhost:8080/health
    # Expected output: {"status":"UP"}
    ```

### Native Build & Run (Alternative)

1.  **Install system dependencies:**
    ```bash
    sudo apt-get update
    sudo apt-get install -y build-essential cmake libpoco-dev libspdlog-dev libjwt-dev libpq-dev
    ```

2.  **Set up PostgreSQL:**
    You'll need a running PostgreSQL instance for the DB-Optimizer's own data.
    Create a database (`db_optimizer_db`) and a user (`db_optimizer_user`) with a password (`db_optimizer_password`).
    You can use the `db_optimizer_postgres` service from `docker-compose.yml` by just running that one, or a local installation.

3.  **Apply Migrations and Seed Data:**
    Ensure your `.env` file (or exported environment variables) has the correct DB credentials.
    ```bash
    ./scripts/migrate.sh
    ./scripts/seed.sh
    ```

4.  **Build the application:**
    ```bash
    mkdir build
    cd build
    cmake ..
    make -j$(nproc)
    ```

5.  **Run the application:**
    ```bash
    ./db_optimizer
    ```

## Usage (API)
(See `docs/API.md` for detailed API documentation)

**Example interactions using `curl` (after running with Docker Compose):**

1.  **Register a new user:**
    ```bash
    curl -X POST http://localhost:8080/auth/register -H "Content-Type: application/json" -d '{"username":"devuser","email":"dev@example.com","password":"devpassword","role":"user"}'
    # Expected: {"message":"User registered successfully"}
    ```

2.  **Login to get a JWT token:**
    ```bash
    LOGIN_RESPONSE=$(curl -X POST http://localhost:8080/auth/login -H "Content-Type: application/json" -d '{"email":"dev@example.com","password":"devpassword"}')
    JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r .token)
    echo $JWT_TOKEN # Save this token for subsequent authenticated requests
    ```

3.  **Add a Monitored Database (using the `target_postgres_db` from Docker Compose):**
    ```bash
    curl -X POST http://localhost:8080/monitored-dbs -H "Content-Type: application/json" -H "Authorization: Bearer $JWT_TOKEN" -d '{
        "name": "My Sample App DB",
        "db_type": "PostgreSQL",
        "host": "target_postgres_db",
        "port": 5432,
        "db_name": "target_db",
        "db_user": "target_user",
        "db_password": "target_password"
    }'
    # Expected: {"id":1,"message":"Monitored database added successfully"} (ID will vary)
    ```

4.  **Simulate some activity on the `target_postgres_db`:**
    (You'll need `psql` installed locally, or exec into `target_postgres_db` container)
    ```bash
    PGPASSWORD=target_password psql -h localhost -p 5433 -U target_user -d target_db -c "SELECT * FROM products WHERE category_id = 1;"
    PGPASSWORD=target_password psql -h localhost -p 5433 -U target_user -d target_db -c "SELECT o.id, p.name FROM orders o JOIN order_items oi ON o.id = oi.order_id JOIN products p ON oi.product_id = p.id WHERE o.user_id = 1;"
    sleep 5 # Give pg_stat_statements time to update
    ```

5.  **Trigger analysis for the monitored DB (replace `1` with the actual DB ID):**
    ```bash
    curl -X POST http://localhost:8080/monitored-dbs/1/analyze -H "Authorization: Bearer $JWT_TOKEN"
    # Expected: {"message":"Analysis triggered successfully for database ID 1"}
    ```

6.  **Retrieve Optimization Reports:**
    ```bash
    curl -X GET http://localhost:8080/monitored-dbs/1/optimization-reports -H "Authorization: Bearer $JWT_TOKEN"
    # Expected: A JSON array of reports
    ```

## Testing
To run tests, ensure your `docker-compose` environment is up and running, especially the `db_optimizer_postgres` and `target_postgres_db` services.

1.  **Run all tests (unit, integration, API):**
    ```bash
    docker-compose exec db_optimizer_app /bin/bash -c "cd build && ctest --output-on-failure && ../scripts/api_tests.sh"
    ```
    Or, if running natively after building:
    ```bash
    cd build
    ./unit_tests
    ./integration_tests
    cd .. # Go back to project root
    ./scripts/api_tests.sh
    ```

2.  **Performance Tests:**
    ```bash
    ./scripts/run_performance_test.sh 1000 100
    ```
    (This will run 1000 requests with 100 concurrency against `/health` and some authenticated endpoints.)

## Contributing
(Standard contribution guidelines - fork, branch, pull request)

## License
MIT License (or appropriate open-source license)

---
```