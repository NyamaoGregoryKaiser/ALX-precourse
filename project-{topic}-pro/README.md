# Mobile Task Management Backend

## Overview

This is a comprehensive, production-ready backend system for a mobile task management application, built with Python (FastAPI), PostgreSQL, and Redis. It provides a robust and scalable foundation for managing user accounts and their associated tasks, incorporating essential features like authentication, authorization, data validation, logging, caching, and rate limiting.

The project is designed to be enterprise-grade, demonstrating best practices in software architecture, development, testing, and deployment, aligning with ALX Software Engineering principles.

## Features

*   **User Management**:
    *   User registration with secure password hashing.
    *   User login with JWT-based authentication.
    *   Token refresh mechanism.
    *   User profile retrieval and update.
    *   Admin functionality for managing all users (read, update, delete).
*   **Task Management**:
    *   CRUD (Create, Read, Update, Delete) operations for tasks.
    *   Tasks owned by specific users.
    *   Task status management (Pending, In Progress, Completed, Cancelled) with business logic for valid transitions.
    *   Filtering tasks by status, due date, and owner.
    *   Admin functionality for managing all tasks (read).
*   **API Design**:
    *   RESTful API endpoints with clear resource definitions.
    *   Pydantic for request/response validation and serialization.
    *   Automatic OpenAPI/Swagger UI documentation.
*   **Database Layer**:
    *   PostgreSQL for persistent storage.
    *   SQLAlchemy as an asynchronous ORM.
    *   Alembic for database migrations.
    *   Seed data script for initial database population.
*   **Authentication & Authorization**:
    *   JSON Web Tokens (JWT) for stateless authentication.
    *   OAuth2 bearer token scheme.
    *   Role-based authorization (user vs. admin).
*   **Configuration & Deployment**:
    *   Environment-based configuration using `python-dotenv` and Pydantic Settings.
    *   Docker and Docker Compose for containerization and orchestration.
    *   `requirements.txt` for dependency management.
*   **Testing & Quality**:
    *   Unit tests for core business logic and services.
    *   Integration tests for API endpoints with a dedicated test database.
    *   High test coverage using `pytest` and `pytest-cov`.
    *   Performance test example with `Locust`.
    *   Linting and formatting checks (`Black`, `Isort`, `Flake8`).
*   **Observability & Reliability**:
    *   Structured logging with `Loguru`.
    *   Centralized custom exception handling.
    *   Caching layer with Redis (`fastapi-cache`, `aioredis`).
    *   Rate limiting with Redis (`fastapi-limiter`).
*   **Documentation**:
    *   Comprehensive README.
    *   Automatic API documentation (Swagger UI).
    *   Architecture documentation (`ARCHITECTURE.md`).
    *   Deployment guide.

## Technologies Used

*   **Backend Framework**: FastAPI (Python)
*   **ASGI Server**: Uvicorn
*   **Database**: PostgreSQL
*   **ORM**: SQLAlchemy (async)
*   **Database Migrations**: Alembic
*   **Data Validation**: Pydantic
*   **Authentication**: PyJWT, Passlib (Bcrypt)
*   **Caching & Rate Limiting**: Redis, `fastapi-limiter`, `redis-py`
*   **Logging**: Loguru
*   **Testing**: Pytest, httpx, pytest-asyncio, pytest-cov
*   **Containerization**: Docker, Docker Compose
*   **CI/CD**: GitHub Actions (configured)

## Project Structure

```
.
├── .github/                      # GitHub Actions workflows for CI/CD
│   └── workflows/
│       └── main.yml              # CI/CD pipeline configuration
├── .env.example                  # Example environment variables
├── Dockerfile                    # Dockerfile for building the FastAPI application image
├── docker-compose.yml            # Docker Compose for orchestrating app, database, and Redis
├── requirements.txt              # Python dependencies
├── alembic.ini                   # Alembic configuration for database migrations
├── migrations/                   # Database migration scripts managed by Alembic
│   ├── versions/
│   └── env.py
├── scripts/
│   └── seed_db.py                # Script to populate initial data into the database
├── app/                          # Main application source code
│   ├── __init__.py
│   ├── main.py                   # FastAPI application instance, global middleware, event handlers
│   ├── config.py                 # Application settings and environment configuration
│   ├── database.py               # SQLAlchemy engine and session setup
│   ├── models/                   # SQLAlchemy ORM models (database schema definitions)
│   │   ├── user.py               # User model
│   │   └── task.py               # Task model
│   ├── schemas/                  # Pydantic schemas (data transfer objects for API requests/responses)
│   │   ├── user.py
│   │   ├── task.py
│   │   └── auth.py
│   ├── crud/                     # CRUD (Create, Read, Update, Delete) operations (data access layer)
│   │   ├── user.py
│   │   └── task.py
│   ├── services/                 # Business logic layer
│   │   ├── auth.py               # Authentication related logic
│   │   └── task.py               # Task related logic
│   ├── api/                      # API endpoints (FastAPI routers)
│   │   └── v1/                   # Version 1 of the API
│   │       ├── auth.py           # Authentication routes
│   │       ├── tasks.py          # Task routes
│   │       └── users.py          # User routes (admin-specific)
│   ├── core/                     # Core application utilities
│   │   ├── security.py           # Password hashing, JWT token creation/decoding
│   │   ├── dependencies.py       # FastAPI dependency injection for DB session, current user, etc.
│   │   ├── exceptions.py         # Custom exception classes
│   │   └── logging_config.py     # Loguru logging setup
│   ├── utils/                    # General utility functions
│   │   ├── caching.py            # Redis caching integration
│   │   └── rate_limiter.py       # FastAPI-Limiter integration
├── tests/                        # Application tests
│   ├── conftest.py               # Pytest fixtures for setup, DB, test data
│   ├── unit/                     # Unit tests for business logic (services)
│   │   ├── test_auth_service.py
│   │   └── test_task_service.py
│   ├── integration/              # Integration tests for API endpoints
│   │   ├── test_auth_api.py
│   │   └── test_task_api.py
│   └── performance/
│       └── locustfile.py         # Locust performance test scripts
├── ARCHITECTURE.md               # Detailed architecture documentation
└── README.md                     # Project overview and setup instructions (this file)
```

## Setup and Running

### Prerequisites

*   **Docker & Docker Compose**: Essential for containerized development and deployment.
*   **Python 3.11+**: For local development if not using Docker.

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/mobile-task-backend.git
cd mobile-task-backend
```

### 2. Configure Environment Variables

Create a `.env` file in the project root by copying `.env.example` and filling in the values.

```bash
cp .env.example .env
```

**Important**:
*   `SECRET_KEY`: **MUST** be a strong, randomly generated string in production.
*   `DATABASE_URL`: Ensure it points to your PostgreSQL instance. For Docker Compose, the default `db` service name works.
*   `REDIS_URL`: Ensure it points to your Redis instance. For Docker Compose, the default `redis` service name works.

### 3. Run with Docker Compose (Recommended)

This sets up PostgreSQL, Redis, and the FastAPI application in isolated containers.

```bash
docker-compose up --build -d
```

*   `--build`: Builds the Docker images (only needed the first time or after `Dockerfile` changes).
*   `-d`: Runs the services in detached mode (in the background).

Once services are up, the FastAPI app will be accessible at `http://localhost:8000`.

**Verify Services**:
*   PostgreSQL: `docker-compose exec db pg_isready -U user -d task_db`
*   Redis: `docker-compose exec redis redis-cli ping`
*   App Logs: `docker-compose logs -f app`

### 4. Database Migrations

The `Dockerfile` and `docker-compose.yml` are configured to automatically run `alembic upgrade head` on container startup. However, for manual control or local development:

**Initialize Alembic (First time setup only if not using Docker auto-migrate):**
```bash
# From inside the app container or local environment
docker-compose exec app alembic init migrations
```
(You will likely already have a migrations folder, so this is just for awareness).

**Generate a new migration (after model changes):**
```bash
# From inside the app container or local environment
docker-compose exec app alembic revision --autogenerate -m "Add new field to User model"
```
Review the generated script in `migrations/versions/`.

**Apply migrations:**
```bash
# From inside the app container or local environment
docker-compose exec app alembic upgrade head
```

### 5. Seed Initial Data (Optional)

After migrations are applied, you can seed some initial users and tasks:

```bash
docker-compose exec app python scripts/seed_db.py
```
This will create an `admin@example.com` and `user1/2@example.com` with default passwords (`adminpassword`, `user1password`, `user2password`) and some sample tasks.

### 6. Access the API Documentation

Once the app is running, you can access the interactive API documentation (Swagger UI) at:
`http://localhost:8000/docs`

Or ReDoc UI at:
`http://localhost:8000/redoc`

*(These are only enabled if `DEBUG=true` in your .env)*

## Development

### Running Locally (without Docker Compose for the app, but with external DB/Redis)

If you prefer to run the FastAPI app directly on your host while using Docker for the database and Redis:

1.  **Start DB and Redis with Docker Compose**:
    ```bash
    docker-compose up db redis -d
    ```
2.  **Install Python Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
3.  **Ensure `.env` DATABASE_URL points to localhost**:
    Example: `DATABASE_URL="postgresql+psycopg2://user:password@localhost:5432/task_db"`
4.  **Run Alembic migrations**:
    ```bash
    alembic upgrade head
    ```
5.  **Run the FastAPI application**:
    ```bash
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ```
    `--reload` enables hot-reloading on code changes (useful for development).

### Code Quality

*   **Black**: Code formatter.
    ```bash
    black app tests scripts
    ```
*   **Isort**: Import sorter.
    ```bash
    isort app tests scripts
    ```
*   **Flake8**: Linter.
    ```bash
    flake8 app tests scripts
    ```
It's recommended to integrate these into your IDE or use pre-commit hooks.

## Testing

### Running Tests

This project uses `pytest` for unit and integration tests.

1.  **Ensure test database is running**:
    If using `docker-compose.yml` for tests (as in CI/CD), ensure `db` and `redis` services are running.
    If running locally, set `DATABASE_URL` in `.env` to point to a test database (e.g., `localhost:5433` as in `conftest.py`) and ensure a PostgreSQL instance is running on that port. Also ensure Redis is available at `localhost:6380`.
2.  **Run tests**:
    ```bash
    pytest
    ```
3.  **Run tests with coverage**:
    ```bash
    pytest --cov=app --cov-report=term-missing
    ```
    This will show a report of code coverage directly in the terminal.

### Performance Testing

The `tests/performance/locustfile.py` contains a Locust script to simulate user load.

1.  **Ensure backend is running (e.g., `docker-compose up`)**
2.  **Install Locust**:
    ```bash
    pip install locust
    ```
3.  **Run Locust**:
    ```bash
    locust -f tests/performance/locustfile.py
    ```
4.  **Access Locust UI**: Open your browser to `http://localhost:8089`. You can configure the number of users, spawn rate, and host in the UI.

## CI/CD

The `.github/workflows/main.yml` file configures a GitHub Actions pipeline:
*   **`build-and-test` job**:
    *   Triggers on `push` to `main` or `develop`, and `pull_request` to `main` or `develop`.
    *   Sets up Python environment.
    *   Starts dedicated PostgreSQL and Redis services for testing.
    *   Installs dependencies.
    *   Runs code formatting (`black`, `isort`) and linting (`flake8`) checks.
    *   Runs `pytest` with code coverage.
    *   Uploads coverage reports to Codecov.
*   **`deploy` job**:
    *   Triggers only on `push` to `main` (after `build-and-test` passes).
    *   This is a **simplified placeholder**. In a real-world scenario, this would involve:
        *   Building and pushing Docker images to a container registry (e.g., AWS ECR, Google Container Registry).
        *   Deploying to a production environment (e.g., Kubernetes, AWS ECS, Google Cloud Run, Azure App Service).
        *   Running database migrations carefully in the production context.
        *   Health checks and monitoring integration.

## API Documentation

FastAPI automatically generates interactive API documentation.
When the application is running (and `DEBUG=true`):
*   **Swagger UI**: `http://localhost:8000/docs`
*   **ReDoc**: `http://localhost:8000/redoc`

The schemas (`app/schemas/`) and route definitions (`app/api/v1/`) are extensively documented with Pydantic `Field` descriptions and FastAPI `summary`/`description` parameters, which directly populate these docs.

## Error Handling

The application implements centralized error handling:
*   **`app/core/exceptions.py`**: Defines custom `APIException` subclasses for common HTTP error scenarios (e.g., `NotFoundException`, `UnauthorizedException`, `ConflictException`, `ForbiddenException`).
*   **`app/main.py`**: Global exception handlers catch these custom exceptions, `RequestValidationError` (from Pydantic), and general `Exception`s, returning consistent JSON responses with appropriate HTTP status codes and logging details.

## Logging and Monitoring

*   **`app/core/logging_config.py`**: Configures `Loguru` for structured, colorized logging to `stdout` and optionally to a file with rotation/retention in production.
*   `logger.info()`, `logger.warning()`, `logger.error()`, `logger.debug()` are used throughout the application to provide clear insights into application flow, errors, and important events.
*   In a production setup, these logs would typically be collected by a centralized logging system (e.g., ELK Stack, Splunk, Datadog).

## Caching Layer

*   **`app/utils/caching.py`**: Provides a `@cache_response` decorator that uses Redis to cache API responses.
    *   Example usage: `app/api/v1/tasks.py` for `/me` and `/admin/all` endpoints.
*   Includes `invalidate_cache` functionality to clear relevant cache entries when data is modified (e.g., after creating/updating/deleting a task).
*   Redis client is initialized and closed during FastAPI application lifespan events.

## Rate Limiting

*   **`app/utils/rate_limiter.py`**: Integrates `fastapi-limiter` with Redis.
*   **`app/main.py`**: `init_rate_limiter` and `close_rate_limiter` are called during application lifespan.
*   **`app/api/v1/tasks.py`**: An example rate limit is applied to the task creation endpoint (`/tasks/`) to limit to 5 requests per user per 60 seconds.
    ```python
    @router.post(...)
    async def create_task(
        ...,
        rate_limiter: Annotated[None, Depends(RateLimiter(times=5, seconds=60))] = None
    ):
        ...
    ```

---

```