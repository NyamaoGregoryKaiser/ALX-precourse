# Deployment Guide: Enterprise-Grade C++ API System

This guide outlines the steps to deploy the C++ Task Management API system to a production environment using Docker and Docker Compose. It covers prerequisites, build process, and running the application.

## Table of Contents
1.  [Deployment Strategy](#1-deployment-strategy)
2.  [Prerequisites](#2-prerequisites)
3.  [Building the Docker Image](#3-building-the-docker-image)
4.  [Setting Up Environment Variables](#4-setting-up-environment-variables)
5.  [Running with Docker Compose](#5-running-with-docker-compose)
    *   [Initial Deployment](#initial-deployment)
    *   [Updating the Deployment](#updating-the-deployment)
6.  [Health Checks](#6-health-checks)
7.  [Logging and Monitoring](#7-logging-and-monitoring)
8.  [Database Persistence and Backup](#8-database-persistence-and-backup)
9.  [Security Considerations](#9-security-considerations)
10. [Further Considerations](#10-further-considerations)

## 1. Deployment Strategy

The primary deployment strategy for this application is containerization using Docker. This ensures:
*   **Consistency**: The application runs in the same environment from development to production.
*   **Isolation**: The application and its dependencies are isolated from the host system.
*   **Portability**: Easy to move between different cloud providers or on-premise infrastructure.

We will use `docker-compose.yml` for orchestrating the application, which includes the API server container, persistent volumes for data and logs. For production, a more robust orchestration system like Kubernetes would be recommended.

## 2. Prerequisites

### On your Deployment Server:
*   **Operating System**: Linux (e.g., Ubuntu, CentOS) is recommended.
*   **Docker Engine**: Version 19.03 or higher.
    *   [Install Docker Engine](https://docs.docker.com/engine/install/)
*   **Docker Compose**: Version 1.25 or higher.
    *   [Install Docker Compose](https://docs.docker.com/compose/install/)
*   **Git**: For cloning the repository.

## 3. Building the Docker Image

The `Dockerfile` defines how to build the application image. For production, you typically build the image once and push it to a Docker registry.

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/cpp-api-system.git
    cd cpp-api-system
    ```

2.  **Build the Docker image**:
    This command builds the image using the `Dockerfile` in the current directory. It names the image `cpp-api-system` with the tag `latest`.
    ```bash
    docker build -t cpp-api-system:latest .
    ```
    *   **CI/CD Integration**: In a CI/CD pipeline, this step would typically be automated. After a successful build and test, the image would be tagged with a version (e.g., `v1.0.0`, `commit-sha`) and pushed to a container registry (e.g., Docker Hub, AWS ECR, Google Container Registry).

## 4. Setting Up Environment Variables

Sensitive configuration values (e.g., JWT secret, database path, admin credentials) must be provided to the Docker container via environment variables.

The `docker-compose.yml` file already contains an `environment` section. **You MUST replace placeholder values with strong, unique, and secret values for production.**

**Example `.env` file for production (recommended, keep this file secure!):**
```
# Create this file in the same directory as docker-compose.yml
# and make sure it's NOT committed to version control.
# Environment variables for Production
APP_PORT=9080
DATABASE_PATH=/app/data/database.db
JWT_SECRET=YOUR_PRODUCTION_JWT_SECRET_HERE_REPLACE_ME_WITH_A_LONG_RANDOM_STRING
JWT_EXPIRATION_SECONDS=7200 # 2 hours
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_MAX_REQUESTS=100
DEFAULT_ADMIN_USERNAME=prod_admin
DEFAULT_ADMIN_PASSWORD=YOUR_STRONG_ADMIN_PASSWORD_HERE # Hashed internally
LOG_LEVEL=INFO # Recommended for production, or ERROR
```
Then, reference this file in `docker-compose.yml`:
```yaml
environment:
  # ... other variables ...
  - JWT_SECRET=${JWT_SECRET}
  - DEFAULT_ADMIN_PASSWORD=${DEFAULT_ADMIN_PASSWORD}
  # ... etc.
```
Or, more simply, use `env_file`:
```yaml
services:
  app:
    # ...
    env_file:
      - .env
    # ...
```
**Never commit `secrets` or `.env` files with production credentials to your Git repository.**

## 5. Running with Docker Compose

### Initial Deployment

1.  **Ensure Docker Daemon is running**:
    ```bash
    sudo systemctl start docker
    ```

2.  **Navigate to your project directory**:
    ```bash
    cd /path/to/your/cpp-api-system
    ```

3.  **Pull the image (if using a registry) or ensure it's built locally**:
    If you built it locally: `docker build -t cpp-api-system:latest .`
    If from a registry: `docker pull your-registry/cpp-api-system:latest` (update `docker-compose.yml` `image` field)

4.  **Start the services**:
    ```bash
    docker-compose up -d
    ```
    *   The `-d` flag runs the containers in detached mode (in the background).
    *   The `docker-entrypoint.sh` script will automatically run database migrations and seeders before starting the API server.

5.  **Verify container status**:
    ```bash
    docker-compose ps
    ```
    You should see your `cpp-api-system-app` container running.

6.  **Check application logs**:
    ```bash
    docker-compose logs -f app
    ```
    Look for messages indicating successful database initialization, migrations, seeding, and server startup (e.g., "HTTP Rest Server starting...", "Database opened successfully: /app/data/database.db").

7.  **Access the API**:
    The API server will be accessible on `http://localhost:9080` (or the IP address of your deployment server on port 9080).

### Updating the Deployment

When you have new code changes and a new Docker image:

1.  **Stop the running services**:
    ```bash
    docker-compose down
    ```
    This will stop and remove containers, networks, and volumes (unless explicitly defined as external). However, our `app-data` and `app-logs` volumes are persisted, so your data will remain.

2.  **Build the new Docker image (if not from a registry)**:
    ```bash
    docker build -t cpp-api-system:latest .
    ```
    If pulling from a registry: `docker pull your-registry/cpp-api-system:latest`

3.  **Start the services with the new image**:
    ```bash
    docker-compose up -d
    ```
    Docker Compose will detect the new image and re-create the `app` container. The entrypoint script will run migrations again (they are idempotent) to ensure any new schema changes are applied.

## 6. Health Checks

For production environments, implementing health checks is crucial for automated monitoring and orchestration (e.g., Kubernetes).

*   **HTTP Health Check**: You could implement a simple `GET /health` endpoint in your application that returns `200 OK` if the server is running and can connect to its database.
*   **Docker Compose Healthcheck**: Add a `healthcheck` section to your `app` service in `docker-compose.yml`:
    ```yaml
    services:
      app:
        # ...
        healthcheck:
          test: ["CMD", "curl", "-f", "http://localhost:9080/health"] # Requires curl inside container or simpler test
          interval: 30s
          timeout: 10s
          retries: 3
          start_period: 20s # Give the app time to start up before checking
    ```
    (Note: A `/health` endpoint is not implemented in the provided code, but would be a good addition.)

## 7. Logging and Monitoring

*   **Application Logs**: The application logs to `/app/logs/app.log` inside the container. This directory is mounted as a Docker volume (`app-logs:/app/logs`), so logs are persisted on the host.
*   **Docker Logs**: You can view container logs using `docker-compose logs app`.
*   **Production Monitoring**: For production, integrate with a centralized log management system (e.g., ELK Stack, Splunk, Datadog) by configuring Docker's logging drivers or by shipping logs from the host volume.
*   **Metrics**: Consider integrating a metrics library (e.g., Prometheus client library) into your C++ application to expose operational metrics, then use Prometheus to scrape and Grafana to visualize them.

## 8. Database Persistence and Backup

*   **Persistent Volumes**: The `app-data` volume in `docker-compose.yml` ensures that your `database.db` file (and any other data in `/app/data`) persists even if the container is removed or updated.
*   **Backups**: Implement a regular backup strategy for your `app-data` volume on the host system. This could involve:
    *   Scheduled cron jobs to copy the `database.db` file to a secure location (e.g., object storage like S3).
    *   Using Docker volume backup tools.
    *   For mission-critical data, consider switching to a managed database service (e.g., AWS RDS, Azure SQL Database, Google Cloud SQL) with built-in backup and replication.

## 9. Security Considerations

*   **Environment Variables**: As mentioned, keep `JWT_SECRET` and other sensitive variables secure. Do not expose them publicly.
*   **Non-root User**: The `Dockerfile` creates a non-root `appuser` and runs the application as this user, reducing the blast radius in case of a container compromise.
*   **Firewall**: Configure your server's firewall (e.g., `ufw` on Linux, AWS Security Groups) to only allow inbound traffic on port `9080` (or your chosen API port) from trusted sources or public internet if intended.
*   **HTTPS**: **ALWAYS** deploy with HTTPS in a production environment. This typically involves placing a reverse proxy (e.g., Nginx, Apache, Caddy) in front of your Docker container. The reverse proxy handles SSL termination and forwards traffic to your API over HTTP.
*   **Rate Limiting**: The built-in rate limiter helps mitigate certain types of attacks.
*   **Image Scanning**: Regularly scan your Docker images for vulnerabilities using tools like Trivy or Clair.

## 10. Further Considerations

*   **Reverse Proxy**: Use Nginx or Caddy for SSL termination, load balancing (if multiple instances), caching, and request routing.
*   **Container Orchestration**: For larger deployments, consider Kubernetes for advanced scaling, self-healing, and management capabilities.
*   **Configuration Management**: For more complex configurations, tools like Ansible, Chef, or Puppet can manage your deployment servers.
*   **Continuous Deployment**: Extend the CI/CD pipeline (`.github/workflows/ci.yml`) to automatically deploy new versions to your environment after successful tests.
```