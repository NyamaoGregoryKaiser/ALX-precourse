```markdown
# Payment Processing System

This project is a comprehensive, production-ready payment processing system built with Python (FastAPI), PostgreSQL, and Docker. It covers a wide range of features required for an enterprise-grade application, focusing on API-first design, modularity, security, and scalability.

## Table of Contents

1.  [Features](#features)
2.  [Architecture Overview](#architecture-overview)
3.  [Technology Stack](#technology-stack)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Development Setup](#local-development-setup)
    *   [Running with Docker Compose](#running-with-docker-compose)
5.  [Database Management (Alembic)](#database-management-alembic)
6.  [Running Tests](#running-tests)
7.  [API Documentation](#api-documentation)
8.  [Authentication and Authorization](#authentication-and-authorization)
9.  [Error Handling](#error-handling)
10. [Logging and Monitoring](#logging-and-monitoring)
11. [Caching and Rate Limiting](#caching-and-rate-limiting)
12. [Idempotency](#idempotency)
13. [Webhooks](#webhooks)
14. [Deployment Guide](#deployment-guide)
15. [CI/CD](#cicd)
16. [Future Enhancements](#future-enhancements)
17. [Contributing](#contributing)
18. [License](#license)

---

## 1. Features

*   **User Management:** Admin, Merchant roles with authentication (JWT).
*   **Merchant Management:** CRUD operations for merchants, linked to users.
*   **Payment Processing:**
    *   Initiate payments via a simulated external payment gateway.
    *   Track payment statuses (pending, captured, refunded, failed).
    *   Idempotency for payment requests.
*   **Webhooks:**
    *   Receive events from the external payment gateway to update payment statuses.
    *   Send notifications to merchants about payment lifecycle events.
    *   Reliable webhook delivery with retries.
*   **API:** RESTful API with full CRUD operations, input validation, and clear error responses.
*   **Security:** JWT-based authentication, role-based authorization, password hashing.
*   **Data Layer:** PostgreSQL database with SQLAlchemy ORM and Alembic migrations.
*   **Configuration:** Environment variable-based configuration (`.env`).
*   **Containerization:** Docker and Docker Compose for easy setup and deployment.
*   **Caching:** Redis for performance optimization.
*   **Rate Limiting:** Protects API endpoints from abuse.
*   **Logging:** Structured logging for better observability.
*   **Error Handling:** Centralized exception handling with custom error types.
*   **Testing:** Comprehensive suite including Unit, Integration, and API tests (Pytest).
*   **CI/CD:** Basic GitHub Actions workflow for automated testing.

## 2. Architecture Overview

The system follows a layered architecture:

*   **Presentation Layer (API):** FastAPI handles incoming HTTP requests, routing, and input validation via Pydantic schemas.
*   **Service Layer (Business Logic):** Contains the core business rules, orchestrates interactions between repositories, and communicates with external services.
*   **Data Access Layer (Repositories):** Abstracts database operations, providing an interface for services to interact with models without direct SQLAlchemy coupling.
*   **Database (PostgreSQL):** Persistent storage for all application data.
*   **Caching/Messaging (Redis):** Used for session caching, rate limiting, and potentially for a task queue (e.g., Celery for background tasks).
*   **External Services (Mock Payment Gateway):** Simulates interaction with third-party payment providers.

```mermaid
graph TD
    A[Client/Frontend] -->|HTTP/S| B(FastAPI Backend)
    B --> C{Authentication & Authorization}
    C --> B
    B --> D[Middleware: Logging, Rate Limiting]
    D --> E[API Routers]
    E --> F[Pydantic Schemas: Validation]
    F --> G[Service Layer: Business Logic]
    G --> H[Repository Layer: DB Operations]
    H --> I[PostgreSQL Database]
    G --> J[External Payment Gateway Client]
    J --> K[Mock Payment Gateway]
    G --> L[Redis Cache/Queue]
    E --> M[Background Tasks: Webhook Delivery]
    M --> L
    K --> E |Webhook Notifications|
```

## 3. Technology Stack

*   **Backend:** Python 3.11+
*   **Web Framework:** FastAPI
*   **Database:** PostgreSQL
*   **ORM:** SQLAlchemy 2.0+ (async)
*   **Migrations:** Alembic
*   **Caching/Rate Limiting:** Redis
*   **API Client:** httpx
*   **Authentication:** PyJWT, Passlib (Bcrypt)
*   **Logging:** Loguru
*   **Testing:** Pytest, pytest-asyncio, pytest-httpx, pytest-cov
*   **Containerization:** Docker, Docker Compose

## 4. Setup and Installation

### Prerequisites

*   Docker and Docker Compose
*   Python 3.11+ (if running locally without Docker)
*   `pip` (Python package installer)

### Local Development Setup (without Docker Compose)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/payment-processing-system.git
    cd payment-processing-system
    ```

2.  **Create a virtual environment and activate it:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: `venv\Scripts\activate`
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up environment variables:**
    Create a `.env` file in the project root by copying `.env.example`.
    ```bash
    cp .env.example .env
    ```
    Edit `.env` and configure your `DATABASE_URL`, `SECRET_KEY`, `REDIS_PASSWORD`, etc.
    *   For local PostgreSQL, you'll need to have one running, e.g., via `docker run --name pg-local -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=password -e POSTGRES_DB=payment_db -p 5432:5432 -d postgres:15-alpine`.
    *   For local Redis, `docker run --name redis-local -p 6379:6379 -d redis:7-alpine`.

5.  **Run database migrations:**
    ```bash
    alembic upgrade head
    ```

6.  **Seed initial data (optional):**
    ```bash
    python scripts/seed_db.py
    ```

7.  **Run the application:**
    ```bash
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    ```
    The API will be available at `http://localhost:8000`.
    *   Access Swagger UI at `http://localhost:8000/docs`.
    *   Access ReDoc at `http://localhost:8000/redoc`.
    *   Access a minimal frontend at `http://localhost:8000/`.

### Running with Docker Compose

This is the recommended way to run the entire system locally, including the database and Redis.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/payment-processing-system.git
    cd payment-processing-system
    ```

2.  **Set up environment variables:**
    Create a `.env` file in the project root by copying `.env.example`.
    ```bash
    cp .env.example .env
    ```
    Edit `.env` and ensure `DATABASE_URL` is configured for the `db` service (e.g., `postgresql+asyncpg://admin:password@db:5432/payment_db`). Also update `REDIS_PASSWORD` to match the one in `docker-compose.yml`.

3.  **Build and run services:**
    ```bash
    docker-compose up --build
    ```
    This will:
    *   Build the `app` Docker image.
    *   Start PostgreSQL (`db`) and Redis (`redis`) containers.
    *   Start the FastAPI application (`app`).
    *   (Optionally) Start a mock payment gateway (`mock-gateway`).

4.  **Run database migrations (once services are up):**
    Open a new terminal and execute the Alembic command inside the running `app` container:
    ```bash
    docker-compose exec app alembic upgrade head
    ```

5.  **Seed initial data (optional):**
    ```bash
    docker-compose exec app python scripts/seed_db.py
    ```

The API will be available at `http://localhost:8000`.

## 5. Database Management (Alembic)

Alembic is used for database migrations.

*   **Generate a new migration:**
    ```bash
    docker-compose exec app alembic revision --autogenerate -m "descriptive_message"
    ```
    Review the generated script in `alembic/versions/` before applying.

*   **Apply all pending migrations:**
    ```bash
    docker-compose exec app alembic upgrade head
    ```

*   **Revert to a previous migration:**
    ```bash
    docker-compose exec app alembic downgrade -1 # Revert last migration
    docker-compose exec app alembic downgrade <revision_id> # Revert to specific revision
    ```

## 6. Running Tests

The project includes a comprehensive test suite.

*   **Ensure test database is ready:** The `conftest.py` sets up a dedicated test database (PostgreSQL container running on port 5433 by default in CI). If running locally, make sure you have a separate PostgreSQL instance for testing or adjust `TEST_DATABASE_URL` in `.env`.

*   **Run all tests with coverage:**
    ```bash
    pytest --cov=app --cov-report=html tests/
    ```
    This will generate an HTML coverage report in the `htmlcov` directory.

*   **Run specific tests:**
    ```bash
    pytest tests/unit/test_auth_service.py
    pytest tests/api/
    ```

*   **Run performance tests (using Locust):**
    1.  Ensure your application is running (e.g., via `docker-compose up`).
    2.  Install Locust: `pip install locust`
    3.  Navigate to the project root and run: `locust -f tests/performance/locustfile.py`
    4.  Open your browser to `http://localhost:8089` to access the Locust UI.

## 7. API Documentation

FastAPI automatically generates OpenAPI (Swagger UI) and ReDoc documentation based on your code.

*   **Swagger UI:** `http://localhost:8000/docs`
*   **ReDoc:** `http://localhost:8000/redoc`

These interfaces provide interactive documentation where you can explore endpoints, request/response schemas, and even send test requests directly from your browser.

## 8. Authentication and Authorization

*   **Authentication:** Uses JWT (JSON Web Tokens) for authenticating users.
    *   Users log in by providing credentials to `/api/v1/auth/token` to receive an `access_token`.
    *   This token must be sent in the `Authorization` header as `Bearer <token>` for protected endpoints.
*   **Authorization:** Role-based access control (RBAC) is implemented using FastAPI dependencies.
    *   `Admin` users have full access.
    *   `Merchant` users can manage their own merchants and payments.
    *   `Customer` role is present for future expansion (e.g., wallet, personal payment history).

## 9. Error Handling

*   **Custom Exceptions:** Defined in `app/core/exceptions.py` for common application-specific errors (e.g., `NotFoundException`, `AuthException`).
*   **Global Handlers:** `main.py` includes exception handlers for `StarletteHTTPException`, `CustomException`, and a generic `Exception` to ensure consistent JSON error responses across the API.
*   **Validation Errors:** FastAPI/Pydantic automatically handle request validation errors, returning `422 Unprocessable Entity` responses.

## 10. Logging and Monitoring

*   **Structured Logging:** `loguru` is configured in `app/core/logger.py` to provide detailed, colorized logs in development and structured, machine-readable logs in production.
*   **Request Logging Middleware:** `app/middleware/logging.py` logs details for every incoming request and outgoing response, including timing and unique `request_id` for correlation.
*   **Monitoring:** While full-fledged monitoring (e.g., Prometheus, Grafana) is beyond this scope, the structured logs provide a solid foundation for integration with log aggregation services (ELK stack, Splunk, Datadog, etc.).

## 11. Caching and Rate Limiting

*   **Caching (Redis):** `app/core/dependencies.py` provides a Redis client. This can be used in services to cache frequently accessed data (e.g., merchant configurations, lookup tables) to reduce database load.
*   **Rate Limiting (`fastapi-limiter`):** Configured in `app/middleware/rate_limiting.py` and `main.py` using `fastapi-limiter` with Redis as the backend. It can be applied globally or per-endpoint using dependencies (e.g., `Depends(rate_limiter_dependency)`). Default is 5 requests per minute.

## 12. Idempotency

*   **Idempotency Keys:** Crucial for payment systems to prevent duplicate processing of the same request due to network issues or retries.
*   **Implementation:** The `Payment` model includes an `idempotency_key` field with a unique constraint. The `PaymentService` checks this key before processing new payment requests. If a request with an existing key is received, it returns the result of the original processing instead of creating a new payment.

## 13. Webhooks

*   **Inbound Webhooks (from Gateway):** The `/api/v1/webhooks/gateway-events` endpoint is designed to receive status updates from the external payment gateway. It validates the incoming webhook (e.g., via signature verification) and updates the relevant payment record.
*   **Outbound Webhooks (to Merchants):** When a payment status changes, the system can send notifications to configured merchant webhook URLs.
    *   `app/models/webhook_event.py` tracks these events.
    *   `app/tasks/webhook_delivery.py` handles asynchronous and reliable delivery with exponential backoff retries. This would typically run in a dedicated worker (e.g., Celery) for true robustness, but a simplified in-process async task is shown.

## 14. Deployment Guide

This project is containerized with Docker, making deployment relatively straightforward to any environment that supports Docker (e.g., Kubernetes, AWS ECS, Google Cloud Run, Azure Container Instances).

1.  **Container Registry:** Push your Docker image to a private container registry (e.g., Docker Hub, AWS ECR, GCR).
    ```bash
    docker build -t your-registry/payment-processor:latest .
    docker push your-registry/payment-processor:latest
    ```
2.  **Environment Configuration:** Ensure all necessary environment variables from `.env.example` are securely configured in your deployment environment (e.g., Kubernetes Secrets, AWS Parameter Store, environment variables). **Crucially, replace placeholders like `SECRET_KEY`, `REDIS_PASSWORD`, `PAYMENT_GATEWAY_API_KEY`, etc., with strong, production-ready values.**
3.  **Database:** Provision a managed PostgreSQL database instance (e.g., AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL). Update `DATABASE_URL` accordingly.
4.  **Redis:** Provision a managed Redis instance (e.g., AWS ElastiCache, Azure Cache for Redis, Google Cloud Memorystore). Update `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`.
5.  **Orchestration:** Use an orchestration tool (Docker Swarm, Kubernetes) or a managed service (AWS ECS, Google Cloud Run) to run the `app` container, ensuring it can connect to your provisioned DB and Redis.
6.  **Load Balancer/API Gateway:** Place a load balancer or API Gateway (e.g., Nginx, AWS ALB, GCP Load Balancer) in front of your FastAPI application for SSL termination, traffic routing, and possibly additional security/rate limiting.
7.  **Monitoring & Logging:** Integrate logs with your chosen log aggregation and monitoring solutions.

## 15. CI/CD

A basic GitHub Actions workflow (`.github/workflows/ci.yml`) is provided:

*   **Triggers:** Runs on `push` and `pull_request` events to `main` and `develop` branches.
*   **Steps:**
    *   Sets up Python.
    *   Installs dependencies.
    *   Starts temporary PostgreSQL and Redis services (using `services` in GitHub Actions).
    *   Waits for services to be healthy.
    *   Runs Alembic migrations on the test database.
    *   Executes `pytest` for unit, integration, and API tests, generating a coverage report.
    *   Uploads the coverage report to Codecov.

This workflow ensures that every code change is automatically tested, maintaining code quality.

## 16. Future Enhancements

*   **More Payment Methods:** Integrate with real payment gateways (Stripe, PayPal, etc.).
*   **Refunds and Disputes:** Implement full refund workflows and dispute handling.
*   **Fraud Detection:** Integrate with fraud detection services.
*   **Reporting & Analytics:** Dashboard for merchants to view transactions, generate reports.
*   **Customer Wallets:** Implement a wallet system for customers.
*   **Subscription Management:** Handle recurring payments.
*   **Asynchronous Tasks:** Use a dedicated task queue (e.g., Celery with Redis/RabbitMQ) for background processes like webhook delivery, report generation, etc., for better scalability and resilience.
*   **API Key Management:** More robust API key generation, rotation, and revocation for merchants.
*   **GraphQL API:** Provide an alternative GraphQL API for more flexible data querying.
*   **Advanced Caching:** Implement more aggressive caching strategies (e.g., for payment details that rarely change).
*   **Internationalization (i18n):** Support multiple languages and currencies comprehensively.
*   **OpenTelemetry:** Distributed tracing for better observability across services.

## 17. Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Write comprehensive tests for your changes.
5.  Ensure all tests pass (`pytest`).
6.  Commit your changes (`git commit -m 'Add new feature'`).
7.  Push to the branch (`git push origin feature/your-feature-name`).
8.  Create a Pull Request.

## 18. License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
```