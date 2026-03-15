# E-commerce System: Comprehensive Production-Ready Solution

This project implements a comprehensive, production-ready e-commerce solution with a focus on modularity, scalability, and adherence to modern software engineering best practices. It's built with Python Flask for the backend, PostgreSQL for the database, and a simple Jinja2-based frontend. Docker is used for containerization, and basic CI/CD configuration is included.

## Table of Contents

1.  [Features](#features)
2.  [Technology Stack](#technology-stack)
3.  [Project Structure](#project-structure)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Development Setup (without Docker)](#local-development-setup-without-docker)
    *   [Docker-based Setup (Recommended)](#docker-based-setup-recommended)
5.  [Running the Application](#running-the-application)
6.  [Database Management (Migrations & Seeding)](#database-management-migrations--seeding)
7.  [API Endpoints](#api-endpoints)
    *   [API Documentation (Swagger UI)](#api-documentation-swagger-ui)
8.  [Frontend Usage](#frontend-usage)
9.  [Testing](#testing)
    *   [Running Tests](#running-tests)
    *   [Performance Testing](#performance-testing)
10. [CI/CD](#cicd)
11. [Architecture](#architecture)
12. [Deployment Guide](#deployment-guide)
13. [Error Handling & Logging](#error-handling--logging)
14. [Caching & Rate Limiting](#caching--rate-limiting)
15. [Contributing](#contributing)
16. [License](#license)

---

## 1. Features

This system provides the core functionalities expected from an e-commerce platform:

*   **User Management:** Registration, Login, Profile Viewing/Editing (Customer & Admin roles).
*   **Authentication & Authorization:** JWT-based authentication, role-based access control (customer, admin).
*   **Product Catalog:** Browse products, view product details, filter by category, search.
*   **Category Management:** CRUD operations for product categories (Admin only).
*   **Shopping Cart:** Add, update, remove items from cart, clear cart.
*   **Order Management:** Place orders from cart, view order history, view order details.
*   **Inventory Management:** Automatic stock deduction upon order placement.
*   **API Endpoints:** Full CRUD operations exposed via RESTful API.
*   **Data Persistence:** PostgreSQL database for robust data storage.
*   **Error Handling:** Centralized API error handling.
*   **Logging & Monitoring:** Structured logging for application events and errors.
*   **Caching:** Redis-backed caching for improved performance (e.g., product listings).
*   **Rate Limiting:** Protects API endpoints against abuse.
*   **Containerization:** Docker for consistent development and deployment environments.
*   **Database Migrations:** Alembic for schema evolution.
*   **Seed Data:** Scripts to populate the database with initial data.
*   **Comprehensive Testing:** Unit, integration, and API tests.
*   **Documentation:** Detailed README, API docs (Swagger), Architecture, and Deployment guides.

---

## 2. Technology Stack

*   **Backend:** Python 3.10+
    *   **Framework:** Flask
    *   **ORM:** SQLAlchemy (via Flask-SQLAlchemy)
    *   **Database Migrations:** Flask-Migrate (Alembic)
    *   **RESTful API:** Flask-RESTful, Webargs (for request parsing/validation)
    *   **Authentication:** Flask-JWT-Extended, Flask-Bcrypt (for password hashing)
    *   **Caching:** Flask-Caching (Redis backend)
    *   **Rate Limiting:** Flask-Limiter (Redis backend)
    *   **API Documentation:** Flasgger (integrates Swagger UI)
    *   **WSGI Server:** Gunicorn (for production)
*   **Database:** PostgreSQL (production), SQLite (development/testing)
*   **Cache/Rate Limit Store:** Redis
*   **Frontend:** HTML, CSS, JavaScript (Jinja2 templates rendered by Flask, Bootstrap 5)
*   **Containerization:** Docker, Docker Compose
*   **Testing:** Pytest, pytest-cov, Faker
*   **CI/CD:** GitHub Actions (basic setup)

---

## 3. Project Structure

```
ecommerce_system/
├── app/
│   ├── api/             # RESTful API blueprints and resources
│   ├── models/          # SQLAlchemy database models
│   ├── services/        # Business logic layer
│   ├── templates/       # Jinja2 frontend templates
│   ├── static/          # CSS, JS, images for frontend
│   ├── utils/           # Utility functions, decorators, error classes
│   ├── config.py        # Application configurations for different environments
│   ├── __init__.py      # Flask app creation, extension initialization, blueprint registration
│   └── routes.py        # Frontend Flask routes
├── migrations/          # Alembic database migration scripts
├── tests/
│   ├── unit/            # Unit tests for models and services
│   ├── integration/     # Integration tests for API endpoints
│   ├── performance/     # Placeholder for performance tests (Locust)
│   └── conftest.py      # Pytest fixtures and test data seeding
├── .env.example         # Example environment variables
├── Dockerfile           # Docker image definition for the web application
├── docker-compose.yml   # Orchestrates Docker containers (web, db, redis)
├── requirements.txt     # Python dependencies
├── manage.py            # Flask CLI commands (run server, db migrations, seeding)
├── .gitignore
├── README.md
├── ARCHITECTURE.md      # Detailed architecture documentation
├── API_DOCS.md          # Generated/manual API documentation
└── DEPLOYMENT.md        # Deployment guide
└── .github/
    └── workflows/
        └── ci.yml       # GitHub Actions CI pipeline configuration
```

---

## 4. Setup and Installation

### Prerequisites

*   Python 3.10+
*   `pip` (Python package installer)
*   `venv` (Python virtual environment)
*   Docker and Docker Compose (recommended for easy setup)
*   Git

### Local Development Setup (without Docker)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/ecommerce-system.git
    cd ecommerce-system
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up environment variables:**
    Create a `.env` file in the root directory (based on `.env.example`):
    ```ini
    # .env
    FLASK_APP=manage.py
    FLASK_ENV=development
    SECRET_KEY="your_super_secret_key_here_for_jwt_and_session" # IMPORTANT: Change this!
    SQLALCHEMY_DATABASE_URI="sqlite:///dev.db" # Use SQLite for simple local dev
    SQLALCHEMY_TRACK_MODIFICATIONS=False
    REDIS_URL="redis://localhost:6379/0" # Only needed if you run Redis locally, otherwise Flask-Caching defaults to SimpleCache
    ADMIN_EMAIL="admin@example.com"
    ADMIN_PASSWORD="admin_password"
    FLASK_API_URL="http://localhost:5000/api" # For frontend to call backend
    ```
    *If you want to use PostgreSQL locally without Docker for the DB, you'll need a PostgreSQL server running and update `SQLALCHEMY_DATABASE_URI` accordingly.*
    *If you want to use Redis locally, ensure a Redis server is running (e.g., `redis-server` if installed, or via Docker).*

5.  **Initialize and migrate the database:**
    ```bash
    flask db_commands run_migrations
    ```

6.  **Seed the database (optional but recommended for initial data):**
    ```bash
    flask db_commands seed
    ```

### Docker-based Setup (Recommended)

This method provides a consistent environment with PostgreSQL and Redis services.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/ecommerce-system.git
    cd ecommerce-system
    ```

2.  **Create `.env` file:**
    Copy `.env.example` to `.env` and fill in `SECRET_KEY`. The `docker-compose.yml` is configured to use the `db` and `redis` service names for `SQLALCHEMY_DATABASE_URI` and `REDIS_URL` respectively.
    ```ini
    # .env
    FLASK_APP=manage.py
    FLASK_CONFIG_TYPE=development # or production
    FLASK_ENV=development
    SECRET_KEY="your_super_secret_key_for_jwt_and_session" # IMPORTANT: Change this!
    SQLALCHEMY_DATABASE_URI="postgresql://user:password@db:5432/ecommerce_db"
    SQLALCHEMY_TRACK_MODIFICATIONS=False
    REDIS_URL="redis://redis:6379/0"
    ADMIN_EMAIL="admin@example.com"
    ADMIN_PASSWORD="admin_password"
    FLASK_API_URL="http://web:5000/api" # Frontend routes will call the 'web' service name inside docker network
    ```

3.  **Build and start Docker containers:**
    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: Builds the images if they don't exist or if `Dockerfile` has changed.
    *   `-d`: Runs containers in detached mode (in the background).

4.  **Run database migrations inside the web container:**
    ```bash
    docker-compose exec web flask db_commands run_migrations
    ```

5.  **Seed the database inside the web container (optional):**
    ```bash
    docker-compose exec web flask db_commands seed
    ```

---

## 5. Running the Application

*   **If running locally (without Docker):**
    ```bash
    flask run --host=0.0.0.0
    ```
    The application will be available at `http://localhost:5000`.

*   **If running with Docker Compose:**
    ```bash
    docker-compose up
    ```
    The application will be available at `http://localhost:5000`. (If you used `-d` previously, you don't need to run `docker-compose up` again unless you stop the containers).

---

## 6. Database Management (Migrations & Seeding)

The `manage.py` script provides CLI commands for database operations.

*   **Run migrations:**
    ```bash
    flask db_commands run_migrations
    ```
    This applies any pending database migrations. When you modify models, you'd first generate a new migration script using `flask db migrate -m "Description of changes"` (this command is part of `flask db` not `db_commands` in standard Flask-Migrate, but I've included a helper in `manage.py` for clarity). Then `flask db_commands run_migrations` applies it.

*   **Seed data:**
    ```bash
    flask db_commands seed
    ```
    This populates the database with sample users, categories, and products. The default admin user is `admin@example.com` with password `admin_password`. Other users have `password123`.

*   **Initialize empty database (without migrations):**
    ```bash
    flask db_commands init
    ```
    *Use with caution, primarily for fresh setup if not using migrations.*

*   **Drop all tables:**
    ```bash
    flask db_commands drop
    ```
    *Use with extreme caution. This permanently deletes all data.*

---

## 7. API Endpoints

The backend exposes a comprehensive RESTful API.

### API Documentation (Swagger UI)

Once the application is running, you can access the interactive API documentation (powered by Flasgger/Swagger UI) at:
`http://localhost:5000/api/docs`

This interface allows you to explore all endpoints, their parameters, expected responses, and even make requests directly from the browser (after authenticating to get a JWT token).

---

## 8. Frontend Usage

The application provides a basic Jinja2-templated frontend.

*   **Homepage:** `http://localhost:5000/`
*   **Products:** `http://localhost:5000/products` (browse, search, filter)
*   **Login:** `http://localhost:5000/login`
*   **Register:** `http://localhost:5000/register`
*   **Cart:** `http://localhost:5000/cart`
*   **Checkout:** `http://localhost:5000/checkout`
*   **My Orders:** `http://localhost:5000/my_orders`

The frontend interacts with the backend API. To perform actions like adding to cart or placing an order, you need to be logged in.

---

## 9. Testing

The project includes various types of tests to ensure quality and correctness.

### Running Tests

1.  **Activate your virtual environment (if not using Docker):**
    ```bash
    source venv/bin/activate
    ```
    If using Docker, run tests within the container:
    ```bash
    docker-compose exec web pytest
    ```

2.  **Run all tests with coverage report:**
    ```bash
    pytest --cov=app --cov-report=term-missing
    ```
    This command will run unit, integration, and API tests, and then display a coverage report in the terminal, highlighting missing lines. The goal is to achieve 80%+ coverage, and the current implementation targets core logic extensively.

### Performance Testing

A placeholder for performance tests using `Locust` is provided in `tests/performance/test_locust.py`.

**To run Locust tests:**

1.  Ensure your Flask application and its dependencies (PostgreSQL, Redis) are running. If using Docker Compose, `docker-compose up` should be running.
2.  Install Locust (if not already in `requirements.txt` and you chose not to install it): `pip install locust`
3.  Navigate to the project root directory.
4.  Run Locust: `locust -f tests/performance/test_locust.py`
5.  Open your web browser and go to `http://localhost:8089`.
6.  Enter the host (e.g., `http://localhost:5000` or `http://web:5000` if testing directly against the service name from within a docker network) and number of users/spawn rate. Start swarming to simulate load.

---

## 10. CI/CD

A basic GitHub Actions workflow (`.github/workflows/ci.yml`) is configured for continuous integration.

*   **Workflow:**
    *   Triggers on `push` to `main` and `pull_request` to `main`.
    *   Sets up Python environment.
    *   Installs dependencies.
    *   Runs `pytest` with coverage.
    *   (Future enhancements could include linting, security scanning, Docker image building, and deployment steps.)

---

## 11. Architecture

Refer to `ARCHITECTURE.md` for a detailed breakdown of the system's design, component interactions, and data flow.

---

## 12. Deployment Guide

Refer to `DEPLOYMENT.md` for instructions on deploying this application to various environments.

---

## 13. Error Handling & Logging

*   **Error Handling:**
    *   Custom `APIError` hierarchy (`NotFoundError`, `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`, `ValidationError`) defined in `app/utils/errors.py`.
    *   A global error handler (`app/__init__.py`) catches these custom errors and returns appropriate JSON responses with correct HTTP status codes.
*   **Logging:**
    *   Uses Python's standard `logging` module.
    *   Configured in `app/__init__.py` to output to both console and a rotating file (`app.log`) in non-debug environments.
    *   Log level is configurable via `LOG_LEVEL` environment variable (`INFO` by default).
    *   Requests and responses are optionally logged for debugging purposes.

---

## 14. Caching & Rate Limiting

*   **Caching:**
    *   Implemented using `Flask-Caching` with a Redis backend (or `SimpleCache` for dev).
    *   Examples: `ProductService.get_all_products` and `ProductService.get_product_by_id` are cached to reduce database load for frequently accessed data. Cache is cleared on data modification.
    *   Configured in `app/config.py`.
*   **Rate Limiting:**
    *   Implemented using `Flask-Limiter` with a Redis backend (or in-memory for dev).
    *   Applied globally (`RATELIMIT_DEFAULT`) and specifically to sensitive endpoints like user registration (`10 per hour`) and login (`5 per minute`) in `app/api/auth.py` to prevent brute-force attacks and abuse.
    *   Authenticated users typically have higher limits (`RATELIMIT_AUTHENTICATED_DEFAULT`).
    *   Configured in `app/config.py`.

---

## 15. Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch for your feature or bug fix (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Write appropriate tests for your changes.
5.  Ensure all tests pass (`pytest`).
6.  Commit your changes (`git commit -m 'feat: Add new feature'`).
7.  Push to your fork (`git push origin feature/your-feature-name`).
8.  Create a Pull Request to the `main` branch of this repository.

---

## 16. License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.