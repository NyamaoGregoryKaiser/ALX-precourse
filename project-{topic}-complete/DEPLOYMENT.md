```markdown
# Task Management System Deployment Guide

This document outlines the steps for deploying the Task Management System to a production environment. The recommended approach involves Docker and a container orchestration service, but generic steps are provided for flexibility.

## Table of Contents

1.  [Deployment Strategy Overview](#1-deployment-strategy-overview)
2.  [Prerequisites](#2-prerequisites)
3.  [Configuration for Production](#3-configuration-for-production)
4.  [Deployment Steps](#4-deployment-steps)
    *   [Build and Push Docker Image](#41-build-and-push-docker-image)
    *   [Set up Infrastructure](#42-set-up-infrastructure)
    *   [Database Setup](#43-database-setup)
    *   [Deploy Application Containers](#44-deploy-application-containers)
    *   [Nginx Reverse Proxy / Load Balancer](#45-nginx-reverse-proxy--load-balancer)
    *   [Monitoring & Logging](#46-monitoring--logging)
5.  [CI/CD for Deployment](#5-cicd-for-deployment)
6.  [Post-Deployment Checks](#6-post-deployment-checks)

## 1. Deployment Strategy Overview

The recommended deployment strategy involves:
*   **Containerization**: Docker for packaging the application and its dependencies.
*   **Orchestration**: A container orchestration platform (e.g., Docker Swarm, Kubernetes, AWS ECS, Google Cloud Run) for managing and scaling containers.
*   **Database**: Managed PostgreSQL instance (e.g., AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL) for reliability and data persistence.
*   **Caching/Rate Limiting**: Managed Redis instance.
*   **Reverse Proxy/Load Balancer**: Nginx or a cloud-provider load balancer (e.g., AWS ALB) for traffic distribution, SSL termination, and static file serving.
*   **Gunicorn**: Production-grade WSGI HTTP server for running the Flask application.

## 2. Prerequisites

*   A server or cloud account where you can deploy Docker containers (e.g., AWS EC2, DigitalOcean Droplet, GCP Compute Engine).
*   Domain name configured with DNS records pointing to your server/load balancer.
*   SSL/TLS certificate (e.g., Let's Encrypt, cloud provider certificate manager) for HTTPS.
*   Familiarity with Docker, Docker Compose (for local orchestration), and your chosen cloud provider's services.

## 3. Configuration for Production

Before building your production image, ensure your Flask application is configured for production:

1.  **Environment Variables**:
    Create a `.env` file or directly configure environment variables on your production server/orchestration platform. These **MUST** be strong and unique.
    ```env
    FLASK_ENV=production
    DATABASE_URL=postgresql://<prod_user>:<prod_password>@<prod_db_host>:<prod_db_port>/<prod_db_name>
    SECRET_KEY=VERY_LONG_RANDOM_STRING_FOR_FLASK_SESSIONS
    JWT_SECRET_KEY=ANOTHER_VERY_LONG_RANDOM_STRING_FOR_JWT_SIGNATURES
    REDIS_URL=redis://<prod_redis_host>:<prod_redis_port>/0
    LOG_LEVEL=INFO # Or WARNING/ERROR for less verbose logs
    SENTRY_DSN=https://examplepublickey@o0.ingest.sentry.io/exampleproject # Your Sentry DSN (for error monitoring)
    ```
    *   Replace placeholders with actual production values.
    *   `DATABASE_URL` and `REDIS_URL` should point to your managed cloud instances.
    *   `SECRET_KEY` and `JWT_SECRET_KEY` are critical for security; generate them securely.

2.  **Gunicorn**:
    The `Dockerfile` is set up to use Gunicorn:
    ```dockerfile
    CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "manage:app"]
    ```
    *   `-w 4`: Runs 4 worker processes. Adjust based on your server's CPU cores and memory. A common rule is `(2 * CPU_CORES) + 1`.
    *   `-b 0.0.0.0:5000`: Binds to all interfaces on port 5000. This is typically exposed to a reverse proxy, not directly to the internet.

3.  **Database URL in `config.py`**:
    The `ProductionConfig` in `app/config.py` explicitly requires `DATABASE_URL` to be set, raising an error if it's missing.

## 4. Deployment Steps

### 4.1. Build and Push Docker Image

1.  **Build the Docker image locally (or via CI/CD):**
    ```bash
    docker build -t task-manager-app:latest .
    ```
2.  **Tag the image for your registry:**
    Replace `<your-docker-registry>` (e.g., `yourusername/` for Docker Hub, or your ECR/GCR repository URL) with your actual registry.
    ```bash
    docker tag task-manager-app:latest <your-docker-registry>/task-manager-app:latest
    ```
3.  **Log in to your Docker registry:**
    ```bash
    docker login <your-docker-registry-host>
    ```
4.  **Push the image to your registry:**
    ```bash
    docker push <your-docker-registry>/task-manager-app:latest
    ```

### 4.2. Set up Infrastructure

Provision the following resources using your cloud provider (e.g., AWS, Azure, GCP):

1.  **Virtual Machine(s) / Container Instance(s)**: Where your Docker containers will run.
2.  **Managed PostgreSQL Database**:
    *   Create a new PostgreSQL instance.
    *   Configure security groups/firewall rules to allow connections from your application instances.
    *   Note down the host, port, username, and password for `DATABASE_URL`.
3.  **Managed Redis Instance**:
    *   Create a new Redis instance.
    *   Configure security groups/firewall rules to allow connections from your application instances.
    *   Note down the host and port for `REDIS_URL`.
4.  **Load Balancer (Optional but Recommended)**:
    *   Set up an Application Load Balancer (ALB) or equivalent to distribute traffic across multiple application instances and handle SSL termination.

### 4.3. Database Setup

1.  **Run Migrations**:
    On your production server or during your CI/CD process, run the database migrations against your production database. This ensures the schema is up-to-date.

    ```bash
    # Ensure FLASK_APP and DATABASE_URL are set in environment
    export FLASK_APP=manage.py
    export DATABASE_URL=postgresql://<prod_user>:<prod_password>@<prod_db_host>:<prod_db_port>/<prod_db_name>

    # Pull your application image to run migrations
    docker pull <your-docker-registry>/task-manager-app:latest

    # Run migrations using the Docker image
    docker run --rm \
      -e DATABASE_URL=$DATABASE_URL \
      -e FLASK_APP=$FLASK_APP \
      <your-docker-registry>/task-manager-app:latest flask db_commands upgrade_db
    ```

2.  **Seed Data (Optional)**:
    If your application requires initial data, run the seed command. **Be careful not to re-seed an existing production database.**
    ```bash
    docker run --rm \
      -e DATABASE_URL=$DATABASE_URL \
      -e FLASK_APP=$FLASK_APP \
      <your-docker-registry>/task-manager-app:latest flask seed # Omit --force unless you explicitly want to recreate
    ```

### 4.4. Deploy Application Containers

Use your chosen container orchestration platform (Kubernetes, ECS, Docker Swarm) to deploy the `task-manager-app` image.

**Example for a single Docker container deployment (not recommended for high availability):**

```bash
# On your server, make sure you have Docker installed
# Pull the image
docker pull <your-docker-registry>/task-manager-app:latest

# Run the container, passing production environment variables
docker run -d \
  --name task-manager-app \
  -p 5000:5000 \
  -e FLASK_ENV=production \
  -e DATABASE_URL="postgresql://<prod_user>:<prod_password>@<prod_db_host>:<prod_db_port>/<prod_db_name>" \
  -e SECRET_KEY="VERY_LONG_RANDOM_STRING_FOR_FLASK_SESSIONS" \
  -e JWT_SECRET_KEY="ANOTHER_VERY_LONG_RANDOM_STRING_FOR_JWT_SIGNATURES" \
  -e REDIS_URL="redis://<prod_redis_host>:<prod_redis_port>/0" \
  -e LOG_LEVEL=INFO \
  -e SENTRY_DSN="your_sentry_dsn_here" \
  <your-docker-registry>/task-manager-app:latest
```
*   **Important**: In a real production setup, you would use a dedicated secrets management service (e.g., AWS Secrets Manager, Vault) instead of passing sensitive data directly as environment variables in the `docker run` command.

### 4.5. Nginx Reverse Proxy / Load Balancer

Configure Nginx (or your cloud provider's load balancer) to:
*   Listen on port 80 (HTTP) and 443 (HTTPS).
*   Redirect HTTP to HTTPS.
*   Terminate SSL/TLS (you'll need your SSL certificate files).
*   Proxy requests to your Flask application container(s) running on port 5000.
*   Serve static files directly (e.g., `/static/`).

**Example Nginx configuration (`/etc/nginx/sites-available/task_manager.conf`):**

```nginx
server {
    listen 80;
    server_name your_domain.com www.your_domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your_domain.com www.your_domain.com;

    ssl_certificate /etc/letsencrypt/live/your_domain.com/fullchain.pem; # Your SSL cert
    ssl_certificate_key /etc/letsencrypt/live/your_domain.com/privkey.pem; # Your SSL key

    location /static/ {
        alias /path/to/your/app/static/; # Path where your Flask app's static files are mounted or served
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    location / {
        proxy_pass http://localhost:5000; # Or your internal app IP/load balancer endpoint
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
        proxy_connect_timeout 90;
        proxy_send_timeout 90;
    }
}
```
*   Replace `your_domain.com` and `/path/to/your/app/static/` with your actual values.
*   Ensure Nginx can reach your Flask app (e.g., `localhost:5000` if running on the same host, or internal network IP if in separate containers/VMs).

### 4.6. Monitoring & Logging

*   **Centralized Logging**: Integrate your application logs with a centralized logging solution (e.g., ELK Stack, Splunk, cloud provider logging services like CloudWatch Logs, Logz.io).
*   **Error Tracking**: Ensure Sentry is configured with your DSN in production.
*   **Application Performance Monitoring (APM)**: Consider tools like Datadog, New Relic, or Prometheus/Grafana for monitoring application metrics, resource utilization, and response times.

## 5. CI/CD for Deployment

The `.github/workflows/main.yml` file provides a basic CI/CD pipeline configuration.

**Key steps in the CI/CD deployment job:**
1.  **Checkout Code**: Fetches the latest code from the `main` branch.
2.  **Authenticate to Cloud Provider**: Sets up credentials for your cloud environment (e.g., AWS, Azure, GCP).
3.  **Docker Login**: Logs into your container registry (e.g., Docker Hub, ECR).
4.  **Build & Push Image**: Builds the production Docker image and pushes it to the registry.
5.  **Deployment Command**: Executes the command to deploy the new image to your orchestration service. This is highly specific to your chosen platform (e.g., `kubectl apply`, `aws ecs update-service`, `gcloud run deploy`).

**Customize the `deploy` job in `main.yml` to match your specific cloud environment and deployment tools.**

## 6. Post-Deployment Checks

1.  **Access the application**: Visit `https://your_domain.com` in your browser.
2.  **Verify API endpoints**: Use `curl` or Postman to test core API functionalities (login, create task, get tasks).
3.  **Check logs**: Monitor application logs for any errors or warnings.
4.  **Database connectivity**: Ensure the application can connect to and query the production database.
5.  **Caching**: Verify Redis is being used for cached endpoints.
6.  **Rate Limiting**: Test rate-limited endpoints to ensure they function correctly.
7.  **Sentry**: Check Sentry for any new error reports.
8.  **Scalability**: If using an orchestration platform, verify that multiple instances of your application are running and traffic is being distributed correctly.
```