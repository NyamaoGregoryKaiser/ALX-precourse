```markdown
# Real-time Chat Application

This is a comprehensive, production-ready real-time chat application system built with a Python FastAPI backend and a React (TypeScript) frontend. It features user authentication, real-time messaging via WebSockets, chat room management, and robust error handling and logging. The entire system is containerized with Docker and includes a basic CI/CD pipeline configuration.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Technologies Used](#technologies-used)
- [Setup and Installation](#setup-and-installation)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Docker Setup (Recommended)](#docker-setup-recommended)
  - [Local Setup (Without Docker)](#local-setup-without-docker)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [CI/CD](#cicd)
- [Deployment](#deployment)
- [Additional Features](#additional-features)
- [Project Status & Future Enhancements](#project-status--future-enhancements)
- [License](#license)

## Features

**Core Chat Functionality:**
- Real-time messaging using WebSockets.
- Create and manage group chats.
- Send and receive messages within chats.
- View chat history.

**User Management & Authentication:**
- User registration and login.
- JWT-based authentication for API and WebSocket connections.
- User profiles (view and update).

**Robust Backend:**
- RESTful API with FastAPI.
- PostgreSQL database with SQLAlchemy ORM.
- Alembic for database migrations.
- CRUD operations for users, chats, and messages.

**Frontend:**
- Responsive React application with TypeScript.
- Intuitive UI for chat navigation and messaging.
- Protected routes based on authentication status.

**Production-Ready Features:**
- Dockerized development and deployment.
- Environment-based configuration.
- Comprehensive logging and error handling.
- Rate limiting to prevent abuse.
- Basic caching with Redis (for rate limiting, expandable for user presence/chat data).
- CI/CD pipeline with GitHub Actions (linting, testing, build checks).

## Architecture

See [architecture.md](./architecture.md) for a detailed overview.

## Technologies Used

**Backend:**
- **Python 3.11**
- **FastAPI**: High-performance web framework.
- **SQLAlchemy**: Asynchronous ORM for database interactions.
- **PostgreSQL**: Relational database.
- **Alembic**: Database migration tool.
- **Redis**: In-memory data store for caching and rate limiting.
- **`python-jose`**: JWT handling.
- **`passlib`**: Password hashing.
- **`uvicorn` / `gunicorn`**: ASGI server for production deployment.

**Frontend:**
- **React 18**
- **TypeScript**: Type safety for JavaScript.
- **Vite**: Fast frontend build tool.
- **Axios**: HTTP client for API calls.
- **WebSockets API**: For real-time communication.
- **React Context API**: For state management (authentication).
- **React Router DOM**: For navigation.
- **`react-toastify`**: For notifications.

**DevOps & Tools:**
- **Docker / Docker Compose**: Containerization.
- **GitHub Actions**: CI/CD.
- **Pytest**: Python testing framework.
- **ESLint / Black / Flake8**: Code linting and formatting.

## Setup and Installation

### Prerequisites

Before you begin, ensure you have the following installed:
- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) (recommended)
- [Python 3.11+](https://www.python.org/downloads/) (for local backend development/testing)
- [Node.js 18+](https://nodejs.org/en/download/) and [npm](https://www.npmjs.com/get-npm) (for local frontend development/testing)

### Environment Variables

Both the backend and frontend services require environment variables. Copy the example files and populate them:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**`backend/.env`**:
```
DATABASE_URL="postgresql+asyncpg://user:password@db:5432/chat_db"
REDIS_URL="redis://redis:6379/0"
SECRET_KEY="YOUR_SUPER_SECRET_KEY_FOR_JWT_SIGNING_CHANGE_THIS" # VERY IMPORTANT: Change this in production
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30
LOG_LEVEL="INFO"
```
**Note**: When running with Docker Compose, `db` and `redis` are the service names, resolving to their internal IPs.

**`frontend/.env`**:
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_BASE_URL=ws://localhost:8000/ws
```
**Note**: These values correspond to the FastAPI backend's exposed ports.

### Docker Setup (Recommended)

This is the easiest way to get the entire system running.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/your-repo-name.git
    cd real-time-chat-app
    ```
2.  **Create `.env` files** as described above.
3.  **Build and run the services:**
    ```bash
    docker-compose up --build -d
    ```
    This command will:
    -   Build Docker images for the backend and frontend.
    -   Start PostgreSQL, Redis, Backend (FastAPI), and Frontend (React) services.
    -   Automatically apply Alembic migrations.
    -   Run the `seed.py` script to populate initial data (users, sample chats).

    Allow some time for the services to start up and migrations/seeding to complete. You can check logs with `docker-compose logs -f`.

### Local Setup (Without Docker)

If you prefer to run services directly on your host machine:

#### 1. Database and Redis
You'll need a running PostgreSQL server and a Redis instance.
-   **PostgreSQL**: Install PostgreSQL and create a database named `chat_db` with a user `user` and password `password` (or configure `backend/.env` accordingly).
-   **Redis**: Install and start a Redis server (usually runs on `localhost:6379`).

#### 2. Backend Setup
```bash
cd backend

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate # On Windows: .\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Apply database migrations
alembic upgrade head

# Seed initial data (optional, but recommended for first run)
python seed.py

# Run the FastAPI application
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend will be available at `http://localhost:8000`.

#### 3. Frontend Setup
```bash
cd frontend

# Install Node.js dependencies
npm install

# Run the React development server
npm run dev
```
The frontend will be available at `http://localhost:3000`.

## Running the Application

Once all services are up (either via Docker Compose or locally):

-   **Frontend**: Open your browser to `http://localhost:3000`.
-   **Backend API Docs**: Access Swagger UI at `http://localhost:8000/api/v1/docs` or ReDoc at `http://localhost:8000/api/v1/redoc`.

You can now register new users or log in with the seeded users (e.g., `alice@example.com` / `password123`).

## API Documentation

FastAPI automatically generates interactive API documentation.
-   **Swagger UI**: `http://localhost:8000/api/v1/docs`
-   **ReDoc**: `http://localhost:8000/api/v1/redoc`

These interfaces allow you to explore all available API endpoints, test requests directly, and understand request/response schemas.

## Testing

The project includes a comprehensive set of tests.

### Backend Tests

To run backend tests:
```bash
cd backend
pytest
```
This will execute unit, integration, and API tests. Test coverage is aimed for 80%+. A `sqlite` database is used for testing to ensure isolation and speed.

### Frontend Tests (Conceptual)

Frontend tests are set up using Jest and React Testing Library.
```bash
cd frontend
npm test
```
**Note**: The provided frontend `App.test.tsx` is a basic placeholder. A full suite would include tests for components, hooks, and page interactions.

## CI/CD

A basic CI/CD pipeline is configured using GitHub Actions (`.github/workflows/ci.yml`). This pipeline performs:
-   **Backend Tests**: Installs dependencies, runs `black --check`, `flake8`, and `pytest` for the backend.
-   **Frontend Tests**: Installs dependencies, runs `npm test`, and `npm run build` for the frontend.

This ensures that code pushed to `main` or `develop` branches, or through pull requests, meets quality standards before deployment. The `deploy` job is commented out but provides a placeholder for integrating with cloud deployment tools (e.g., pushing Docker images to a registry and deploying to Kubernetes, AWS ECS, etc.).

## Deployment

For production deployment, you would typically:

1.  **Build production Docker images**:
    ```bash
    docker-compose -f docker-compose.prod.yml build # (assuming a prod specific docker-compose)
    ```
2.  **Push images to a container registry** (e.g., Docker Hub, AWS ECR, GCP Container Registry).
3.  **Deploy to a cloud platform** (e.g., Kubernetes, AWS ECS/EC2, Google Cloud Run, Azure Container Instances).
    -   Ensure your `backend/.env` environment variables are securely managed (e.g., AWS Secrets Manager, Kubernetes Secrets).
    -   Use a reverse proxy like Nginx or Caddy for SSL termination, load balancing, and serving the frontend static files.
    -   Configure proper domain names and network security groups.

The `docker-compose.yml` provided can be adapted for a simpler single-host deployment by changing `localhost` references in `frontend/.env` to the public IP/domain of your backend.

## Additional Features

-   **Authentication/Authorization**: JWT-based token authentication. `get_current_active_user` dependency ensures only active, authenticated users access protected routes.
-   **Logging & Monitoring**: Structured logging with Python's `logging` module, configured to output to console. `LoggingMiddleware` tracks request performance. For production, integrate with centralized logging systems (ELK stack, Grafana Loki) and monitoring tools (Prometheus, Grafana).
-   **Error Handling Middleware**: `ErrorHandlerMiddleware` catches `HTTPException`s and general exceptions, providing consistent JSON responses and logging errors.
-   **Caching Layer**: Redis is integrated and used by `fastapi-limiter`. It can be extended for caching user presence, frequently accessed chat metadata, or message history.
-   **Rate Limiting**: `RateLimitMiddleware` (or `fastapi-limiter` decorators) protects API endpoints from abuse by limiting requests per IP address.

## Project Status & Future Enhancements

This project provides a strong foundation for a real-time chat application. Potential future enhancements include:

-   **Advanced Chat Features**:
    -   Direct Messaging (more robust logic for creating 1-on-1 chats).
    -   Typing indicators.
    -   Read receipts.
    -   File/image sharing.
    -   Message editing/deletion.
    -   Push notifications.
    -   Search messages/chats.
-   **User Presence**: Show online/offline status using Redis.
-   **Chat Roles**: Admin/moderator roles for group chats.
-   **Scalability**:
    -   Horizontal scaling of FastAPI instances.
    -   Database read replicas.
    -   Separate WebSocket service for better scaling.
-   **UI/UX Improvements**:
    -   Infinite scrolling for messages.
    -   Better error messages and loading states.
    -   Theming.
-   **Security**:
    -   More granular authorization (e.g., only chat creator can delete chat).
    -   HTTPS enforcement.
    -   Content Security Policy (CSP).

## License

This project is open-source and available under the [MIT License](LICENSE).
```