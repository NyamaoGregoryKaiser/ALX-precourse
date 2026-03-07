```markdown
# Deployment Guide: Enterprise-Grade Task Management System

This document provides instructions for deploying the Task Management System to a production environment. The recommended deployment strategy leverages Docker for containerization, ensuring a consistent and isolated runtime environment.

## Table of Contents

- [Deployment Prerequisites](#deployment-prerequisites)
- [Configuration for Production](#configuration-for-production)
  - [Environment Variables](#environment-variables)
  - [Database Configuration](#database-configuration)
  - [Logging](#logging)
- [Building the Production Docker Image](#building-the-production-docker-image)
- [Deployment with Docker Compose (Single Host)](#deployment-with-docker-compose-single-host)
- [Deployment to Container Orchestration (Kubernetes, AWS ECS, etc.)](#deployment-to-container-orchestration-kubernetes-aws-ecs-etc)
- [Monitoring and Logging](#monitoring-and-logging)
- [Maintenance](#maintenance)
- [Security Considerations](#security-considerations)

## Deployment Prerequisites

Before deploying, ensure your production server(s) meet the following requirements:

*   **Docker & Docker Compose**: Installed and running (for containerized deployments).
*   **SSH Access**: To your server(s).
*   **Git**: To clone the repository.
*   **Web Server/Reverse Proxy (Optional but Recommended)**: Nginx or Apache for HTTPS termination, load balancing, and static file serving.
*   **Database Server (for PostgreSQL/MySQL)**: A running and accessible PostgreSQL or MySQL instance. For simplicity in development, SQLite is used, but for production, a dedicated DB server is essential.
*   **CI/CD System (Optional)**: If not using GitHub Actions, ensure your CI/CD system can build and push Docker images.

## Configuration for Production

Crucial adjustments are needed for production environments.

### Environment Variables

**NEVER hardcode sensitive information in your codebase.** Use environment variables for all secrets and environment-specific settings.

1.  **`JWT_SECRET`**:
    *   **Importance**: Critical for securing JWT tokens. Must be a long, random, and complex string.
    *   **Generation**: Use `openssl rand -base64 32` to generate a strong 32-byte (base64 encoded) key.
    *   **Storage**: Store this securely in your deployment environment (e.g., Docker secrets, Kubernetes secrets, cloud provider environment variables, or securely managed `.env` file for Docker Compose).
2.  **`APP_ENV`**: Set to `production`. This can influence logging levels, error reporting, etc. (though not extensively used in this example).
    ```bash
    # Example in .env for Docker Compose
    JWT_SECRET=your_actual_strong_jwt_secret_here
    APP_ENV=production
    ```

### Database Configuration

While SQLite (`app.db`) is used for local development, it is **NOT recommended for production** due to lack of concurrent write performance, central management, and backup/restore capabilities.

**Recommended Production Setup:** PostgreSQL or MySQL.

1.  **Update `config.json`**:
    Modify the `db_client` section in `config.json` to point to your production database.

    ```json
    {
        "db_client": [
            {
                "db_type": "postgresql",  // or "mysql"
                "db_host": "your_db_host",
                "db_port": 5432,          // 3306 for MySQL
                "db_name": "task_manager_db",
                "user": "db_user",
                "passwd": "db_password",
                "connections_num": 10,    // Adjust connection pool size
                "is_fast": true,
                "name": "default"
            }
        ],
        // ... other configurations
    }
    ```
    *   **`db_host`**: IP address or hostname of your database server.
    *   **`db_port`**: Default for PostgreSQL is 5432, MySQL is 3306.
    *   **`db_name`**: Name of the database to connect to.
    *   **`user` & `passwd`**: Database credentials. **Use environment variables or secrets management for these!** (e.g., `${DB_USER}`, `${DB_PASSWD}` in `config.json` which Drogon can pick up from env).

2.  **Database Migrations**:
    For production, it's crucial to have a robust migration strategy.
    *   **Initial Schema**: Apply `db/schema.sql` to your production database *before* deploying the application.
        ```bash
        # Example for PostgreSQL
        psql -h your_db_host -U db_user -d task_manager_db -f db/schema.sql
        ```
    *   **Future Migrations**: For schema changes, consider using a dedicated migration tool (e.g., Flyway, Liquibase, or custom Drogon ORM migration scripts) to manage database evolution without data loss.

### Logging

The `config.json` specifies `log_path` and `log_file`.
For production:
*   Ensure `log_path` is set to a persistent volume (e.g., a Docker volume or mounted directory) to prevent log loss if the container restarts.
*   Consider integrating with a centralized logging system (ELK stack, Splunk, cloud logging services) by configuring Drogon to log to `stdout`/`stderr` and letting your container orchestrator collect them.

## Building the Production Docker Image

1.  **Clone the repository on your build server/CI/CD environment:**
    ```bash
    git clone https://github.com/yourusername/task-management-system.git
    cd task-management-system
    ```

2.  **Adjust `Dockerfile` (if necessary)**:
    The provided `Dockerfile` is generally production-ready. Ensure it's optimized for size and security (e.g., by using a minimal base image, multi-stage builds).

3.  **Build the Docker image:**
    ```bash
    docker build -t your_registry/task-management-system:latest .
    ```
    Replace `your_registry` with your Docker image registry (e.g., Docker Hub, AWS ECR, Google Container Registry).

4.  **Push the image to your registry:**
    ```bash
    docker push your_registry/task-management-system:latest
    ```

## Deployment with Docker Compose (Single Host)

This is suitable for small-scale deployments or testing on a single server.

1.  **Prepare `docker-compose.yml`**:
    *   **Environment Variables**: Ensure your `.env` file is present on the server or explicitly define environment variables in the `docker-compose.yml` file, especially `JWT_SECRET` and database credentials if directly embedded.
    *   **Volumes**: Update volumes to use persistent storage for `db/` (if still using SQLite), `log/`, and any other persistent data.
    *   **Database Service**: If using PostgreSQL/MySQL in Docker, add a service for it.
    *   **Network**: Ensure proper networking if you have other services (e.g., a reverse proxy).

    ```yaml
    # Example docker-compose.yml for production (using PostgreSQL)
    version: '3.8'

    services:
      db:
        image: postgres:13-alpine
        container_name: task_management_postgres
        environment:
          POSTGRES_DB: task_manager_db
          POSTGRES_USER: db_user
          POSTGRES_PASSWORD: ${DB_PASSWORD} # Load from .env
        volumes:
          - postgres_data:/var/lib/postgresql/data # Persistent volume for DB
        restart: unless-stopped
        healthcheck: # Ensure DB is ready before app connects
          test: ["CMD-SHELL", "pg_isready -U db_user -d task_manager_db"]
          interval: 5s
          timeout: 5s
          retries: 5

      app:
        image: your_registry/task-management-system:latest # Use your pre-built image
        container_name: task-management-app
        ports:
          - "80:8080" # Map to port 80 or 443 with Nginx proxy
        volumes:
          - ./log:/app/log # Persistent volume for logs
          - ./config.json:/app/config.json # Mount external config (optional)
        environment:
          JWT_SECRET: ${JWT_SECRET} # Load from .env
          APP_ENV: production
          DB_HOST: db # Service name within Docker network
          DB_PORT: 5432
          DB_NAME: task_manager_db
          DB_USER: db_user
          DB_PASSWORD: ${DB_PASSWORD} # Load from .env
        depends_on:
          db:
            condition: service_healthy # Wait for DB to be healthy
        restart: unless-stopped

    volumes:
      postgres_data:
    ```

2.  **Deploy**:
    SSH into your server, navigate to the project directory (containing `docker-compose.yml` and `.env`), and run:
    ```bash
    docker compose pull       # Pull latest images
    docker compose up -d      # Start services in detached mode
    ```

## Deployment to Container Orchestration (Kubernetes, AWS ECS, etc.)

For high-availability, scalability, and robust management, deploy to a container orchestration platform.

1.  **Image Push**: Ensure your production Docker image is pushed to a reliable container registry.
2.  **Kubernetes (Example)**:
    *   Create Kubernetes deployment YAMLs for your application (Deployment, Service, Ingress, PersistentVolumeClaims, Secrets).
    *   Use Kubernetes Secrets for `JWT_SECRET` and database credentials.
    *   Configure `readiness` and `liveness` probes for your application.
    *   Define Horizontal Pod Autoscalers (HPAs) for scaling.
    *   Deploy using `kubectl apply -f your-kubernetes-manifests.yaml`.
3.  **AWS ECS/Fargate**:
    *   Define a Task Definition with your Docker image, environment variables (from Secrets Manager or Parameter Store), CPU/memory, and port mappings.
    *   Create an ECS Service and associate it with a Load Balancer (ALB).
    *   Configure auto-scaling policies.
4.  **Google Cloud Run/App Engine**:
    *   These platforms simplify deployment by often only requiring a Docker image. Configure environment variables and scaling as per the platform's documentation.

## Monitoring and Logging

*   **Application Logs**: Configure Drogon to output logs to `stdout`/`stderr`. Container orchestrators (Kubernetes, ECS) can then collect these logs and forward them to centralized logging systems (e.g., ELK stack, Datadog, CloudWatch Logs).
*   **System Metrics**: Monitor host CPU, memory, network I/O.
*   **Application Metrics**: Track API response times, error rates, request counts. Use Prometheus/Grafana or cloud-native monitoring solutions.
*   **Health Checks**: Implement `/health` or `/status` endpoints in your application to allow load balancers and orchestrators to check service health. Drogon can easily create such endpoints.

## Maintenance

*   **Regular Updates**: Keep Drogon, C++ compiler, and system dependencies updated to patch security vulnerabilities and benefit from performance improvements.
*   **Database Backups**: Regularly back up your production database.
*   **Security Audits**: Periodically review your code and infrastructure for security vulnerabilities.
*   **Log Review**: Regularly review logs for errors, anomalies, and potential security incidents.
*   **Performance Monitoring**: Continuously monitor performance metrics to identify bottlenecks.

## Security Considerations

*   **HTTPS**: Always deploy with HTTPS. Use a reverse proxy (Nginx, ALB, etc.) to terminate SSL/TLS.
*   **Secrets Management**: Use dedicated secrets management tools (Kubernetes Secrets, AWS Secrets Manager, HashiCorp Vault) for `JWT_SECRET`, database credentials, etc.
*   **Input Validation**: Strict input validation on all API endpoints is critical to prevent injection attacks and other vulnerabilities.
*   **Error Messages**: Avoid exposing sensitive system details in error messages in production. Use generic messages for clients and detailed logs for operators.
*   **Dependencies**: Keep all libraries and dependencies up-to-date to mitigate known vulnerabilities.
*   **Principle of Least Privilege**: Ensure your application and database users have only the necessary permissions.
*   **Rate Limiting**: Effectively configured rate limiting prevents brute-force attacks and resource exhaustion.
*   **Firewall**: Configure network firewalls to restrict access to only necessary ports and IPs. The database should not be publicly accessible.

By following these guidelines, you can ensure a robust, secure, and maintainable deployment of your Task Management System.
```