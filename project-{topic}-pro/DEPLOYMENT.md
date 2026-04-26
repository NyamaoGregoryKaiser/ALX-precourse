```markdown
# Enterprise Task Management System - Deployment Guide

This document provides instructions for deploying the Task Management System to a production environment using Docker and Docker Compose. While Docker Compose is excellent for local development and smaller deployments, for large-scale production, consider Kubernetes or cloud-specific deployment services.

## Table of Contents

1.  [Prerequisites](#1-prerequisites)
2.  [Production Environment Setup](#2-production-environment-setup)
3.  [Environment Variables](#3-environment-variables)
4.  [Database Migrations](#4-database-migrations)
5.  [Building and Deploying Docker Images](#5-building-and-deploying-docker-images)
    *   [Backend Image](#backend-image)
    *   [Frontend Image](#frontend-image)
6.  [Running with Docker Compose for Production](#6-running-with-docker-compose-for-production)
7.  [Post-Deployment Checks](#7-post-deployment-checks)
8.  [Scaling and High Availability](#8-scaling-and-high-availability)
9.  [CI/CD Integration](#9-cicd-integration)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

*   A Linux server (e.g., Ubuntu, CentOS)
*   Docker installed (`sudo apt-get install docker.io`)
*   Docker Compose installed (`sudo apt-get install docker-compose`)
*   Git installed
*   SSH access to the server

## 2. Production Environment Setup

### 2.1. Server Setup

Ensure your server is updated and secured.

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install git -y
```

### 2.2. Clone the Repository

```bash
git clone https://github.com/your-username/task-management-system.git
cd task-management-system
```

## 3. Environment Variables

Create a strong and secure `.env` file for your production environment. This file should be placed in the root directory of your project (where `docker-compose.yml` resides).

**Crucial Production Considerations:**

*   **`SECRET_KEY`**: Generate a very strong, long, random string. **Never use the default or a weak key in production.**
    *   Example: `python -c "import os; print(os.urandom(32).hex())"`
*   **`DATABASE_URL` / `ASYNC_DATABASE_URL`**: Use strong credentials and potentially connect to an external managed PostgreSQL service for better reliability and scaling.
*   **`REDIS_URL`**: Use strong credentials if Redis is exposed or an external managed Redis service.
*   **`BACKEND_CORS_ORIGINS`**: Set this to the exact production URL(s) of your frontend application (e.g., `https://your-task-app.com`). Do not use `*` or `http://localhost`.
*   **`LOG_LEVEL`**: Typically `INFO` or `WARNING` for production, `DEBUG` can be too verbose.
*   **`SENTRY_DSN`**: If using Sentry, provide your production DSN.

Example `.env` (production variant):

```ini
# Backend Configuration
DATABASE_URL="postgresql://prod_user:prod_strong_password@prod_db_host:5432/prod_taskdb"
ASYNC_DATABASE_URL="postgresql+asyncpg://prod_user:prod_strong_password@prod_db_host:5432/prod_taskdb"
SECRET_KEY="a-very-long-and-complex-production-secret-key-much-longer-than-this-example"
BACKEND_CORS_ORIGINS='["https://your-task-app.com"]'
REDIS_URL="redis://prod_redis_host:6379/0"
LOG_LEVEL="INFO"
SENTRY_DSN="https://examplePublicKey@o0.ingest.sentry.io/exampleProjectId"

# Frontend Configuration
REACT_APP_API_BASE_URL="https://api.your-task-app.com/api/v1"
```

**Security Best Practice**: Keep your `.env` file secure. Do not commit it to version control. Use environment variables injected by your hosting provider or a secrets management service.

## 4. Database Migrations

In a production environment, you should apply database migrations before starting the application, rather than relying on `Base.metadata.create_all` or `seed.py` in the Docker entrypoint.

### 4.1. Access the Backend Container (or run locally)

If your `db` service is already running, you can run migrations from within the backend container.

```bash
docker-compose up -d db # Start just the database
docker-compose run backend alembic upgrade head
```

If you prefer to run migrations locally without building the backend image, ensure Python and dependencies are installed in your local `backend/` directory, and your local `.env` points to the production DB.

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
```

**Note**: `seed.py` is primarily for development and demo purposes. In production, you would manually add initial admin users or have a more controlled seeding process.

## 5. Building and Deploying Docker Images

### Backend Image

For production, modify `backend/Dockerfile` to remove the source code mounting and ensure `uvicorn` is run with Gunicorn for robustness and parallelism.

**Modified `backend/Dockerfile` for Production (Example with Gunicorn):**

```dockerfile
# Use an official Python runtime as a parent image
FROM python:3.11-slim-buster

# Set environment variables for non-root user (good security practice)
ENV HOME=/home/appuser
ENV APP_HOME=/home/appuser/app
RUN groupadd -r appuser && useradd -r -g appuser appuser
WORKDIR $APP_HOME

# Install system dependencies for psycopg2-binary and Gunicorn
RUN apt-get update && apt-get install -y \
    postgresql-client \
    gcc \
    # libpq-dev is often needed for psycopg2-binary if pre-compiled wheels aren't sufficient
    libpq-dev \
    # Add any other build dependencies
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the working directory
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy the rest of the application code into the container
COPY --chown=appuser:appuser . .

# Set permissions for the app directory
RUN chmod -R 755 $APP_HOME

# Switch to non-root user
USER appuser

# Expose port 8000 for FastAPI
EXPOSE 8000

# Command to run the application using Gunicorn with Uvicorn workers
CMD ["gunicorn", "main:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--log-level", "info"]
```

Build and push your backend image to a Docker registry (e.g., Docker Hub, GitHub Container Registry).

```bash
cd backend
docker build -t your-dockerhub-username/task-manager-backend:latest .
docker push your-dockerhub-username/task-manager-backend:latest
```

### Frontend Image

For production, the frontend should be built and served as static files, potentially by a web server like Nginx or directly by the backend (if configured to serve static files).

**Modified `frontend/Dockerfile` for Production (Example serving with Nginx):**

```dockerfile
# Stage 1: Build the React application
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build the app with production environment variables
# REACT_APP_API_BASE_URL should point to your public API gateway/backend URL
ARG REACT_APP_API_BASE_URL
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
RUN npm run build

# Stage 2: Serve the built application with Nginx
FROM nginx:alpine

# Copy the Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built React app from the builder stage
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**`frontend/nginx.conf` (Example):**

```nginx
server {
    listen 80;
    server_name localhost; # Replace with your domain in production

    root /usr/share/nginx/html;
    index index.html index.htm;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to the backend service
    location /api {
        proxy_pass http://backend:8000; # 'backend' is the service name in docker-compose
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Build and push your frontend image:

```bash
cd frontend
docker build --build-arg REACT_APP_API_BASE_URL=${REACT_APP_API_BASE_URL} -t your-dockerhub-username/task-manager-frontend:latest .
docker push your-dockerhub-username/task-manager-frontend:latest
```

**Important**: In the `docker-compose.yml` (production version), you would update the `image` fields for `backend` and `frontend` to point to these pushed images, and ensure the frontend serves the static build.

## 6. Running with Docker Compose for Production

Adjust your `docker-compose.yml` for production:

*   Use `image` instead of `build`.
*   Remove volume mounts for source code (`./backend:/app`, `./frontend:/app`).
*   Remove `--reload` from backend command.
*   Ensure proper network configuration if using external DB/Redis.
*   Implement `restart: always` for all services.
*   Consider resource limits (`deploy: resources:`).

**Example `docker-compose.yml` for Production:**

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    # No port mapping if only accessed internally by backend/migrations
    # ports:
    #   - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 5s
      timeout: 5s
      retries: 5
    # For managed cloud databases, you might remove this service and point backend to external host

  redis:
    image: redis:7-alpine
    restart: always
    # No port mapping if only accessed internally by backend
    # ports:
    #   - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    # For managed cloud Redis, you might remove this service and point backend to external host

  backend:
    image: your-dockerhub-username/task-manager-backend:latest # Use your pushed image
    restart: always
    env_file:
      - .env
    # Only map if you need direct access to backend API from outside (e.g. for API consumers)
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    # Production command, apply migrations before starting
    command: ["/bin/sh", "-c", "alembic upgrade head && gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --log-level info"]

  frontend:
    image: your-dockerhub-username/task-manager-frontend:latest # Use your pushed Nginx image
    restart: always
    ports:
      - "80:80" # Map to port 80 for public access
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
```

Once your production `docker-compose.yml` is ready and your `.env` is secure:

```bash
docker-compose -f docker-compose.prod.yml up -d # Using a separate prod file
```
Or if you named it `docker-compose.yml`, just:
```bash
docker-compose up -d
```

## 7. Post-Deployment Checks

*   **Access Frontend**: Navigate to your server's public IP or domain name.
*   **API Healthcheck**: `curl http://your-server-ip:8000/api/v1/healthcheck` (or `https://your-domain/api/v1/healthcheck` if using a reverse proxy/frontend for API routes).
*   **Container Logs**: `docker-compose logs -f` to monitor all service logs for errors.
*   **Database Check**: Connect to your PostgreSQL database to ensure tables are created and data (if seeded) exists.
*   **Sentry/Monitoring**: Verify that errors are being reported to your monitoring system (e.g., Sentry).

## 8. Scaling and High Availability

For serious production deployments, consider:

*   **Load Balancer**: Distribute traffic across multiple instances of your frontend and backend.
*   **Kubernetes**: An orchestration platform for deploying, managing, and scaling containerized applications.
*   **Managed Services**: Use cloud provider's managed PostgreSQL, Redis, and container services (ECS, EKS, Azure Container Apps, Google Cloud Run) for automatic scaling, backups, and high availability.
*   **Horizontal Scaling**: Run multiple instances of your backend service behind a load balancer.

## 9. CI/CD Integration

Integrate your Docker image builds and pushes into your CI/CD pipeline (e.g., GitHub Actions, GitLab CI, Jenkins). This ensures that every successful merge to your main branch automatically builds and pushes the latest images, ready for deployment. The `ci.yml` in `.github/workflows/` provides a starting point.

## 10. Troubleshooting

*   **`docker-compose logs <service_name>`**: Check logs for specific services (e.g., `docker-compose logs backend`).
*   **`docker-compose exec <service_name> bash`**: Access a running container's shell for debugging.
*   **Firewall**: Ensure necessary ports (80/443 for frontend, 8000 for backend if directly exposed) are open on your server.
*   **Environment Variables**: Double-check that all required environment variables are correctly set in your `.env` file and are being picked up by Docker Compose.
*   **Network Issues**: Ensure containers can communicate with each other (e.g., backend reaching `db` and `redis` via their service names).

By following these guidelines, you can successfully deploy your Enterprise Task Management System to a production environment.
```

---

### 6. Additional Features

These features are integrated into the backend implementation provided in `main.py`, `config.py`, `app/security.py`, `app/dependencies.py`, `app/middleware/error_handler.py`, and `app/utils/caching.py`.

**Authentication/Authorization (JWT & RBAC)**
*   `app/security.py`: Handles `create_access_token`, `verify_password`, `get_password_hash`.
*   `app/dependencies.py`: `get_current_user`, `get_current_active_user`, `get_current_active_admin`, `HasRole` (for RBAC).
*   `app/api/v1/auth.py`: Login/registration endpoints.
*   API routes use `Depends(dependencies.get_current_active_user)` or `Depends(dependencies.HasRole([UserRole.ADMIN]))`.

**Logging and Monitoring**
*   `backend/app/utils/logging.py`: Centralized logger configuration.
*   `backend/main.py`: Basic request logging middleware.
*   `config.py`: Placeholder for `SENTRY_DSN`.