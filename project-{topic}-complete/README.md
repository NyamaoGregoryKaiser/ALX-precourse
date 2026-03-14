```markdown
# Task Management System

A comprehensive, production-ready Task Management System built with Flask (Python), PostgreSQL, and a minimal HTML/JS frontend demonstration. This project aims to showcase best practices in software engineering, including modular design, API development, database management, testing, CI/CD, and additional enterprise-grade features.

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Development (with Docker Compose)](#local-development-with-docker-compose)
    *   [Running Tests](#running-tests)
    *   [Running Performance Tests (Locust)](#running-performance-tests-locust)
4.  [API Documentation](#api-documentation)
5.  [Deployment Guide](#deployment-guide)
6.  [Contributing](#contributing)
7.  [License](#license)

## Features

### Core Application (Python/Flask)
*   **Modular Structure**: Separated into `models`, `services`, `routes`, `utils` for clear separation of concerns.
*   **RESTful API**: Full CRUD operations for:
    *   Users
    *   Projects
    *   Tasks
    *   Comments
*   **Business Logic**: Handled in `services` layer, including validation and state transitions.
*   **Minimal Frontend**: `app/templates/index.html` and `app/static/script.js` provide a basic interactive interface to demonstrate API calls.

### Database Layer (PostgreSQL with SQLAlchemy)
*   **SQLAlchemy ORM**: Python objects mapped to database tables.
*   **Alembic Migrations**: Manages database schema changes.
*   **Seed Data**: Script (`seed_db.py`) to populate the database with initial users, projects, tasks, and comments.

### Configuration & Setup
*   **`requirements.txt`**: All Python dependencies listed.
*   **Environment Variables**: Managed via `python-dotenv` and `config.py` for flexible environment-specific settings.
*   **Dockerization**: `Dockerfile` and `docker-compose.yml` for easy setup and deployment of the Flask app, PostgreSQL, and Redis.
*   **CI/CD**: GitHub Actions workflow (`.github/workflows/main.yml`) for automated testing and deployment.

### Testing & Quality (Pytest, Coverage, Locust)
*   **Unit Tests**: For individual components like models and services (`tests/unit`).
*   **Integration Tests**: For API endpoints, ensuring correct interaction between components (`tests/integration`).
*   **Code Coverage**: Aiming for 80%+ coverage (configured in CI).
*   **Performance Tests**: Conceptual `locustfile.py` to simulate user load and measure API performance.

### Additional Features
*   **Authentication/Authorization**: JWT (JSON Web Tokens) for secure API access, with role-based access control (Admin, Manager, User).
*   **Logging and Monitoring**: Structured logging using Python's `logging` module, with a conceptual integration for Sentry.
*   **Error Handling**: Centralized custom exception classes and error handling middleware for consistent API responses.
*   **Caching Layer**: Redis-backed caching using `Flask-Caching` to improve response times for frequently accessed data (e.g., user profiles).
*   **Rate Limiting**: IP-based rate limiting using `Flask-Limiter` to protect against abuse and DDOS attacks.

## Architecture

The system follows a layered architecture:

*   **Presentation Layer (Frontend - Minimal HTML/JS)**: Interacts with the API, handles user input, and displays data.
*   **API Layer (`app/routes`)**: Flask blueprints defining RESTful endpoints, validating requests, and calling services.
*   **Service Layer (`app/services`)**: Contains the core business logic, orchestrating interactions between models and handling complex operations.
*   **Data Access Layer (`app/models`)**: SQLAlchemy models defining database schemas and providing an ORM interface for data persistence.
*   **Infrastructure (Extensions, Utils)**:
    *   `app/extensions.py`: Initializes Flask extensions (DB, JWT, Cache, Limiter).
    *   `app/utils/`: Common utilities, decorators (for logging, auth), and custom exception handling.
*   **Database (PostgreSQL)**: Relational database for storing application data.
*   **Cache/Rate Limiter (Redis)**: In-memory data store for caching and rate limiting.

[Refer to ARCHITECTURE.md for a more detailed overview.](./ARCHITECTURE.md)

## Setup and Installation

### Prerequisites

*   Docker and Docker Compose
*   Python 3.10+
*   `pip` (Python package installer)
*   `git`

### Local Development (with Docker Compose)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/task-manager.git
    cd task-manager
    ```

2.  **Create a `.env` file:**
    Create a file named `.env` in the root directory of the project and add the following content. These will be loaded by `python-dotenv`.
    ```env
    FLASK_APP=manage.py
    FLASK_ENV=development
    DATABASE_URL=postgresql://user:password@db:5432/task_manager_db
    SECRET_KEY=your-flask-secret-key-CHANGE-ME
    JWT_SECRET_KEY=your-jwt-secret-key-CHANGE-ME
    REDIS_URL=redis://redis:6379/0
    # SENTRY_DSN=your_sentry_dsn_here # Uncomment and add for Sentry monitoring
    LOG_LEVEL=DEBUG
    ```
    *Replace `your-flask-secret-key-CHANGE-ME` and `your-jwt-secret-key-CHANGE-ME` with strong, random strings.*

3.  **Build and run the Docker containers:**
    ```bash
    docker-compose up --build -d
    ```
    This command will:
    *   Build the Docker image for the Flask application.
    *   Start the PostgreSQL database service.
    *   Start the Redis cache/rate limit service.
    *   Run database migrations (`flask db_commands upgrade_db`).
    *   Seed the database with initial data (`flask seed`).
    *   Start the Flask development server (via `gunicorn` in `Dockerfile` for production, but overridden to `flask run` in `docker-compose.yml` for dev).

4.  **Access the application:**
    *   The Flask API will be available at `http://localhost:5000`.
    *   The minimal frontend demo will be at `http://localhost:5000/`.

    You can interact with the API using tools like Postman, Insomnia, `curl`, or the provided demo frontend.

5.  **Stop the containers:**
    ```bash
    docker-compose down
    ```

### Running Tests

1.  **Ensure Docker containers are running (for DB/Redis):**
    ```bash
    docker-compose up -d db redis
    ```
    Wait for services to be healthy.

2.  **Install Python dependencies (if not already done):**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Run tests with coverage:**
    ```bash
    FLASK_ENV=testing coverage run -m pytest tests/unit tests/integration
    coverage report -m
    ```
    *   `FLASK_ENV=testing` ensures the `TestingConfig` is used, which uses an in-memory SQLite database for speed.
    *   `coverage report -m` will show the test coverage report.

4.  **Clean up Docker containers (if started manually for tests):**
    ```bash
    docker-compose down
    ```

### Running Performance Tests (Locust)

1.  **Ensure your application and database are running:**
    ```bash
    docker-compose up -d
    ```

2.  **Start Locust:**
    ```bash
    locust -f tests/performance/locustfile.py
    ```

3.  **Access Locust web UI:**
    Open your browser to `http://localhost:8089`.
    *   Enter the "Number of users to simulate" and "Hatch rate (users spawned/second)".
    *   Enter your Flask app's host (e.g., `http://localhost:5000`).
    *   Click "Start swarming".

    *Note: The `locustfile.py` assumes a `testuser` with `userpassword` exists from the `seed_db.py` script. If you re-seed or change this, update the locustfile.*

## API Documentation

Detailed API endpoints, request/response formats, and authentication requirements are available in [API.md](./API.md).

## Deployment Guide

A conceptual deployment guide is available in [DEPLOYMENT.md](./DEPLOYMENT.md). The CI/CD pipeline in `.github/workflows/main.yml` also outlines deployment steps for a production environment.

## Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Implement your changes and write tests.
4.  Ensure all tests pass and code coverage remains high.
5.  Submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
```