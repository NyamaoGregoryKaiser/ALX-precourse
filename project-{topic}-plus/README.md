# Enterprise Data Visualization Tools System

This is a comprehensive, production-ready data visualization tools system, built with a Python (Flask) backend. It provides a robust API for managing users, data sources, visualizations, and dashboards.

## Features

**Core Application (Backend - Python Flask)**
*   **User Management**: Registration, Login, Profile Management (CRUD for authenticated user).
*   **Authentication/Authorization**: JWT-based authentication for secure API access. Decorators for role-based and resource-ownership authorization.
*   **Data Source Management**: CRUD operations for various data source types (CSV, Excel, PostgreSQL, MySQL, API). Supports file uploads with schema detection.
*   **Visualization Management**: CRUD operations for defining visualizations (bar, line, pie, table, scatter charts) with flexible configuration and data transformation queries.
*   **Dashboard Management**: CRUD operations for creating and organizing dashboards, including adding, updating, and removing visualizations from a dashboard.
*   **Data Processing**: Backend logic using `pandas` for loading, cleaning, transforming, and aggregating data based on user-defined queries.
*   **API Endpoints**: Full RESTful API with Flask-RESTX for structure and automatic Swagger documentation.

**Database Layer**
*   **PostgreSQL**: Robust relational database.
*   **SQLAlchemy ORM**: Pythonic interface to interact with the database.
*   **Flask-Migrate (Alembic)**: Database schema migration management.
*   **Seed Data**: Script to populate the database with initial fake data for development and testing.

**Configuration & Setup**
*   **Dependency Management**: `requirements.txt` for Python packages.
*   **Environment Configuration**: `.env` file for managing sensitive and environment-specific settings.
*   **Dockerization**: `Dockerfile` and `docker-compose.yml` for easy setup and deployment of the application, database, and Redis cache.
*   **CI/CD**: GitHub Actions workflow (`.github/workflows/main.yml`) configured for automated testing and deployment (conceptual deployment part).

**Testing & Quality**
*   **Pytest**: Comprehensive test suite including:
    *   **Unit Tests**: Verifying individual components (models, utility functions).
    *   **Integration Tests**: Testing interactions between modules (e.g., services interacting with models).
    *   **API Tests**: End-to-end testing of API endpoints (authentication, CRUD operations, edge cases).
*   **Coverage**: Aiming for 80%+ code coverage.

**Additional Features**
*   **Logging & Monitoring**: Structured logging with `RotatingFileHandler` and console output.
*   **Error Handling**: Global exception handling middleware for consistent API error responses.
*   **Caching Layer**: `Flask-Caching` with Redis backend to improve performance for data-intensive visualization data fetches.
*   **Rate Limiting**: `Flask-Limiter` with Redis backend to protect API endpoints from abuse.

## Technologies Used

*   **Backend**: Python 3.10+
    *   **Web Framework**: Flask
    *   **API Framework**: Flask-RESTX
    *   **ORM**: Flask-SQLAlchemy
    *   **Migrations**: Flask-Migrate (Alembic)
    *   **Authentication**: Flask-JWT-Extended
    *   **Serialization**: Marshmallow
    *   **Data Processing**: Pandas
    *   **Caching**: Flask-Caching (Redis)
    *   **Rate Limiting**: Flask-Limiter (Redis)
    *   **Password Hashing**: Werkzeug Security (used by Flask)
*   **Database**: PostgreSQL
*   **Caching/Rate Limiting Store**: Redis
*   **Containerization**: Docker, Docker Compose
*   **CI/CD**: GitHub Actions
*   **Testing**: Pytest, Pytest-Cov, Pytest-Mock
*   **Development Utilities**: python-dotenv, Faker

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
*   Docker and Docker Compose
*   Python 3.10+
*   `pip` (Python package installer)

### Setup Instructions

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/dataviz-system.git
    cd dataviz-system
    ```

2.  **Create and configure environment variables:**
    Copy the example environment file and fill in your secrets.
    ```bash
    cp .env.example .env
    # Open .env and replace placeholder values with strong, unique secrets.
    # Especially for SECRET_KEY and JWT_SECRET_KEY.
    ```

3.  **Build and run with Docker Compose (Recommended for development):**
    This will set up the backend, PostgreSQL database, and Redis cache.
    ```bash
    docker-compose up --build -d
    ```
    This command will:
    *   Build the `backend` Docker image.
    *   Start the `db` (PostgreSQL) and `redis` containers.
    *   Run database migrations (`flask db upgrade`).
    *   Seed the database with initial data (`flask seed`).
    *   Start the `backend` Flask application using Gunicorn.

    The application will be accessible at `http://localhost:5000`.
    The Swagger UI for API documentation will be at `http://localhost:5000/swagger-ui`.

4.  **Verify services:**
    ```bash
    docker-compose ps
    ```
    You should see `db`, `redis`, and `backend` services running.

    You can also check the health endpoint:
    ```bash
    curl http://localhost:5000/health
    ```
    Expected output: `{"cache": "ok", "database": "ok", "status": "healthy"}`

5.  **Access the API Documentation:**
    Open your browser and navigate to `http://localhost:5000/swagger-ui`. Here you can explore all available API endpoints, their expected inputs, and example responses.

### Manual Setup (Without Docker - for advanced debugging/local dev)

1.  **Create a Python virtual environment:**
    ```bash
    python -m venv .venv
    source .venv/bin/activate # On Windows: .venv\Scripts\activate
    ```

2.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Set Flask environment variables:**
    ```bash
    export FLASK_APP=manage.py
    export FLASK_ENV=development # For Linux/macOS
    # On Windows: set FLASK_APP=manage.py; set FLASK_ENV=development
    ```
    Ensure your `.env` file is configured correctly for local PostgreSQL and Redis if not using Docker. E.g., `DATABASE_URL="postgresql://user:password@localhost:5432/dataviz_dev"`.

4.  **Start PostgreSQL and Redis manually:**
    You'll need a local PostgreSQL server running on port 5432 and a Redis server running on port 6379, configured with the credentials from your `.env` file.

5.  **Initialize and migrate the database:**
    ```bash
    flask db upgrade
    flask seed # Optional: to populate with test data
    ```

6.  **Run the Flask application:**
    ```bash
    gunicorn --bind 0.0.0.0:5000 --workers 4 manage:app
    # Or for development with Flask's reloader:
    # flask run
    ```

## Development

### Running Tests

To run the test suite, ensure your Docker Compose services (db, redis) are running, or you have local PostgreSQL/Redis configured for testing.

```bash
docker-compose up -d db redis # If not already running
export FLASK_APP=manage.py
export FLASK_ENV=testing
export TEST_DATABASE_URL="postgresql://user:password@localhost:5432/dataviz_test" # Or point to your docker-compose db service
export REDIS_HOST=redis # For docker-compose redis, use `localhost` if local
export REDIS_PORT=6379
export JWT_SECRET_KEY="test-jwt-secret"
export SECRET_KEY="test-secret"

# Apply test migrations and seed test data
flask db upgrade
flask seed

pytest --cov=app --cov-report=term-missing tests/
```
The `pytest` command will run all tests, including unit, integration, and API tests, and report on code coverage.

### Code Quality

Follow PEP8 guidelines. Static analysis tools like `flake8` and `black` can be integrated:
```bash
pip install flake8 black
black .
flake8 .
```

### Extending the System

*   **New Data Source Types**: Add new types to `app/models.py` and implement parsing/connection logic in `app/services/data_processing.py`.
*   **New Chart Types**: Extend `VisualizationConfigSchema` in `app/schemas.py` and modify `app/services/data_processing.py` to format data for the new chart type.
*   **Frontend**: This project focuses on the backend API. A separate frontend application (e.g., using React, Vue.js, Svelte) would consume these APIs to provide a rich user interface.

## Contribution

Feel free to fork the repository, open issues, and submit pull requests.

---
**Note**: This `README.md` is a detailed template. Some sections (like performance tests, frontend details) are conceptual and provide guidance rather than full implementations within this single response.