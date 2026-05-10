# Performance Monitoring System

A comprehensive, production-ready Performance Monitoring System built with FastAPI, PostgreSQL, and Docker. This system allows for tracking service performance, collecting metrics, defining alert rules, and sending notifications. It includes authentication, logging, error handling, caching, rate limiting, and extensive testing.

## Features

*   **Service Management**: Register and manage various applications/services to be monitored.
*   **Metric Definition**: Define custom metric types (e.g., CPU Usage, Memory, Latency, Error Rate) with units.
*   **Metric Collection**: API endpoint for submitting metric data points, with simulated data generation for demonstration.
*   **Alerting**:
    *   Define flexible alert rules based on metric thresholds (e.g., `value > 80.0`).
    *   Background task for real-time alert rule evaluation.
    *   Record and manage triggered alert notifications.
*   **Authentication & Authorization**: JWT-based authentication with role-based access control (Admin/User).
*   **Robust Data Layer**: PostgreSQL database with SQLAlchemy ORM and Alembic migrations.
*   **Caching**: Redis-backed caching for frequently accessed, less dynamic data (e.g., metric types, service lists) to improve API response times.
*   **Rate Limiting**: Redis-backed rate limiting on key endpoints to prevent abuse.
*   **Logging**: Structured logging using Loguru for better observability.
*   **Error Handling**: Centralized custom exception handling middleware.
*   **Background Tasks**: APScheduler for periodic tasks like simulated data collection and alert evaluation.
*   **Containerization**: Docker and Docker Compose for easy setup and deployment.
*   **Testing**: Unit, Integration, and basic Performance tests (with Pytest).
*   **Simple Frontend**: A basic HTML/CSS/JS dashboard to visualize services, metrics, and alerts, demonstrating API interaction.

## Project Structure

```
performance-monitoring-system/
├── app/
│   ├── api/             # API versioning and endpoint definitions
│   ├── auth/            # Authentication logic (JWT, password hashing)
│   ├── core/            # Configuration, database connection, logging, custom exceptions
│   ├── crud/            # Database CRUD operations for each model
│   ├── middleware/      # Custom FastAPI middleware (e.g., error handling)
│   ├── models/          # SQLAlchemy ORM models
│   ├── schemas/         # Pydantic data validation schemas
│   ├── services/        # Business logic (e.g., data collection, alert evaluation)
│   ├── tasks/           # Background task scheduling (APScheduler)
│   ├── templates/       # Jinja2 templates for the basic frontend
│   ├── static/          # Static files (CSS, JS) for the frontend
│   └── main.py          # FastAPI application entry point
├── alembic/             # Alembic migration scripts
├── tests/               # Unit, Integration, and Performance tests
├── scripts/             # Utility scripts (e.g., seed data)
├── docs/                # Project documentation
├── .env.example         # Example environment variables file
├── Dockerfile           # Docker build instructions for the backend
├── docker-compose.yml   # Docker Compose setup for services (backend, db, redis)
├── requirements.txt     # Python dependencies
├── alembic.ini          # Alembic configuration
├── .gitignore
├── .github/             # GitHub Actions CI/CD workflow
└── README.md            # This documentation
```

## Setup and Running

### Prerequisites

*   Docker and Docker Compose
*   (Optional, for local development outside Docker) Python 3.11+, pip, virtualenv

### 1. Clone the repository

```bash
git clone https://github.com/your-username/performance-monitoring-system.git
cd performance-monitoring-system
```

### 2. Configure Environment Variables

Create a `.env` file by copying `.env.example`:

```bash
cp .env.example .env
```

You can modify the values in `.env` if needed, e.g., for custom ports or database credentials.
**Important**: Change `SECRET_KEY` to a strong, random value for production.

### 3. Build and Run with Docker Compose

```bash
docker-compose up --build
```

This command will:
*   Build the `backend` Docker image (based on the `Dockerfile`).
*   Pull `postgres` and `redis` images.
*   Start the `db`, `redis`, and `backend` services.
*   The `backend` service will wait for `db` and `redis` to be healthy.
*   Run Alembic migrations to create database tables.
*   Execute `scripts/seed_data.py` to populate initial data (admin user, services, metric types, alert rules).
*   Start the FastAPI application with Uvicorn.

It might take a minute or two for all services to become healthy and the backend to start up.

### Access the Application

Once `docker-compose up` completes, you can access:

*   **FastAPI Backend (API Docs)**: `http://localhost:8000/api/v1/docs` (or `http://127.0.0.1:8000/api/v1/docs`)
*   **Simple Web Frontend**: `http://localhost:8000/` (or `http://127.0.0.1:8000/`)

#### Initial Login Credentials
Use the following credentials (from `.env`):
*   **Email**: `admin@example.com`
*   **Password**: `adminpass`

### Stopping the Application

```bash
docker-compose down
```
To remove all associated data volumes (e.g., for a clean slate):
```bash
docker-compose down -v
```

### Running Tests

If you are running tests inside the Docker Compose environment, ensure your `docker-compose.yml` has a separate `test_db` service if you want to avoid interfering with your main development database, or modify `tests/conftest.py` `TEST_DATABASE_URL` to point to a temporary test container.

For simplicity of this setup, the `tests/conftest.py` assumes a `localhost:5433` for the test database. You would typically spin up a dedicated test database container (or run tests inside the backend container if it has database access and a temporary db is used).

**To run tests locally (outside Docker, assuming PostgreSQL is running on `localhost:5433`):**

1.  **Install dependencies**: `pip install -r requirements.txt` (or use `poetry install`)
2.  **Ensure a test PostgreSQL database is running**:
    ```bash
    docker run --name test-perf-db -e POSTGRES_DB=test_db -e POSTGRES_USER=test_user -e POSTGRES_PASSWORD=test_password -p 5433:5432 -d postgres:15-alpine
    ```
3.  **Run pytest**:
    ```bash
    pytest tests/
    ```
    For coverage:
    ```bash
    pytest --cov=app --cov-report=term-missing tests/
    ```
    For performance benchmarks (install `pytest-benchmark` first: `pip install pytest-benchmark`):
    ```bash
    pytest --benchmark-min-time=0.0001 --benchmark-warmup=true tests/performance/
    ```

## Code Coverage

The project aims for `80%+` unit and integration test coverage. Run tests with `pytest --cov=app --cov-report=term-missing` to see current coverage.

## Project Maintenance

### Database Migrations (Alembic)

1.  **Generate a new migration script** (after changing `app/models/`):
    ```bash
    docker-compose run --rm backend alembic revision --autogenerate -m "descriptive message"
    ```
2.  **Apply migrations** (this is part of `docker-compose up` `command` but can be run manually):
    ```bash
    docker-compose run --rm backend alembic upgrade head
    ```

### Seed Data
To re-seed data (useful for development, **be careful in production** as it might re-create entities):
```bash
docker-compose run --rm backend python scripts/seed_data.py
```

---

#### `docs/api.md`
```markdown