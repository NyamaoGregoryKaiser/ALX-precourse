# Enterprise-Grade C++ Task Management System

This project implements a full-scale, production-ready Task Management System using C++ for the backend API and a command-line interface (CLI) client. It's designed with robust features, comprehensive testing, and modern deployment practices.

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Prerequisites](#prerequisites)
4.  [Setup & Installation](#setup--installation)
    *   [Database Setup](#database-setup)
    *   [Backend Setup](#backend-setup)
    *   [CLI Client Setup](#cli-client-setup)
    *   [Docker Setup](#docker-setup)
5.  [Running the Application](#running-the-application)
    *   [Backend](#running-the-backend)
    *   [CLI Client](#running-the-cli-client)
    *   [Docker Compose](#running-with-docker-compose)
6.  [API Documentation](#api-documentation)
7.  [Testing](#testing)
8.  [CI/CD](#cicd)
9.  [Configuration](#configuration)
10. [Logging & Monitoring](#logging--monitoring)
11. [Error Handling](#error-handling)
12. [Caching](#caching)
13. [Rate Limiting](#rate-limiting)
14. [Contributing](#contributing)
15. [License](#license)

---

## 1. Features

*   **User Management**: Register, login, manage profiles.
*   **Project Management**: Create, read, update, delete projects.
*   **Task Management**: Full CRUD for tasks, assignment to projects, due dates, priorities, statuses.
*   **Tagging**: Categorize tasks with tags.
*   **Authentication & Authorization**: JWT-based authentication, role-based access control (User/Admin).
*   **Robust Backend**: Built with Drogon, a high-performance C++ web framework.
*   **Database Layer**: PostgreSQL with Drogon ORM.
*   **CLI Client**: A C++ command-line interface for interacting with the API.
*   **Containerization**: Docker and Docker Compose for easy deployment.
*   **CI/CD**: Automated build, test, and deployment workflows with GitHub Actions.
*   **Comprehensive Testing**: Unit, integration, and API tests with 80%+ coverage target.
*   **Detailed Documentation**: README, Architecture, API, and Deployment guides.
*   **Observability**: Structured logging, centralized error handling.
*   **Performance Enhancements**: Caching layer integration points, rate limiting middleware.

## 2. Architecture

Refer to [ARCHITECTURE.md](ARCHITECTURE.md) for a detailed overview of the system's design.

## 3. Prerequisites

*   C++ Compiler (GCC 9+ or Clang 9+)
*   CMake (3.15+)
*   Drogon (v1.8.0+)
*   PostgreSQL (12+) client libraries (`libpq-dev` or `postgresql-devel`)
*   OpenSSL (development headers for JWT and HTTPS)
*   `jwt-cpp` library (for JWT handling)
*   `jsoncpp` library (for general JSON parsing, although Drogon covers most)
*   `libcurl` (for CLI client HTTP requests)
*   Google Test (for unit and integration tests)
*   Docker & Docker Compose (for containerized setup)

**On Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install -y build-essential cmake libssl-dev libpq-dev libjsoncpp-dev libcurl4-openssl-dev
```

**Installing Drogon and jwt-cpp:**
Drogon and jwt-cpp can be installed system-wide or integrated as Git submodules/fetched by CMake. For simplicity, we'll assume they are available or fetched by the `CMakeLists.txt`.

```bash
# Example for Drogon (refer to Drogon's official guide for latest)
git clone --recursive https://github.com/drogonframework/drogon
cd drogon
mkdir build && cd build
cmake ..
sudo make install

# Example for jwt-cpp (fetched by CMake in this project)
# git clone https://github.com/Thalhammer/jwt-cpp.git
# cd jwt-cpp
# mkdir build && cd build
# cmake ..
# sudo make install
```

## 4. Setup & Installation

### Database Setup

1.  **Start PostgreSQL**: Ensure a PostgreSQL instance is running and accessible.
    *   If running locally, default port `5432` is assumed.
    *   If using Docker, see [Docker Setup](#docker-setup).

2.  **Create Database**: Connect to your PostgreSQL server (e.g., as `postgres` user) and create the database.

    ```sql
    CREATE USER task_manager_user WITH PASSWORD 'your_secure_password';
    CREATE DATABASE task_manager_db OWNER task_manager_user;
    \c task_manager_db;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO task_manager_user;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO task_manager_user;
    ```
    **Note**: Replace `'your_secure_password'` with a strong password.

3.  **Run Migrations**: Navigate to the `database` directory and run the initial schema.

    ```bash
    cd database
    psql -U task_manager_user -d task_manager_db -h localhost -p 5432 -f schema/001_initial_schema.sql
    psql -U task_manager_user -d task_manager_db -h localhost -p 5432 -f seed/seed_data.sql
    cd ..
    ```

    For future migrations, you would apply scripts from `migrations/up/`.

### Backend Setup

1.  **Environment Variables**: Create a `.env` file in the `backend/` directory based on `backend/.env.example`.

    ```ini
    # backend/.env
    DATABASE_HOST=localhost
    DATABASE_PORT=5432
    DATABASE_USER=task_manager_user
    DATABASE_PASSWORD=your_secure_password
    DATABASE_NAME=task_manager_db
    JWT_SECRET=supersecretjwtkeythatshouldbemorethan32charslongandrandom
    SERVER_PORT=8080
    ```
    Ensure `JWT_SECRET` is strong and unique.

2.  **Build**:

    ```bash
    cd backend
    mkdir build && cd build
    cmake ..
    make
    cd ../..
    ```

### CLI Client Setup

1.  **Environment Variables**: Create a `.env` file in the `cli-client/` directory based on `cli-client/.env.example`.

    ```ini
    # cli-client/.env
    API_BASE_URL=http://localhost:8080/api/v1
    ```

2.  **Build**:

    ```bash
    cd cli-client
    mkdir build && cd build
    cmake ..
    make
    cd ../..
    ```

### Docker Setup

For a fully containerized environment, use Docker Compose.

1.  **Environment Variables**: Create a `.env` file in the root directory based on `docker/.env.example`.
    ```ini
    # .env (in project root, for docker-compose)
    POSTGRES_USER=task_manager_user
    POSTGRES_PASSWORD=your_secure_password
    POSTGRES_DB=task_manager_db
    APP_DATABASE_HOST=db
    APP_DATABASE_PORT=5432
    APP_JWT_SECRET=supersecretjwtkeythatshouldbemorethan32charslongandrandom
    APP_SERVER_PORT=8080
    ```
    Make sure these match your database setup and desired secrets.

2.  **Build and Run with Docker Compose**:

    ```bash
    docker-compose -f docker/docker-compose.yml up --build
    ```
    This will:
    *   Build the `backend` Docker image.
    *   Start a PostgreSQL container.
    *   Start the `backend` application container, running the `init-db.sh` script to apply migrations and seed data before starting the server.

## 5. Running the Application

### Running the Backend

After building (see [Backend Setup](#backend-setup)):

```bash
cd backend/build
./TaskManagementSystemBackend
```
The server will start, typically listening on `http://localhost:8080`.

### Running the CLI Client

After building (see [CLI Client Setup](#cli-client-setup)):

```bash
cd cli-client/build
./TaskManagementSystemClient help
```
Follow the client's instructions for available commands (e.g., `register`, `login`, `list-tasks`).

### Running with Docker Compose

If using Docker Compose, the backend will be running automatically once `docker-compose up` completes. You can access it at `http://localhost:8080`.

To stop:
```bash
docker-compose -f docker/docker-compose.yml down
```

## 6. API Documentation

Comprehensive API documentation, including endpoint details, request/response formats, and authentication requirements, can be found in [API_DOCS.md](API_DOCS.md).

## 7. Testing

To run all tests:

```bash
cd backend/build # or cli-client/build
ctest
```

Detailed instructions for running unit, integration, and API tests, along with information on test coverage, are available in the [Testing](#testing) section of this README (or refer to `backend/tests/README.md` if implemented separately).

## 8. CI/CD

The project includes a GitHub Actions workflow (`.github/workflows/ci-cd.yml`) to automate:
*   Building the C++ backend and client.
*   Running all tests.
*   (Optional) Building Docker images and pushing to a registry.
*   (Optional) Deployment to a staging/production environment.

Refer to the `.github/workflows/ci-cd.yml` file for details.

## 9. Configuration

Configuration is managed via:
*   `backend/config.json`: Drogon specific server settings.
*   `.env` files: Sensitive credentials and environment-specific settings (database, JWT secret, ports). Loaded at runtime.

The application uses a `ConfigLoader` utility to safely load environment variables.

## 10. Logging & Monitoring

The backend leverages Drogon's built-in logging system.
*   Logs are output to `stdout`/`stderr` by default and can be configured in `backend/config.json` to write to files.
*   Errors are logged with detailed context.
*   For production, consider integrating with a centralized logging solution (e.g., ELK Stack, Splunk) and monitoring tools (e.g., Prometheus, Grafana).

## 11. Error Handling

The system employs a centralized error handling mechanism:
*   Custom exception classes (`AppErrors.h`) for specific application errors.
*   Global exception handlers (Drogon's `errorHandler`) to catch unhandled exceptions and return consistent JSON error responses.
*   Meaningful HTTP status codes are used for API responses.

## 12. Caching

A caching layer is crucial for performance.
*   Currently, the system uses a conceptual placeholder for caching (e.g., in-memory map for JWT blacklisting).
*   For production-grade caching, **Redis** integration is recommended for session management, frequently accessed data, and rate limiting counters. The architecture is designed to allow easy integration of a Redis client.

## 13. Rate Limiting

The backend implements a `RateLimitFilter` to protect API endpoints from abuse.
*   It tracks requests per client (IP address or authenticated user).
*   Configurable limits (e.g., X requests per Y seconds).
*   Returns `HTTP 429 Too Many Requests` when limits are exceeded.
*   Can be enhanced with distributed caching (like Redis) for multi-instance deployments.

## 14. Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature`).
3.  Implement your changes and write tests.
4.  Ensure all tests pass.
5.  Commit your changes (`git commit -m 'feat: Add new feature'`).
6.  Push to the branch (`git push origin feature/your-feature`).
7.  Open a Pull Request.

## 15. License

This project is licensed under the MIT License. See the `LICENSE` file for details.