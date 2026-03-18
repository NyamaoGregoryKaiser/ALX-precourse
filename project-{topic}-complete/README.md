```markdown
# Data Visualization Tools System

A comprehensive, production-ready data visualization system built with FastAPI (Python) for the backend and React for the frontend. This system allows users to connect to various data sources, define datasets, create interactive visualizations, and organize them into dashboards.

## Features

**Backend (FastAPI - Python):**
*   **User Management:** Register, login, manage users with JWT-based authentication and role-based authorization (admin/normal user).
*   **Data Source Management:** CRUD operations for connecting to external databases (e.g., PostgreSQL, MySQL, CSV via mocking). Connection testing.
*   **Dataset Definition:** CRUD operations for defining specific queries or data extractions from connected data sources.
*   **Visualization Builder:** CRUD operations for creating various chart types (bar, line, pie, scatter, table) with configurable options.
*   **Dashboarding:** CRUD operations for creating and managing dashboards composed of multiple visualizations.
*   **Data Processing:** Services for connecting to databases, executing queries, and transforming raw data for visualization.
*   **API-driven:** All functionalities exposed via a RESTful API with auto-generated OpenAPI (Swagger UI/ReDoc) documentation.
*   **Enterprise-grade:**
    *   **Authentication/Authorization:** JWT.
    *   **Logging:** Structured logging.
    *   **Error Handling:** Custom exception handlers.
    *   **Caching:** Redis-backed caching for data endpoints.
    *   **Rate Limiting:** Redis-backed rate limiting.
    *   **Database:** PostgreSQL with SQLAlchemy and Alembic for migrations.

**Frontend (React - JavaScript):**
*   **Minimal UI:** A basic React application demonstrates interaction with the backend API, including user login, displaying data sources, and viewing a sample dashboard. (Further UI development would be an iterative process)

**Infrastructure:**
*   **Docker:** Containerization using Docker and Docker Compose for easy setup and deployment.
*   **Environment Configuration:** `python-dotenv` and Pydantic-settings for managing environment variables.
*   **CI/CD:** Basic GitHub Actions workflow for linting, testing, and optional Docker image building/pushing.

## Technology Stack

*   **Backend:** Python 3.9+, FastAPI, SQLAlchemy, Alembic, Pydantic, python-jose, passlib, fastapi-cache, fastapi-limiter, asyncpg, httpx.
*   **Database:** PostgreSQL
*   **Caching/Rate Limiting:** Redis
*   **Frontend:** React, JavaScript, npm
*   **Containerization:** Docker, Docker Compose
*   **CI/CD:** GitHub Actions
*   **Testing:** Pytest (Python), Jest/React Testing Library (JS - conceptual)

## Setup and Installation

### Prerequisites

*   Docker and Docker Compose
*   Git

### Steps

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/your-username/data-viz-system.git
    cd data-viz-system
    ```

2.  **Configure Environment Variables:**
    Create a `.env` file in the project root by copying `.env.example`:
    ```bash
    cp .env.example .env
    ```
    Edit `.env` and fill in your desired values. **Crucially, replace `SECRET_KEY` with a strong, random string.**

    Example `.env` content (adjust `POSTGRES_USER`, `POSTGRES_PASSWORD`, `SECRET_KEY`):
    ```ini
    # Core Application Settings
    PROJECT_NAME="DataVizSystem"
    PROJECT_VERSION="1.0.0"
    API_V1_STR="/api/v1"

    # Database Configuration (PostgreSQL)
    POSTGRES_SERVER="db" # Name of the DB service in docker-compose
    POSTGRES_USER="admin"
    POSTGRES_PASSWORD="password"
    POSTGRES_DB="dataviz_db"
    POSTGRES_PORT=5432

    # JWT Secret Key (MUST be a long, random string in production)
    SECRET_KEY="your-super-secret-key-that-is-at-least-32-characters-long-and-randomized"
    ALGORITHM="HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES=10080

    # Admin User Credentials (for initial seeding)
    FIRST_SUPERUSER_EMAIL="admin@example.com"
    FIRST_SUPERUSER_PASSWORD="adminpassword"

    # CORS Origins (Frontend URL)
    BACKEND_CORS_ORIGINS=["http://localhost:3000"]

    # Redis Configuration
    REDIS_HOST="redis" # Name of the Redis service in docker-compose
    REDIS_PORT=6379
    REDIS_DB=0

    # Environment
    ENVIRONMENT="development"
    ```

3.  **Build and Run Docker Containers:**
    This command will:
    *   Build the `db` (PostgreSQL), `redis`, `backend` (FastAPI), and `frontend` (React + Nginx) images.
    *   Start all services.
    *   Automatically apply Alembic migrations.
    *   Seed the database with an initial superuser and sample data.
    ```bash
    docker-compose up --build -d
    ```
    Wait for all services to become healthy. You can check their status with `docker-compose ps`.

4.  **Access the Application:**
    *   **Backend API (Swagger UI):** `http://localhost:8000/api/v1/docs`
    *   **Backend API (ReDoc):** `http://localhost:8000/api/v1/redoc`
    *   **Frontend:** `http://localhost:3000`

### Initial Credentials

*   **Superuser Email:** `admin@example.com` (as defined in `.env`)
*   **Superuser Password:** `adminpassword` (as defined in `.env`)

Use these credentials to log in via the frontend or directly through the `/api/v1/auth/access-token` endpoint in Swagger UI to obtain a JWT token.

## Usage

1.  **Login:** Access the frontend at `http://localhost:3000` or use the `/api/v1/auth/access-token` endpoint in Swagger UI.
2.  **Explore API:**
    *   Use the Swagger UI (`http://localhost:8000/api/v1/docs`) to interact with all API endpoints.
    *   Authenticate by clicking the "Authorize" button and pasting your JWT token (e.g., `Bearer YOUR_TOKEN`).
    *   Try creating new data sources, datasets, visualizations, and dashboards.
    *   Fetch data for a visualization or a dashboard to see the data processing in action.

## Development

### Backend

1.  **Install dependencies:** `pip install -r requirements.txt`
2.  **Run migrations:**
    *   Set `DATABASE_URL` in `.env` or as an environment variable to point to your development PostgreSQL.
    *   Generate new migration scripts: `alembic revision --autogenerate -m "Add new feature"`
    *   Apply migrations: `alembic upgrade head`
3.  **Run the application locally:** `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
4.  **Testing:** `pytest` (ensure your test database is configured in `tests/conftest.py` or via environment variables).

### Frontend

1.  **Navigate to frontend directory:** `cd frontend`
2.  **Install dependencies:** `npm install`
3.  **Run the development server:** `npm start` (usually on `http://localhost:3000`)

## Project Structure

Refer to the conceptual file structure at the top of this document. Key directories:
*   `app/`: FastAPI backend code (API endpoints, core logic, CRUD, models, schemas, services).
*   `alembic/`: Database migration scripts.
*   `frontend/`: React single-page application.
*   `tests/`: Unit and integration tests for the backend.
*   `docs/`: Additional documentation.

## Testing & Quality

*   **Unit Tests:** Located in `tests/unit/`, focusing on individual functions and components (e.g., `security.py`, `data_transformer.py`).
*   **Integration Tests:** Located in `tests/integration/`, focusing on API endpoints and their interaction with the database (`users.py`, `auth.py`).
*   **Code Coverage:** Achieved using `pytest-cov`. The CI/CD pipeline uploads coverage reports.
*   **Code Quality:** `flake8`, `black`, `isort` are used for linting and auto-formatting.

## Deployment

The `docker-compose.yml` provides a simple deployment strategy for a single server. For production, consider:

*   **Reverse Proxy:** Use Nginx or Caddy in front of the `backend` and `frontend` services for SSL termination, load balancing, and static file serving.
*   **Scalability:** Deploy to Kubernetes, AWS ECS, Google Cloud Run, etc., for auto-scaling and high availability.
*   **Managed Databases:** Use managed PostgreSQL and Redis services (e.g., AWS RDS, Azure Database for PostgreSQL, Google Cloud Memorystore) instead of self-hosting in Docker.
*   **Secrets Management:** Use proper secrets management (e.g., AWS Secrets Manager, HashiCorp Vault) for database credentials and `SECRET_KEY`.
*   **Monitoring:** Integrate with monitoring tools like Prometheus and Grafana for metrics, and centralized logging (e.g., ELK stack, Grafana Loki).
*   **HTTPS:** Always use HTTPS in production.

## API Documentation

FastAPI automatically generates interactive API documentation:
*   **Swagger UI:** `http://localhost:8000/api/v1/docs`
*   **ReDoc:** `http://localhost:8000/api/v1/redoc`

These interfaces allow you to explore all available endpoints, their request/response schemas, and even test them directly after authenticating.

## Architecture Documentation