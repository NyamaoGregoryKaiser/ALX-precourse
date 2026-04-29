# DBOptiFlow: Database Optimization System

DBOptiFlow is a comprehensive, production-ready system for monitoring, analyzing, and optimizing external database performance. It identifies bottlenecks and provides actionable recommendations to improve database efficiency.

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Setup (using Docker Compose)](#local-setup-using-docker-compose)
    *   [Manual Setup (without Docker)](#manual-setup-without-docker)
4.  [Usage](#usage)
    *   [API Endpoints](#api-endpoints)
    *   [Web UI](#web-ui)
    *   [Celery Worker](#celery-worker)
    *   [CLI Commands](#cli-commands)
5.  [Testing](#testing)
6.  [Deployment Guide](#deployment-guide)
7.  [CI/CD Configuration](#cicd-configuration)
8.  [Authentication and Authorization](#authentication-and-authorization)
9.  [Logging and Monitoring](#logging-and-monitoring)
10. [Error Handling](#error-handling)
11. [Caching Layer](#caching-layer)
12. [Rate Limiting](#rate-limiting)
13. [Future Enhancements](#future-enhancements)
14. [Contributing](#contributing)
15. [License](#license)

## 1. Features

*   **Database Registration:** Securely register external PostgreSQL/MySQL databases for monitoring.
*   **Metric Collection:** Periodically collect key performance metrics (slow queries, index usage, table statistics, configuration parameters).
*   **Performance Analysis:** Advanced logic to identify common bottlenecks (missing indexes, inefficient queries, sub-optimal configurations).
*   **Actionable Recommendations:** Generate SQL statements (e.g., `CREATE INDEX`, `ANALYZE TABLE`), configuration tuning suggestions, and query rewrite ideas.
*   **Reporting:** Generate and view detailed optimization reports.
*   **RESTful API:** Full CRUD operations for managing monitored databases, tasks, and reports.
*   **User Management:** Secure user registration, login, and profile management.
*   **Asynchronous Tasks:** Uses Celery for background processing of metric collection and analysis.
*   **Web UI:** A user-friendly web interface for managing and visualizing optimization efforts.
*   **Dockerized:** Easy setup and deployment using Docker and Docker Compose.
*   **Comprehensive Testing:** Unit, integration, and API tests.
*   **Robustness:** Implements logging, error handling, rate limiting, and caching.

## 2. Architecture

DBOptiFlow follows a modular, microservice-oriented (loosely coupled) architecture:

```mermaid
graph TD
    A[User/Client] -->|Web UI| B[Flask Backend (DBOptiFlow App)]
    A -->|REST API| B
    B -->|Database Operations| C[PostgreSQL (DBOptiFlow System DB)]
    B -->|Queue Tasks| D[Redis (Celery Broker)]
    D -->|Process Tasks| E[Celery Worker]
    E -->|Connects to| F[External Monitored Database]
    F -->|Returns Metrics| E
    E -->|Stores Results| C

    subgraph DBOptiFlow Core Services
        B -- HTTP --> B1[API Layer]
        B -- Call --> B2[Service Layer]
        B -- Render --> B3[Frontend (Jinja2)]
        B2 -- ORM --> C
    end

    subgraph External Database Interaction
        E --> S1[DB Connector Service]
        S1 --> S2[Metric Collector Service]
        S2 --> S3[Analyzer Service]
        S3 --> S4[Report Generator Service]
        S4 --> C
    end
```

*   **Flask Backend:** The core application, handling API requests, serving the UI, and orchestrating services.
    *   **API Layer:** Defines RESTful endpoints for CRUD operations.
    *   **Service Layer:** Contains the business logic for connecting to external databases, collecting metrics, analyzing data, and generating reports.
    *   **Authentication & Authorization:** Secures API endpoints and UI access using JWT and session management.
    *   **Extensions:** Integrates various Flask extensions (SQLAlchemy, Migrate, JWT, Cache, Limiter).
*   **PostgreSQL (DBOptiFlow System DB):** Stores all system-related data, including user accounts, configurations of monitored databases, collected metrics, analysis results, and generated reports.
*   **Redis (Celery Broker):** Acts as a message broker for Celery, facilitating communication between the Flask app and Celery workers.
*   **Celery Worker:** A separate process responsible for executing long-running, asynchronous tasks such as:
    *   Periodically collecting metrics from external databases.
    *   Running complex analysis routines.
    *   Generating comprehensive reports.
*   **External Monitored Database:** The actual database instances (e.g., PostgreSQL, MySQL) that DBOptiFlow connects to for metric collection and analysis. DBOptiFlow *does not* modify these databases directly; it only reads metrics and provides recommendations.

## 3. Setup and Installation

### Prerequisites

*   **Docker** and **Docker Compose** (recommended for local setup)
*   Alternatively, for manual setup:
    *   Python 3.8+
    *   PostgreSQL (running locally or accessible)
    *   Redis (running locally or accessible)
    *   `pip` (Python package installer)

### Local Setup (using Docker Compose)

This is the easiest way to get DBOptiFlow up and running.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/dboptiflow.git
    cd dboptiflow
    ```

2.  **Create `.env` file:**
    Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
    Open `.env` and fill in the values. Ensure `SECRET_KEY` is a strong, random string. You can leave database and Redis defaults for local development.

3.  **Build and run Docker containers:**
    ```bash
    docker-compose up --build -d
    ```
    This command will:
    *   Build the `dboptiflow` Flask application image.
    *   Start a PostgreSQL database container for DBOptiFlow's system data.
    *   Start a Redis container (for Celery broker and cache).
    *   Start the `dboptiflow` Flask application container.
    *   Start the `celery_worker` container.

4.  **Run Migrations and Seed Data:**
    Once containers are up, execute database migrations and seed the database with initial data (e.g., an admin user).
    ```bash
    docker-compose exec app flask db upgrade
    docker-compose exec app flask seed-db
    ```
    *(Note: `seed-db` will create an initial admin user with `username: admin`, `password: password`. Change this immediately in production!)*

5.  **Access the Application:**
    *   **Web UI:** Open your browser and go to `http://localhost:5000`
    *   **API Base URL:** `http://localhost:5000/api/v1`

### Manual Setup (without Docker)

If you prefer to run the application directly on your host:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/dboptiflow.git
    cd dboptiflow
    ```

2.  **Create a virtual environment and install dependencies:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

3.  **Set up Environment Variables:**
    Copy `.env.example` to `.env` and configure your database connection string, Redis URL, and a `SECRET_KEY`.
    Example `.env` (adjust for your setup):
    ```
    FLASK_APP=manage.py
    FLASK_ENV=development
    SECRET_KEY=your_super_secret_key_here
    DATABASE_URL=postgresql://user:password@localhost:5432/dboptiflow_db
    REDIS_URL=redis://localhost:6379/0
    CELERY_BROKER_URL=redis://localhost:6379/0
    CELERY_RESULT_BACKEND=redis://localhost:6379/0
    # Add external DB credentials here for testing, e.g.
    # EXTERNAL_DB_HOST=localhost
    # EXTERNAL_DB_PORT=5432
    # EXTERNAL_DB_USER=testuser
    # EXTERNAL_DB_PASS=testpass
    # EXTERNAL_DB_NAME=testdb
    ```
    You will need a PostgreSQL database instance running and accessible at `localhost:5432` (or wherever you configure it). Also, a Redis instance.

4.  **Run Database Migrations and Seed Data:**
    ```bash
    flask db upgrade
    flask seed-db
    ```

5.  **Run the Flask Application:**
    ```bash
    flask run
    ```

6.  **Run the Celery Worker (in a separate terminal):**
    ```bash
    celery -A app.tasks worker -l info
    ```

7.  **Access the Application:**
    *   **Web UI:** Open your browser and go to `http://localhost:5000`
    *   **API Base URL:** `http://localhost:5000/api/v1`

## 4. Usage

### API Endpoints

The API is accessible at `/api/v1/`. All authenticated endpoints require a JWT token in the `Authorization: Bearer <token>` header.

**Authentication:**

*   `POST /api/v1/auth/register`: Register a new user.
    *   Body: `{ "username": "...", "password": "..." }`
*   `POST /api/v1/auth/login`: Log in and receive a JWT token.
    *   Body: `{ "username": "...", "password": "..." }`
*   `GET /api/v1/auth/me`: Get current user details (requires JWT).

**Monitored Databases (`/api/v1/databases`):**

*   `POST /api/v1/databases`: Add a new database to monitor.
    *   Body: `{ "name": "...", "db_type": "postgresql", "host": "...", "port": ..., "username": "...", "password": "...", "database": "..." }`
*   `GET /api/v1/databases`: List all monitored databases.
*   `GET /api/v1/databases/<id>`: Get details of a specific monitored database.
*   `PUT /api/v1/databases/<id>`: Update details of a monitored database.
*   `DELETE /api/v1/databases/<id>`: Remove a monitored database.

**Optimization Tasks (`/api/v1/tasks`):**

*   `POST /api/v1/tasks`: Create a new optimization task for a database.
    *   Body: `{ "db_id": ..., "task_type": "metric_collection", "schedule": "every 5 minutes" }`
    *   `task_type`: `metric_collection`, `analysis`
    *   `schedule`: Cron string or interval (e.g., "1 hour", "daily", "0 0 * * *")
*   `GET /api/v1/tasks`: List all optimization tasks.
*   `GET /api/v1/tasks/<id>`: Get details of a specific task.
*   `DELETE /api/v1/tasks/<id>`: Delete an optimization task.
*   `POST /api/v1/tasks/<id>/run`: Manually trigger an optimization task (will run in background via Celery).

**Reports (`/api/v1/reports`):**

*   `GET /api/v1/reports`: List all generated reports.
*   `GET /api/v1/reports/<id>`: Get details of a specific report.

**Metrics (`/api/v1/metrics`):**

*   `GET /api/v1/metrics/database/<db_id>`: Get latest metrics for a specific monitored database.
*   `GET /api/v1/metrics/database/<db_id>/history`: Get historical metrics for a specific monitored database.
    *   Query params: `start_date`, `end_date`, `metric_type`

### Web UI

Navigate to `http://localhost:5000`.

1.  **Register/Login:** Create a new account or log in with the seeded admin user (`admin`/`password`).
2.  **Dashboard:** View an overview of monitored databases and recent activities.
3.  **Monitored Databases:**
    *   Add a new database by providing connection details.
    *   View, edit, or delete existing database configurations.
    *   Trigger manual metric collection or analysis tasks.
4.  **Reports:** Browse generated optimization reports, click to view details and recommendations.

### Celery Worker

The Celery worker runs in the background. It polls Redis for new tasks and executes the business logic for metric collection and analysis. It's automatically started with `docker-compose up`. If running manually, ensure you start it with:

```bash
celery -A app.tasks worker -l info
```
For scheduled tasks, you'd also run `celery -A app.tasks beat -l info` in another terminal, but currently scheduling logic is triggered via API/UI.

### CLI Commands

The Flask CLI (`flask`) provides utility commands:

*   `flask db init`: Initialize migrations (first time setup).
*   `flask db migrate -m "Initial migration"`: Create a new migration script.
*   `flask db upgrade`: Apply pending migrations.
*   `flask db downgrade`: Revert the last migration.
*   `flask seed-db`: Populate the database with initial data (e.g., admin user).
*   `flask run`: Run the Flask development server.

## 5. Testing

DBOptiFlow includes a comprehensive test suite using `pytest` to ensure code quality and functionality.

To run tests:

1.  **Ensure Docker containers are running (or manual setup is complete):**
    ```bash
    docker-compose up -d
    ```
2.  **Execute tests within the app container:**
    ```bash
    docker-compose exec app pytest
    ```
    Or, if running manually after `source venv/bin/activate`:
    ```bash
    pytest
    ```

**Test Coverage:**
Tests aim for 80%+ coverage across unit, integration, and API levels.

*   **Unit Tests (`tests/unit`):** Focus on individual functions, methods, and service logic in isolation. Mocks are used for external dependencies (database, external APIs).
*   **Integration Tests (`tests/integration`):** Verify the interaction between different components, such as API endpoints with the database, or Celery tasks with the service layer.
*   **API Tests (`tests/integration`):** Test the RESTful API endpoints, including authentication, request/response cycles, and data validation.
*   **Performance Tests:** While a full-fledged load testing setup is beyond this single response, the framework provides a foundation. For performance testing, tools like `locust`, `JMeter`, or `k6` would be used against the deployed API endpoints to measure response times, throughput, and error rates under load. Monitoring tools (Prometheus, Grafana) would then track application and database performance.

## 6. Deployment Guide

The recommended deployment method is using Docker and Docker Compose (or Kubernetes in a production environment).

1.  **Production `.env`:** Create a `.env` file for production with strong, random `SECRET_KEY`, production database credentials, secure Redis URL, and `FLASK_ENV=production`.
    *   **Crucially**, ensure your `DATABASE_URL` points to a persistent, managed PostgreSQL instance, and `REDIS_URL` points to a secure, managed Redis instance.
    *   Disable debugging (`FLASK_DEBUG=0`).

2.  **Build Production Images:**
    ```bash
    docker-compose build --no-cache
    ```

3.  **Run Migrations:**
    Before starting the application, ensure migrations are applied. This might be part of your CI/CD pipeline or a manual step.
    ```bash
    docker-compose run --rm app flask db upgrade
    ```
    If it's a fresh deploy, you might also want to `flask seed-db`.

4.  **Start Services:**
    ```bash
    docker-compose up -d
    ```
    For production, you might want to use a process manager like `supervisor` or `systemd` to manage `celery_worker` and `celery_beat` processes outside of Docker Compose, or utilize a container orchestration platform like Kubernetes to manage all services.

5.  **Reverse Proxy:** In a real production environment, place a reverse proxy (Nginx or Apache) in front of the Flask application to handle SSL/TLS termination, static file serving, load balancing, and potentially additional rate limiting or security features.

6.  **Monitoring:** Integrate with external monitoring solutions (e.g., Prometheus + Grafana, Datadog) to monitor application logs, performance metrics, and system health.

## 7. CI/CD Configuration

A basic GitHub Actions workflow is provided as a placeholder in `.github/workflows/main.yml`.

```yaml
# .github/workflows/main.yml
name: DBOptiFlow CI/CD

on:
  push:
    branches:
      - main
      - develop
  pull_request:
    branches:
      - main
      - develop

jobs:
  build_and_test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_DB: testdb
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpassword
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:latest
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install pytest pytest-cov

      - name: Wait for PostgreSQL and Redis to be ready
        run: |
          echo "Waiting for PostgreSQL..."
          for i in `seq 1 10`; do
            nc -z localhost 5432 && break
            echo "PostgreSQL not ready yet, waiting..."
            sleep 5
          done
          echo "Waiting for Redis..."
          for i in `seq 1 10`; do
            nc -z localhost 6379 && break
            echo "Redis not ready yet, waiting..."
            sleep 5
          done

      - name: Set up environment variables
        run: |
          echo "FLASK_APP=manage.py" >> $GITHUB_ENV
          echo "FLASK_ENV=testing" >> $GITHUB_ENV
          echo "SECRET_KEY=${{ secrets.SECRET_KEY || 'test-secret-key' }}" >> $GITHUB_ENV
          echo "DATABASE_URL=postgresql://testuser:testpassword@localhost:5432/testdb" >> $GITHUB_ENV
          echo "REDIS_URL=redis://localhost:6379/0" >> $GITHUB_ENV
          echo "CELERY_BROKER_URL=redis://localhost:6379/0" >> $GITHUB_ENV
          echo "CELERY_RESULT_BACKEND=redis://localhost:6379/0" >> $GITHUB_ENV

      - name: Run Database Migrations
        run: |
          flask db upgrade

      - name: Run Tests with Coverage
        run: |
          pytest --cov=app --cov-report=xml
        env:
          FLASK_ENV: testing

      - name: Upload coverage reports to Codecov
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }} # Not strictly necessary for basic coverage report

  # Additional jobs for deployment could be added here, e.g.,
  # deploy:
  #   needs: build_and_test
  #   if: github.ref == 'refs/heads/main'
  #   runs-on: ubuntu-latest
  #   steps:
  #     - name: Deploy to Production
  #       run: |
  #         echo "Deployment steps (e.g., push Docker images, update Kubernetes deployment)"
  #         # Example: docker login ...
  #         # Example: docker build -t myapp:latest .
  #         # Example: docker push myapp:latest
  #         # Example: kubectl apply -f kubernetes/deployment.yaml
```

This workflow automates:
*   Checking out code.
*   Setting up Python environment.
*   Installing dependencies.
*   Starting isolated PostgreSQL and Redis services for testing.
*   Running database migrations for the test environment.
*   Executing unit, integration, and API tests.
*   Generating a coverage report.

For full CI/CD, you would extend this to:
*   Build Docker images after successful tests.
*   Push images to a container registry (e.g., Docker Hub, ECR).
*   Deploy to staging/production environments (e.g., Kubernetes, EC2, Azure App Services).

## 8. Authentication and Authorization

*   **API Authentication:** Uses **JWT (JSON Web Tokens)** via `Flask-JWT-Extended`.
    *   Upon successful login, the API returns an access token.
    *   This token must be included in subsequent requests in the `Authorization: Bearer <token>` header.
    *   Routes are protected using the `@jwt_required()` decorator.
*   **Web UI Authentication:** Uses standard **Flask Sessions** (`session['user_id']`).
    *   Login through the UI creates a session.
    *   Routes are protected using a custom `@login_required` decorator.
*   **Authorization:** Currently, a simple check for `user.is_admin` could be added, but for this project, all authenticated users have access to all DBOptiFlow features. More granular role-based access control (RBAC) could be implemented by adding roles to the `User` model and checking them in decorators.

## 9. Logging and Monitoring

*   **Logging:** Python's standard `logging` module is used throughout the application.
    *   Logs are configured to output to `stdout` by default, making them easily viewable in Docker logs (`docker-compose logs app`).
    *   Different log levels (INFO, WARNING, ERROR) are used for various events.
    *   Custom log formats can be configured in `config.py`.
*   **Monitoring:**
    *   For the DBOptiFlow system itself, integrate with solutions like Prometheus + Grafana to collect metrics on API response times, error rates, Celery task queue depth, and database performance of DBOptiFlow's own PostgreSQL instance.
    *   The core purpose of DBOptiFlow is to *monitor external databases*. The collected metrics are stored in DBOptiFlow's database and can be visualized via its UI or API.

## 10. Error Handling

*   **Custom Exceptions:** `app.utils.errors.py` defines custom exception classes (e.g., `APIError`).
*   **Global Error Handlers:** Flask's `app.register_error_handler` is used in `app/__init__.py` to catch specific HTTP errors (404, 500) and custom `APIError` exceptions.
*   **Consistent API Responses:** Error responses are formatted as JSON, providing a `message` and an `error_code` for client-side handling.
*   **Logging Errors:** All caught exceptions are logged with relevant details.

## 11. Caching Layer

*   **Flask-Caching:** Used for a simple, in-memory (or Redis-backed) caching layer.
*   **Usage:** The `@cache.cached()` decorator from `app.extensions.py` can be applied to API endpoints or service methods to cache their results, reducing redundant computations or database queries.
    *   Example: `GET /api/v1/reports` could be cached for a short period.
*   **Configuration:** Configured in `app/config.py` to use Redis as the cache backend when available, falling back to simple in-memory cache.

## 12. Rate Limiting

*   **Flask-Limiter:** Integrated to protect API endpoints from abuse.
*   **Configuration:** Defined in `app/extensions.py` and applied to API blueprints.
*   **Default Limits:** A default rate limit (e.g., "200 per day", "50 per hour") can be applied globally or to specific routes.
*   **Example:** Rate limit for authentication endpoints to prevent brute-force attacks.

## 13. Future Enhancements

*   **Support for more database types:** Expand `db_connector` and `metric_collector` to support SQL Server, Oracle, MongoDB, etc.
*   **Advanced Analysis Algorithms:** Integrate machine learning for anomaly detection in metrics, predictive analytics for resource needs.
*   **Automated Remediation (Opt-in):** Allow users to approve and automatically execute recommended SQL statements on target databases (with extreme caution and proper authorization).
*   **Interactive Query Builder/Optimizer:** A UI to input queries and get real-time optimization suggestions.
*   **Enhanced UI/Dashboard:** Richer visualizations, interactive graphs (using libraries like D3.js, Chart.js, or React/Vue frontend).
*   **Notification System:** Email, Slack, PagerDuty integration for critical alerts and new report availability.
*   **Role-Based Access Control (RBAC):** More granular permissions for different user roles.
*   **Multi-tenancy:** Isolate data and configurations for different organizations.
*   **Background task scheduling UI:** A way to manage Celery Beat schedules via the web interface.

## 14. Contributing

Contributions are welcome! Please fork the repository, create a feature branch, and submit a pull request.

## 15. License

This project is licensed under the MIT License. See the `LICENSE` file for details.
```