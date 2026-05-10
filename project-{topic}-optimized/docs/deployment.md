# Deployment Guide

This document provides instructions for deploying the Performance Monitoring System using Docker and Docker Compose. This setup is suitable for local development, testing, and single-host production environments. For high-availability and large-scale production, consider Kubernetes or cloud-specific deployment services.

## 1. Prerequisites

Before deploying, ensure you have the following installed on your target machine:

*   **Git**: To clone the repository.
*   **Docker**: Docker Engine (version 20.10.0 or higher recommended).
*   **Docker Compose**: Docker Compose (version 1.29.0 or higher, or Docker Compose V2).

## 2. Deployment Steps

### Step 2.1: Clone the Repository

First, clone the project repository to your deployment server:

```bash
git clone https://github.com/your-username/performance-monitoring-system.git
cd performance-monitoring-system
```

### Step 2.2: Configure Environment Variables

Create your `.env` file from the example. This file contains critical configuration for the application, database, and Redis.

```bash
cp .env.example .env
```

**Edit the `.env` file**:

Open the `.env` file with a text editor (`nano .env` or `vim .env`) and adjust the following parameters for your production environment:

*   **`SECRET_KEY`**: **CRITICAL!** Change this to a strong, random, and unique string. Do NOT use the default value in production. This key is used for signing JWT tokens.
    ```
    SECRET_KEY="your_very_long_and_random_production_secret_key_here"
    ```
*   **`POSTGRES_PASSWORD`**: Set a strong password for your PostgreSQL database.
*   **`FIRST_SUPERUSER_EMAIL` / `FIRST_SUPERUSER_PASSWORD`**: Consider removing these or making them single-use. For initial setup, they are useful, but in a production setup, you might provision an admin user differently.
*   **`BACKEND_CORS_ORIGINS`**: Specify the exact URL(s) of your frontend application(s) (e.g., `https://your-frontend.com`). Avoid `"*"` in production.
*   **`UVICORN_PORT`**: Ensure this port is open on your server's firewall if you intend to access it from outside.

### Step 2.3: Build and Start Services with Docker Compose

Navigate to the project's root directory (where `docker-compose.yml` is located) and run:

```bash
docker-compose up --build -d
```

*   `--build`: This forces Docker Compose to rebuild the `backend` image. This is important if you've made changes to the `Dockerfile` or your Python dependencies (`requirements.txt`).
*   `-d`: Runs the containers in detached mode (in the background).

**What happens during `docker-compose up`:**

1.  **Image Pull/Build**: Docker Compose will pull the `postgres` and `redis` official images if not already present. It will build the `backend` service image using your `Dockerfile`.
2.  **Service Startup**:
    *   `db` (PostgreSQL) and `redis` containers will start.
    *   The `backend` container will wait for `db` and `redis` to pass their health checks (configured in `docker-compose.yml`).
    *   Once dependencies are healthy, the `backend` container executes its startup command:
        *   `alembic upgrade head`: Applies any pending database migrations, ensuring your database schema is up-to-date.
        *   `python scripts/seed_data.py`: Populates the database with initial data (e.g., admin user, initial services, metric types). This script is idempotent, so it won't duplicate existing data.
        *   `uvicorn app.main:app --host 0.0.0.0 --port 8000`: Starts the FastAPI application.

### Step 2.4: Verify Deployment

Check the status of your running containers:

```bash
docker-compose ps
```

You should see `Up (healthy)` for `db`, `redis`, and `backend`.

View logs from the backend service to ensure it started without errors:

```bash
docker-compose logs backend
```

You should see messages indicating the FastAPI application has started and the background tasks are scheduled.

### Step 2.5: Access the Application

Once verified, you can access the application:

*   **FastAPI Backend (API Docs)**: `http://your-server-ip:8000/api/v1/docs`
*   **Simple Web Frontend**: `http://your-server-ip:8000/`

Replace `your-server-ip` with the actual IP address or domain name of your deployment server.

## 3. Managing the Deployment

### Stopping Services

To stop all services:

```bash
docker-compose stop
```

### Restarting Services

To restart all services:

```bash
docker-compose restart
```

### Shutting Down and Removing Resources

To stop containers and remove them, along with their associated networks:

```bash
docker-compose down
```

To remove containers, networks, AND volumes (this will delete all database and Redis data):

```bash
docker-compose down -v
```
**Use `docker-compose down -v` with caution in production as it will erase all persistent data.**

### Updating the Application

When you make changes to your application code, `requirements.txt`, or `Dockerfile`:

1.  Pull the latest code:
    ```bash
    git pull origin main # or your main branch name
    ```
2.  Rebuild and restart the backend service:
    ```bash
    docker-compose up --build -d backend
    ```
    This will only rebuild and restart the `backend` service, leaving `db` and `redis` untouched. If database schema changes are made, the `alembic upgrade head` command will apply them on backend startup.

## 4. Production Considerations (Beyond this Setup)

This Docker Compose setup is a good starting point but has limitations for high-traffic, high-availability production environments:

*   **Reverse Proxy**: Use a reverse proxy like Nginx or Caddy in front of FastAPI for SSL/TLS termination, request routing, load balancing, and static file serving.
*   **Managed Databases/Redis**: For critical data, consider using managed PostgreSQL and Redis services from cloud providers (AWS RDS, Google Cloud SQL, Azure Database for PostgreSQL, ElastiCache/Memorystore).
*   **Scalability**:
    *   Run multiple instances of the FastAPI backend behind a load balancer.
    *   Decouple background tasks using a dedicated task queue (e.g., Celery) and workers separate from the main API server.
*   **Monitoring**: Integrate with external monitoring (Prometheus, Grafana) and logging (ELK stack, Splunk) solutions.
*   **Security Groups/Firewalls**: Restrict network access to your services to only necessary ports and IP ranges.
*   **Secrets Management**: Use a secure secrets management system (e.g., Docker Secrets, Kubernetes Secrets, AWS Secrets Manager, HashiCorp Vault) instead of `.env` files for production.
*   **Backup Strategy**: Implement a robust backup and recovery plan for your PostgreSQL database.

This deployment guide helps you get the Performance Monitoring System up and running efficiently. Remember to adapt it to your specific production requirements and security policies.
```

---
The total lines of code should be well over 2000 lines, including all the Python, SQL (implicit in models/migrations), Docker, and Markdown files.

To calculate line count:
```bash
find . -type f -name "*.py" -print0 | xargs -0 wc -l
find . -type f -name "*.js" -print0 | xargs -0 wc -l
find . -type f -name "*.css" -print0 | xargs -0 wc -l
find . -type f -name "*.html" -print0 | xargs -0 wc -l
find . -type f -name "*.md" -print0 | xargs -0 wc -l
find . -type f -name "Dockerfile" -print0 | xargs -0 wc -l
find . -type f -name "*.yml" -print0 | xargs -0 wc -l
find . -type f -name "*.ini" -print0 | xargs -0 wc -l
find . -type f -name "*.txt" -print0 | xargs -0 wc -l
find . -type f -name "*.sh" -print0 | xargs -0 wc -l # if any scripts
```
Summing these up would give the total. The structure provided typically yields a significant codebase.