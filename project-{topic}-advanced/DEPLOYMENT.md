# E-commerce Solutions System: Deployment Guide

This document outlines the steps and considerations for deploying the ALX E-commerce Solutions System to a production environment. We will focus on a cloud-agnostic approach using Docker and `docker-compose`, with a conceptual CI/CD pipeline.

## Table of Contents

1.  [Deployment Strategy Overview](#1-deployment-strategy-overview)
2.  [Prerequisites](#2-prerequisites)
3.  [Environment Configuration](#3-environment-configuration)
4.  [Database Setup](#4-database-setup)
5.  [Building Docker Images](#5-building-docker-images)
6.  [Running on a Single Server (Docker Compose)](#6-running-on-a-single-server-docker-compose)
7.  [CI/CD Pipeline (GitHub Actions)](#7-cicd-pipeline-github-actions)
8.  [Advanced Deployment Considerations](#8-advanced-deployment-considerations)
    *   [Load Balancing & Reverse Proxy (Nginx)](#load-balancing--reverse-proxy-nginx)
    *   [Managed Database Services](#managed-database-services)
    *   [Managed Redis Services](#managed-redis-services)
    *   [Container Orchestration (Kubernetes/Docker Swarm)](#container-orchestration-kubernetesdocker-swarm)
    *   [Monitoring & Logging](#monitoring--logging)
    *   [Security Best Practices](#security-best-practices)
9.  [Post-Deployment Checks](#9-post-deployment-checks)

---

## 1. Deployment Strategy Overview

The recommended deployment strategy involves:
*   **Containerization:** Using Docker to package the backend and frontend applications along with their dependencies.
*   **Container Orchestration:** For production-grade scale and resilience, Kubernetes or Docker Swarm would manage container lifecycles, scaling, and networking. For simpler setups, `docker-compose` on a single VM is sufficient.
*   **Managed Services:** Utilizing cloud-managed services for the database (PostgreSQL) and caching (Redis) to offload operational overhead.
*   **CI/CD:** Automating the build, test, and deployment process using GitHub Actions.

## 2. Prerequisites

*   **Cloud Provider Account:** AWS, GCP, Azure, DigitalOcean, etc.
*   **Domain Name:** Configured with appropriate DNS records.
*   **SSL/TLS Certificate:** For HTTPS (e.g., Let's Encrypt).
*   **Server/VM:** A Linux-based server (e.g., Ubuntu) with Docker and Docker Compose installed.
*   **Git:** For cloning the repository.
*   **SSH Client:** For connecting to your server.

## 3. Environment Configuration

**Crucial for production deployments.**
Create a `.env` file for the backend and `.env.local` for the frontend in their respective project roots.

**`backend/.env` (Production Example):**
```
NODE_ENV=production
PORT=5000
API_VERSION=/api/v1
DATABASE_URL="postgresql://<db_user>:<db_password>@<db_host>:<db_port>/<db_name>?schema=public"
JWT_SECRET=YOUR_VERY_STRONG_AND_RANDOM_JWT_SECRET_HERE # GENERATE A SECURE ONE!
JWT_EXPIRES_IN=24h
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD_HERE # GENERATE A SECURE ONE!
FRONTEND_URL=https://www.yourdomain.com
LOG_LEVEL=info # or warn, error
REDIS_URL=redis://<redis_host>:<redis_port> # If using external Redis
```

**`frontend/.env.local` (Production Example):**
```
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api/v1 # Points to your deployed backend API
```

**Key Considerations for Environment Variables:**
*   **Security:** Never hardcode secrets. Use environment variables or a secrets management service (e.g., AWS Secrets Manager, HashiCorp Vault).
*   **Strong Secrets:** Use strong, randomly generated values for `JWT_SECRET`, `ADMIN_PASSWORD`, and database credentials.
*   **Database URL:** Replace placeholders with actual credentials and host of your production PostgreSQL instance.
*   **Frontend URL:** Specify the public URL of your frontend for CORS.
*   **Redis URL:** If using a managed Redis, provide its connection string.

## 4. Database Setup

1.  **Provision PostgreSQL:** Set up a production-ready PostgreSQL database. It's highly recommended to use a managed database service from your cloud provider (e.g., AWS RDS, Azure Database for PostgreSQL, GCP Cloud SQL, DigitalOcean Managed Databases).
    *   Configure backups, replication, and security (firewall rules, private networking).
    *   Create a dedicated database user with appropriate permissions.
    *   Note down the connection string components (host, port, user, password, database name).

2.  **Apply Migrations:** Once the database is provisioned, apply the Prisma migrations.
    This can be done:
    *   **Manually:** `cd backend && npx prisma migrate deploy --preview-feature`
    *   **Via Docker:** The `backend/Dockerfile` and `docker-compose.yml` include `npx prisma migrate deploy` in the `CMD` or `command` section. This ensures migrations are applied when the backend container starts.

3.  **Seed Initial Data:** If you have essential initial data (like an admin user, default categories), run the seed script.
    *   `cd backend && npx ts-node prisma/seed.ts` (if running locally)
    *   `docker-compose exec backend npm run prisma:seed` (if running via Docker Compose)

## 5. Building Docker Images

For deployment, you will build optimized Docker images.

1.  **Navigate to the project root:**
    ```bash
    cd ecommerce-system
    ```

2.  **Build backend image:**
    ```bash
    docker build -t your-dockerhub-username/ecommerce-backend:latest -f ./backend/Dockerfile ./backend
    ```

3.  **Build frontend image:**
    ```bash
    docker build -t your-dockerhub-username/ecommerce-frontend:latest -f ./frontend/Dockerfile ./frontend
    ```

4.  **Push to Container Registry:** Push these images to a container registry (e.g., Docker Hub, AWS ECR, GCP Container Registry) so your deployment environment can pull them.
    ```bash
    docker push your-dockerhub-username/ecommerce-backend:latest
    docker push your-dockerhub-username/ecommerce-frontend:latest
    ```

## 6. Running on a Single Server (Docker Compose)

For smaller deployments or proof-of-concept in production, you can run the entire system on a single VM using `docker-compose`.

1.  **SSH into your server.**
2.  **Install Docker and Docker Compose** if not already present.
3.  **Clone your repository** or copy the `docker-compose.yml` and relevant `.env` files.
4.  **Create `.env` files** for backend and frontend on the server (see Section 3).
5.  **Edit `docker-compose.yml`:**
    *   Replace `image: postgres:15-alpine` with your **managed database host** or remove the `db` service if using an external DB.
    *   Replace `image: redis:7-alpine` with your **managed Redis host** or remove the `redis` service.
    *   Update `DATABASE_URL` and `REDIS_URL` in the `backend` service to point to your managed services.
    *   Update `NEXT_PUBLIC_API_BASE_URL` in `frontend` service to your public backend URL.
    *   Change `build: .` to `image: your-dockerhub-username/ecommerce-backend:latest` (and similarly for frontend) if you've pre-built and pushed images. This is recommended for faster deployments.
6.  **Run Docker Compose:**
    ```bash
    docker-compose -f docker-compose.yml up -d
    ```
    This will pull the images and start the containers.

7.  **Configure Nginx (Optional but Recommended):** Set up Nginx as a reverse proxy to:
    *   Handle SSL termination (HTTPS).
    *   Route traffic to the frontend and backend containers.
    *   Serve static assets efficiently.

    **Example Nginx config (`/etc/nginx/sites-available/ecommerce.conf`):**
    ```nginx
    server {
        listen 80;
        server_name yourdomain.com api.yourdomain.com;
        return 301 https://$host$request_uri; # Redirect HTTP to HTTPS
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com; # Frontend domain

        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem; # Path to your SSL cert
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem; # Path to your SSL key

        location / {
            proxy_pass http://localhost:3000; # Frontend container internal port
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    server {
        listen 443 ssl http2;
        server_name api.yourdomain.com; # Backend API domain

        ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem; # Path to your SSL cert
        ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem; # Path to your SSL key

        location / {
            proxy_pass http://localhost:5000; # Backend container internal port
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
    ```
    Enable the site: `sudo ln -s /etc/nginx/sites-available/ecommerce.conf /etc/nginx/sites-enabled/` and `sudo nginx -t && sudo systemctl reload nginx`.

## 7. CI/CD Pipeline (GitHub Actions)

A CI/CD pipeline automates the process of building, testing, and deploying the application.

**`.github/workflows/ci-cd.yml` (Conceptual Example):**
```yaml