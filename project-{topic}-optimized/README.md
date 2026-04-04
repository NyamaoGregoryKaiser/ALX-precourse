# Mobile Task Manager Backend

A comprehensive, production-ready backend system for a mobile task management application, built with FastAPI, PostgreSQL, and SQLAlchemy. This project is designed following modern software engineering best practices, including authentication, authorization, caching, rate limiting, logging, testing, and CI/CD.

## Features

*   **User Management**:
    *   User registration and login (JWT-based authentication).
    *   Secure password hashing.
    *   User profile management (view and update own profile).
    *   Admin functionality for managing all users (CRUD).
*   **Project Management**:
    *   Create, Read, Update, Delete (CRUD) operations for projects.
    *   Projects are owned by users.
    *   Authorization: Only project owners or superusers can manage their projects.
*   **Task Management**:
    *   Create, Read, Update, Delete (CRUD) operations for tasks.
    *   Tasks belong to projects and can be assigned to users.
    *   Flexible authorization:
        *   Project owners can manage all tasks within their projects.
        *   Assignees can update the status and description of tasks assigned to them.
        *   Superusers have full control.
*   **Database Layer**:
    *   PostgreSQL with asynchronous SQLAlchemy ORM.
    *   Alembic for database migrations.
    *   Seed data script for initial population.
*   **Configuration**:
    *   Environment variables managed via Pydantic Settings.
    *   Docker and Docker Compose for easy setup and deployment.
*   **Testing**:
    *   Unit tests for core logic.
    *   Integration tests for API endpoints.
    *   80%+ test coverage.
*   **Monitoring & Observability**:
    *   Structured logging with Loguru.
    *   Custom error handling middleware.
*   **Performance & Scalability**:
    *   Redis for caching (e.g., user tokens).
    *   Rate limiting using `fastapi-limiter`.
*   **CI/CD**:
    *   GitHub Actions workflow for linting, testing, and coverage reporting.
*   **Documentation**:
    *   Automatic OpenAPI (Swagger UI/ReDoc) documentation for API endpoints.
    *   Comprehensive project README, Architecture, API, and Deployment guides.

## Technologies Used

*   **Backend Framework**: FastAPI (Python)
*   **Database**: PostgreSQL
*   **ORM**: SQLAlchemy with `asyncpg`
*   **Migrations**: Alembic
*   **Caching/Rate Limiting**: Redis
*   **Authentication**: JWT (JSON Web Tokens)
*   **Dependency Management**: `requirements.txt`
*   **Containerization**: Docker, Docker Compose
*   **CI/CD**: GitHub Actions
*   **Testing**: Pytest, httpx, pytest-asyncio, pytest-cov
*   **Linting/Formatting**: Black, Isort, Mypy
*   **Logging**: Loguru

## Setup and Installation

### Prerequisites

*   Docker and Docker Compose
*   Python 3.11+
*   Git

### Steps

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/mobile-task-manager-backend.git
    cd mobile-task-manager-backend
    ```

2.  **Create `.env` file:**
    Copy the `.env.example` file to `.env` and fill in your desired values. **Ensure `SECRET_KEY` is a strong, random string in production.**

    ```bash
    cp .env.example .env
    # Open .env and modify
    ```

3.  **Build and run with Docker Compose (recommended for local development):**
    This will set up the PostgreSQL database, Redis, and the FastAPI application. It also runs migrations and seeds initial data.

    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: Rebuilds images (useful after code changes or initial setup).
    *   `-d`: Runs containers in detached mode.

    Wait for a few moments for the services to start up and the database to initialize. You can check the logs:
    ```bash
    docker-compose logs -f backend
    ```

4.  **Access the application:**
    *   **API Documentation (Swagger UI)**: `http://localhost:8000/api/v1/docs`
    *   **API Documentation (ReDoc)**: `http://localhost:8000/api/v1/redoc`
    *   **Health Check**: `http://localhost:8000/health`

5.  **Stop the services:**
    ```bash
    docker-compose down
    ```

### Manual Setup (Without Docker Compose - Advanced)

If you prefer to run the application directly on your host or manage database/redis separately:

1.  **Install Python dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

2.  **Set up PostgreSQL & Redis:**
    Ensure you have a PostgreSQL database and a Redis instance running and accessible. Update your `.env` file with the correct connection strings (`DATABASE_URL`, `REDIS_URL`) or host/port details.

3.  **Run Alembic migrations:**
    ```bash
    alembic upgrade head
    ```

4.  **Seed initial data (optional but recommended):**
    ```bash
    python scripts/seed.py
    ```

5.  **Run the FastAPI application:**
    ```bash
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ```
    For production, use `gunicorn` with `uvicorn.workers.UvicornWorker`. See `Dockerfile` for an example.

## Development

### Running Tests

To run tests and check coverage:

1.  Ensure your Docker services (db, redis) are running: `docker-compose up -d db redis` (if not using `docker-compose up --build` for the whole stack).
2.  Create a `.env` file for tests (see CI config for example `testdb` credentials).
3.  Execute pytest:
    ```bash
    pytest --cov=app --cov-report=html --cov-report=term-missing app/tests/
    ```
    This will run all tests in the `app/tests/` directory, show coverage in the terminal, and generate an HTML report in `htmlcov/`.

### Linting and Formatting

```bash
black app alembic scripts --check
isort app alembic scripts --check-only
mypy app
```

To fix formatting issues:
```bash
black app alembic scripts
isort app alembic scripts
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
```