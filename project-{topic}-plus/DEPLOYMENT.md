```markdown
# Mobile App Backend System: Deployment Guide

This document provides instructions and considerations for deploying the Mobile App Backend System to a production environment. The primary deployment strategy involves containerization with Docker and can be adapted to various cloud platforms.

## Table of Contents

1.  [Prerequisites](#prerequisites)
2.  [Production Environment Configuration](#production-environment-configuration)
3.  [Containerization](#containerization)
4.  [Database Setup](#database-setup)
5.  [Redis Setup](#redis-setup)
6.  [Running Migrations](#running-migrations)
7.  [Deployment Options](#deployment-options)
    *   [Docker Swarm / Single Server](#docker-swarm--single-server)
    *   [Kubernetes (K8s)](#kubernetes-k8s)
    *   [Cloud-Specific Services (AWS, GCP, Azure)](#cloud-specific-services-aws-gcp-azure)
8.  [CI/CD Integration](#cicd-integration)
9.  [Monitoring & Logging](#monitoring--logging)
10. [Security Best Practices](#security-best-practices)
11. [Troubleshooting](#troubleshooting)

## 1. Prerequisites

*   **Docker & Docker Compose:** For building and managing containers.
*   **Cloud Provider Account (Optional):** AWS, GCP, Azure, etc., if deploying to the cloud.
*   **Domain Name:** For exposing your API via HTTPS.
*   **SSL/TLS Certificate:** Essential for HTTPS.

## 2. Production Environment Configuration

Before deploying, ensure your `.env` file is configured for production:

*   `DEBUG=False`: Disables debug mode, suppresses detailed error messages, and turns off interactive API docs (`/docs`, `/redoc`).
*   `SECRET_KEY`: **Generate a strong, unique, and long secret key.** Never use the development key in production. Store it securely (e.g., AWS Secrets Manager, Vault).
*   `ACCESS_TOKEN_EXPIRE_MINUTES`: Adjust token expiration as needed for your security policy.
*   `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_HOST`, `POSTGRES_PORT`: Use credentials for your production PostgreSQL instance. **These should be strong and distinct from development.**
*   `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`: Use credentials for your production Redis instance.
*   `LOG_LEVEL`: Set to `INFO` or `WARNING` to reduce verbosity in production.

**Example Production `.env` (values should be replaced with actual secrets):**
```dotenv
DEBUG=False
PROJECT_NAME="Mobile App Prod Backend"
SECRET_KEY="YOUR_SUPER_STRONG_PRODUCTION_SECRET_KEY_HERE"
ACCESS_TOKEN_EXPIRE_MINUTES=60 # Example: 1 hour

POSTGRES_USER="prod_user"
POSTGRES_PASSWORD="YOUR_PROD_DB_PASSWORD"
POSTGRES_DB="prod_app_db"
POSTGRES_HOST="prod-db-instance.xxxx.us-east-1.rds.amazonaws.com"
POSTGRES_PORT=5432

REDIS_HOST="prod-redis-cache.xxxx.us-east-1.cache.amazonaws.com"
REDIS_PORT=6379
REDIS_DB=0

LOG_LEVEL=INFO
DEFAULT_RATE_LIMIT="1000/hour" # More aggressive rate limit for production
```

## 3. Containerization

The `Dockerfile` in the root of the project is optimized for building the application image.

**Building the Production Image:**

```bash
docker build -t mobile-app-backend:latest .
```
Consider tagging with a version number for better version control (e.g., `mobile-app-backend:v1.0.0`).

## 4. Database Setup

For production, it's highly recommended to use a **managed database service** (e.g., AWS RDS PostgreSQL, Google Cloud SQL for PostgreSQL, Azure Database for PostgreSQL).

1.  **Provision a PostgreSQL instance:** Choose a suitable instance size, enable backups, multi-AZ deployment (for high availability), and configure security groups/firewalls to allow connections only from your application servers.
2.  **Create the database and user:** Create the database (e.g., `prod_app_db`) and a dedicated user (e.g., `prod_user`) with strong credentials, granting necessary permissions.
3.  **Update `.env`:** Configure your `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` in your production environment to point to this managed instance.

## 5. Redis Setup

Similar to PostgreSQL, use a **managed Redis service** for caching and rate limiting (e.g., AWS ElastiCache for Redis, Google Cloud Memorystore for Redis, Azure Cache for Redis).

1.  **Provision a Redis instance:** Select an appropriate instance type, configure high availability if needed, and set up security to allow connections only from your application servers.
2.  **Update `.env`:** Configure your `REDIS_HOST`, `REDIS_PORT`, and `REDIS_DB` to point to this managed instance.

## 6. Running Migrations

Database migrations (`alembic upgrade head`) are critical for production deployments.

**Option 1: During Container Startup (as configured in `Dockerfile`/`docker-compose.yml`)**
The provided `Dockerfile` and `docker-compose.yml` include `alembic upgrade head` as part of the `CMD`. This is convenient for simple setups but has caveats in highly scaled environments (race conditions if multiple instances try to migrate simultaneously).

```bash
# Dockerfile CMD
CMD ["/bin/bash", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
```
**Considerations:** Ensure your deployment platform handles only one instance running migrations at a time during an update (e.g., by running a dedicated migration job).

**Option 2: Dedicated Migration Job (Recommended for Production)**
For robust deployments, run migrations as a separate, one-off job before deploying new application versions.

1.  **Build the image:** `docker build -t mobile-app-backend:vX.Y.Z .`
2.  **Run migrations:**
    ```bash
    docker run --rm \
      --env-file /path/to/your/prod.env \
      mobile-app-backend:vX.Y.Z alembic upgrade head
    ```
    Replace `/path/to/your/prod.env` with the path to your production environment variables file.
3.  **Deploy the application instances** after migrations are successfully applied.

## 7. Deployment Options

### 7.1. Docker Swarm / Single Server

For simpler deployments or smaller scale, Docker Swarm or directly running Docker containers on a single VM/server might suffice.

1.  **Prepare a `docker-compose.prod.yml`:**
    *   Remove `volumes` mount (code should be in the image).
    *   Set `restart: always` for all services.
    *   Point `db` and `redis` services to your *managed* cloud instances by updating environment variables to use their respective hostnames/IPs. You might remove the `db` and `redis` service definitions if using managed services entirely, only providing their connection strings to the `app` service.
    *   Add a reverse proxy (e.g., Nginx) for HTTPS termination and load balancing (if multiple app instances).

    ```yaml
    # Example docker-compose.prod.yml (partial)
    version: '3.8'

    services:
      app:
        image: mobile-app-backend:latest
        environment:
          # Production specific env vars (e.g., from external secret management)
          # Point to managed DB/Redis
          POSTGRES_HOST: prod-db-instance.xxxx.rds.amazonaws.com
          REDIS_HOST: prod-redis-cache.xxxx.elasticache.amazonaws.com
          DEBUG: False
          SECRET_KEY: # ... from secrets manager
        deploy:
          replicas: 3 # Run multiple instances for high availability
          restart_policy:
            condition: on-failure
        ports:
          - "8000:8000" # Expose to reverse proxy

      nginx: # Optional: if managing reverse proxy in same compose
        image: nginx:alpine
        ports:
          - "80:80"
          - "443:443"
        volumes:
          - ./nginx.conf:/etc/nginx/nginx.conf:ro
          - ./certs:/etc/nginx/certs:ro # SSL certificates
        depends_on:
          - app
        # ... more nginx configuration
    ```
2.  **Deploy:** `docker-compose -f docker-compose.prod.yml up -d`

### 7.2. Kubernetes (K8s)

For larger-scale, highly available, and auto-scaling deployments, Kubernetes is the industry standard.

1.  **Container Registry:** Push your `mobile-app-backend` image to a container registry (e.g., Docker Hub, AWS ECR, GCP GCR).
    ```bash
    docker tag mobile-app-backend:latest your-registry/mobile-app-backend:v1.0.0
    docker push your-registry/mobile-app-backend:v1.0.0
    ```
2.  **Kubernetes Manifests:** Create Kubernetes YAML manifests for:
    *   **Deployments:** For the FastAPI application (e.g., `app-deployment.yaml`), specifying multiple replicas and resource limits.
    *   **Services:** For internal load balancing and exposing the API within the cluster.
    *   **Ingress:** For external access, HTTPS termination, and routing to your FastAPI service.
    *   **Secrets:** For securely storing database credentials, JWT secret key, etc. (e.g., Kubernetes Secrets or integration with external secret managers).
    *   **ConfigMaps:** For non-sensitive configurations.
    *   **Jobs/CronJobs:** For running Alembic migrations or seed scripts.
    *   **Horizontal Pod Autoscalers (HPA):** To automatically scale pods based on CPU/memory utilization.

3.  **Managed Kubernetes Service:** Deploy to a managed K8s service (e.g., AWS EKS, GCP GKE, Azure AKS) for ease of management.

### 7.3. Cloud-Specific Services (AWS, GCP, Azure)

Each major cloud provider offers services that can host containerized applications.

*   **AWS:**
    *   **ECS (Elastic Container Service):** Orchestrates Docker containers. Can use Fargate (serverless) or EC2 (managed VMs).
    *   **EKS (Elastic Kubernetes Service):** Managed Kubernetes.
    *   **API Gateway + Lambda (Serverless):** For very high-scale, event-driven, cost-optimized scenarios, you could refactor some parts into AWS Lambda functions triggered via API Gateway. FastAPI can run on Lambda using mangum.
*   **Google Cloud Platform (GCP):**
    *   **Cloud Run:** Serverless platform for containerized applications.
    *   **GKE (Google Kubernetes Engine):** Managed Kubernetes.
    *   **App Engine Flexible Environment:** PaaS for containerized apps.
*   **Azure:**
    *   **Azure Container Instances (ACI):** Run containers without managing VMs.
    *   **Azure Kubernetes Service (AKS):** Managed Kubernetes.
    *   **Azure App Service:** PaaS for web apps, supports containers.

## 8. CI/CD Integration

Set up a Continuous Integration/Continuous Deployment (CI/CD) pipeline to automate testing, building, and deployment. The `.github/workflows/ci_cd.yml` file provides an example using GitHub Actions.

**Typical CI/CD Workflow:**

1.  **Code Commit:** Developer pushes code to a Git repository.
2.  **CI Trigger:** CI system (e.g., GitHub Actions, Jenkins, GitLab CI) triggers.
3.  **Build:** Build Docker image.
4.  **Test:** Run unit, integration, and API tests. Check code coverage.
5.  **Security Scan (Optional):** Scan code/dependencies for vulnerabilities.
6.  **Push to Registry:** If tests pass, push the Docker image to a container registry.
7.  **CD Trigger:** If image push is successful, trigger deployment to staging/production.
8.  **Deployment:**
    *   Run database migrations (as a job).
    *   Update application deployment (e.g., Kubernetes Deployment, ECS Service).
    *   Perform health checks.
9.  **Notifications:** Notify relevant teams of deployment status.

## 9. Monitoring & Logging

*   **Logging:** The application uses Python's standard `logging` module with custom request IDs.
    *   In production, configure logs to be sent to a centralized logging system (e.g., ELK Stack, Splunk, Datadog, AWS CloudWatch Logs, GCP Cloud Logging).
*   **Metrics:** Collect application metrics (e.g., request count, latency, error rates, CPU/memory usage of containers).
    *   Use Prometheus for collection and Grafana for visualization. FastAPI can expose Prometheus metrics.
    *   Cloud providers offer their own monitoring services (e.g., AWS CloudWatch, GCP Monitoring).
*   **Alerting:** Set up alerts for critical errors, high latency, low resource availability, or failed deployments.

## 10. Security Best Practices

*   **HTTPS Everywhere:** Always use HTTPS for all communication.
*   **Secrets Management:** Never hardcode secrets. Use environment variables and integrate with a dedicated secrets management service (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, HashiCorp Vault).
*   **Least Privilege:** Grant only necessary permissions to database users, API keys, and service accounts.
*   **Network Security:** Configure firewalls and security groups to restrict network access to your services.
*   **Regular Updates:** Keep all dependencies (OS, Python, libraries, Docker images) updated to patch security vulnerabilities.
*   **Vulnerability Scanning:** Regularly scan your Docker images and dependencies for known vulnerabilities.
*   **Backup & Restore:** Implement a robust database backup strategy and test restoration procedures.
*   **Input Validation:** Continue to rely on Pydantic for strict input validation to prevent injection attacks and other vulnerabilities.

## 11. Troubleshooting

*   **Check container logs:** `docker-compose logs -f app` or `kubectl logs -f <pod-name>`
*   **Verify network connectivity:** Ensure your application container can reach the database and Redis instances.
*   **Review environment variables:** Double-check that all production environment variables are correctly set.
*   **Test database connection:** Try to connect to your database from the app container shell (e.g., `psql -h <host> -U <user> -d <db>`).
*   **Alembic issues:** If you suspect migration problems, check the `alembic_version` table in your database.
*   **Redis connection:** Verify Redis is accessible and working.
```