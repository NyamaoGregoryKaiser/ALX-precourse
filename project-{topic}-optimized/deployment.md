# Deployment Guide for the Web Scraping Tools System

This guide outlines the steps to deploy the Web Scraping Tools System using Docker and Docker Compose. This setup is suitable for both local development and production environments, with minor adjustments.

## Prerequisites

1.  **Docker Desktop** or **Docker Engine & Compose** installed on your server/local machine.
    *   [Install Docker Engine](https://docs.docker.com/engine/install/)
    *   [Install Docker Compose](https://docs.docker.com/compose/install/)
2.  **Git** installed to clone the repository.
3.  **Basic understanding of Docker and Docker Compose**.

## 1. Clone the Repository

First, clone the project repository to your desired location:

```bash
git clone https://github.com/your-username/web-scraping-system.git
cd web-scraping-system
```

## 2. Configure Environment Variables

The application relies on environment variables for sensitive information and service configurations.

1.  Create a `.env` file in the root directory of the project by copying the example:

    ```bash
    cp .env.example .env
    ```

2.  Edit the `.env` file and set the values according to your environment:

    ```ini
    FLASK_APP=app
    FLASK_ENV=production # Use 'development' for local development, 'production' for live deployment
    SECRET_KEY="YOUR_VERY_STRONG_AND_UNIQUE_SECRET_KEY" # IMPORTANT: Change this for production!

    # Database Configuration
    DATABASE_URL="postgresql://user:password@db:5432/scraper_db" # 'db' is the service name in docker-compose

    # Celery Configuration
    CELERY_BROKER_URL="redis://redis:6379/0" # 'redis' is the service name in docker-compose
    CELERY_RESULT_BACKEND="redis://redis:6379/1" # 'redis' is the service name in docker-compose

    # Logging Configuration
    LOG_LEVEL="INFO" # DEBUG, INFO, WARNING, ERROR, CRITICAL
    LOG_FILE="/app/logs/app.log" # Path inside the Docker container
    ```

    **Important Considerations for Production:**
    *   **`SECRET_KEY`**: Generate a long, random string. Never use the default or a simple key in production.
    *   **`DATABASE_URL`**: For production, consider using an external managed PostgreSQL service instead of the Docker Compose `db` service for better reliability, backups, and scalability. If using an external DB, update the host, user, password, and database name accordingly.
    *   **`FLASK_ENV`**: Set to `production`.
    *   **Volumes**: In `docker-compose.yml`, for production, you might want to use named volumes for `/app/logs` to persist logs and prevent them from being lost if the container is recreated.

## 3. Build and Run with Docker Compose

Navigate to the project root directory where `docker-compose.yml` is located.

1.  **Build the Docker images:**

    ```bash
    docker-compose build
    ```
    This command builds the `app` image (Flask application, Celery worker, Celery beat) and pulls the `postgres` and `redis` images.

2.  **Start the services:**

    ```bash
    docker-compose up -d
    ```
    This command starts all services defined in `docker-compose.yml` in detached mode (`-d`).
    The `entrypoint.sh` script for the `app` service will handle:
    *   Waiting for the PostgreSQL database to be ready.
    *   Applying database migrations (`flask db upgrade`).
    *   Seeding initial data (only on the very first run if `.seeded` file doesn't exist).
    *   Starting the Gunicorn web server for the Flask app.

3.  **Verify services are running:**

    ```bash
    docker-compose ps
    ```
    You should see `db`, `redis`, `app`, `celery_worker`, and `celery_beat` services listed as `Up`.

4.  **Access the application:**
    The Flask application will be accessible at `http://localhost:5000` (or `http://your_server_ip:5000` if deployed on a remote server).

## 4. Initial Setup (Post-Deployment)

*   **Default Users (from `seed_data.py`):**
    *   **Admin:** `username: admin`, `password: adminpassword`
    *   **Regular User:** `username: user1`, `password: user1password`
    You can log in with these credentials via the web UI. **For production, change these default passwords or create new admin users and delete the seed data (by removing `seed_data.py` and `.seeded` after first run, or modifying `entrypoint.sh`).**

## 5. Managing the Application

*   **Stop services:**
    ```bash
    docker-compose down
    ```
*   **Stop and remove containers, networks, and volumes (caution!):**
    ```bash
    docker-compose down --volumes
    ```
    Use `--volumes` if you want to remove the `postgres_data` volume and start fresh (this will delete your database data).
*   **View logs:**
    ```bash
    docker-compose logs -f [service_name]
    # e.g., docker-compose logs -f app
    # e.g., docker-compose logs -f celery_worker
    ```
*   **Execute Flask commands:**
    You can run Flask CLI commands (like `flask db migrate` or `flask shell`) inside the `app` container:
    ```bash
    docker-compose exec app flask db revision --autogenerate -m "Add new field to User"
    docker-compose exec app flask db upgrade
    docker-compose exec app flask shell
    ```

## 6. Scaling (Production Considerations)

*   **Web Server (Gunicorn)**: The `docker-compose.yml` already uses Gunicorn with 4 workers. You can adjust the number of workers in `entrypoint.sh` or by passing arguments to Gunicorn. For high traffic, consider using a reverse proxy like Nginx in front of Gunicorn.
*   **Celery Workers**: You can scale Celery workers horizontally by increasing the `replicas` in Docker Compose (if using Swarm/Kubernetes) or by running multiple `celery_worker` containers.
*   **Database**: For true high availability and scalability in production, integrate with a managed cloud PostgreSQL service (AWS RDS, Google Cloud SQL, Azure Database for PostgreSQL).
*   **Redis**: Similarly, use a managed Redis service for high availability and persistence.

## 7. CI/CD Integration

The `.github/workflows/main.yml` file provides a basic CI/CD pipeline configuration for GitHub Actions.
*   It automatically builds and tests the application on `push` and `pull_request` events.
*   For full CD, you would extend this workflow to deploy the Docker image to a staging or production environment upon successful tests and merges to `main`. This often involves:
    1.  Pushing the built Docker image to a container registry (e.g., Docker Hub, AWS ECR).
    2.  Connecting to your production server via SSH.
    3.  Pulling the latest image on the server.
    4.  Restarting the `docker-compose` services with the new image.

## Troubleshooting

*   **`docker-compose up` fails**:
    *   Check `.env` file for correct syntax and values.
    *   Check logs of individual services: `docker-compose logs <service_name>`.
    *   Ensure no other processes are using ports 5000, 5432, or 6379 on your host machine.
*   **Database connection issues**:
    *   Verify `DATABASE_URL` in `.env` is correct. The hostname should be `db` (the service name).
    *   Ensure the `db` service is healthy and running.
*   **Celery tasks not running**:
    *   Check logs for `celery_worker` and `celery_beat` services.
    *   Ensure `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND` are correctly pointing to the `redis` service.
    *   In `testing` environment, Celery tasks run eagerly (synchronously) for easier testing. Ensure your `FLASK_ENV` is not `testing` if you expect asynchronous behavior.

By following these steps, you should be able to successfully deploy and manage your web scraping tools system.