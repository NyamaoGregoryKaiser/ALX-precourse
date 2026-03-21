# Task Management API - Enterprise-Grade Security System

This project implements a comprehensive, production-ready Task Management API with a strong focus on security, testing, and DevOps practices. It's built with Python (Flask) and aims to be enterprise-grade, covering various aspects of modern software development.

## Table of Contents
1.  [Project Overview](#project-overview)
2.  [Features](#features)
3.  [Architecture](#architecture)
4.  [Setup & Installation](#setup--installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Development Setup](#local-development-setup)
    *   [Docker Setup](#docker-setup)
5.  [Running the Application](#running-the-application)
6.  [Database Management](#database-management)
7.  [API Documentation (Swagger UI)](#api-documentation-swagger-ui)
8.  [Testing](#testing)
    *   [Running Tests](#running-tests)
    *   [Performance Testing (Conceptual)](#performance-testing-conceptual)
9.  [Configuration](#configuration)
10. [Logging & Monitoring](#logging--monitoring)
11. [Error Handling](#error-handling)
12. [Caching](#caching)
13. [Rate Limiting](#rate-limiting)
14. [CI/CD Pipeline](#cicd-pipeline)
15. [Deployment Guide](#deployment-guide)
16. [Security Considerations](#security-considerations)
17. [ALX Software Engineering Focus](#alx-software-engineering-focus)
18. [License](#license)

---

## 1. Project Overview

The Task Management API allows users to create, manage, and assign tasks. It supports multiple user roles (Admin, Regular User) and enforces access control based on these roles. The system prioritizes security, scalability, and maintainability.

## 2. Features

*   **User Management**: Register, Login, Logout, User CRUD (with RBAC).
*   **Task Management**: Create, Read (single, list), Update, Delete tasks (with RBAC).
*   **Authentication**: JWT (JSON Web Tokens) based authentication with access and refresh tokens, token blacklisting.
*   **Authorization**: Role-Based Access Control (RBAC) - Admin vs. Regular User roles.
*   **Data Validation**: Input validation using Marshmallow schemas for API requests.
*   **Database**: SQLAlchemy ORM with Flask-SQLAlchemy, supporting SQLite (development) and PostgreSQL (production).
*   **Migrations**: Alembic/Flask-Migrate for database schema evolution.
*   **Caching**: Redis-backed caching for API responses to improve performance.
*   **Rate Limiting**: Throttling API requests to prevent abuse and denial-of-service attacks.
*   **Logging**: Structured JSON logging to files and console.
*   **Error Handling**: Centralized, custom error handling for consistent API responses.
*   **Containerization**: Docker and Docker Compose for easy setup and deployment.
*   **API Documentation**: Interactive API documentation using Swagger UI (Flasgger).
*   **Testing**: Comprehensive Unit and Integration tests using Pytest (targeting 80%+ coverage).
*   **CI/CD**: GitHub Actions pipeline for automated testing and (conceptual) deployment.
*   **Configuration**: Environment variable based configuration for flexibility across environments.

## 3. Architecture

The application follows a layered architectural pattern:

*   **Presentation Layer (Routes/Controllers)**: Handles HTTP requests, parses input, calls appropriate service methods, and formats responses. Flask Blueprints are used to organize endpoints.
*   **Service Layer (Business Logic)**: Contains the core business logic, orchestrates interactions between models, and applies application-specific rules. This layer is responsible for authorization checks (in conjunction with decorators).
*   **Data Access Layer (Models)**: Defines the database schema using SQLAlchemy ORM, handles data persistence, and provides methods for interacting with the database.
*   **Utility Layer**: Contains cross-cutting concerns like logging, error handling, decorators (for auth/authz, caching, rate limiting), and helper functions.

**Key Components:**
*   **Flask**: Web framework.
*   **SQLAlchemy**: ORM for database interaction.
*   **Flask-JWT-Extended**: For JWT authentication.
*   **Flask-Limiter**: For rate limiting.
*   **Flask-Caching**: For caching.
*   **Marshmallow**: For request/response data validation and serialization.
*   **Flasgger**: For OpenAPI/Swagger documentation.
*   **Pytest**: For testing.
*   **Gunicorn**: WSGI HTTP Server for production.
*   **Redis**: For caching and rate limiting storage.
*   **PostgreSQL/SQLite**: Database.

## 4. Setup & Installation

### Prerequisites

*   Python 3.9+
*   pip (Python package installer)
*   Docker & Docker Compose (for containerized setup)
*   Git

### Local Development Setup (without Docker)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/task-management-api.git
    cd task-management-api
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate  # On Windows: `venv\Scripts\activate`
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure Environment Variables:**
    Copy the `.env.example` file to `.env` and fill in your details.
    ```bash
    cp .env.example .env
    ```
    Ensure `SQLALCHEMY_DATABASE_URI` points to your preferred database (e.g., `sqlite:///app.db` for local SQLite).

5.  **Initialize Database & Run Migrations:**
    ```bash
    flask db init
    flask db migrate -m "initial_migration" # Only run once for new project
    flask db upgrade
    ```

6.  **Seed the database with initial data (optional but recommended):**
    ```bash
    python scripts/seed_db.py
    ```

### Docker Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/task-management-api.git
    cd task-management-api
    ```

2.  **Configure Environment Variables:**
    Copy `.env.example` to `.env`. Ensure your `SECRET_KEY`, `JWT_SECRET_KEY`, `REDIS_URL` are set.
    For `SQLALCHEMY_DATABASE_URI`, use the one pointing to the `db` service within Docker Compose (e.g., `postgresql://user:password@db:5432/mydatabase` if using a PostgreSQL container, or `sqlite:////app/instance/app.db` for persistent SQLite within container).

3.  **Build and run services with Docker Compose:**
    ```bash
    docker-compose up --build -d
    ```
    This will build the `web` application image, pull the `redis` image, and start both containers. The `-d` flag runs them in detached mode.

4.  **Run database migrations within the running container:**
    ```bash
    docker-compose exec web flask db upgrade
    ```

5.  **Seed the database within the running container (optional):**
    ```bash
    docker-compose exec web python scripts/seed_db.py
    ```

## 5. Running the Application

*   **Local (without Docker):**
    ```bash
    flask run
    ```
    The application will be accessible at `http://127.0.0.1:5000`.

*   **With Docker Compose:**
    The application will be accessible at `http://localhost:5000`.

## 6. Database Management

This project uses Flask-Migrate (built on Alembic) for database migrations.

*   **Initialize migrations (first time only):**
    ```bash
    flask db init
    ```
*   **Create a new migration script:**
    ```bash
    flask db migrate -m "Description of changes"
    ```
    Review the generated script in `alembic/versions/`.
*   **Apply migrations to the database:**
    ```bash
    flask db upgrade
    ```
*   **Revert migrations:**
    ```bash
    flask db downgrade
    ```
*   **Seed data:**
    ```bash
    python scripts/seed_db.py
    ```
    This script will drop and recreate all tables before seeding. **Use with caution, especially in production.**

## 7. API Documentation (Swagger UI)

Once the application is running, access the interactive API documentation at:
`http://localhost:5000/apidocs`

This interface allows you to explore all endpoints, view request/response schemas, and even make live API calls.

## 8. Testing

The project emphasizes comprehensive testing, including unit, integration, and API tests.

### Running Tests

1.  **Ensure virtual environment is active (if not using Docker):**
    ```bash
    source venv/bin/activate
    ```

2.  **Run pytest with coverage:**
    ```bash
    pytest --cov=app --cov-report=html --cov-report=xml tests/
    ```
    *   `--cov=app`: Measures coverage for the `app` directory.
    *   `--cov-report=html`: Generates an HTML coverage report (look for `htmlcov/index.html`).
    *   `--cov-report=xml`: Generates an XML report, useful for CI/CD tools like Codecov.
    *   `tests/`: Specifies the test directory.

    **Note:** Tests use an in-memory SQLite database and a simple cache backend to ensure isolation and speed. Rate limiting is disabled during tests.

### Performance Testing (Conceptual)

For production-ready systems, performance testing is crucial. Tools like [Locust](https://locust.io/) or [JMeter](https://jmeter.apache.org/index.html) can be used to simulate user load.

**Example Locust script (conceptual `locustfile.py`):**

```python
# from locust import HttpUser, task, between
# import random
#
# class WebsiteUser(HttpUser):
#     wait_time = between(1, 2.5) # Wait time between tasks
#     host = "http://localhost:5000"
#     users = {}
#     tokens = {}
#
#     def on_start(self):
#         """On start, register and login some users."""
#         self.client.post("/api/auth/register", json={"username": f"testuser_{self.environment.stats.total.num_requests}", "email": f"testuser_{self.environment.stats.total.num_requests}@example.com", "password": "password"})
#         response = self.client.post("/api/auth/login", json={"username": f"testuser_{self.environment.stats.total.num_requests}", "password": "password"})
#         self.access_token = response.json()["access_token"]
#         self.headers = {"Authorization": f"Bearer {self.access_token}"}
#
#     @task(3)
#     def get_tasks(self):
#         self.client.get("/api/tasks/", headers=self.headers, name="/api/tasks [GET]")
#
#     @task(1)
#     def create_task(self):
#         self.client.post("/api/tasks/", headers=self.headers, json={"title": f"Task {random.randint(1, 100000)}", "description": "Performance test task", "status": "pending"}, name="/api/tasks [POST]")
#
#     @task(1)
#     def get_my_info(self):
#         self.client.get("/api/auth/me", headers=self.headers, name="/api/auth/me [GET]")
```

To run Locust:
1.  Install Locust: `pip install locust`
2.  Save the above as `locustfile.py` in your project root.
3.  Run: `locust -f locustfile.py`
4.  Open `http://localhost:8089` in your browser to access the Locust UI.

## 9. Configuration

Configuration is managed via environment variables and defined in `app/config.py`. The `.env` file (loaded by `python-dotenv`) populates these variables in development. In production, these should be managed by your hosting environment (e.g., Docker secrets, Kubernetes secrets, cloud provider environment variables).

**Key environment variables:**
*   `SECRET_KEY`: Flask secret key. **Crucial for security.**
*   `JWT_SECRET_KEY`: JWT signing key. **Crucial for security.**
*   `SQLALCHEMY_DATABASE_URI`: Database connection string.
*   `REDIS_URL`: Redis connection string for caching and rate limiting.
*   `FLASK_ENV`: `development` or `production`.
*   `LOG_LEVEL`: `INFO`, `DEBUG`, `WARNING`, `ERROR`, `CRITICAL`.
*   `RATE_LIMIT_DEFAULT`: Default rate limit string (e.g., "200 per day;50 per hour").

## 10. Logging & Monitoring

The application uses Python's `logging` module configured for structured JSON output.
Logs are written to the console (development) and to a rotating file (`logs/app.log`).

*   `app/utils/logger.py`: Configures logging handlers and a custom JSON formatter.
*   `LOG_LEVEL`, `LOG_FILE_PATH`, `LOG_MAX_BYTES`, `LOG_BACKUP_COUNT` in `config.py` control logging behavior.

In a production environment, these logs should be collected by a centralized logging system (e.g., ELK Stack, Splunk, Datadog) for easier analysis and monitoring.

## 11. Error Handling

Centralized error handling ensures consistent and informative error responses for API consumers.
*   `app/utils/exceptions.py`: Defines custom exception classes (e.g., `NotFoundError`, `ForbiddenError`).
*   `app/utils/error_handlers.py`: Registers global error handlers for custom exceptions, `webargs` validation errors, and generic HTTP exceptions. This ensures all errors return a standardized JSON format.

## 12. Caching

A Redis-backed caching layer is integrated using Flask-Caching to improve response times for frequently accessed, less dynamic data.
*   `app/__init__.py`: Initializes `Flask-Caching`.
*   `app/utils/decorators.py`: Provides the `@cache_response` decorator.
*   `app/routes/*.py`: Applied to GET endpoints (e.g., `get_all_users`, `get_task`).
*   `CACHE_TYPE`, `CACHE_REDIS_URL`, `CACHE_DEFAULT_TIMEOUT` in `config.py` control caching.

Invalidation of caches (e.g., `cache.delete_memoized`) is implemented after data modification operations (PUT, POST, DELETE) to ensure data freshness.

## 13. Rate Limiting

Flask-Limiter is used to protect API endpoints from abuse and brute-force attacks by limiting the number of requests a user can make within a certain timeframe.
*   `app/__init__.py`: Initializes `Flask-Limiter`.
*   `app/utils/decorators.py`: Provides the `@rate_limit` decorator.
*   `app/routes/*.py`: Applied to most endpoints, especially authentication and creation endpoints.
*   `RATELIMIT_STORAGE_URL`, `RATELIMIT_DEFAULT` in `config.py` configure rate limiting.

## 14. CI/CD Pipeline

A conceptual GitHub Actions workflow (`.github/workflows/main.yml`) is provided:
*   **Build and Test**:
    *   Checks out code.
    *   Sets up Python environment.
    *   Installs dependencies.
    *   Runs database migrations (for test setup).
    *   Executes unit and integration tests with coverage.
    *   Uploads coverage reports to Codecov.
*   **Deployment (Conceptual)**:
    *   Placeholder stages for deploying to `staging` and `production` environments.
    *   These stages would typically involve building and pushing Docker images to a registry, then deploying to a cloud platform (e.g., AWS ECS, Kubernetes, Azure App Service, Heroku).

## 15. Deployment Guide

The recommended deployment strategy for this application is containerization using Docker.

1.  **Build and Push Docker Image (CI/CD):**
    Your CI/CD pipeline (e.g., GitHub Actions) should build the Docker image (`Dockerfile`) and push it to a container registry (e.g., Docker Hub, AWS ECR, Google Container Registry).

2.  **Provision Infrastructure:**
    Set up your production environment. This typically involves:
    *   A cloud provider (AWS, Azure, GCP).
    *   A container orchestration service (Kubernetes, AWS ECS, Azure Kubernetes Service).
    *   A managed database service (AWS RDS, Azure Database for PostgreSQL).
    *   A managed Redis service (AWS ElastiCache, Azure Cache for Redis).
    *   Load Balancers, Firewalls, Monitoring tools.

3.  **Configure Environment Variables:**
    Crucially, secure your `SECRET_KEY`, `JWT_SECRET_KEY`, `SQLALCHEMY_DATABASE_URI` (pointing to your production database), `REDIS_URL` (pointing to your production Redis instance), and other sensitive configurations using the secrets management features of your chosen platform. **Do not hardcode these in your Dockerfile or commit them to source control.**

4.  **Deploy Containers:**
    Deploy your application and Redis containers to your orchestration service. Ensure they can communicate with each other and with your managed database.
    *   The `Dockerfile` uses `gunicorn` as the production WSGI server.
    *   Scale `gunicorn` workers and threads based on your server's CPU and memory.

5.  **Set up Monitoring and Alerting:**
    Integrate your centralized logging, metrics (e.g., Prometheus), and alerting systems to monitor application health, performance, and security events.

## 16. Security Considerations

*   **Authentication (JWT)**: Securely generates and validates JWTs. Access tokens have short expiry; refresh tokens are used for longer sessions and can be revoked. Token blacklisting prevents reuse of revoked tokens.
*   **Authorization (RBAC)**: Fine-grained access control based on user roles (`admin`, `user`). Decorators enforce permissions at the endpoint level.
*   **Password Hashing**: Uses `Werkzeug.security.generate_password_hash` with `sha256` by default, providing strong, salt-aware hashing.
*   **Input Validation**: Marshmallow schemas rigorously validate all API inputs, preventing common injection attacks and data integrity issues.
*   **Error Handling**: Prevents leakage of sensitive information in error messages (especially in production).
*   **Rate Limiting**: Mitigates brute-force attacks on login endpoints and protects against denial-of-service attempts.
*   **HTTPS**: **Essential for production.** Configure your load balancer or reverse proxy (e.g., Nginx) to enforce HTTPS for all traffic to protect data in transit. This project assumes HTTPS will be handled by the infrastructure layer.
*   **Secret Management**: Environment variables are used, but for production, proper secrets management (e.g., AWS Secrets Manager, HashiCorp Vault) is required.
*   **CORS**: `Flask-Cors` is enabled to manage Cross-Origin Resource Sharing. Configure `CORS_ORIGINS` in production to allow only trusted frontend origins.
*   **SQL Injection Prevention**: SQLAlchemy ORM inherently protects against SQL injection by using parameterized queries.
*   **Dependency Security**: Keep `requirements.txt` up-to-date and regularly scan dependencies for known vulnerabilities (e.g., using `pip-audit`, Snyk, Dependabot).
*   **Least Privilege**: Design roles and permissions with the principle of least privilege.
*   **Logging**: Records security-relevant events (login attempts, failed authorizations) for auditing.

## 17. ALX Software Engineering Focus

This project directly addresses several ALX Software Engineering precourse materials:

*   **Programming Logic**: Demonstrates structured programming, modular design (blueprints, services, utils), object-oriented programming (models), and clear control flow in the API endpoints and services.
*   **Algorithm Design**: Examples include efficient database queries (e.g., filtering, pagination), basic data validation logic, and the flow of authentication/authorization. While no complex algorithms are present, the emphasis is on designing efficient and correct solutions for common web application problems.
*   **Technical Problem Solving**: Addresses real-world challenges like robust error handling, secure authentication, access control, performance optimization (caching), and system resilience (rate limiting). The testing suite exemplifies problem-solving through test-driven or behavior-driven development.

## 18. License

This project is open-source and available under the [MIT License](LICENSE).
```