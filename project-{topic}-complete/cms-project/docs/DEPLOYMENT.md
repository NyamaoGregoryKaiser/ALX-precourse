# CMS Project Deployment Guide

This document provides a comprehensive guide for deploying the CMS project to a production environment. The recommended deployment strategy involves Docker containers orchestrated by a platform like Kubernetes or AWS ECS/Fargate, fronted by a web server (Nginx) and a load balancer for scalability and security.

## 1. Prerequisites

Before deployment, ensure you have:
*   A cloud provider account (e.g., AWS, GCP, Azure) or a server with Docker/Docker Compose installed.
*   `git` installed for cloning the repository.
*   `docker` and `docker-compose` installed locally (for testing the deployment locally).
*   DNS configuration ready to point your domain to the deployed application.
*   An SSL/TLS certificate for HTTPS (e.g., Let's Encrypt, commercial cert).

## 2. Environment Variables

Sensitive information and environment-specific settings must be configured properly. **DO NOT commit `.env` files to your repository.**

Create a production `.env` file on your deployment target(s) or use your cloud provider's secret management service.

```env
# Production .env example
FLASK_ENV=production
SECRET_KEY=YOUR_LONG_RANDOM_SECRET_KEY_FOR_FLASK_SESSIONS # REQUIRED, generate with `os.urandom(24)` or similar
JWT_SECRET_KEY=YOUR_LONG_RANDOM_SECRET_KEY_FOR_JWT_TOKENS # REQUIRED, generate a strong, unique key
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME # REQUIRED, e.g., from AWS RDS
CACHE_TYPE=redis # Recommended for production
CACHE_REDIS_URL=redis://REDIS_HOST:6379/0 # REQUIRED if CACHE_TYPE=redis
RATELIMIT_STORAGE_URL=redis://REDIS_HOST:6379/1 # REQUIRED for persistent rate limiting
LOG_LEVEL=INFO # INFO, WARNING, ERROR, CRITICAL
```

**Key considerations:**
*   **`SECRET_KEY` and `JWT_SECRET_KEY`**: Must be strong, unique, and kept secret. Never reuse these.
*   **`DATABASE_URL`**: Point to your managed PostgreSQL instance (e.g., AWS RDS, Azure Database for PostgreSQL). Do not use `db:5432` from `docker-compose.yml` in production unless your DB is also in a container on the same network.
*   **`CACHE_REDIS_URL` and `RATELIMIT_STORAGE_URL`**: Point to your managed Redis instance (e.g., AWS ElastiCache, Azure Cache for Redis).

## 3. Database Setup

In production, it's highly recommended to use a managed database service to ensure high availability, backups, and scalability.

1.  **Provision PostgreSQL Instance:** Set up a PostgreSQL database instance on your chosen cloud provider (e.g., AWS RDS, Google Cloud SQL for PostgreSQL, Azure Database for PostgreSQL).
2.  **Create Database and User:** Create the `cms_db` database and a dedicated `cmsuser` with a strong password. Grant necessary permissions.
3.  **Update `DATABASE_URL`:** Configure your `DATABASE_URL` in the production environment variables to point to this managed instance.
4.  **Initial Migration:** After the application container is deployed and running, connect to it (e.g., `docker exec -it <app_container_id> bash` or via Kubernetes `kubectl exec`) and run the migrations:
    ```bash
    flask db upgrade
    ```
5.  **Seed Data (Optional):** If you need initial data, run the seed script:
    ```bash
    python seed.py
    ```

## 4. Containerized Deployment (Docker/Docker Compose)

The provided `Dockerfile` and `docker-compose.yml` are excellent starting points for local development and can be adapted for production.

### 4.1. Local Production-like Test with Docker Compose

To test the production setup locally before deploying to a cloud platform:

1.  **Build Images:**
    ```bash
    docker-compose build
    ```
2.  **Run Services:**
    ```bash
    docker-compose up -d
    ```
    This will start the `app` and `db` services. Ensure your local `.env` reflects production-like settings (e.g., `FLASK_ENV=production`).
3.  **Run Migrations & Seed:**
    ```bash
    docker-compose exec app flask db upgrade
    docker-compose exec app python seed.py
    ```
4.  **Access:** The application will be available at `http://localhost:5000`.

### 4.2. Deployment to Cloud Container Orchestration (e.g., Kubernetes, AWS ECS)

For true production, `docker-compose` is typically replaced by an orchestration service.

1.  **Build and Push Docker Image:**
    ```bash
    docker build -t your-dockerhub-username/cms-project:latest .
    docker push your-dockerhub-username/cms-project:latest
    ```
    Replace `your-dockerhub-username` with your Docker Hub username or an AWS ECR/GCR repository.
2.  **Update `docker-compose.yml` for Cloud (if using ECS Fargate, etc.):**
    If using services like AWS ECS, you might adapt `docker-compose.yml` to be used with `ecs-cli compose` or convert it to Kubernetes manifests.
3.  **Deploy Application Container:**
    *   **Kubernetes:** Create `Deployment` and `Service` YAMLs for your Flask app, PostgreSQL, and Redis. Manage secrets using Kubernetes Secrets.
    *   **AWS ECS/Fargate:** Define an ECS Task Definition that references your Docker image and environment variables (from AWS Secrets Manager or Parameter Store). Create an ECS Service to run and scale your tasks.
4.  **Database Connection:** Ensure the application container can connect to your managed PostgreSQL instance (e.g., proper security groups, network ACLs, VPC configuration).
5.  **Redis Cache/Rate Limiter:** Provision a managed Redis instance (e.g., AWS ElastiCache). Configure your app's environment variables to point to it.
6.  **Load Balancer (e.g., AWS ALB, Nginx Ingress):**
    *   Place a Load Balancer in front of your Flask application containers.
    *   Configure it for HTTP to HTTPS redirection.
    *   Attach your SSL/TLS certificate.
    *   Distribute traffic across multiple instances of your Flask app for high availability and scalability.
7.  **Web Server (Nginx - Optional but Recommended):**
    *   Even with a load balancer, an Nginx reverse proxy *within* your application container (or as a sidecar) can handle static file serving, additional caching, and request filtering.
    *   The provided `start.sh` uses Gunicorn directly; Nginx would typically sit in front of Gunicorn. For simplicity, we are assuming the load balancer handles external traffic, and Gunicorn is directly exposed to it.
8.  **Run Migrations and Seed Data:**
    *   This is a crucial step after initial deployment. You can execute this as a one-off command in your orchestration system (e.g., Kubernetes Job, ECS Run Task).
    *   ```bash
        # Example for Docker (replace with your container ID)
        docker exec -it <app_container_id> flask db upgrade
        docker exec -it <app_container_id> python seed.py
        ```
    *   Ensure this runs *after* the database is accessible.

## 5. CI/CD Integration

The `.github/workflows/main.yml` demonstrates a basic CI pipeline. For production, extend it to:

1.  **Build Docker Image:** After successful tests, build the production Docker image.
2.  **Tag Image:** Tag the image with a version (e.g., `v1.0.0`) or Git SHA.
3.  **Push to Registry:** Push the tagged image to a Docker registry (Docker Hub, AWS ECR, GCP Container Registry).
4.  **Deployment Trigger:** On successful push to `main` branch:
    *   Trigger an automatic deployment to your staging environment.
    *   After manual approval, trigger deployment to production.
    *   This typically involves updating your Kubernetes Deployment, ECS Task Definition, or similar orchestration configuration to point to the new image tag.
    *   Perform rolling updates to ensure zero downtime.

## 6. Monitoring and Alerting

*   **Application Logs:** Configure your Flask application to send logs to a centralized logging service (e.g., AWS CloudWatch Logs, ELK Stack, Splunk). Use `LOG_LEVEL=INFO` or `WARNING` in production.
*   **System Metrics:** Monitor CPU, memory, network I/O of your containers and database instances.
*   **Application Performance Monitoring (APM):** Integrate APM tools (e.g., New Relic, Datadog, Sentry) to track request latency, error rates, and bottlenecks.
*   **Database Metrics:** Monitor database connections, query performance, and storage utilization.
*   **Alerting:** Set up alerts for critical errors, high resource usage, and service outages.

## 7. Security Best Practices

*   **HTTPS Everywhere:** Always enforce HTTPS for all traffic.
*   **Least Privilege:** Configure IAM roles/service accounts for your containers and database with the minimum necessary permissions.
*   **Network Segmentation:** Use VPCs, subnets, security groups, and network ACLs to restrict network access between components.
*   **Secrets Management:** Use dedicated secret management services (e.g., AWS Secrets Manager, HashiCorp Vault, Kubernetes Secrets) instead of embedding secrets in environment variables directly (though `dotenv` is fine for local dev).
*   **Regular Updates:** Keep your base images, Python dependencies, and system packages updated to patch security vulnerabilities.
*   **Penetration Testing:** Periodically conduct security audits and penetration tests.
*   **Backup and Recovery:** Implement a robust backup and disaster recovery plan for your database and any persistent storage.

By following these guidelines, you can successfully deploy and operate your CMS project in a secure, scalable, and reliable production environment.