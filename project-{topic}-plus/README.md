```markdown
# ALX-Shop: Enterprise-Grade E-commerce Automation Platform

## Project Overview

ALX-Shop is a comprehensive, production-ready DevOps automation system for an e-commerce platform. This project demonstrates a full-stack Python application (FastAPI backend) with a robust database layer (PostgreSQL, SQLAlchemy, Alembic), essential DevOps tooling (Docker, CI/CD with GitHub Actions), extensive testing, and critical enterprise features like authentication/authorization, caching, rate limiting, logging, and error handling.

The architecture emphasizes modularity, scalability, and maintainability, aligning with ALX Software Engineering principles.

## Features

### Core Application (FastAPI Backend)
*   **Modular Design**: Structured into API routes, services, schemas, and models.
*   **CRUD Operations**: Full Create, Read, Update, Delete for Users, Products, and Orders.
*   **Business Logic**: Product availability checks, order total calculations, inventory management.
*   **API Endpoints**: RESTful API with clear request/response models.

### Database Layer (PostgreSQL with SQLAlchemy & Alembic)
*   **Schema Definitions**: `User`, `Product`, `Order`, `OrderItem` models.
*   **Migrations**: Database schema management using Alembic.
*   **Seed Data**: Script to populate the database with initial users (admin, customer) and products.
*   **Query Optimization**: Indexing, eager loading (`lazy="selectin"`), pagination, and server-side filtering.

### Configuration & Setup
*   **Dependency Management**: `requirements.txt` for Python packages.
*   **Environment Configuration**: `.env` file support using `pydantic-settings`.
*   **Docker Setup**: `Dockerfile` for the application, `docker-compose.yml` for local orchestration of app, PostgreSQL, and Redis.
*   **CI/CD Pipeline**: GitHub Actions workflow for linting, testing, building, and pushing Docker images.

### Testing & Quality
*   **Unit Tests**: `pytest` for isolated testing of service logic and security functions (aiming for high coverage).
*   **Integration Tests**: `httpx` and `pytest-asyncio` for testing API endpoints against a live test database.
*   **API Tests**: Covered by integration tests.
*   **Performance Tests**: `locust` script for load testing API endpoints.

### Additional Features
*   **Authentication & Authorization**: JWT-based (access and refresh tokens), role-based access control (Admin, Customer).
*   **Logging & Monitoring**: Structured logging with `logging` module.
*   **Error Handling**: Custom exception middleware for consistent API error responses.
*   **Caching Layer**: Redis integration with `fastapi-cache2` for API response caching.
*   **Rate Limiting**: Redis-backed `fastapi-limiter` for protecting API endpoints against abuse.

## Technologies Used

*   **Backend**: Python 3.11+, FastAPI
*   **Database**: PostgreSQL
*   **ORM**: SQLAlchemy 2.0+
*   **Migrations**: Alembic
*   **Data Validation**: Pydantic 2.0+
*   **Authentication**: PyJWT, python-jose, passlib
*   **Caching/Rate Limiting**: Redis, fastapi-cache2, fastapi-limiter
*   **Containerization**: Docker, Docker Compose
*   **CI/CD**: GitHub Actions
*   **Testing**: Pytest, httpx, pytest-asyncio, pytest-cov, Locust
*   **Linting/Formatting**: Flake8, Black, isort, Mypy

## Getting Started

Follow these steps to set up and run the ALX-Shop API locally.

### Prerequisites

*   Docker and Docker Compose installed
*   Python 3.11+ (if running outside Docker for development/testing)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/alx-shop.git
cd alx-shop
```

### 2. Environment Configuration

Create a `.env` file in the project root by copying `.env.example`:

```bash
cp .env.example .env
```

**Edit `.env`**:
Adjust the values as needed. Key variables:
*   `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`: For PostgreSQL.
*   `SECRET_KEY`: **Crucial for JWT security**. Generate a strong, random key (e.g., `openssl rand -hex 32`).
*   `BACKEND_CORS_ORIGINS`: Set to `["*"]` for development or specific frontend URLs.

### 3. Run with Docker Compose (Recommended for Local Development)

This will start the FastAPI application, PostgreSQL database, and Redis cache/rate limit server.

```bash
docker-compose up --build -d
```

*   `--build`: Builds the Docker image for your application (needed on first run or after Dockerfile changes).
*   `-d`: Runs the services in detached mode (in the background).

Wait a few moments for the services to initialize.

### 4. Database Migrations

Once the `app` and `db` containers are running:

```bash
docker-compose exec app alembic upgrade head
```
This applies all pending database migrations using Alembic.

### 5. Seed Initial Data (Optional, but Recommended for Development)

Populate the database with a default admin user, some customer users, and sample products:

```bash
docker-compose exec app python seed_data.py
```

### 6. Access the API

The API should now be running at `http://localhost:8000`.

*   **Swagger UI (API Docs)**: `http://localhost:8000/docs`
*   **Redoc (API Docs)**: `http://localhost:8000/redoc`
*   **Health Check**: `http://localhost:8000/api/v1/healthcheck`

You can use the Swagger UI to interact with the API endpoints. For authenticated endpoints, use the "Authorize" button and provide a Bearer token (you can obtain one by logging in via the `/api/v1/login` endpoint using `admin@alx.com` / `adminpassword` or one of the seeded customer accounts).

## Development

### Running outside Docker (Optional)

If you prefer to run the FastAPI app directly for faster iteration (requires local PostgreSQL and Redis):

1.  **Install Python dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
2.  **Ensure PostgreSQL and Redis are running locally.**
    *   Make sure your `.env` `DATABASE_HOST` points to `localhost` or your local PostgreSQL host.
    *   Ensure your `.env` `REDIS_URI` points to your local Redis.
3.  **Run migrations**:
    ```bash
    # Ensure your DATABASE_URL in .env is configured for a sync driver like psycopg2 or alembic env.py is setup for async
    alembic upgrade head
    ```
4.  **Seed data**:
    ```bash
    python seed_data.py
    ```
5.  **Start the FastAPI app**:
    ```bash
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ```

## Testing

### Linting and Formatting

```bash
flake8 app/ tests/
black --check app/ tests/
isort --check-only app/ tests/
mypy app/
```
To automatically fix formatting issues (do this before committing):
```bash
black app/ tests/
isort app/ tests/
```

### Unit and Integration Tests

The test suite uses `pytest`. Ensure your Docker containers are running (especially the `db` and `redis` services, or you have local instances). The `conftest.py` sets up a dedicated test database and mocks the database session where appropriate.

```bash
# Run all tests with coverage report
pytest --cov=app --cov-report=term-missing --cov-report=xml tests/
```
This command will:
*   Run tests in the `tests/` directory.
*   Collect code coverage for the `app/` directory.
*   Print a coverage report to the terminal, highlighting missing lines.
*   Generate `coverage.xml` for CI/CD tools.

### Performance Testing (Locust)

1.  **Ensure your API is running**.
2.  **Run Locust**:
    ```bash
    locust -f tests/performance/locust_script.py
    ```
3.  Open your browser to `http://localhost:8089` to access the Locust web UI.
4.  Enter the host (e.g., `http://localhost:8000`), number of users, and spawn rate to start your load test.

## CI/CD Pipeline (GitHub Actions)

The `.github/workflows/ci-cd.yml` file defines the CI/CD pipeline:

*   **Triggers**: Pushes to `main`, `develop` branches, or tags `v*.*.*`, and pull requests to `main`, `develop`.
*   **`build_and_test` Job**:
    *   Sets up a dedicated PostgreSQL and Redis service in GitHub Actions.
    *   Installs Python dependencies.
    *   Runs Alembic migrations and seed data on the test database.
    *   Executes linting checks (flake8, black, isort, mypy).
    *   Runs `pytest` with code coverage.
    *   Uploads coverage report to Codecov (if configured).
*   **`build_and_push_docker` Job**:
    *   Depends on `build_and_test` succeeding.
    *   Logs in to Docker Hub using secrets.
    *   Builds the Docker image for the application.
    *   Pushes the image to Docker Hub with relevant tags (branch name, commit SHA, `latest` for `main`).
*   **(Conceptual) `deploy` Job**:
    *   Placeholder for deploying the Docker image to a production environment (e.g., Kubernetes, AWS ECS, Azure App Service). This would require cloud-specific credentials and tooling.

**To enable the CI/CD pipeline**:
1.  **GitHub Repository**: Push your code to a GitHub repository.
2.  **GitHub Secrets**: In your GitHub repository settings, under "Secrets and variables" -> "Actions", add the following secrets:
    *   `JWT_SECRET_KEY`: Your strong secret key for JWT (same as in `.env`).
    *   `DOCKER_USERNAME`: Your Docker Hub username.
    *   `DOCKER_PASSWORD`: Your Docker Hub access token or password.
    *   `CODECOV_TOKEN` (Optional): If you integrate with Codecov.

## Architecture

See `ARCHITECTURE.md` for a detailed overview of the system design.

## Deployment Guide

See `DEPLOYMENT.md` for instructions and considerations for deploying the application to production.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
```