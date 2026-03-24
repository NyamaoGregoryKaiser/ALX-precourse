# Enterprise-Grade CMS Project

## Overview
This project implements a full-scale, enterprise-grade Content Management System (CMS) using Python (Flask) for the backend, SQLAlchemy for the ORM, PostgreSQL as the database, and a minimal Jinja2-based frontend for demonstration, alongside a comprehensive RESTful API. It's designed with modularity, scalability, and best practices in mind, covering all aspects from development to deployment and testing.

## Features

### Core Application (Python/Flask)
*   **Modular Architecture:** Organized into blueprints for API, authentication, and administrative interfaces.
*   **RESTful API:** Full CRUD operations for Users, Content (Articles/Pages), Categories, and Tags.
*   **Data Models:** Defined using SQLAlchemy ORM for database interaction.
*   **Data Validation & Serialization:** Using Marshmallow schemas for consistent API responses and request validation.
*   **Business Logic:** Encapsulated within service functions or resource methods.
*   **Basic Web UI:** Minimal Jinja2 templates for admin dashboard and basic content views (API-first design allows for easy integration with a separate JS frontend).

### Database Layer
*   **PostgreSQL:** Production-ready relational database.
*   **SQLAlchemy ORM:** Pythonic way to interact with the database.
*   **Flask-Migrate (Alembic):** Database schema migrations for evolution.
*   **Seed Data:** Script to populate the database with initial data for development/testing.
*   **Query Optimization:** Examples of `joinedload`, `lazy` loading, and indexing considerations.

### Configuration & Setup
*   **`requirements.txt`:** All Python dependencies managed.
*   **Environment Configuration:** `config.py` for different environments (development, testing, production) and `.env` for sensitive variables.
*   **Docker Setup:** `Dockerfile` for the Flask application and `docker-compose.yml` for orchestrating the app with PostgreSQL.
*   **CI/CD Pipeline:** GitHub Actions configuration (`.github/workflows/main.yml`) for automated linting, testing, and build processes.

### Testing & Quality
*   **Pytest Framework:** Comprehensive testing suite.
*   **Unit Tests:** Covering models, schemas, and utility functions (aim for high coverage).
*   **Integration Tests:** Verifying interactions between different components.
*   **API Tests:** Ensuring API endpoints function correctly with various inputs and authentication states.
*   **Performance Tests:** Using `Locust` to simulate user load and identify bottlenecks.

### Documentation
*   **Comprehensive `README.md`:** This file serves as the main entry point for the project.
*   **API Documentation:** Interactive Swagger UI provided by `Flasgger`.
*   **Architecture Documentation:** `docs/ARCHITECTURE.md` outlining the system design.
*   **Deployment Guide:** `docs/DEPLOYMENT.md` detailing steps for production deployment.

### Additional Features
*   **Authentication & Authorization:**
    *   **JWT (JSON Web Tokens):** For secure, stateless API authentication.
    *   **Role-Based Access Control (RBAC):** Admin, Editor, Author roles with distinct permissions.
*   **Logging & Monitoring:** Structured logging using Python's `logging` module.
*   **Error Handling:** Global error handling middleware for consistent API responses on errors (e.g., 400, 401, 403, 404, 500).
*   **Caching Layer:** Basic in-memory caching for frequently accessed content to improve performance.
*   **Rate Limiting:** Protects API endpoints against abuse and ensures fair usage.

## Project Structure

```
cms-project/
├── .github/
│   └── workflows/
│       └── main.yml           # CI/CD pipeline with GitHub Actions
├── .dockerignore              # Files to ignore in Docker build context
├── .env.example               # Example environment variables
├── Dockerfile                 # Dockerfile for the Flask application
├── docker-compose.yml         # Docker Compose for app + PostgreSQL
├── requirements.txt           # Python dependencies
├── start.sh                   # Entrypoint script for Docker container
├── app/
│   ├── __init__.py            # Application factory, extensions, blueprints registration
│   ├── auth/                  # Authentication related logic (login, logout, register)
│   │   ├── __init__.py
│   │   └── routes.py
│   ├── api/                   # RESTful API endpoints blueprint
│   │   ├── __init__.py
│   │   ├── content.py         # Content (Articles/Pages) API
│   │   ├── categories.py      # Categories API
│   │   ├── tags.py            # Tags API
│   │   ├── users.py           # User Management API
│   │   └── auth.py            # API Auth (token generation)
│   ├── admin/                 # Basic Jinja2-based Admin UI
│   │   ├── __init__.py
│   │   └── routes.py
│   │   └── templates/         # Admin UI templates
│   │       ├── base.html
│   │       ├── index.html
│   │       └── content_list.html
│   ├── models.py              # SQLAlchemy database models
│   ├── schemas.py             # Marshmallow schemas for serialization/validation
│   ├── config.py              # Application configuration (dev, test, prod)
│   ├── extensions.py          # Flask extensions initialization
│   ├── middlewares.py         # Custom middleware (error handling, rate limiting)
│   ├── utils.py               # Utility functions (e.g., slug generation)
│   └── templates/             # Generic templates (e.g., error pages)
│       ├── 404.html
│       └── 500.html
├── migrations/                # Alembic migration scripts
│   ├── versions/
│   ├── env.py
│   └── README
├── tests/                     # Test suite
│   ├── __init__.py
│   ├── conftest.py            # Pytest fixtures
│   ├── unit/
│   │   ├── test_models.py
│   │   └── test_utils.py
│   ├── integration/
│   │   └── test_services.py
│   ├── api/
│   │   ├── test_auth_api.py
│   │   ├── test_user_api.py
│   │   └── test_content_api.py
│   └── performance/
│       └── locustfile.py      # Locust performance tests
├── docs/                      # Supplementary documentation
│   ├── ARCHITECTURE.md
│   └── DEPLOYMENT.md
├── seed.py                    # Script to seed database with initial data
├── manage.py                  # Flask-CLI commands (e.g., run, db migrate)
└── README.md                  # This file
```

## Setup and Installation

### Prerequisites
*   Python 3.8+
*   Docker & Docker Compose (for containerized setup)
*   Git

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/cms-project.git
cd cms-project
```

### 2. Environment Variables
Create a `.env` file in the root directory based on `.env.example`:
```bash
cp .env.example .env
```
Edit `.env` and fill in your desired values (e.g., `DATABASE_URL`, `SECRET_KEY`, `JWT_SECRET_KEY`).

### 3. Using Docker (Recommended)

#### Build and Run Services
```bash
docker-compose up --build -d
```
This will:
*   Build the Docker image for the Flask application.
*   Start the PostgreSQL database container.
*   Start the Flask application container, accessible on port `5000`.

#### Database Migrations
Once the services are running, execute migrations:
```bash
docker-compose exec app flask db upgrade
```

#### Seed Initial Data
```bash
docker-compose exec app python seed.py
```

#### Access the Application
*   **API Documentation (Swagger UI):** `http://localhost:5000/apidocs`
*   **Admin Dashboard:** `http://localhost:5000/admin`
*   **API Base:** `http://localhost:5000/api/v1`

#### Stop Services
```bash
docker-compose down
```

### 4. Local Setup (Without Docker)

#### Install Dependencies
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### Database Setup
1.  Ensure PostgreSQL is installed and running.
2.  Create a database, e.g., `cms_db`.
3.  Update the `DATABASE_URL` in your `.env` file to point to your PostgreSQL instance (e.g., `postgresql://user:password@localhost:5432/cms_db`).

#### Database Migrations
```bash
flask db upgrade
```

#### Seed Initial Data
```bash
python seed.py
```

#### Run the Application
```bash
flask run
```
The application will be accessible at `http://127.0.0.1:5000`.

## Running Tests

### Unit, Integration, and API Tests
```bash
# Ensure local setup or run inside docker container
pytest tests/
# Or to generate coverage report
pytest --cov=app --cov-report=html tests/
```
Open `htmlcov/index.html` to view the coverage report.

### Performance Tests (Locust)
1.  Ensure the application is running (locally or via Docker).
2.  Start Locust:
    ```bash
    locust -f tests/performance/locustfile.py
    ```
3.  Open your browser to `http://localhost:8089` (Locust UI).
4.  Enter the host (e.g., `http://localhost:5000`), number of users, and spawn rate, then start swarming.

## API Documentation
The API is self-documented using Flasgger, providing an interactive Swagger UI.
Access it at: `http://localhost:5000/apidocs`

## Deployment
Refer to `docs/DEPLOYMENT.md` for a comprehensive guide on deploying this CMS to a production environment.

## Architecture
Refer to `docs/ARCHITECTURE.md` for a detailed overview of the system's architecture, design decisions, and component interactions.

## Contribution
(Placeholder for contribution guidelines)

## License
(Placeholder for license information, e.g., MIT License)
```