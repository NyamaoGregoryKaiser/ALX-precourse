# ML-Utilities-System

A comprehensive, production-ready Machine Learning Utilities System designed to streamline the management of ML datasets, models, and experiments.

## Table of Contents

1.  [Features](#features)
2.  [Technology Stack](#technology-stack)
3.  [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Local Development Setup (Docker Compose)](#local-development-setup-docker-compose)
    *   [Running Migrations](#running-migrations)
    *   [Seeding Initial Data](#seeding-initial-data)
    *   [Running the Application](#running-the-application)
4.  [API Documentation](#api-documentation)
5.  [Frontend (Basic UI)](#frontend-basic-ui)
6.  [Testing](#testing)
    *   [Running Tests](#running-tests)
    *   [Performance Testing (Locust)](#performance-testing-locust)
7.  [Architecture](#architecture)
8.  [Deployment](#deployment)
9.  [Additional Features](#additional-features)
10. [ALX Software Engineering Focus](#alx-software-engineering-focus)
11. [License](#license)

---

## 1. Features

*   **User Management**: Secure user registration, login, and role-based access control (normal user, superuser).
*   **Dataset Management**: CRUD operations for managing ML datasets, including metadata like name, description, file path, size, type, and counts.
*   **Model Management**: CRUD operations for registering and versioning trained ML models, capturing framework, task type, hyperparameters, and performance metrics.
*   **Experiment Tracking**: CRUD operations for logging ML experiment runs, including parameters, metrics, artifacts URI, and status.
*   **Authentication & Authorization**: JWT-based authentication for securing API endpoints.
*   **Caching**: Redis-backed caching for read-heavy endpoints to improve performance.
*   **Rate Limiting**: Middleware to protect the API from abuse and ensure fair usage.
*   **Error Handling**: Centralized error handling middleware for consistent API responses.
*   **Logging & Monitoring**: Basic logging configuration for application events.
*   **Database Migrations**: Alembic for managing database schema changes.
*   **Dockerization**: Containerized application for easy setup and deployment.
*   **CI/CD**: Example GitHub Actions workflow for automated testing.
*   **Comprehensive Testing**: Unit, integration, and basic performance tests.
*   **Interactive API Docs**: Automatically generated OpenAPI (Swagger UI) documentation.

## 2. Technology Stack

*   **Backend**: Python (FastAPI)
*   **Database**: PostgreSQL
*   **ORM**: SQLAlchemy (Async)
*   **Caching/Rate Limiting**: Redis
*   **Database Migrations**: Alembic
*   **Frontend**: Jinja2 (server-side rendered HTML with vanilla JS for basic interactivity)
*   **Authentication**: JWT
*   **Containerization**: Docker, Docker Compose
*   **CI/CD**: GitHub Actions
*   **Testing**: Pytest, httpx, Locust

## 3. Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

*   Docker and Docker Compose installed
*   Python 3.11+ (if running without Docker or for development outside containers)

### Local Development Setup (Docker Compose)

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/ml-utilities-system.git
    cd ml-utilities-system
    ```

2.  **Create `.env` file**:
    Copy the example environment variables and customize them.
    ```bash
    cp .env.example .env
    ```
    **Important**: Change `SECRET_KEY` in `.env` to a strong, random string for production.

3.  **Build and run Docker containers**:
    This command will build the `app` service image, start `db`, `redis`, and `app` containers. The `app` container's `command` in `docker-compose.yml` automatically runs Alembic migrations and seeds initial data.
    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: Rebuilds images (useful after code changes).
    *   `-d`: Runs containers in detached mode (in the background).

4.  **Verify services are running**:
    ```bash
    docker-compose ps
    ```
    You should see `ml_utils_db`, `ml_utils_redis`, and `ml_utils_app` in a healthy state.

### Running Migrations (Manual, if not using `docker-compose up`'s command)

If you modify your models, you'll need to create and apply new migrations.
Connect to the `app` container:
```bash
docker-compose exec app bash
```
Then, inside the container:
```bash
# Generate a new migration script
alembic revision --autogenerate -m "Add new feature X"

# Apply migrations
alembic upgrade head
```
Exit the container: `exit`

### Seeding Initial Data (Manual, if not using `docker-compose up`'s command)

The `docker-compose.yml` already includes `python seed_data.py` as part of the app's startup command. If you need to re-seed or run it manually:
```bash
docker-compose exec app python seed_data.py
```
This script creates a default superuser (`admin@example.com` / `adminpassword`) and some sample datasets, models, and experiments.

### Running the Application

After running `docker-compose up -d`, the application should be accessible:

*   **FastAPI Backend**: `http://localhost:8000`
*   **Interactive API Docs (Swagger UI)**: `http://localhost:8000/docs`
*   **Basic Frontend**: `http://localhost:8000` (redirects to `/`)
*   **Redis**: `http://localhost:6379` (for Redis client access, not a web interface)
*   **PostgreSQL**: `http://localhost:5432` (for DB client access)

## 4. API Documentation

The FastAPI application automatically generates OpenAPI documentation, accessible via Swagger UI:

*   **Swagger UI**: `http://localhost:8000/docs`
*   **ReDoc**: `http://localhost:8000/redoc`
*   **OpenAPI JSON Schema**: `http://localhost:8000/api/v1/openapi.json`

Refer to these for detailed information on endpoints, request/response schemas, and available operations (CRUD).

## 5. Frontend (Basic UI)

A minimal, backend-rendered HTML frontend (`app/templates/`) with vanilla JavaScript (`app/static/js/main.js`) is provided to demonstrate basic interaction with the API.

*   **Home Page**: `http://localhost:8000/`
*   **Login Page**: `http://localhost:8000/login`
    *   Use `admin@example.com` / `adminpassword` to log in initially.
*   **Dashboard**: `http://localhost:8000/dashboard`
    *   Here you can create, view, and manage datasets, models, and experiments through a simple web interface.

This UI serves as a demonstration; a full-scale production application would typically use a dedicated SPA framework like React, Vue, or Angular.

## 6. Testing

The project includes unit, integration, and performance tests to ensure code quality and functionality.

### Running Tests

To run all tests (unit, integration, and generate coverage report):

```bash
docker-compose exec app pytest /app/tests --cov=/app --cov-report=term-missing --cov-report=xml
```
*   `--cov=/app`: Enables coverage measurement for the `app` directory.
*   `--cov-report=term-missing`: Shows missing lines in the terminal.
*   `--cov-report=xml`: Generates an XML coverage report (`coverage.xml`), useful for CI/CD tools like Codecov.

**Target Coverage**: Aim for 80%+ code coverage for critical modules.

### Performance Testing (Locust)

Locust is used for load testing the API endpoints.

1.  **Ensure services are running**:
    ```bash
    docker-compose up -d
    ```

2.  **Run Locust from within the app container**:
    ```bash
    docker-compose exec app locust -f /app/tests/performance/test_locust.py --web-host 0.0.0.0
    ```
    This will start the Locust web UI, usually accessible at `http://localhost:8089`.

3.  **Access the Locust UI**: Open your browser to `http://localhost:8089`.
    *   Enter the number of users and spawn rate.
    *   The host for the FastAPI app should be `http://localhost:8000`.
    *   Click "Start swarming" to begin the load test.

    Alternatively, run in headless mode for automated CI/CD checks:
    ```bash
    docker-compose exec app locust -f /app/tests/performance/test_locust.py --web-host 0.0.0.0 --headless --users 10 --spawn-rate 5 --run-time 30s --csv=locust_report
    ```
    This will run for 30 seconds with 10 users, spawning 5 users/second, and save results to CSV.

## 7. Architecture

The system follows a layered, modular architecture:

*   **Client Layer**: Basic Jinja2/JS frontend or external SPA/CLI clients interacting via API.
*   **API Layer (FastAPI)**:
    *   **Endpoints (`app/api/v1/endpoints`)**: Defines HTTP routes and their handlers, performs request validation, and orchestrates business logic.
    *   **Schemas (`app/schemas`)**: Pydantic models for data validation and serialization (request and response bodies).
    *   **Core (`app/core`)**: Configuration, database connection, security utilities (JWT, password hashing), dependency injection, middleware (error handling, rate limiting), and caching.
*   **Business Logic Layer (`app/crud`, `app/services`)**:
    *   **CRUD (`app/crud`)**: Database interaction logic, abstracting common Create, Read, Update, Delete operations.
    *   **Services (`app/services`)**: Contains more complex business rules or orchestrates multiple CRUD operations. (Currently light, but designed for growth).
*   **Data Access Layer (`app/models`)**: SQLAlchemy ORM models defining the database schema.
*   **Database (PostgreSQL)**: Persistent storage for all application data.
*   **Cache (Redis)**: In-memory data store for caching API responses and managing rate limits.

---
[Link to `docs/architecture.md` for more details on architecture and design decisions.]

## 8. Deployment

The project is designed for containerized deployment, making it suitable for various cloud environments (AWS ECS, Google Cloud Run, Kubernetes, etc.).

---
[Link to `docs/deployment.md` for a comprehensive deployment guide.]

## 9. Additional Features

*   **Authentication/Authorization**: JWT tokens are used for stateless authentication. Users can have `is_superuser` and `is_active` flags for basic role-based authorization.
*   **Logging and Monitoring**: Python's standard `logging` module is configured. In a production environment, this would integrate with a centralized logging system (e.g., ELK stack, Datadog).
*   **Error Handling Middleware**: Custom middleware (`app/core/middleware.py`) catches common `HTTPException` types and provides consistent JSON error responses.
*   **Caching Layer**: Redis is used via `app/core/cache.py` to cache responses for GET endpoints, improving performance for frequently accessed data. Cache invalidation is triggered on data modification.
*   **Rate Limiting**: Implemented via a middleware (`app/core/middleware.py`) using Redis to track and limit requests per IP address per minute, preventing API abuse.

## 10. ALX Software Engineering Focus

This project embodies several principles covered in ALX Software Engineering pre-course materials:

*   **Programming Logic**: Clear, modular Python code with well-defined functions and classes, adhering to DRY principles in CRUD operations.
*   **Algorithm Design**:
    *   **Pagination**: Implemented in `CRUDBase` for efficient retrieval of large datasets.
    *   **Data Validation**: Pydantic schemas enforce data integrity and structure.
    *   **Security**: Robust password hashing (bcrypt) and JWT token generation/validation.
*   **Technical Problem Solving**:
    *   **Database Management**: Use of Alembic for controlled schema evolution, SQL relationships, and efficient queries.
    *   **Scalability**: Async FastAPI, PostgreSQL, and Redis for handling concurrent requests and data loads.
    *   **Maintainability**: Layered architecture, dependency injection, and clear separation of concerns.
    *   **Error Handling**: Proactive error handling and graceful degradation (e.g., Redis down for rate limiting).
    *   **Containerization**: Solving environment consistency and deployment complexity using Docker.
    *   **Testing**: Ensuring reliability and correctness through a comprehensive test suite.

## 11. License

This project is licensed under the MIT License - see the `LICENSE` file for details.