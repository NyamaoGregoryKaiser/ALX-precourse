```markdown
# Deployment Guide

This document provides a general guide for deploying the ALX Comprehensive CMS. The project is designed for containerized deployment using Docker. We'll cover local Docker Compose deployment and conceptual steps for production environments.

## Table of Contents

1.  [Local Deployment with Docker Compose](#1-local-deployment-with-docker-compose)
2.  [Production Deployment Strategy](#2-production-deployment-strategy)
    *   [Prerequisites for Production](#prerequisites-for-production)
    *   [Build and Push Docker Images](#build-and-push-docker-images)
    *   [Environment Variable Management](#environment-variable-management)
    *   [Database Setup](#database-setup)
    *   [Deployment to a Single VM (using Docker Compose)](#deployment-to-a-single-vm-using-docker-compose)
    *   [Deployment with Kubernetes / Container Orchestration](#deployment-with-kubernetes--container-orchestration)
    *   [Post-Deployment Steps](#post-deployment-steps)
3.  [CI/CD Integration](#3-cicd-integration)
4.  [Security Best Practices](#4-security-best-practices)
5.  [Troubleshooting Deployment](#5-troubleshooting-deployment)

---

## 1. Local Deployment with Docker Compose

This is the fastest way to get the entire application stack running on your local machine.

1.  **Ensure Docker and Docker Compose are installed:**
    *   [Docker Desktop](https://www.docker.com/products/docker-desktop) (includes Compose)
2.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/alx-cms.git
    cd alx-cms
    ```
3.  **Configure environment variables:**
    *   Create `backend/.env` from `backend/.env.example`
    *   Create `frontend/.env` from `frontend/.env.example`
    *   **Important:** Update `JWT_SECRET` in `backend/.env` with a strong, unique value.
    *   Ensure `REACT_APP_BACKEND_URL` in `frontend/.env` points to `http://localhost:3000`.
4.  **Run Docker Compose:**
    ```bash
    docker-compose up --build -d
    ```
    This command will:
    *   Build the Docker images for backend and frontend.
    *   Start a PostgreSQL database container.
    *   Start the backend container, which will automatically run TypeORM migrations and seed initial data (if the database is empty).
    *   Start the frontend (Nginx) container, serving the React app.
5.  **Access the application:**
    *   **Frontend (Admin Panel):** `http://localhost:80`
    *   **Backend API:** `http://localhost:3000`
    *   **Swagger API Docs:** `http://localhost:3000/api-docs`
    *   **Initial Admin Credentials:** `admin@example.com` / `adminpassword`

## 2. Production Deployment Strategy

For a production environment, simply running `docker-compose` on a developer's machine is insufficient. A robust strategy involves a container registry, a managed database, and an orchestration platform.

### Prerequisites for Production

*   **Cloud Provider Account:** AWS, GCP, Azure, DigitalOcean, etc.
*   **Domain Name:** Configured with DNS records pointing to your deployment.
*   **SSL/TLS Certificate:** Essential for securing traffic (e.g., Let's Encrypt).
*   **Container Registry:** (e.g., Docker Hub, AWS ECR, GCP GCR, GitLab Container Registry)
*   **SSH Access:** To your servers if managing VMs directly.

### Build and Push Docker Images

Before deploying, you need to build optimized production images and push them to a container registry. This is often handled by CI/CD.

1.  **Build Production Images locally (if not using CI/CD):**
    ```bash
    # From project root
    docker build -t your-registry/cms-backend:latest -f backend/Dockerfile ./backend
    docker build -t your-registry/cms-frontend:latest -f frontend/Dockerfile --build-arg REACT_APP_BACKEND_URL=https://api.yourdomain.com ./frontend
    ```
    *   **Important:** Replace `your-registry` and `yourdomain.com` with your actual registry and domain. Ensure `REACT_APP_BACKEND_URL` in the frontend build ARG points to your *publicly accessible* backend API URL.

2.  **Log in to your Container Registry:**
    ```bash
    docker login your-registry-url
    ```

3.  **Push Images:**
    ```bash
    docker push your-registry/cms-backend:latest
    docker push your-registry/cms-frontend:latest
    ```

### Environment Variable Management

*   **NEVER** hardcode secrets in your code or Dockerfiles.
*   **Cloud Provider Secrets Management:** Use AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, HashiCorp Vault, or similar.
*   **Orchestrator Secrets:** Kubernetes Secrets, Docker Swarm Secrets.
*   **`.env` files:** Can be used for simple VM deployments but require careful management of access.

### Database Setup

For production, avoid running PostgreSQL in Docker Compose on the same host as your application containers unless it's a very small-scale project.

*   **Managed Database Service:**
    *   **AWS RDS (PostgreSQL):** Highly recommended for scalability, backups, and maintenance.
    *   **Google Cloud SQL (PostgreSQL):** Similar managed service for GCP.
    *   **Azure Database for PostgreSQL:** For Azure users.
    *   **DigitalOcean Managed Databases:** Cost-effective for smaller deployments.
*   **Configuration:** Configure your backend's `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, and `DATABASE_NAME` environment variables to connect to your managed database instance.
*   **Migrations & Seeding:** Run migrations (`npm run migration:run`) and seeds (`npm run seed:run`) as part of your deployment process, typically as a pre-deploy hook or a one-off command on a fresh database.

### Deployment to a Single VM (using Docker Compose)

This is a simpler production deployment often used for small to medium-sized applications or staging environments.

1.  **Provision a VM:** Choose a Linux VM (e.g., Ubuntu, CentOS) on your cloud provider.
2.  **Install Docker and Docker Compose:**
    ```bash
    sudo apt update
    sudo apt install docker.io docker-compose -y
    sudo usermod -aG docker $USER # Add your user to the docker group
    newgrp docker # Apply group changes
    ```
3.  **SSH into the VM.**
4.  **Create a deployment directory:** `mkdir /app/cms && cd /app/cms`
5.  **Create a `.env` file:** Populate it with all necessary production environment variables (database connection, JWT secret, etc.).
6.  **Create a `docker-compose.prod.yml`:** (Adapt the main `docker-compose.yml` for production)
    *   Use `your-registry/cms-backend:latest` and `your-registry/cms-frontend:latest` for image names.
    *   Remove `build:` directives.
    *   Ensure `command:` for backend is `npm run start:prod` (after `npm run build` is done in Dockerfile).
    *   Configure `ports` and `volumes` as needed.
7.  **Run Docker Compose:**
    ```bash
    docker login your-registry-url
    docker-compose -f docker-compose.prod.yml pull
    docker-compose -f docker-compose.prod.yml up -d
    ```
8.  **Configure a Reverse Proxy (Nginx/Caddy):**
    *   Install Nginx/Caddy on the host machine.
    *   Configure it to proxy traffic from port 80/443 to the frontend service (port 80 in container, exposed as e.g., 8080 on host) and backend service (port 3000 in container, exposed as e.g., 3001 on host).
    *   Crucially, set up SSL/TLS using Certbot or similar.

### Deployment with Kubernetes / Container Orchestration

For large-scale, highly available, and resilient production deployments, Kubernetes is the industry standard.

1.  **Provision a Kubernetes Cluster:**
    *   **AWS EKS**
    *   **Google GKE**
    *   **Azure AKS**
    *   **DigitalOcean Kubernetes**
2.  **Create Kubernetes Manifests (YAML files):**
    *   `Deployment` for backend and frontend (specifying desired replicas, image, resources).
    *   `Service` for backend and frontend (exposing them within the cluster).
    *   `Ingress` for external access (routing traffic from domain to services, handling SSL).
    *   `Secret` for environment variables and sensitive data.
    *   `ConfigMap` for non-sensitive configurations.
    *   `PersistentVolumeClaim` (optional, for persistent storage if needed, e.g., media uploads).
3.  **Apply Manifests:**
    ```bash
    kubectl apply -f your-backend-deployment.yaml
    kubectl apply -f your-frontend-deployment.yaml
    # ... apply other manifests
    ```
4.  **Consider Helm:** For managing and deploying Kubernetes applications, Helm charts are highly recommended. They allow you to define, install, and upgrade even the most complex Kubernetes applications.

### Post-Deployment Steps

*   **Health Checks:** Configure health checks for your containers/pods so that orchestrators can automatically restart unhealthy instances.
*   **Monitoring & Alerting:** Integrate with monitoring tools (Prometheus, Grafana, Datadog) to track application performance, errors, and resource usage. Set up alerts for critical issues.
*   **Logging Aggregation:** Forward container logs to a centralized logging system (ELK stack, Splunk, Loki) for easy searching and analysis.
*   **Backup Strategy:** Implement regular database backups.
*   **CDN:** Use a Content Delivery Network (CDN) for static assets (frontend build, media files) to improve performance and reduce origin server load.

## 3. CI/CD Integration

Refer to the provided `.gitlab-ci.yml` for an example of a comprehensive CI/CD pipeline that automates:
*   **Build:** Docker image creation.
*   **Test:** Unit, integration, and E2E tests.
*   **Scan:** Security scanning (e.g., Snyk).
*   **Deploy:** To staging and production environments.

This pipeline integrates with a container registry and can trigger deployments to various environments based on branch or tags.

## 4. Security Best Practices

*   **Always use HTTPS:** Deploy with SSL/TLS certificates.
*   **Strong Passwords & Secrets:** Use strong, unique passwords for all services and sensitive data. Manage secrets securely.
*   **Principle of Least Privilege:** Grant only necessary permissions to users, services, and containers.
*   **Regular Updates:** Keep Node.js, npm packages, Docker images, and underlying OS up-to-date.
*   **Security Scanning:** Integrate vulnerability scanning into your CI/CD pipeline.
*   **Input Validation:** Robust server-side validation (already implemented with `class-validator` in NestJS).
*   **Sanitize User Input:** Prevent XSS, SQL injection, etc., in content (e.g., if rendering user-provided HTML, sanitize it).
*   **Rate Limiting:** Protect against brute-force attacks and abuse.
*   **CORS Configuration:** Be specific about allowed origins in production.
*   **Security Headers:** Use `helmet` (already integrated) for common HTTP security headers.

## 5. Troubleshooting Deployment

*   **Check Logs:** The first step is always to check the logs of your containers/services.
    *   `docker logs <container-name>`
    *   `kubectl logs <pod-name>`
*   **Environment Variables:** Verify that all environment variables are correctly set and accessible within the containers.
*   **Network Connectivity:** Ensure services can communicate with each other (e.g., backend to database, frontend to backend). Check firewalls, security groups, and network policies.
*   **Database Connection:** Confirm the database is running and accessible from the backend container with the correct credentials.
*   **Container Status:** Check if containers are actually running and healthy.
    *   `docker ps`
    *   `kubectl get pods`
*   **Resource Limits:** If containers are crashing, they might be running out of memory or CPU. Adjust resource limits in Docker Compose or Kubernetes manifests.
*   **Migration Issues:** If the app fails on startup, check if database migrations ran successfully.
```