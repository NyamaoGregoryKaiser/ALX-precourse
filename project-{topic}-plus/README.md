```markdown
# ShopSwift E-commerce Solution

ShopSwift is a comprehensive, production-ready e-commerce platform built with Flask, SQLAlchemy, and PostgreSQL. It features a robust backend API, user management, product catalog, shopping cart, order processing, and various enterprise-grade functionalities.

## Table of Contents

1.  [Features](#features)
2.  [Technology Stack](#technology-stack)
3.  [Project Structure](#project-structure)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Development with Docker Compose](#local-development-with-docker-compose)
    *   [Local Development without Docker (Python Virtual Environment)](#local-development-without-docker-python-virtual-environment)
5.  [Running the Application](#running-the-application)
6.  [Database Management](#database-management)
    *   [Migrations](#migrations)
    *   [Seeding Data](#seeding-data)
7.  [Testing](#testing)
    *   [Unit and Integration Tests](#unit-and-integration-tests)
    *   [Performance Tests](#performance-tests)
8.  [API Documentation](#api-documentation)
9.  [Architecture Documentation](#architecture-documentation)
10. [Deployment Guide](#deployment-guide)
11. [Contributing](#contributing)
12. [License](#license)

## Features

*   **User Management**: Register, login, manage profiles, role-based access control (customer, admin).
*   **Authentication & Authorization**: JWT-based authentication for secure API access.
*   **Product Catalog**: Create, view, update, delete products and categories. Search and filter products.
*   **Shopping Cart**: Add, update, remove items, clear cart.
*   **Order Processing**: Create orders from cart, view order history, update order status (admin).
*   **Database Layer**: PostgreSQL database with SQLAlchemy ORM and Alembic migrations.
*   **Configuration**: Environment-specific configurations (development, testing, production).
*   **Dockerization**: Docker Compose setup for easy local development and deployment.
*   **CI/CD**: GitHub Actions workflow for automated testing and deployment to staging/production.
*   **Caching**: Redis-backed caching for improved API response times.
*   **Rate Limiting**: Protects API endpoints from abuse.
*   **Logging & Error Handling**: Centralized logging and robust error handling middleware.
*   **Testing**: Comprehensive suite of unit, integration, and performance tests.

## Technology Stack

*   **Backend**: Python 3.10+
*   **Web Framework**: Flask
*   **Database**: PostgreSQL (production), SQLite (testing/local dev option)
*   **ORM**: SQLAlchemy
*   **Database Migrations**: Alembic (Flask-Migrate)
*   **Authentication**: Flask-JWT-Extended, Flask-Bcrypt
*   **Serialization/Validation**: Marshmallow
*   **Caching**: Flask-Caching, Redis
*   **Rate Limiting**: Flask-Limiter, Redis
*   **Containerization**: Docker, Docker Compose
*   **CI/CD**: GitHub Actions
*   **Testing**: Pytest, Pytest-Cov, Locust
*   **Web Server**: Gunicorn

## Project Structure

The project is structured into logical modules to promote maintainability and scalability.

```
ecommerce_system/
├── app/                      # Core Flask application
│   ├── __init__.py           # App factory, extensions initialization
│   ├── config.py             # Configuration classes
│   ├── models.py             # SQLAlchemy ORM models
│   ├── schemas.py            # Marshmallow schemas for data validation/serialization
│   ├── api/                  # API blueprints
│   │   ├── auth.py           # Auth endpoints (register, login, refresh)
│   │   ├── users.py          # User management endpoints
│   │   ├── categories.py     # Category CRUD endpoints
│   │   ├── products.py       # Product CRUD endpoints
│   │   ├── cart.py           # Shopping cart endpoints
│   │   └── orders.py         # Order processing endpoints
│   ├── services/             # Business logic services
│   │   ├── product_service.py
│   │   ├── user_service.py
│   │   └── order_service.py
│   ├── utils/                # Utility functions and decorators
│   │   ├── decorators.py     # Custom decorators (e.g., role_required)
│   │   └── error_handlers.py # Global error handlers
│   └── templates/            # Basic Jinja2 templates (minimal frontend for demo)
├── migrations/               # Alembic database migration scripts
├── tests/                    # Test suite
│   ├── unit/                 # Unit tests for models and services
│   ├── integration/          # Integration tests for API endpoints
│   └── performance/          # Performance tests with Locust
├── scripts/
│   └── seed_db.py            # Script to populate database with initial data
├── .env.example              # Example environment variables file
├── Dockerfile                # Docker image definition
├── docker-compose.yml        # Docker Compose for local development
├── requirements.txt          # Python dependencies
├── manage.py                 # Flask CLI commands (migrations, seeding)
├── README.md                 # Project README
├── ARCHITECTURE.md           # System architecture documentation
├── API.md                    # API endpoint documentation
├── DEPLOYMENT.md             # Deployment guide
└── .github/                  # GitHub Actions CI/CD workflows
```

## Setup and Installation

### Prerequisites

*   **Git**: For cloning the repository.
*   **Python 3.10+**: If not using Docker for local dev.
*   **Docker & Docker Compose**: Recommended for local development and deployment.

### Local Development with Docker Compose (Recommended)

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/shopsift.git
    cd shopsift
    ```

2.  **Create `.env` file**:
    Copy the example environment variables and fill in your details.
    ```bash
    cp .env.example .env
    ```
    You can keep the default values for `DATABASE_URL`, `REDIS_URL`, `RATELIMIT_STORAGE_URL` as they match the `docker-compose.yml` setup. **Change `JWT_SECRET_KEY` for production.**

3.  **Build and run services**:
    This will build the `app` image, set up PostgreSQL and Redis containers, run database migrations, seed initial data, and start the Flask application.
    ```bash
    docker-compose up --build
    ```
    The `--build` flag is important the first time you run it, or after any changes to `Dockerfile` or `requirements.txt`.

4.  **Access the application**:
    Once started, the Flask application will be available at `http://localhost:5000`.
    *   API endpoints: `http://localhost:5000/api/...`
    *   Basic frontend: `http://localhost:5000/`, `http://localhost:5000/login`, `http://localhost:5000/register`

### Local Development without Docker (Python Virtual Environment)

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/shopsift.git
    cd shopsift
    ```

2.  **Create and activate a virtual environment**:
    ```bash
    python3 -m venv venv
    source venv/bin/activate # On Windows: .\venv\Scripts\activate
    ```

3.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
    *   **Note for `psycopg2-binary`**: If you encounter issues, you might need to install `libpq-dev` (Linux) or `postgresql-devel` (Fedora/CentOS) system packages, or use `pip install psycopg2-binary`.

4.  **Set up environment variables**:
    Create a `.env` file in the project root based on `.env.example`.
    For `DATABASE_URL`, you'll need a running PostgreSQL instance (e.g., installed locally or via Docker directly) or you can switch to SQLite for development in `app/config.py`.
    Example for `.env` using local PostgreSQL:
    ```
    FLASK_APP=manage.py
    FLASK_ENV=development
    DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce_db
    JWT_SECRET_KEY=dev-jwt-secret
    # Set REDIS_URL if you have a local Redis instance
    REDIS_URL=redis://localhost:6379/0
    RATELIMIT_STORAGE_URL=redis://localhost:6379/1
    ```

5.  **Initialize Database**:
    *   Create the database in PostgreSQL if it doesn't exist (e.g., `CREATE DATABASE ecommerce_db;`).
    *   Run migrations:
        ```bash
        flask db upgrade
        ```
    *   Seed initial data:
        ```bash
        flask seed-db
        ```
    *   (Optional) Create an admin user:
        ```bash
        flask create-admin admin@example.com adminpass
        ```

6.  **Run the application**:
    ```bash
    flask run
    ```
    The application will run on `http://127.0.0.1:5000`.

## Running the Application

### With Docker Compose
After `docker-compose up --build`, the application will be running.
Access `http://localhost:5000` in your browser.

### Without Docker
After setting up the virtual environment and database:
```bash
flask run
```
Access `http://127.0.0.1:5000` in your browser.

## Database Management

### Migrations (Alembic)

*   **Initialize migrations (first time setup)**:
    ```bash
    flask db init
    ```
    This creates the `migrations/` folder.
*   **Generate a migration script (after model changes)**:
    ```bash
    flask db migrate -m "Description of changes"
    ```
*   **Apply migrations to the database**:
    ```bash
    flask db upgrade
    ```
*   **Revert migrations**:
    ```bash
    flask db downgrade
    ```

### Seeding Data

To populate your database with initial test data (e.g., users, categories, products):

```bash
flask seed-db
```
**Note**: The `docker-compose.yml` file is configured to run `flask db upgrade` and `flask seed-db` automatically on container startup in development, ensuring your DB is always ready.

## Testing

### Unit and Integration Tests

The project uses `pytest` for unit and integration testing. Test files are located in the `tests/` directory.

To run all tests:
```bash
pytest
```

To run tests with coverage reporting (requires `pytest-cov`):
```bash
pytest --cov=app --cov-report=term-missing
```
This will show a summary of code coverage in your terminal. For a full HTML report, use `--cov-report=html`.

### Performance Tests

Performance testing is done using `Locust`. A sample `locustfile.py` is provided in `tests/performance/`.

1.  **Install Locust**:
    ```bash
    pip install locust
    ```
2.  **Navigate to the performance tests directory**:
    ```bash
    cd tests/performance
    ```
3.  **Run Locust**:
    ```bash
    locust -f locustfile.py
    ```
4.  **Access the Locust UI**:
    Open your web browser and navigate to `http://localhost:8089` (or the address shown in your terminal).
    Enter the host of your running ShopSwift application (e.g., `http://localhost:5000`) and configure your load test.

## API Documentation

The API endpoints are documented in `API.md` using an OpenAPI/Swagger-like format.

## Architecture Documentation

A high-level overview of the system's architecture, including components and data flow, is available in `ARCHITECTURE.md`.

## Deployment Guide

Detailed deployment instructions for various environments (e.g., cloud providers like AWS, GCP, Azure, or bare-metal servers) are in `DEPLOYMENT.md`. This includes setting up Gunicorn, Nginx, and proper environment variable management.

## Contributing

Contributions are welcome! Please refer to `CONTRIBUTING.md` (if exists, otherwise follow standard open-source contribution guidelines).

## License

This project is licensed under the MIT License - see the `LICENSE` file for details.
```