# Project Management API

## Comprehensive, Production-Ready API Development System

This project demonstrates a full-scale, enterprise-grade API for a Project Management system, built with FastAPI, SQLAlchemy 2.0 (Async), PostgreSQL, and Redis. It includes robust backend services, a database layer with migrations, comprehensive testing, Dockerization, and CI/CD pipeline configuration.

---

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Technology Stack](#technology-stack)
4.  [Setup & Installation](#setup--installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Development Setup (without Docker)](#local-development-setup-without-docker)
    *   [Dockerized Setup](#dockerized-setup)
5.  [Database Management](#database-management)
    *   [Migrations](#migrations)
    *   [Seeding Data](#seeding-data)
6.  [Running the Application](#running-the-application)
7.  [API Documentation](#api-documentation)
    *   [Swagger UI (OpenAPI)](#swagger-ui-openapi)
    *   [Redoc](#redoc)
8.  [Testing](#testing)
    *   [Running Tests](#running-tests)
    *   [Coverage Report](#coverage-report)
    *   [Performance Testing (Conceptual)](#performance-testing-conceptual)
9.  [CI/CD](#cicd)
10. [Frontend (Basic Demonstration)](#frontend-basic-demonstration)
11. [Deployment Guide](#deployment-guide)
12. [Contributing](#contributing)
13. [License](#license)

---

## 1. Features

*   **User Management**: CRUD operations for users, including registration and profile management.
*   **Authentication & Authorization**: JWT-based authentication, role-based access control (Admin, Manager, Member).
*   **Project Management**: CRUD operations for projects, including assigning owners and tracking status.
*   **Task Management**: CRUD operations for tasks, associating them with projects, assigning to users, and tracking status/priority.
*   **Database Layer**: PostgreSQL with SQLAlchemy 2.0 (async), Alembic for migrations.
*   **Configuration**: Environment-based settings using `python-dotenv` and `pydantic-settings`.
*   **Dockerization**: `Dockerfile` and `docker-compose.yml` for easy setup and deployment.
*   **Testing**: Unit, integration, and API tests with high coverage.
*   **Error Handling**: Centralized and structured error handling middleware.
*   **Logging & Monitoring**: Structured logging with Loguru and request/response logging middleware.
*   **Caching**: In-memory caching example (demonstrates concept).
*   **Rate Limiting**: API rate limiting using `fastapi-limiter` with Redis.
*   **Documentation**: Automated OpenAPI (Swagger UI/Redoc) documentation.
*   **CI/CD**: GitHub Actions workflow for automated testing and deployment.
*   **Frontend**: A simple HTML/CSS/JS frontend to demonstrate API interaction.

---

## 2. Architecture

The application follows a modular, layered architecture:

*   **`app/main.py`**: Entry point for the FastAPI application, initializes middleware, routers, and event handlers.
*   **`app/core/`**: Contains core utilities like configuration (`config.py`), database connection (`database.py`), security helpers (`security.py`), centralized logging (`logging_config.py`), and custom exceptions (`exceptions.py`).
*   **`app/api/v1/`**: Houses the API endpoint definitions.
    *   `endpoints/`: Individual routers for different resources (users, projects, tasks).
    *   `__init__.py`: Aggregates all endpoint routers and defines authentication routes.
*   **`app/auth/`**: Specific utilities for JWT token creation and validation.
*   **`app/crud/`**: Implements Create, Read, Update, Delete (CRUD) operations, abstracting database interactions from API logic.
*   **`app/models/`**: Pydantic models for API request/response validation and serialization. These define the data shape exposed via the API.
*   **`app/schemas/`**: SQLAlchemy ORM models, defining the database schema and relationships.
*   **`app/dependencies/`**: Common FastAPI dependency injection functions (e.g., getting a DB session, current user).
*   **`app/middleware/`**: Custom ASGI middleware for cross-cutting concerns (logging, error handling).
*   **`migrations/`**: Alembic scripts for database schema evolution.
*   **`tests/`**: Contains unit and integration tests.
*   **`frontend/`**: A basic static frontend to interact with the API.

---

## 3. Technology Stack

**Backend:**
*   **Python 3.11+**: Programming language
*   **FastAPI**: Web framework for building APIs with Python
*   **Pydantic**: Data validation and settings management (integrated with FastAPI)
*   **SQLAlchemy 2.0 (Async)**: ORM for interacting with the database
*   **Alembic**: Database migration tool
*   **PostgreSQL**: Relational database
*   **Redis**: In-memory data store for caching and rate limiting
*   **python-jose**: JWT (JSON Web Tokens) for authentication
*   **passlib**: Password hashing
*   **Loguru**: Enhanced logging library
*   **FastAPI-Limiter**: Rate limiting middleware
*   **uvicorn / Gunicorn**: ASGI server for running FastAPI application

**Testing:**
*   **Pytest**: Testing framework
*   **httpx**: Asynchronous HTTP client for integration tests
*   **pytest-asyncio**: Pytest plugin for async tests
*   **pytest-cov**: Code coverage

**Deployment & Infrastructure:**
*   **Docker / Docker Compose**: Containerization
*   **GitHub Actions**: CI/CD pipeline

**Frontend (Demonstration):**
*   **HTML, CSS, JavaScript**: Basic client-side interaction

---

## 4. Setup & Installation

### Prerequisites

*   Python 3.11+
*   pip (Python package installer)
*   Docker & Docker Compose (for containerized setup)
*   PostgreSQL installed locally or accessible (for non-Docker setup)
*   Redis installed locally or accessible (for non-Docker setup)

### Local Development Setup (without Docker)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/project-management-api.git
    cd project-management-api
    ```

2.  **Create a virtual environment and activate it:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up environment variables:**
    Copy the `.env.example` file to `.env` and fill in your database credentials and a strong `SECRET_KEY`.
    ```bash
    cp .env.example .env
    # Open .env and edit
    ```
    **Example `.env` content:**
    ```
    APP_NAME="Project Management API"
    ENVIRONMENT="development"
    DEBUG=True

    DATABASE_URL="postgresql://user:password@localhost:5432/project_db"
    # Ensure this is for an actual PostgreSQL instance running locally or remotely
    # For local setup, you might need to install PostgreSQL and create a user/database.

    SECRET_KEY="YOUR_VERY_STRONG_SECRET_KEY_HERE" # Use `openssl rand -hex 32`
    ALGORITHM="HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES=30

    REDIS_HOST="localhost"
    REDIS_PORT=6379
    REDIS_DB=0
    RATE_LIMIT_DEFAULT="100/minute"

    BACKEND_CORS_ORIGINS="http://localhost:8000,http://localhost:5173"
    ```

5.  **Start PostgreSQL and Redis:**
    Ensure you have PostgreSQL and Redis running locally and accessible on `localhost:5432` and `localhost:6379` respectively, matching your `.env` configuration.

### Dockerized Setup

This is the recommended approach for ease of setup and consistency.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/project-management-api.git
    cd project-management-api
    ```

2.  **Set up environment variables:**
    Copy `.env.example` to `.env` and fill in necessary details. Ensure `DATABASE_URL`, `SECRET_KEY`, `REDIS_HOST`, and `REDIS_PORT` match the `docker-compose.yml` service names (`db` and `redis`).
    **Example `.env` content for Docker:**
    ```
    APP_NAME="Project Management API"
    ENVIRONMENT="development"
    DEBUG=True

    DATABASE_URL="postgresql://user:password@db:5432/project_db" # Points to the 'db' service
    # Ensure POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB in docker-compose.yml match this

    SECRET_KEY="YOUR_VERY_STRONG_SECRET_KEY_HERE" # Use `openssl rand -hex 32`
    ALGORITHM="HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES=30

    REDIS_HOST="redis" # Points to the 'redis' service
    REDIS_PORT=6379
    REDIS_DB=0
    RATE_LIMIT_DEFAULT="100/minute"

    BACKEND_CORS_ORIGINS="http://localhost:8000,http://localhost:5173"
    ```

3.  **Build and run the Docker containers:**
    ```bash
    docker-compose up --build -d
    ```
    This command will:
    *   Build the `backend` Docker image.
    *   Start PostgreSQL (`db`) and Redis (`redis`) services.
    *   Run `alembic upgrade head` inside the `backend` container to apply migrations.
    *   Run `python app/seed_data.py` to populate initial data. **(Remove this line from `docker-compose.yml` after initial setup in production)**
    *   Start the FastAPI application.

    Wait a few moments for all services to start and migrations to apply.

---

## 5. Database Management

### Migrations

This project uses [Alembic](https://alembic.sqlalchemy.org/en/latest/) for database migrations.

1.  **To initialize Alembic (if not already done):**
    ```bash
    alembic init migrations
    ```
    This creates the `alembic.ini` and `migrations/` directory. (Already provided in this project).

2.  **To configure `alembic.ini`:**
    Ensure `sqlalchemy.url` points to your development database (or Docker service `db`), and `target_metadata` points to `app.core.database:Base`. (Already configured).

3.  **To generate a new migration script (after changing SQLAlchemy models):**
    ```bash
    alembic revision --autogenerate -m "Description of your changes"
    ```
    Review the generated script in `migrations/versions/` and adjust if necessary.

4.  **To apply migrations:**
    ```bash
    alembic upgrade head
    ```

5.  **To revert migrations:**
    ```bash
    alembic downgrade -1 # Reverts the last migration
    alembic downgrade base # Reverts all migrations
    ```

### Seeding Data

A `seed_data.py` script is provided to populate the database with initial users, projects, and tasks.

*   **Run the seed script (after migrations are applied):**
    ```bash
    python app/seed_data.py
    ```
    **Note:** In `docker-compose.yml`, this script is configured to run automatically on `backend` service startup (after migrations), which is convenient for development. **For production deployments, you should remove this line from `docker-compose.yml`'s `command` and run seeding as a manual or separate CI/CD step only once.** The script will drop and recreate tables before seeding, so use with caution!

---

## 6. Running the Application

### Locally (without Docker)

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The `--reload` flag is useful for development as it restarts the server on code changes.

### With Docker Compose

If you followed the Dockerized setup, your application should already be running.
Check the status:
```bash
docker-compose ps
```
The backend should be accessible at `http://localhost:8000`.

---

## 7. API Documentation

FastAPI automatically generates interactive API documentation based on your code.

### Swagger UI (OpenAPI)
*   Access at: `http://localhost:8000/docs`
    This provides an interactive interface to explore endpoints, make requests, and see responses.

### Redoc
*   Access at: `http://localhost:8000/redoc`
    This provides a more compact and readable documentation view.

### API Endpoints Overview

The API is versioned under `/api/v1/`.

**Authentication:**
*   `POST /api/v1/auth/token`: Authenticate user and get JWT token.

**Users (`/api/v1/users`):**
*   `POST /`: Create a new user (Admin only).
*   `GET /`: Retrieve multiple users (Admin only).
*   `GET /me`: Retrieve current user's profile.
*   `PUT /me`: Update current user's profile.
*   `GET /{user_id}`: Retrieve a user by ID (Admin only).
*   `PUT /{user_id}`: Update a user by ID (Admin only).
*   `DELETE /{user_id}`: Delete a user by ID (Admin only, cannot delete self).

**Projects (`/api/v1/projects`):**
*   `POST /`: Create a new project (Manager/Admin only).
*   `GET /`: Retrieve multiple projects (Members see own, Managers/Admins see all).
*   `GET /{project_id}`: Retrieve a project by ID (Owner, Manager/Admin only).
*   `PUT /{project_id}`: Update a project by ID (Manager/Admin only).
*   `DELETE /{project_id}`: Delete a project by ID (Manager/Admin only).

**Tasks (`/api/v1/tasks`):**
*   `POST /`: Create a new task (Project Owner, Manager/Admin only).
*   `GET /`: Retrieve multiple tasks (Members see tasks in owned projects or assigned to them; Managers/Admins see all).
*   `GET /{task_id}`: Retrieve a task by ID (Project Owner, Assignee, Manager/Admin only).
*   `PUT /{task_id}`: Update a task by ID (Project Owner, Manager/Admin can update all; Assignee can update status, description, due date, is_completed).
*   `DELETE /{task_id}`: Delete a task by ID (Project Owner, Manager/Admin only).

---

## 8. Testing

The project includes unit, integration, and API tests using `pytest`.

### Running Tests

1.  **Ensure your `.env` is configured for testing:**
    The `TEST_DATABASE_URL` should point to a separate database instance to avoid data corruption.
    Example `TEST_DATABASE_URL="postgresql://user:password@localhost:5433/test_project_db"` (note the different port or database name).
    Also ensure `REDIS_HOST` and `REDIS_PORT` are configured for tests.
    The `conftest.py` will use these settings to spin up a clean database and Redis instance for each test run.

2.  **Run tests locally:**
    ```bash
    pytest
    ```
    This will run all tests in the `app/tests/` directory.

### Coverage Report

To generate a code coverage report:

```bash
pytest --cov=app --cov-report=term-missing --cov-report=html
```
*   `--cov=app`: Specifies the directory to measure coverage for.
*   `--cov-report=term-missing`: Shows missing lines in the terminal.
*   `--cov-report=html`: Generates an HTML report in `htmlcov/` (open `htmlcov/index.html` in your browser).

The goal is to achieve 80%+ coverage, especially for business logic and CRUD operations.

### Performance Testing (Conceptual)

While specific performance test scripts are beyond the scope of a single file response, here's how you'd approach it:

*   **Tools**: Use tools like [Locust](https://locust.io/), [JMeter](https://jmeter.apache.org/), or [k6](https://k6.io/).
*   **Scenarios**:
    *   **Load Testing**: Simulate expected user load to check response times and resource utilization.
    *   **Stress Testing**: Push the system beyond its normal limits to find breaking points.
    *   **Scalability Testing**: Increase load over time while scaling resources to see how the system performs.
*   **Metrics**: Monitor response times, throughput (requests per second), error rates, CPU/memory usage, and database performance.
*   **Implementation**:
    1.  Write Python scripts (for Locust) that simulate user actions (e.g., login, create project, list tasks, update task).
    2.  Define concurrency and ramp-up patterns.
    3.  Run the tests against a deployed instance of your API (ideally in a staging environment).
    4.  Analyze results and identify bottlenecks (e.g., slow database queries, inefficient code, resource limits).

---

## 9. CI/CD

A basic GitHub Actions workflow (`.github/workflows/ci.yml`) is included to demonstrate Continuous Integration and Continuous Deployment.

**Workflow Steps:**
1.  **`build-and-test` job:**
    *   Checks out code.
    *   Sets up Python environment.
    *   Installs dependencies.
    *   **Sets up PostgreSQL and Redis as services for testing.**
    *   Creates a test `.env` file.
    *   **Applies Alembic migrations to the test database.**
    *   Runs `pytest` with code coverage (`--cov-report=xml`).
    *   Uploads coverage report to Codecov.
2.  **`deploy-development` job:**
    *   Runs only on `develop` branch pushes.
    *   Builds and pushes Docker image to Docker Hub (or your chosen registry).
    *   Deploys to a development server using SSH (replace with your actual deployment logic, e.g., Kubernetes, CapRover, AWS ECS).
3.  **`deploy-production` job:**
    *   Runs only on `main` branch pushes.
    *   Builds and pushes Docker image (tagged `latest`).
    *   Deploys to a production server using SSH (similar to development, but for production environment).

**Configuration:**
*   You'll need to set up GitHub Secrets for `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `DEV_SSH_HOST`, `DEV_SSH_USERNAME`, `DEV_SSH_KEY`, `PROD_SSH_HOST`, `PROD_SSH_USERNAME`, `PROD_SSH_KEY`.
*   Replace `your-dockerhub-username` with your actual Docker Hub username in the workflow.
*   Adjust deployment scripts (`script:` section) to match your server setup.

---

## 10. Frontend (Basic Demonstration)

A simple `frontend/` directory is included to show how a client application would interact with the API.

*   `frontend/index.html`: Basic structure with forms for login, project creation, task listing.
*   `frontend/style.css`: Minimal styling.
*   `frontend/script.js`: JavaScript code to make `fetch` API calls to your FastAPI backend.

**To run the frontend:**

1.  **Start the backend API** (using Docker Compose or locally as described above).
2.  **Open `frontend/index.html`** in your web browser.
3.  You might need to serve it via a local static file server to avoid CORS issues if not running on `localhost:8000` or `localhost:5173`.
    *   A simple Python HTTP server: `python -m http.server 5173 --directory frontend`
    *   Then access `http://localhost:5173/index.html`

**Login Credentials for Seed Data:**
*   **Admin:** `username: admin`, `password: adminpass`
*   **Manager:** `username: manager`, `password: managerpass`
*   **Member 1:** `username: member1`, `password: memberpass`
*   **Member 2:** `username: member2`, `password: memberpass`

---

## 11. Deployment Guide

### Overview

Deployment typically involves:
1.  **Containerization**: Building Docker images.
2.  **Orchestration**: Using Docker Compose or Kubernetes to manage services.
3.  **CI/CD**: Automating build, test, and deployment.
4.  **Monitoring**: Setting up logging, metrics, and alerts.
5.  **Security**: Hardening containers, network, and access.

### Steps

1.  **Prepare your Server/Cloud Environment:**
    *   Provision a VM (e.g., AWS EC2, DigitalOcean Droplet) or use a container orchestration service (Kubernetes, AWS ECS, Google Cloud Run).
    *   Install Docker and Docker Compose on your VM if not using a managed container service.

2.  **Set up `git clone` on the Server:**
    ```bash
    git clone https://github.com/your-username/project-management-api.git
    cd project-management-api
    ```

3.  **Configure `.env` for Production:**
    *   Create a `.env` file directly on the server (do NOT commit sensitive data).
    *   Ensure `ENVIRONMENT=production`, `DEBUG=False`.
    *   Use strong, unique `SECRET_KEY` (generate with `openssl rand -hex 32`).
    *   Configure `DATABASE_URL` and `REDIS_HOST` to point to your production database and Redis instances (these might be separate managed services like AWS RDS/ElastiCache or dedicated Docker containers).
    *   `BACKEND_CORS_ORIGINS` should only list your production frontend domains.

4.  **Run Migrations (Production-Safe):**
    *   In a production setup, it's safer to run migrations as a separate step.
    *   Access the backend container/environment and execute:
        ```bash
        docker-compose run backend alembic upgrade head
        ```
    *   **Crucially, remove the `alembic upgrade head` and `python app/seed_data.py` commands from the `backend` service's `command` in `docker-compose.yml` for production.** You only want migrations applied explicitly.

5.  **Initial Seeding (Production):**
    *   If this is the first deployment, run `python app/seed_data.py` *once* manually after migrations:
        ```bash
        docker-compose run backend python app/seed_data.py
        ```
    *   This script drops and recreates tables, so ensure you only run it when you want to reset the database.

6.  **Deploy Application:**
    *   Build and start containers:
        ```bash
        docker-compose up --build -d
        ```
    *   Consider using more advanced deployment strategies for zero-downtime updates (e.g., blue-green deployment, rolling updates with Kubernetes).

7.  **Reverse Proxy & SSL (Recommended):**
    *   Use a reverse proxy like Nginx or Caddy in front of your FastAPI application.
    *   Configure it to handle SSL termination (HTTPS) and serve your application on standard ports (80/443).
    *   Example Nginx configuration:
        ```nginx
        server {
            listen 80;
            server_name your-api-domain.com;
            return 301 https://$host$request_uri;
        }

        server {
            listen 443 ssl http2;
            server_name your-api-domain.com;

            ssl_certificate /etc/letsencrypt/live/your-api-domain.com/fullchain.pem;
            ssl_certificate_key /etc/letsencrypt/live/your-api-domain.com/privkey.pem;

            location / {
                proxy_pass http://localhost:8000; # Or your Docker service name
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
            }
        }
        ```

8.  **Monitoring & Logging:**
    *   Integrate with external logging services (e.g., ELK Stack, Splunk, LogDNA) or cloud-native solutions.
    *   Set up metrics collection (e.g., Prometheus/Grafana) to monitor application and infrastructure health.

---

## 12. Contributing

Feel free to fork this repository, submit pull requests, or open issues. Any contributions that improve the quality, functionality, or documentation are welcome.

---

## 13. License

This project is licensed under the MIT License. See the `LICENSE` file for details.
```