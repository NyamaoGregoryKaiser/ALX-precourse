# E-commerce C++ API

This project provides a comprehensive, production-ready backend API for an e-commerce platform, built entirely in modern C++. It follows a modular, layered architecture focusing on high performance, scalability, and maintainability, adhering to ALX Software Engineering principles.

## Features

**Core Application (C++)**
*   **RESTful API**: Full CRUD operations for Users, Products, Orders, and Cart Items.
*   **Layered Architecture**: Separation of concerns with Models, DAOs (Data Access Objects), Services (Business Logic), and Controllers (API Endpoints).
*   **Modular Design**: Clear module separation for Users, Products, Orders, and Authentication.
*   **Modern C++**: Utilizes C++17 features, smart pointers, RAII, and exception safety.
*   **Concurrency**: Built on CrowCpp for efficient, multithreaded request handling.

**Database Layer**
*   **PostgreSQL**: Robust relational database for transactional data.
*   **Schema Definitions**: Detailed SQL DDL for all tables and relationships.
*   **Migration-ready**: Structure for SQL migration scripts (e.g., Flyway/Liquibase compatible).
*   **Seed Data**: Example data for initial setup and testing.
*   **Connection Pooling**: Efficient database connection management with `libpqxx`.
*   **Query Optimization**: Indexed tables, parameterized queries, and best practices for performance.

**Configuration & Setup**
*   **CMake**: Standardized build system for C++ projects.
*   **Environment Variables**: Externalized configuration via `.env` files for different environments.
*   **Docker & Docker Compose**: Containerized application and services for easy setup and deployment.
*   **CI/CD Pipeline**: Conceptual GitHub Actions workflow for automated build, test, and deployment.

**Testing & Quality**
*   **Unit Tests**: Comprehensive unit tests for models, utilities, and service logic using Google Test/Mock. (Aim for 80%+ coverage)
*   **Integration Tests**: Database interaction tests for DAO and Service layers.
*   **API Tests**: Python-based functional tests to validate API endpoints.
*   **Performance Testing**: Guidance on tools and strategies for load, stress, and soak testing.

**Additional Features**
*   **Authentication & Authorization**: JWT (JSON Web Tokens) based authentication with role-based access control (RBAC) middleware.
*   **Logging & Monitoring**: Structured logging with `spdlog` for application insights and error tracking.
*   **Error Handling Middleware**: Centralized, robust error handling with standardized JSON responses.
*   **Caching Layer**: Conceptual integration with Redis for data caching.
*   **Rate Limiting**: IP-based rate limiting middleware to prevent abuse and ensure service stability.

## Getting Started

### Prerequisites

*   Docker & Docker Compose
*   CMake (if building locally outside Docker)
*   C++17 compiler (e.g., GCC 9+ or Clang 9+)
*   `libpqxx` development libraries (if building locally)
*   `libssl-dev` (for JWT/OpenSSL)
*   `libcrypt-dev` (for bcrypt)
*   `git`

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ecommerce-cpp.git
cd ecommerce-cpp
```

### 2. Configure Environment Variables

Create a `.env` file in the `config/` directory by copying the example:

```bash
cp config/.env.example config/.env
```

Edit `config/.env` and update the values as needed. **Crucially, generate a strong `JWT_SECRET` for production.** For development, you can use `JwtUtils::generateRandomSecret()` in a temporary program or set a placeholder.

```dotenv
# config/.env
DB_HOST=db
DB_PORT=5432
DB_NAME=ecommerce_db
DB_USER=user
DB_PASSWORD=password
DB_POOL_SIZE=10
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
JWT_SECRET=your_very_long_and_secure_jwt_secret_here_for_prod
JWT_EXPIRY_SECONDS=3600
REDIS_HOST=redis
REDIS_PORT=6379
LOG_LEVEL=info
RATE_LIMIT_RPM=60
```
**Note:** `DB_HOST` and `REDIS_HOST` should be `localhost` if running outside Docker Compose, or the service name (`db`, `redis`) if running inside Docker Compose. The `docker-compose.yml` automatically sets these to `db` and `redis`.

### 3. Build and Run with Docker Compose (Recommended)

This will set up PostgreSQL, Redis, and the C++ application.

```bash
docker-compose -f docker/docker-compose.yml up --build -d
```

*   `--build`: Rebuilds the Docker image for the application. Use this after code changes.
*   `-d`: Runs containers in detached mode.

Verify services are running:
```bash
docker-compose ps
```

Check application logs:
```bash
docker-compose logs -f app
```

### 4. Access the API

Once the application is running, you can access it at `http://localhost:8080`.

*   **Health Check**: `GET http://localhost:8080/`
*   **API Documentation**: Refer to `docs/API.md` for endpoint details.

### 5. Running Tests

The project includes unit, integration, and API tests.

#### Using Docker Compose (Recommended for consistency)

```bash
# Ensure test DB is set up (see .github/workflows for an example of docker-compose.test.yml)
# For simplicity, you can use the main docker-compose.yml for local testing if it's clean
docker-compose -f docker/docker-compose.yml exec app /app/build/tests/unit_tests
docker-compose -f docker/docker-compose.yml exec app /app/build/tests/integration_tests

# For API tests (assuming Python and requests are installed on your host)
# The application container needs its port exposed for this to work.
docker-compose -f docker/docker-compose.yml up -d # Ensure app is running
python3 tests/api/test_api.py http://localhost:8080
```

#### Running Locally (Requires local setup of dependencies)

```bash
# Build the project (from root directory)
mkdir build && cd build
cmake ..
make

# Run Unit Tests
./tests/unit_tests

# Run Integration Tests (ensure PostgreSQL and Redis are running locally and .env is configured)
./tests/integration_tests

# Run API Tests (from project root)
python3 tests/api/test_api.py http://localhost:8080
```

## Architecture

Refer to `docs/ARCHITECTURE.md` for a detailed overview of the system design.

## API Documentation

Refer to `docs/API.md` for a comprehensive list of API endpoints, request/response formats, and authentication requirements.

## Deployment

Refer to `docs/DEPLOYMENT.md` for detailed deployment instructions, including CI/CD and production considerations.

## Contributing

Contributions are welcome! Please follow the standard GitHub flow:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature-name`).
3. Make your changes.
4. Write tests for your changes.
5. Ensure all tests pass (`make test`).
6. Commit your changes (`git commit -m 'Add new feature'`).
7. Push to the branch (`git push origin feature/your-feature-name`).
8. Create a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. (Not included in this response, but implied).