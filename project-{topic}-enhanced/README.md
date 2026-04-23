```markdown
# Personal Finance Tracker Backend

## Comprehensive, Production-Ready Mobile App Backend System

This project provides a full-scale, enterprise-grade backend for a personal finance tracking mobile application. It's built with Python using FastAPI, SQLAlchemy, and PostgreSQL, incorporating best practices for development, testing, and deployment.

---

## Table of Contents

1.  [Features](#features)
2.  [Technology Stack](#technology-stack)
3.  [Project Structure](#project-structure)
4.  [Local Setup & Development](#local-setup-&-development)
    *   [Prerequisites](#prerequisites)
    *   [Environment Variables](#environment-variables)
    *   [Running with Docker Compose](#running-with-docker-compose)
    *   [Running Natively (without Docker Compose)](#running-natively-without-docker-compose)
    *   [Database Migrations](#database-migrations)
    *   [Seeding Initial Data](#seeding-initial-data)
5.  [API Documentation](#api-documentation)
6.  [Testing](#testing)
    *   [Unit, Integration & API Tests](#unit-integration-&-api-tests)
    *   [Performance Tests (Locust)](#performance-tests-locust)
7.  [Authentication & Authorization](#authentication-&-authorization)
8.  [Logging & Monitoring](#logging-&-monitoring)
9.  [Error Handling](#error-handling)
10. [Caching](#caching)
11. [Rate Limiting](#rate-limiting)
12. [CI/CD (GitHub Actions)](#ci/cd-github-actions)
13. [Deployment](#deployment)
14. [Architecture Overview](ARCHITECTURE.md)
15. [Deployment Guide](DEPLOYMENT.md)

---

## 1. Features

This backend system provides the following core functionalities:

*   **User Management**: User registration, login, profile retrieval, and updates. (Admin functionalities for user listing, creation, update, and deletion).
*   **Authentication & Authorization**: Secure JWT-based authentication for user access, role-based authorization (e.g., superuser vs. regular user).
*   **Category Management**: CRUD operations for creating, reading, updating, and deleting financial categories (e.g., 'Food', 'Salary', 'Rent'). Categories can be `income` or `expense` types.
*   **Transaction Management**: CRUD operations for recording income and expense transactions with descriptions, amounts, dates, and category associations.
*   **Financial Overview**: Calculate a user's current net balance (total income - total expenses).
*   **Budget Management**: CRUD operations for setting and tracking budgets against specific expense categories for defined periods.
*   **Budget Progress**: Endpoint to calculate and display the progress of a budget (amount spent vs. budget amount).
*   **Data Validation**: Robust input validation using Pydantic schemas.
*   **Database Migrations**: Managed schema evolution using Alembic.
*   **Caching Layer**: Redis-based caching for frequently accessed read-heavy endpoints to improve performance.
*   **Rate Limiting**: Redis-based rate limiting to protect endpoints from abuse.
*   **Comprehensive Logging**: Structured logging for application events, errors, and requests.
*   **Centralized Error Handling**: Custom exception handling middleware.
*   **Containerization**: Docker and Docker Compose setup for easy local development and deployment.
*   **Automated Testing**: Unit, integration, and API tests with coverage reporting.
*   **Performance Testing**: Basic load testing setup with Locust.
*   **CI/CD**: GitHub Actions workflow for automated testing and deployment.
*   **Extensive Documentation**: README, API docs (Swagger UI/ReDoc), Architecture, and Deployment guides.

---

## 2. Technology Stack

*   **Backend Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
*   **Asynchronous ORM**: [SQLAlchemy 2.0](https://docs.sqlalchemy.org/en/20/) with [AsyncPG](https://magicstack.github.io/asyncpg/current/)
*   **Database**: [PostgreSQL](https://www.postgresql.org/)
*   **Database Migrations**: [Alembic](https://alembic.sqlalchemy.org/en/latest/)
*   **Data Validation/Settings**: [Pydantic v2](https://pydantic.dev/) and `pydantic-settings`
*   **Password Hashing**: [Passlib](https://passlib.readthedocs.io/en/stable/) (Bcrypt)
*   **JSON Web Tokens (JWT)**: [Python-jose](https://python-jose.readthedocs.io/en/latest/)
*   **Caching**: [FastAPI-Cache2](https://fastapi-cache.aerapi.dev/) with [Redis](https://redis.io/)
*   **Rate Limiting**: [FastAPI-Limiter](https://github.com/long2ice/fastapi-limiter) with [Redis](https://redis.io/)
*   **Containerization**: [Docker](https://www.docker.com/), [Docker Compose](https://docs.docker.com/compose/)
*   **Testing**: [Pytest](https://docs.pytest.org/en/stable/), [HTTPX](https://www.python-httpx.org/), [Locust](https://locust.io/)
*   **CI/CD**: [GitHub Actions](https://docs.github.com/en/actions)
*   **Linting/Formatting**: (Implicitly assumed, e.g., Black, Flake8 - not explicitly configured in provided files but essential for production)

---

## 3. Project Structure

```
.
├── app/
│   ├── api/                      # API endpoint definitions (routers)
│   │   ├── v1/                   # API version 1
│   │   │   ├── endpoints/        # Specific resource endpoints (auth, users, categories, etc.)
│   │   │   └── api.py            # Aggregates all v1 endpoints
│   │   └── __init__.py
│   ├── core/                     # Core application configurations and utilities
│   │   ├── config.py             # Pydantic-based settings management
│   │   ├── security.py           # JWT, password hashing
│   │   ├── exceptions.py         # Custom exception classes and handlers
│   │   ├── middlewares.py        # Custom FastAPI middleware (e.g., request logger)
│   │   ├── rate_limiter.py       # Rate limiting setup with Redis
│   │   ├── cache.py              # Caching decorators with Redis
│   │   ├── logger.py             # Centralized logging configuration
│   │   └── deps.py               # FastAPI dependency injection functions (e.g., DB session, current user)
│   ├── crud/                     # CRUD (Create, Read, Update, Delete) operations for database models
│   │   ├── base.py               # Generic CRUD base class
│   │   ├── crud_user.py          # User-specific CRUD
│   │   ├── ...                   # Other resource-specific CRUD files
│   │   └── __init__.py
│   ├── db/                       # Database-related configurations
│   │   ├── base_class.py         # Base declarative class for SQLAlchemy models
│   │   ├── session.py            # SQLAlchemy engine and session setup
│   │   ├── models/               # SQLAlchemy ORM models (User, Category, Transaction, Budget)
│   │   │   └── ...
│   │   └── init_db.py            # Script for initial database seeding
│   ├── schemas/                  # Pydantic schemas for request/response validation and serialization
│   │   ├── msg.py                # Generic message schema
│   │   ├── token.py              # JWT token schemas
│   │   ├── ...                   # Other resource-specific schemas
│   │   └── __init__.py
│   ├── main.py                   # Main FastAPI application entry point
│   └── __init__.py
├── alembic/                      # Alembic migrations directory
│   ├── versions/                 # Migration script files
│   ├── env.py                    # Alembic environment configuration
│   ├── script.py.mako            # Template for new migration files
│   └── alembic.ini               # Alembic configuration file
├── tests/
│   ├── unit/                     # Unit tests for individual functions/classes
│   │   └── ...
│   ├── integration/              # Integration/API tests for endpoints and component interactions
│   │   └── ...
│   ├── performance/              # Performance/load tests (Locust)
│   │   └── locustfile.py
│   └── conftest.py               # Pytest fixtures and configurations
├── scripts/
│   ├── run_migrations.sh         # Script to run Alembic migrations
│   └── seed_db.py                # Script to seed the database (callable standalone)
├── .env.example                  # Example environment variables file
├── Dockerfile                    # Docker build instructions for the application
├── docker-compose.yml            # Docker Compose configuration for app, DB, and Redis
├── requirements.txt              # Python dependency list
├── .gitignore                    # Files/directories to ignore in Git
├── README.md                     # This documentation
├── ARCHITECTURE.md               # High-level architecture overview
├── DEPLOYMENT.md                 # Guide for deploying the application
└── .github/
    └── workflows/
        └── main.yml              # GitHub Actions CI/CD pipeline configuration
```

---

## 4. Local Setup & Development

### Prerequisites

Before you begin, ensure you have the following installed:

*   **Docker & Docker Compose**: Essential for containerized development and running the database/Redis easily. [Install Docker](https://docs.docker.com/get-docker/).
*   **Python 3.11+**: If you plan to run natively.
*   **Git**: For cloning the repository.

### Environment Variables

Create a `.env` file in the project root directory based on `.env.example`. This file contains sensitive information and configuration settings.

```bash
cp .env.example .env
```

**Edit the `.env` file** and replace `YOUR_SUPER_SECRET_KEY_GOES_HERE_MAKE_IT_VERY_LONG_AND_RANDOM` with a strong, random string (e.g., generated with `openssl rand -hex 32`).

### Running with Docker Compose (Recommended)

Docker Compose simplifies running the application, PostgreSQL, and Redis in isolated containers.

1.  **Build and Start Services**:
    ```bash
    docker-compose up --build -d
    ```
    This command will:
    *   Build the `app` Docker image.
    *   Start the `db` (PostgreSQL) and `redis` containers.
    *   **Crucially, the `app` service's `command` in `docker-compose.yml` will automatically run Alembic migrations and seed the database (`app/db/init_db.py`) before starting the FastAPI server.**

2.  **Verify Services**:
    ```bash
    docker-compose ps
    ```
    You should see `app`, `db`, and `redis` services running.

3.  **Access the API**:
    The FastAPI application will be accessible at `http://localhost:8000`.
    *   **Interactive API Docs (Swagger UI)**: `http://localhost:8000/v1/docs`
    *   **Alternative API Docs (ReDoc)**: `http://localhost:8000/v1/redoc`
    *   **Root Endpoint**: `http://localhost:8000/`

4.  **Stop Services**:
    ```bash
    docker-compose down
    ```
    This stops and removes the containers and networks. Add `-v` (`docker-compose down -v`) to also remove Docker volumes (which would delete your database data).

### Running Natively (without Docker Compose)

This approach requires you to manually manage PostgreSQL and Redis instances.

1.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

2.  **Start PostgreSQL and Redis**:
    Ensure you have PostgreSQL and Redis running locally or accessible. Update your `.env` file to point to their correct host and port (e.g., `POSTGRES_SERVER=localhost`, `REDIS_HOST=localhost`).

3.  **Run Migrations**:
    First, ensure your `DATABASE_URL` in `.env` points to your running PostgreSQL instance.
    ```bash
    alembic upgrade head
    ```

4.  **Seed Initial Data**:
    ```bash
    python -m app.db.init_db
    ```
    (This script needs a database session, so typically you'd run it within a context where `get_db` can provide one, or modify it to run standalone with a direct engine creation. For simplicity, it assumes the app's `get_db` dependency can be satisfied, or is called as part of `docker-compose up`.)

5.  **Start the FastAPI Application**:
    ```bash
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ```
    The `--reload` flag is useful for development as it automatically restarts the server on code changes.

### Database Migrations (Alembic)

*   **Generate a new migration script**:
    ```bash
    alembic revision --autogenerate -m "Add new feature X"
    ```
    Review the generated script in `alembic/versions/` and adjust if necessary.

*   **Apply migrations**:
    ```bash
    alembic upgrade head
    ```

*   **Revert migrations (use with caution)**:
    ```bash
    alembic downgrade -1 # Revert last migration
    alembic downgrade base # Revert all migrations
    ```

### Seeding Initial Data

The `app/db/init_db.py` script automatically runs when you `docker-compose up --build -d`. It creates a superuser and some default categories, transactions, and budgets.

*   **Superuser Credentials (from .env.example / .env)**:
    *   **Email**: `user` (or `POSTGRES_USER` value)
    *   **Password**: `password` (or `POSTGRES_PASSWORD` value)

---

## 5. API Documentation

Once the backend is running, FastAPI automatically generates interactive API documentation:

*   **Swagger UI**: `http://localhost:8000/v1/docs`
*   **ReDoc**: `http://localhost:8000/v1/redoc`

These interfaces allow you to explore all available endpoints, their request/response schemas, and even try out API calls directly from your browser.

---

## 6. Testing

The project includes unit, integration, and performance tests to ensure quality and reliability.

### Unit, Integration & API Tests

We use `pytest` with `httpx` for API testing and `pytest-asyncio` for asynchronous code. Test coverage is measured with `pytest-cov`.

1.  **Install Test Dependencies**:
    Ensure you have `pytest`, `pytest-asyncio`, `httpx`, and `pytest-cov` installed (they are in `requirements.txt`).

2.  **Run Tests**:
    ```bash
    pytest
    ```

3.  **Run Tests with Coverage Report**:
    ```bash
    pytest --cov=app --cov-report=term-missing
    ```
    This will run all tests, show missing lines, and provide a summary. Aim for 80%+ coverage.

    To generate an HTML coverage report:
    ```bash
    pytest --cov=app --cov-report=html
    # Then open htmlcov/index.html in your browser
    ```

### Performance Tests (Locust)

Locust is used for writing user-driven load tests.

1.  **Start the Application**: Ensure your FastAPI application is running (e.g., via `docker-compose up -d`).

2.  **Run Locust**:
    ```bash
    locust -f tests/performance/locustfile.py
    ```

3.  **Access Locust UI**:
    Open your browser to `http://localhost:8089`.
    *   Enter the number of users to simulate (`Number of users (peak concurrency)`).
    *   Enter the spawn rate (`Spawn rate (users/second)`).
    *   Enter the host of your running FastAPI app (e.g., `http://localhost:8000`).
    *   Click "Start swarming".

    The `locustfile.py` includes basic login, category creation, transaction posting, and balance retrieval tasks. You can adjust `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` in `tests/performance/locustfile.py` or via environment variables if you want to use specific credentials.

---

## 7. Authentication & Authorization

The backend uses JWT (JSON Web Tokens) for authentication.

*   **Login (`/v1/auth/login`)**: Users provide email/password to receive an `access_token` and `refresh_token`.
*   **Access Token**: Short-lived, used for authenticating most API requests. Sent in the `Authorization` header as `Bearer <token>`.
*   **Refresh Token (`/v1/auth/refresh-token`)**: Longer-lived, used to obtain a new `access_token` when the current one expires, without requiring re-authentication with credentials.
*   **Roles**:
    *   `is_active`: User can log in and access resources.
    *   `is_superuser`: User has administrative privileges (e.g., accessing all users list, creating users via admin endpoints). This is enforced using FastAPI `Depends` for specific endpoints.

Example of an authenticated request:
```http
GET /v1/users/me
Authorization: Bearer <your_access_token>
```

---

## 8. Logging & Monitoring

The application uses Python's standard `logging` module.

*   **Configuration**: `app/core/logger.py` configures logging to:
    *   Console (standard output).
    *   A rotating file (`app_logs.log`) to prevent log files from growing indefinitely.
*   **Log Levels**: Configurable via `LOG_LEVEL` in `.env` (e.g., `INFO`, `DEBUG`, `WARNING`, `ERROR`).
*   **Request Logging Middleware**: `app/core/middlewares.py` logs every incoming request and outgoing response, including processing time.
*   **Integration**: For production, logs should be sent to a centralized logging system like ELK Stack (Elasticsearch, Logstash, Kibana), Grafana Loki, or cloud-specific logging services (e.g., AWS CloudWatch, Google Cloud Logging). This would involve configuring the `logging` handlers to send logs to these services.

---

## 9. Error Handling

A custom exception handling mechanism is implemented in `app/core/exceptions.py`.

*   **`CustomException`**: A base class for application-specific HTTP errors (e.g., `HTTPException400`, `HTTPException401`, `HTTPException404`).
*   **`custom_exception_handler`**: A FastAPI exception handler registered in `app/main.py` that catches `CustomException` instances and returns standardized JSON error responses with appropriate HTTP status codes.
*   **Logging**: All `CustomException` instances are logged, providing visibility into errors occurring in the system.

This approach ensures consistent error responses across the API and better debugging capabilities.

---

## 10. Caching

A caching layer using Redis and `FastAPI-Cache2` is integrated to improve the performance of read-heavy endpoints.

*   **Configuration**: `app/core/cache.py` defines decorators for caching. Redis connection details are from `settings.REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`.
*   **Usage**: The `@cache_1_minute` or `@cache_5_minutes` decorators are applied to FastAPI path operations.
    *   Example: `app/api/v1/endpoints/users.py` uses `@cache_1_minute` for `read_users`.
*   **Benefits**: Reduces database load and response times for frequently requested data.
*   **Invalidation**: For critical data, consider strategies for cache invalidation (e.g., clearing cache entries when data changes). This project does not include explicit cache invalidation logic but it can be implemented using `FastAPICache.clear(namespace="...")`.

---

## 11. Rate Limiting

Rate limiting helps protect the API from excessive requests, preventing abuse and ensuring fair usage. `FastAPI-Limiter` with Redis is used.

*   **Configuration**: `app/core/rate_limiter.py` defines `RateLimiter` instances. Redis connection is shared with caching.
*   **Usage**: Rate limits are applied as FastAPI dependencies (`Depends(RateLimiter(...))`).
    *   Example: `app/api/v1/endpoints/auth.py` applies `Depends(RateLimiter(times=5, seconds=60))` to the `/login` endpoint.
*   **Behavior**: If a user (identified by IP address by default) exceeds the rate limit, the API returns a `429 Too Many Requests` status code.

---

## 12. CI/CD (GitHub Actions)

A GitHub Actions workflow (`.github/workflows/main.yml`) is provided for Continuous Integration and Continuous Deployment.

*   **Triggers**: Runs on `push` to `main` or `develop` branches, and on `pull_request` to `main` or `develop`.
*   **`build-and-test` Job**:
    1.  **Checkout**: Clones the repository.
    2.  **Setup Python**: Sets up Python 3.11 and caches pip dependencies.
    3.  **Install Dependencies**: Installs `requirements.txt`.
    4.  **Setup Docker Compose**: Starts PostgreSQL and Redis containers for testing.
    5.  **Run Alembic Migrations**: Applies database migrations using Alembic.
    6.  **Run Pytest**: Executes unit, integration, and API tests with coverage.
    7.  **Upload Coverage**: Uploads the coverage report to Codecov (requires `CODECOV_TOKEN` secret).
    8.  **Cleanup**: Tears down Docker containers.
*   **`deploy` Job**:
    1.  **Needs `build-and-test`**: Only runs if tests pass.
    2.  **Conditional Execution**: Only runs on `push` to the `main` branch.
    3.  **Docker Login**: Logs into Docker Hub (requires `DOCKER_USERNAME` and `DOCKER_PASSWORD` secrets).
    4.  **Build and Push Docker Image**: Builds the application's Docker image and pushes it to Docker Hub with `latest` and `commit_sha` tags.
    5.  **Deploy to Server**: (Placeholder) This step outlines how to deploy the new Docker image to a production server, typically involving SSH, pulling the new image, and restarting the application services. **You will need to implement this part based on your specific deployment environment (e.g., bare metal VM, Kubernetes, AWS ECS, GCP Cloud Run).**

**Required GitHub Secrets**:
*   `SECRET_KEY`: Your FastAPI application's secret key (must match `.env` on production).
*   `DOCKER_USERNAME`: Your Docker Hub username.
*   `DOCKER_PASSWORD`: Your Docker Hub access token or password.
*   `CODECOV_TOKEN`: (Optional) Token for Codecov integration.
*   `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_KEY`: (Optional, for example SSH deployment) Hostname, username, and SSH private key for your deployment server.

---

## 13. Deployment

Refer to the dedicated [DEPLOYMENT.md](DEPLOYMENT.md) guide for detailed instructions on deploying this backend system to a production environment. It covers considerations for:
*   Cloud Providers (AWS, GCP, Azure)
*   Container Orchestration (Kubernetes, Docker Swarm)
*   Managed Services (AWS ECS, Google Cloud Run)
*   Database Management
*   Monitoring & Alerting
*   Security Best Practices

---

## 14. Architecture Overview

For a detailed understanding of the system's architecture, including diagrams and data flow, please refer to the [ARCHITECTURE.md](ARCHITECTURE.md) file.

---

**This completes the comprehensive mobile app backend system implementation.**