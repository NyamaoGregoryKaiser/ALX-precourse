# E-commerce Mobile App Backend

This project provides a comprehensive, production-ready backend system for a mobile e-commerce application. It's built with Python using the Flask framework and adheres to best practices for scalability, security, and maintainability.

## Table of Contents

1.  [Features](#features)
2.  [Technology Stack](#technology-stack)
3.  [Architecture](#architecture)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Development Setup](#local-development-setup)
    *   [Database Migrations](#database-migrations)
    *   [Seeding Initial Data](#seeding-initial-data)
    *   [Running the Application](#running-the-application)
5.  [API Documentation](#api-documentation)
6.  [Testing](#testing)
    *   [Unit Tests](#unit-tests)
    *   [Integration Tests](#integration-tests)
    *   [Performance Tests](#performance-tests)
    *   [Test Coverage](#test-coverage)
7.  [Deployment Guide](#deployment-guide)
8.  [CI/CD Configuration](#cicd-configuration)
9.  [Logging and Monitoring](#logging-and-monitoring)
10. [Error Handling](#error-handling)
11. [Caching](#caching)
12. [Rate Limiting](#rate-limiting)
13. [Authentication and Authorization](#authentication-and-authorization)
14. [Contributing](#contributing)
15. [License](#license)

## 1. Features

This backend system offers the following core functionalities:

*   **User Management:**
    *   User registration and login (email/password).
    *   JWT-based authentication and refresh token mechanism.
    *   Role-Based Access Control (RBAC) for `ADMIN`, `EDITOR`, `CUSTOMER` roles.
    *   CRUD operations for users (Admin only for full control, users can manage their own profile).
*   **Product Catalog:**
    *   CRUD operations for product categories.
    *   CRUD operations for products with details (name, description, price, stock, image, category).
    *   Pagination, searching, and filtering for product and category listings.
*   **Order Management:**
    *   Customer can create orders with multiple products.
    *   Automatic stock deduction upon order creation.
    *   Retrieve individual orders and a list of orders (customers see their own, admins see all).
    *   Update order status (Admin/Editor only).
*   **Robustness & Performance:**
    *   Comprehensive error handling with custom exceptions.
    *   Logging for auditing and debugging.
    *   Caching layer with Redis for frequently accessed data (products, categories).
    *   Rate limiting to protect against abuse.
    *   Database migrations with Alembic.
    *   Dockerized setup for consistent environments.
*   **Quality & Maintainability:**
    *   Modular project structure.
    *   Unit, integration, and API tests with high coverage.
    *   CI/CD pipeline configuration (GitHub Actions).
    *   Clear and extensive documentation.

## 2. Technology Stack

*   **Backend Framework:** Flask (Python)
*   **Database:** PostgreSQL
*   **ORM:** SQLAlchemy with Flask-SQLAlchemy
*   **Migrations:** Alembic
*   **Serialization/Validation:** Marshmallow, webargs, Flask-Smorest
*   **Authentication:** Flask-JWT-Extended (JWT)
*   **Hashing:** Flask-Bcrypt
*   **Caching:** Redis with Flask-Caching
*   **Rate Limiting:** Flask-Limiter
*   **CORS:** Flask-Cors
*   **Containerization:** Docker, Docker Compose
*   **Testing:** Pytest, pytest-cov, Locust (for performance)
*   **API Documentation:** Flask-Smorest (generates OpenAPI/Swagger UI)
*   **Environment Management:** python-dotenv
*   **WSGI Server:** Gunicorn

## 3. Architecture

The application follows a layered architectural pattern to ensure separation of concerns and maintainability.

*   **Presentation Layer (`app/api`):**
    *   Handles HTTP requests and responses.
    *   Uses Flask Blueprints for modular API endpoints.
    *   Utilizes Marshmallow schemas for request validation and response serialization.
    *   Integrates Flask-Smorest for API documentation generation and improved validation.
    *   Applies authentication, authorization, caching, and rate limiting decorators.
*   **Business Logic Layer (`app/services`):**
    *   Contains the core business rules and data processing logic.
    *   Interacts with the `Database Layer` through ORM models.
    *   Encapsulates operations like user registration, product updates, order creation, ensuring data integrity and consistency.
    *   Raises custom `APIError` exceptions for specific business rule violations.
*   **Database Layer (`app/models`, `app/database`):**
    *   Defines the database schema using SQLAlchemy ORM models.
    *   Manages database sessions and connections.
    *   Includes association tables for many-to-many relationships (e.g., `User` and `UserRole`).
    *   Migrations are handled by Alembic.
*   **Utilities Layer (`app/utils`):**
    *   Provides common functionalities such as custom decorators (e.g., `role_required`, `cache_response`), centralized error handling, and logging configuration.
*   **Configuration & Extensions (`app/config`, `app/extensions`):**
    *   Manages application settings for different environments (development, testing, production).
    *   Initializes Flask extensions (JWT, Bcrypt, Cache, Limiter, CORS).

### Component Diagram

```
+------------------+     +------------------+     +------------------+
| Mobile App (FE)  |<--->|    Web Browser   |     |  3rd Party Integrations  |
|                  |     |  (Swagger UI)    |     |   (Future: Payment)      |
+------------------+     +------------------+     +------------------+
         |                       |
         | (HTTPS: REST API)     |
         v                       v
+------------------------------------------------------------------+
|                       Load Balancer / Reverse Proxy              |
|                             (e.g., Nginx)                        |
+------------------------------------------------------------------+
         |
         v
+------------------------------------------------------------------+
|                        API Gateway (Optional)                    |
+------------------------------------------------------------------+
         |
         v
+------------------------------------------------------------------+
|                 [Flask Backend Application - Gunicorn]           |
|  +------------------------------------------------------------+  |
|  |           Presentation Layer (`app/api`)                 |  |
|  |           - API Endpoints, Request/Response Handling       |  |
|  |           - Authentication (JWT), Authorization (RBAC)     |  |
|  |           - Request Validation (Marshmallow, webargs)      |  |
|  |           - Rate Limiting (Flask-Limiter)                  |  |
|  |           - Caching (Flask-Caching)                        |  |
|  +------------------------------------------------------------+  |
|                           |                                      |
|                           v                                      |
|  +------------------------------------------------------------+  |
|  |           Business Logic Layer (`app/services`)          |  |
|  |           - User, Product, Category, Order Management Logic  |  |
|  |           - Stock Management, Order Calculation            |  |
|  |           - Custom Error Handling (`app/utils/errors`)     |  |
|  +------------------------------------------------------------+  |
|                           |                                      |
|                           v                                      |
|  +------------------------------------------------------------+  |
|  |           Database Layer (`app/models`, `app/database`)  |  |
|  |           - SQLAlchemy ORM Models (User, Product, Order)   |  |
|  |           - Query Optimization (eager loading)             |  |
|  +------------------------------------------------------------+  |
|                           ^                                      |
|                           |                                      |
|  +------------------------------------------------------------+  |
|  |                     Utility Modules (`app/utils`)          |  |
|  |                     - Logging (`app/utils/logger`)         |  |
|  |                     - Decorators (`app/utils/decorators`)    |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
         |                 |
         | (SQL)           | (Key-Value)
         v                 v
+------------+       +----------+
| PostgreSQL |<----->|   Redis  |
| (Database) |       | (Cache,  |
+------------+       | Rate Lim |
                     +----------+
```

## 4. Setup and Installation

### Prerequisites

*   Docker and Docker Compose
*   Python 3.9+ (if running locally without Docker)
*   `pip` (Python package installer)

### Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/ALX-Software-Engineering/ecommerce-backend.git
    cd ecommerce-backend
    ```

2.  **Create `.env` file:**
    Copy the example environment variables and customize them.
    ```bash
    cp .env.example .env
    ```
    Edit `.env` and fill in your desired secret keys and database/redis URLs. For Docker Compose, the default URLs in `.env.example` are usually correct.

3.  **Build and run with Docker Compose:**
    This will build the Flask app image, start PostgreSQL, Redis, and the Flask app. It also runs database migrations and seeds initial data via `docker-entrypoint.sh`.
    ```bash
    docker-compose up --build -d
    ```
    The `-d` flag runs containers in detached mode. To see logs, use `docker-compose logs -f`.

    *Expected output for `docker-compose up --build -d`*:
    ```
    [+] Running 4/4
     ⠿ Network ecommerce-backend_default  Created                                                    0.1s
     ⠿ Container db                       Started                                                    0.1s
     ⠿ Container redis                    Started                                                    0.1s
     ⠿ Container app                      Started                                                    0.1s
    ```

4.  **Verify services are running:**
    ```bash
    docker-compose ps
    ```
    You should see `db`, `redis`, and `app` containers with `Up` status.

### Database Migrations

The `docker-entrypoint.sh` script automatically runs `flask db upgrade` on container startup.
If you need to manage migrations manually (e.g., in local development without full Docker Compose rebuilds, or adding new models):

1.  **Ensure your app container is running:**
    ```bash
    docker-compose ps
    ```
2.  **Access the app container's shell:**
    ```bash
    docker-compose exec app bash
    ```
3.  **Generate a new migration script (after changing models):**
    ```bash
    flask db revision --autogenerate -m "Add new feature tables"
    ```
    This creates a new file in the `migrations/versions/` directory. Review the generated script carefully before applying.
4.  **Apply migrations:**
    ```bash
    flask db upgrade
    ```
    This applies all pending migrations to the database.
5.  **Downgrade migrations (if needed):**
    ```bash
    flask db downgrade
    ```
    Use `flask db downgrade -1` to go back one step, or a specific revision ID.

### Seeding Initial Data

The `docker-entrypoint.sh` script automatically runs `python seed_db.py` on container startup.
This script populates the database with:
*   Default roles: `ADMIN`, `EDITOR`, `CUSTOMER`.
*   An admin user: `admin@example.com` with password `adminpass123`.
*   A customer user: `customer@example.com` with password `customerpass`.
*   Example product categories and products.

To manually seed data (e.g., after a fresh migration or if you skip auto-seeding):

1.  **Access the app container's shell:**
    ```bash
    docker-compose exec app bash
    ```
2.  **Run the seed script:**
    ```bash
    python seed_db.py
    ```
    You can also use the Flask CLI command:
    ```bash
    flask db-ops seed
    ```

### Running the Application

Once Docker Compose is up, the Flask application will be accessible at:
*   **API Root:** `http://localhost:5000/`
*   **Swagger UI:** `http://localhost:5000/api/docs/swagger-ui/` (in development mode)
*   **OpenAPI Spec:** `http://localhost:5000/api/docs/openapi.json` (in development mode)

## 5. API Documentation

The API is documented using Flask-Smorest, which generates an OpenAPI 3.0 specification.
In development mode (`FLASK_ENV=development`), you can access the interactive Swagger UI at:

[http://localhost:5000/api/docs/swagger-ui/](http://localhost:5000/api/docs/swagger-ui/)

The raw OpenAPI JSON specification is available at:

[http://localhost:5000/api/docs/openapi.json](http://localhost:5000/api/docs/openapi.json)

These endpoints are disabled in `production` mode for security.

### Key Endpoints (Examples)

**Authentication**
*   `POST /api/auth/register` - Register a new user.
*   `POST /api/auth/login` - Login and get JWT tokens.
*   `POST /api/auth/refresh` - Refresh access token using refresh token.
*   `GET /api/auth/me` - Get current user profile (requires access token).

**Users (Admin Only for most)**
*   `GET /api/users/` - List all users (Admin only).
*   `GET /api/users/<id>` - Get user by ID (Admin or self).
*   `PUT /api/users/<id>` - Update user (Admin or self for limited fields).
*   `DELETE /api/users/<id>` - Delete user (Admin only, cannot delete self).

**Categories**
*   `GET /api/categories/` - List all categories (public).
*   `GET /api/categories/<id>` - Get category by ID (public).
*   `POST /api/categories/` - Create category (Admin/Editor).
*   `PUT /api/categories/<id>` - Update category (Admin/Editor).
*   `DELETE /api/categories/<id>` - Delete category (Admin/Editor, no products linked).

**Products**
*   `GET /api/products/` - List all products (public).
*   `GET /api/products/<id>` - Get product by ID (public).
*   `POST /api/products/` - Create product (Admin/Editor).
*   `PUT /api/products/<id>` - Update product (Admin/Editor).
*   `DELETE /api/products/<id>` - Delete product (Admin/Editor).

**Orders**
*   `POST /api/orders/` - Create new order (Customer).
*   `GET /api/orders/` - List orders (Customer: own orders; Admin: all orders).
*   `GET /api/orders/<id>` - Get order by ID (Customer: own order; Admin: any order).
*   `PUT /api/orders/<id>/status` - Update order status (Admin/Editor).
*   `DELETE /api/orders/<id>` - Delete order (Admin only).

## 6. Testing

The project includes a comprehensive test suite covering unit, integration, and performance aspects.

### Unit Tests

*   Located in `tests/unit/`.
*   Focus on individual components (models, services) in isolation.
*   Run with `pytest`.

### Integration Tests

*   Located in `tests/integration/`.
*   Test the interaction between multiple components, primarily through API endpoints.
*   Use Flask's test client to simulate HTTP requests.
*   Run with `pytest`.

### Performance Tests

*   Located in `tests/performance/`.
*   Uses [Locust](https://locust.io/) to simulate user load and measure API performance.
*   The `locustfile.py` script defines various user behaviors.

**To run performance tests:**

1.  Ensure your application is running (e.g., `docker-compose up -d`).
2.  Open a new terminal and install Locust if you haven't: `pip install locust`.
3.  Navigate to the project root and run Locust:
    ```bash
    locust -f tests/performance/locustfile.py
    ```
4.  Open your browser to `http://localhost:8089` to access the Locust UI.
5.  Enter the number of users, spawn rate, and host (`http://localhost:5000`), then click "Start swarming".

### Test Coverage

We aim for 80%+ test coverage. To generate a coverage report:

1.  Install `pytest-cov`: `pip install pytest-cov` (included in `requirements.txt`).
2.  Run tests with coverage:
    ```bash
    pytest --cov=app --cov-report=term-missing --cov-report=html
    ```
    *   `--cov=app`: Specifies the directory to measure coverage for.
    *   `--cov-report=term-missing`: Shows missing lines in the terminal.
    *   `--cov-report=html`: Generates an HTML report in `htmlcov/` directory. Open `htmlcov/index.html` in your browser for a detailed report.

## 7. Deployment Guide

This setup is designed for Docker-based deployment to various cloud providers (e.g., AWS EC2, Google Cloud Run, Azure Container Instances, DigitalOcean Droplets).

1.  **Prepare your environment:**
    *   Provision a Linux VM (e.g., Ubuntu) on your chosen cloud provider.
    *   Install Docker and Docker Compose on the VM.
    *   Install `git`.
2.  **Clone the repository on the server:**
    ```bash
    git clone https://github.com/ALX-Software-Engineering/ecommerce-backend.git
    cd ecommerce-backend
    ```
3.  **Configure `.env`:**
    *   Create a `.env` file on the server.
    *   **Crucially, set `FLASK_ENV=production`** and use strong, unique `SECRET_KEY` and `JWT_SECRET_KEY` values.
    *   Set `DATABASE_URL` to your production PostgreSQL instance (if external, otherwise use `db` if running with docker-compose on the same server).
    *   Set `REDIS_URL` for your production Redis instance.
    *   **Disable `FLASK_DEBUG=1`**.
    *   Disable `OPENAPI_SWAGGER_UI_PATH` and `OPENAPI_URL_PREFIX` in `app/config.py` for `ProductionConfig` to prevent exposure of API docs in production.
4.  **Run with Docker Compose:**
    ```bash
    docker-compose up --build -d
    ```
    The `docker-entrypoint.sh` handles migrations and initial seeding automatically.
5.  **Set up a Reverse Proxy (Recommended):**
    For production, it's highly recommended to place a reverse proxy (like Nginx) in front of your Gunicorn application. This provides:
    *   SSL/TLS termination (HTTPS).
    *   Load balancing (if you scale out Flask app instances).
    *   Static file serving (if you had a web frontend).
    *   Request buffering, compression, etc.

    Example Nginx configuration (e.g., `/etc/nginx/sites-available/ecommerce`):
    ```nginx
    server {
        listen 80;
        server_name your_domain.com; # Replace with your domain or IP
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl;
        server_name your_domain.com; # Replace with your domain or IP

        ssl_certificate /etc/letsencrypt/live/your_domain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/your_domain.com/privkey.pem;

        location / {
            proxy_pass http://localhost:5000; # Or the IP/port of your Flask app container if not localhost
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_redirect off;
        }
    }
    ```
    Then `sudo ln -s /etc/nginx/sites-available/ecommerce /etc/nginx/sites-enabled/` and `sudo systemctl restart nginx`.
    Use Certbot for easy SSL certificate generation (`sudo apt install certbot python3-certbot-nginx`).

## 8. CI/CD Configuration

A basic GitHub Actions workflow (`.github/workflows/ci.yml`) is provided for Continuous Integration.

```yaml