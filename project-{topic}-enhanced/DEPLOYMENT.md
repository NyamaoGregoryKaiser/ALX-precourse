```markdown
# DBOptiFlow Deployment Guide

This document outlines the steps and considerations for deploying the DBOptiFlow system to a production environment. While the project uses Docker Compose for local development, a production deployment would typically leverage more robust infrastructure.

## Table of Contents

1.  [Deployment Strategy Overview](#1-deployment-strategy-overview)
2.  [Prerequisites for Production Environment](#2-prerequisites-for-production-environment)
3.  [Build and Push Docker Images](#3-build-and-push-docker-images)
4.  [Environment Variables and Secrets Management](#4-environment-variables-and-secrets-management)
5.  [Database Setup](#5-database-setup)
6.  [Caching Layer (Redis) Setup](#6-caching-layer-redis-setup)
7.  [Container Orchestration (Kubernetes/ECS/Swarm)](#7-container-orchestration-kubernetecs-swarm)
    *   [Example: Manual Docker Compose on a VM](#71-example-manual-docker-compose-on-a-vm)
8.  [Web Server and Load Balancing](#8-web-server-and-load-balancing)
9.  [HTTPS Configuration](#9-https-configuration)
10. [Monitoring and Logging](#10-monitoring-and-logging)
11. [CI/CD Pipeline Integration](#11-ci/cd-pipeline-integration)
12. [Post-Deployment Checks](#12-post-deployment-checks)

---

## 1. Deployment Strategy Overview

DBOptiFlow is designed for containerized deployment. A typical production setup would involve:

*   **Container Images:** Backend and Frontend packaged as Docker images.
*   **Orchestration:** Using a container orchestration platform (e.g., Kubernetes, AWS ECS, Docker Swarm) for managing deployment, scaling, and high availability.
*   **Managed Services:** Leveraging cloud provider managed services for PostgreSQL and Redis for reliability, backups, and ease of management.
*   **Load Balancer:** Distributing incoming traffic across multiple instances of the frontend/backend.
*   **HTTPS:** All traffic secured with SSL/TLS.
*   **Centralized Logging & Monitoring:** Aggregating logs and metrics for operational visibility.

## 2. Prerequisites for Production Environment

Before deploying, ensure you have:

*   **Cloud Provider Account:** (e.g., AWS, Azure, GCP) or a dedicated server/VM.
*   **Docker & Docker Compose:** Installed if deploying manually on a VM.
*   **Container Registry:** (e.g., Docker Hub, AWS ECR, GCP Container Registry) to store your built Docker images.
*   **DNS Management:** A registered domain name pointing to your deployment.
*   **SSL/TLS Certificate:** For HTTPS (e.g., Let's Encrypt).
*   **SSH Access:** To your deployment server(s).
*   **Database and Redis Instances:** Provisioned and accessible.

## 3. Build and Push Docker Images

The CI/CD pipeline (described in `README.md` and `.github/workflows/ci-cd.yml`) automates this. If deploying manually:

1.  **Build Backend Image:**
    ```bash
    cd db-optiflow/backend
    docker build -t your-docker-username/db-optiflow-backend:latest .
    ```
2.  **Build Frontend Image:**
    ```bash
    cd db-optiflow/frontend
    # Pass VITE_API_BASE_URL as a build-arg to ensure the frontend build includes the correct API endpoint
    docker build -t your-docker-username/db-optiflow-frontend:latest --build-arg VITE_API_BASE_URL=https://api.yourdomain.com/api .
    ```
    Replace `https://api.yourdomain.com/api` with your actual production backend API URL.

3.  **Push Images to Registry:**
    ```bash
    docker push your-docker-username/db-optiflow-backend:latest
    docker push your-docker-username/db-optiflow-frontend:latest
    ```
    Ensure you are logged into your Docker registry (`docker login`).

## 4. Environment Variables and Secrets Management

**DO NOT store sensitive information (like database passwords, JWT secrets) directly in your repository or Docker images.**

*   **`.env` file:** Suitable for local development. In production, environment variables should be set directly in your orchestration platform (Kubernetes Secrets, AWS SSM Parameter Store, ECS Task Definitions, etc.).
*   **Secrets Management:**
    *   **Database Credentials:** Instead of storing in `.env`, use a dedicated secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault, Azure Key Vault) or inject them directly into your container's environment from your orchestration platform.
    *   **JWT Secrets:** Same as database credentials.
*   **Update `backend/.env.example` values:** Ensure the production values for `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `REDIS_HOST`, `REDIS_PORT`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` reflect your production infrastructure.
    *   `DB_HOST` will be the endpoint of your managed PostgreSQL instance.
    *   `REDIS_HOST` will be the endpoint of your managed Redis instance.

## 5. Database Setup (PostgreSQL)

It's highly recommended to use a **managed PostgreSQL service** (e.g., AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL) for production due to built-in backups, replication, scaling, and maintenance.

1.  **Provision Managed PostgreSQL:** Create an instance with appropriate compute and storage.
2.  **Configure Security Group/Firewall:** Allow inbound connections to the PostgreSQL port (5432) only from your application servers/containers.
3.  **Create Database and User:** Create the `dbopti_db` database and `dbopti_user` with a strong password as defined in your environment variables.
4.  **Run Migrations:**
    *   The `Dockerfile` for the backend includes `npm run migration:run` in its `CMD`. When the backend container starts in production, it will automatically apply pending migrations.
    *   Alternatively, you can run migrations manually from a temporary container or a dedicated CI/CD step:
        ```bash
        # Example using a temporary container, replace with your image
        docker run --rm \
            -e DB_HOST=your.prod.db.endpoint \
            -e DB_PORT=5432 \
            -e DB_USER=dbopti_user \
            -e DB_PASSWORD=your_prod_password \
            -e DB_NAME=dbopti_db \
            your-docker-username/db-optiflow-backend:latest npm run migration:run
        ```
5.  **Seed Data (Optional):** If you need initial data, run the seed script:
    ```bash
    # Similar to migrations, either via a temporary container or CI/CD
    docker run --rm \
        # ... environment variables ...
        your-docker-username/db-optiflow-backend:latest npm run seed
    ```

## 6. Caching Layer (Redis) Setup

Similar to PostgreSQL, use a **managed Redis service** (e.g., AWS ElastiCache, Azure Cache for Redis, Google Cloud Memorystore) for production.

1.  **Provision Managed Redis:** Create an instance.
2.  **Configure Security Group/Firewall:** Allow inbound connections to the Redis port (6379) only from your application servers/containers.
3.  **Password (Optional but Recommended):** Configure Redis with a strong password if your managed service supports it. Update `REDIS_PASSWORD` in your environment.

## 7. Container Orchestration

### 7.1. Example: Manual Docker Compose on a VM (for simpler deployments)

While not as robust as Kubernetes, Docker Compose can be used for simpler production deployments on a single VM.

1.  **Provision a Linux VM:** Choose a suitable instance type (e.g., t3.medium on AWS) with Docker installed.
2.  **SSH into the VM.**
3.  **Create Project Directory:**
    ```bash
    mkdir db-optiflow-prod
    cd db-optiflow-prod
    ```
4.  **Create `docker-compose.yml`:** Copy the `docker-compose.yml` from the root of your project into this directory.
    *   **Important:** Modify `image` fields to point to your Docker registry images (e.g., `image: your-docker-username/db-optiflow-backend:latest`).
    *   **Remove `db-optiflow-postgres` and `db-optiflow-redis` services** if you are using managed cloud services, and ensure backend/frontend `env_file` points to your managed service endpoints.
5.  **Create `.env` file:** Copy your production `.env` file here. Ensure it has correct endpoints for your managed DB/Redis.
6.  **Create `nginx.conf`:** Copy `frontend/nginx.conf` to this directory.
    *   **Modify proxy_pass:** Update `proxy_pass http://db-optiflow-backend:5000/api/` to `proxy_pass http://localhost:5000/api/` if the backend is running on the same host, or `proxy_pass http://your-backend-internal-ip:5000/api/` if backend is on another internal IP/container name.
    *   **Update `VITE_API_BASE_URL` in frontend build args** to point to your public API endpoint.
7.  **Pull Images and Start Services:**
    ```bash
    docker compose pull
    docker compose up -d
    ```

**For Kubernetes, AWS ECS/EKS, Azure AKS, or GCP GKE:**
This requires writing Kubernetes manifests (Deployments, Services, Ingress, Secrets) or using cloud-specific task definitions. This is beyond the scope of this document but is the recommended approach for enterprise production deployments.

## 8. Web Server and Load Balancing

*   **Frontend:** The `frontend/Dockerfile` uses Nginx to serve the static React application. Nginx also acts as a reverse proxy to forward API requests to the backend.
*   **Load Balancer:** In a production environment with multiple instances, an external load balancer (e.g., AWS ALB, Nginx Proxy Manager, Cloudflare) would distribute traffic to your frontend containers and provide SSL termination.

## 9. HTTPS Configuration

**Always use HTTPS in production.**

*   If using an external load balancer, configure SSL/TLS termination on the load balancer itself.
*   If deploying on a single VM with Nginx:
    *   Obtain an SSL certificate (e.g., from Let's Encrypt using Certbot).
    *   Mount the certificates into the Nginx container.
    *   Modify `nginx.conf` to listen on port 443, use your certificates, and redirect HTTP to HTTPS.

    Example `nginx.conf` snippet for HTTPS (within `server` block):
    ```nginx
    listen 443 ssl;
    ssl_certificate /etc/nginx/certs/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/yourdomain.com/privkey.pem;
    # ... other SSL/TLS settings
    ```
    You'd need to mount `/etc/nginx/certs` as a Docker volume containing your certificates.

## 10. Monitoring and Logging

*   **Centralized Logging:** Configure your containers to send logs to a centralized logging system (e.g., ELK Stack, Grafana Loki, AWS CloudWatch Logs, Datadog). Winston (used in backend) can be configured to send logs to various transports.
*   **Application Monitoring:**
    *   Integrate with APM tools (e.g., New Relic, Datadog, Dynatrace) for detailed performance metrics.
    *   Consider Prometheus and Grafana for collecting and visualizing custom application metrics.
*   **Infrastructure Monitoring:** Monitor the health and performance of your VM instances, Docker containers, PostgreSQL, and Redis instances.

## 11. CI/CD Pipeline Integration

The provided `.github/workflows/ci-cd.yml` demonstrates a basic CI/CD pipeline. For production:

*   **Secrets:** Configure GitHub Secrets for `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `PROD_SSH_HOST`, `PROD_SSH_USER`, `PROD_SSH_PRIVATE_KEY`, and `STAGING_SSH_HOST`, `STAGING_SSH_USER`, `STAGING_SSH_PRIVATE_KEY`.
*   **Environment Variables:** Configure GitHub Variables for `VITE_API_BASE_URL` specific to staging and production.
*   **Deployment Script:** Enhance the SSH deployment script to handle graceful restarts, blue/green deployments, or rolling updates if using advanced orchestration.

## 12. Post-Deployment Checks

After deploying, perform these checks:

*   **Access Frontend:** Verify `https://yourdomain.com` loads correctly.
*   **Access API Docs:** Verify `https://api.yourdomain.com/api-docs` is accessible.
*   **Login & Register:** Test user authentication.
*   **CRUD Operations:** Test adding a new `DbConnection`, viewing recommendations, etc.
*   **Check Logs:** Monitor application logs for any errors or warnings.
*   **Performance:** Run your `k6` performance tests against the deployed environment.
*   **Security Scan:** Run vulnerability scans against your deployed application.

By following this guide, you can confidently deploy DBOptiFlow to a robust and scalable production environment.
```