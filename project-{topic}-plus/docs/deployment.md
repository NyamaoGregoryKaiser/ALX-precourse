# Deployment Guide

This document outlines the steps and considerations for deploying the ML-Utilities-System to a production environment. The system is designed for containerized deployment using Docker, making it highly portable across various cloud providers or on-premise infrastructure.

## 1. Prerequisites

*   **Docker & Docker Compose**: Essential for local development and can be used for single-host deployments.
*   **Cloud Provider Account**: (e.g., AWS, GCP, Azure) if deploying to the cloud.
*   **Kubernetes Cluster**: (Optional) For highly scalable and resilient deployments.
*   **Domain Name & SSL Certificate**: For securing API traffic (HTTPS).
*   **CI/CD Pipeline**: (e.g., GitHub Actions, GitLab CI, Jenkins) for automated deployments.

## 2. Configuration for Production

Before deploying, ensure your `.env` file (or equivalent environment variables in your deployment environment) is properly configured for production:

*   **`SECRET_KEY`**: **CRITICAL** - Generate a strong, random, and long key. Never use the default or a simple key in production. Store it securely (e.g., AWS Secrets Manager, Vault).
*   **`DATABASE_URL`**: Update to point to your production PostgreSQL instance. This should be an external, managed database service (e.g., AWS RDS, GCP Cloud SQL), not the `db` container from `docker-compose.yml`.
*   **`REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`**: Update to point to your production Redis instance (e.g., AWS ElastiCache, GCP Memorystore).
*   **`FIRST_SUPERUSER_EMAIL`, `FIRST_SUPERUSER_PASSWORD`**: These are for initial setup. In production, you might create the admin user manually or via secure scripts, and ensure the default password is changed immediately.
*   **`BACKEND_CORS_ORIGINS`**: Set this to the exact URLs of your frontend applications or other clients that need to access the API. Do **NOT** use `["*"]` in production.
*   **`RATE_LIMIT_PER_MINUTE`**: Adjust this value based on expected traffic and desired API usage policies.
*   **Logging**: Configure Python's logging to output to a centralized logging system (e.g., stdout/stderr for container logs, then forwarded to ELK, Datadog, CloudWatch Logs, etc.).
*   **`PROJECT_NAME`**: Set an appropriate name for your environment.

## 3. Database Setup

1.  **Provision a Production PostgreSQL Instance**:
    *   Create a managed PostgreSQL database service (e.g., AWS RDS, GCP Cloud SQL, Azure Database for PostgreSQL).
    *   Ensure it's accessible from your application's network.
    *   Note down the connection details (host, port, user, password, database name).

2.  **Apply Database Migrations**:
    *   The `alembic` tool is used for schema management.
    *   In your CI/CD pipeline or during initial deployment, execute migrations:
        ```bash
        # Ensure alembic.ini points to your production DB
        # Or pass --sql for review before execution: alembic upgrade head --sql > migrations.sql
        alembic upgrade head
        ```
    *   It's crucial to apply migrations before starting the application, especially on the first deployment.

3.  **Seed Initial Data (Optional)**:
    *   If your application requires initial data (like the default superuser), run the `seed_data.py` script once.
    *   This can be part of your deployment script or a separate maintenance job.
    *   **Caution**: Ensure `seed_data.py` is idempotent, meaning it won't duplicate data if run multiple times. Our `seed_data.py` checks for existing users/data before creating.

## 4. Application Deployment Options

### 4.1. Docker Compose (Single Host)

For smaller deployments or quick proofs-of-concept on a single server:

1.  **Install Docker and Docker Compose** on your production server.
2.  **Copy project files** (`Dockerfile`, `docker-compose.yml`, `app/`, `main.py`, `requirements.txt`, `.env`) to the server.
3.  **Configure `.env`** with production settings (especially `DATABASE_URL` pointing to your external PostgreSQL and `REDIS_HOST` to external Redis).
4.  **Modify `docker-compose.yml`**:
    *   Remove `volumes` for `./app` to prevent accidental host filesystem changes and ensure the Docker image is self-contained.
    *   Update `db` and `redis` services to point to your external managed services or remove them if they are entirely external.
    *   Change the `command` for the `app` service to use Gunicorn for production-grade process management and stability:
        ```yaml
        command: >
          sh -c "alembic upgrade head &&
                 gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000"
        ```
        (Adjust `--workers` based on your server's CPU cores).
5.  **Build and run**:
    ```bash
    docker-compose up --build -d
    ```
6.  **Setup a Reverse Proxy**: Place Nginx or Caddy in front of the FastAPI application for SSL termination, load balancing (if multiple app instances), and static file serving.

### 4.2. Kubernetes (Container Orchestration)

For highly scalable, resilient, and manageable deployments:

1.  **Build Docker Image**:
    ```bash
    docker build -t your-registry/ml-utils-system:latest .
    docker push your-registry/ml-utils-system:latest
    ```
    (Replace `your-registry` with your Docker Hub or cloud container registry).

2.  **Create Kubernetes Manifests**:
    *   **Deployment**: Define your application deployment (e.g., 3 replicas of the FastAPI app).
    *   **Service**: Expose your deployment within the cluster.
    *   **Ingress**: Configure external access, SSL termination, and routing (e.g., using Nginx Ingress Controller).
    *   **Secrets**: Store sensitive information (`SECRET_KEY`, `DATABASE_URL`, `REDIS_HOST`) as Kubernetes Secrets.
    *   **ConfigMaps**: Store non-sensitive configuration (like CORS origins, rate limit values) as ConfigMaps.
    *   **Health Checks**: Configure liveness and readiness probes pointing to `/health` or similar endpoints.
    *   **Horizontal Pod Autoscaler (HPA)**: Automatically scale your pods based on CPU/memory usage.

3.  **Apply Manifests**:
    ```bash
    kubectl apply -f k8s/
    ```
    (Assuming your manifests are in a `k8s/` directory).

4.  **Monitor**: Use Kubernetes logging and monitoring tools (e.g., Prometheus, Grafana, built-in cloud provider tools) to observe your application.

### 4.3. Cloud-Specific Services (e.g., AWS ECS/Fargate, Google Cloud Run, Azure Container Apps)

These managed container services simplify deployment and operations.

1.  **Build and Push Docker Image** to the respective cloud container registry (e.g., ECR for AWS, Artifact Registry for GCP).
2.  **Create Service/Revision**:
    *   Define your service, pointing to the pushed Docker image.
    *   Configure environment variables (from Secrets Manager or directly).
    *   Set up CPU/memory, autoscaling rules, health checks.
    *   Attach to your managed PostgreSQL and Redis services.
3.  **Deploy**.
4.  **Configure Custom Domain & SSL**: Use the cloud provider's load balancer and certificate manager (e.g., AWS ALB + ACM, GCP Load Balancer + Certificate Manager).

## 5. CI/CD Pipeline

The `.github/workflows/ci.yml` provides a basic GitHub Actions example for Continuous Integration:

*   **Build**: Builds the Docker image.
*   **Test**: Runs unit, integration, and basic performance tests.
*   **Coverage**: Uploads test coverage reports.

For **Continuous Deployment (CD)**, extend this workflow to:

1.  **Tag and Push**: Tag your Docker image with a unique version (e.g., Git SHA, semantic version) and push it to a production container registry.
2.  **Deploy to Environment**: Trigger a deployment to your staging/production environment using:
    *   **Kubernetes**: `kubectl apply` with updated image tag.
    *   **Cloud Services**: Update the service definition with the new image tag using AWS CLI, `gcloud`, Azure CLI, or Terraform/Pulumi.
3.  **Rollback**: Implement a strategy for quick rollbacks in case of deployment failures.

## 6. Security Best Practices

*   **Environment Variables**: Never hardcode secrets. Use environment variables, and in production, use dedicated secret management services.
*   **HTTPS**: Always use HTTPS for all API traffic. Configure SSL/TLS at your load balancer or API Gateway.
*   **CORS**: Restrict `BACKEND_CORS_ORIGINS` to trusted domains only.
*   **Input Validation**: FastAPI/Pydantic handle this well, but be vigilant about all user inputs.
*   **Dependencies**: Regularly update dependencies to patch security vulnerabilities. Use tools like Dependabot.
*   **Container Security**: Scan Docker images for vulnerabilities. Use minimal base images.
*   **Principle of Least Privilege**:
    *   Database user should only have necessary permissions.
    *   Application should run with minimal OS privileges inside the container.
*   **Error Messages**: Avoid verbose error messages in production that could leak sensitive information. Use generic error messages with internal logging for details.

## 7. Monitoring & Alerting

*   **Logs**: Centralize logs from all application instances (e.g., ELK Stack, Datadog, Splunk, cloud provider's logging services).
*   **Metrics**: Collect application metrics (e.g., request latency, error rates, CPU/memory usage, database connection pool size) using tools like Prometheus/Grafana or cloud monitoring services.
*   **Alerting**: Set up alerts for critical issues (e.g., high error rates, service downtime, low disk space, security events).

By following this guide, you can confidently deploy and operate the ML-Utilities-System in a production environment.