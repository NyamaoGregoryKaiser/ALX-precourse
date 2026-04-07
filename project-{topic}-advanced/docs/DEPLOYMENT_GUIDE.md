# Project Management API (PMApi) - Deployment Guide

This guide provides instructions for deploying the Project Management API to a production environment. The recommended approach is to use Docker for containerization and orchestrate services with Docker Compose (for single-server deployments) or Kubernetes (for clustered deployments).

## Table of Contents

1.  [Deployment Strategy Overview](#1-deployment-strategy-overview)
2.  [Prerequisites](#2-prerequisites)
3.  [Environment Configuration](#3-environment-configuration)
4.  [Building Docker Images](#4-building-docker-images)
5.  [Deployment Steps (Docker Compose on a single server)](#5-deployment-steps-docker-compose-on-a-single-server)
    *   [1. Prepare the Server](#51-prepare-the-server)
    *   [2. Clone the Repository](#52-clone-the-repository)
    *   [3. Create .env File](#53-create-env-file)
    *   [4. Pull and Start Services](#54-pull-and-start-services)
    *   [5. Initialize Database (First-time Deployment)](#55-initialize-database-first-time-deployment)
    *   [6. Nginx Configuration](#56-nginx-configuration)
    *   [7. CI/CD Integration](#57-cicd-integration)
6.  [Post-Deployment Checks](#6-post-deployment-checks)
7.  [Updating the Application](#7-updating-the-application)
8.  [Troubleshooting](#8-troubleshooting)

---

## 1. Deployment Strategy Overview

The primary deployment strategy focuses on Docker containers for portability and consistency.

*   **Containerization:** Both the backend (Node.js) and frontend (React served by Nginx) are containerized using Docker. PostgreSQL and Redis use official Docker images.
*   **Orchestration:** For single-server deployments, Docker Compose is used to define and run the multi-container application. For larger-scale, high-availability deployments, Kubernetes would be the recommended choice (beyond the scope of this document, but the Docker images are ready).
*   **CI/CD:** GitHub Actions automates testing, building Docker images, and pushing them to a Docker registry. A placeholder for a deployment step is included, which can be extended to automatically deploy to your server.

## 2. Prerequisites

*   **Production Server:** A Linux-based server (e.g., Ubuntu, CentOS) with:
    *   **Docker Engine:** Latest stable version installed.
    *   **Docker Compose:** Latest stable version installed.
    *   **Git:** Installed.
    *   **SSH access:** With appropriate user permissions.
*   **Domain Name:** A registered domain name pointing to your server's IP address (for production access and SSL).
*   **SSL Certificate:** Recommended for production (e.g., Let's Encrypt with Certbot).
*   **Docker Hub Account (or private registry):** To store and pull Docker images built by CI/CD.

## 3. Environment Configuration

The application relies heavily on environment variables for sensitive data and dynamic configurations.

**`backend/.env` (on your server):**
This file **must not** be committed to version control. It should be securely placed on your production server.

```dotenv
# Server Configuration
PORT=3000
NODE_ENV=production # Crucial for production optimization and security

# Database Configuration (PostgreSQL)
DB_DIALECT=postgres
DB_HOST=db        # If db is a service in the same docker-compose network
DB_PORT=5432
DB_USER=your_db_user_prod # Use strong, unique credentials
DB_PASSWORD=your_db_password_prod
DB_NAME=your_db_name_prod
# DB_TEST_NAME is only for testing, not needed in production .env

# JWT Configuration
JWT_SECRET=a_very_long_and_complex_secret_key_for_production # Generate a strong, random string
JWT_ACCESS_EXPIRATION_MINUTES=15 # Shorter expiration for access tokens is more secure
JWT_REFRESH_EXPIRATION_DAYS=30   # Longer for refresh tokens

# Redis Configuration
REDIS_HOST=redis  # If redis is a service in the same docker-compose network
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_prod # Use a strong password for Redis
# Make sure Redis is configured for AOF persistence in `docker-compose.yml`

# Logging Configuration
LOG_LEVEL=info # or warn, error for production. 'debug' is too verbose for prod.

# Rate Limiting
RATE_LIMIT_WINDOW_MINUTES=1
RATE_LIMIT_MAX_REQUESTS=60 # Adjust based on expected traffic
```

**`docker-compose.yml` (on your server):**
Ensure the `docker-compose.yml` on your server references the production-ready environment variables. The provided `docker-compose.yml` is set up to read these.

## 4. Building Docker Images

For production, it's recommended to build and push Docker images to a registry (like Docker Hub) via your CI/CD pipeline.

The `build-and-push` job in `.github/workflows/ci-cd.yml` handles this:
*   It builds the `backend` and `frontend` images.
*   Tags them with `latest` and the short commit SHA.
*   Pushes them to Docker Hub (or your configured registry).

**GitHub Secrets required for Docker Hub push:**
*   `DOCKER_USERNAME`
*   `DOCKER_PASSWORD`

## 5. Deployment Steps (Docker Compose on a single server)

These steps assume you're deploying to a remote Linux server.

### 5.1. Prepare the Server

1.  **Update system:**
    ```bash
    sudo apt update && sudo apt upgrade -y
    ```
2.  **Install Docker & Docker Compose:**
    ```bash
    sudo apt install docker.io docker-compose -y
    sudo usermod -aG docker ${USER} # Add your user to the docker group
    newgrp docker # Apply group changes immediately
    ```
3.  **Create deployment directory:**
    ```bash
    mkdir -p /opt/pmapi
    cd /opt/pmapi
    ```

### 5.2. Clone the Repository

```bash
git clone https://github.com/your-username/project-management-api.git . # Clone into current directory
```

### 5.3. Create `.env` File

Create the `backend/.env` file with **production-grade** environment variables as described in Section 3.
```bash
cp backend/.env.example backend/.env # Copy the example
# NOW, EDIT backend/.env with your production credentials and settings!
# Ensure DB_HOST=db and REDIS_HOST=redis
```
**Important:** Never share this `.env` file or commit it to your repository.

### 5.4. Pull and Start Services

Navigate to the root directory `/opt/pmapi`.

1.  **Pull latest images (from Docker Hub/registry):**
    ```bash
    docker-compose pull
    ```
    This will pull the `latest` tagged images for your backend and frontend that were pushed by the CI/CD pipeline.

2.  **Start the services:**
    ```bash
    docker-compose up -d
    ```
    The `-d` flag runs containers in detached mode. This command will:
    *   Create `db` and `redis` containers if they don't exist.
    *   Start `backend` and `frontend` containers.
    *   The `backend` service will wait for `db` and `redis` to be healthy before starting.

### 5.5. Initialize Database (First-time Deployment)

For the **very first deployment only**, you need to run migrations and seed data.
The `docker-compose.yml` in development mode automatically runs `npm run db:migrate && npm run db:seed`. For production, it's safer to run these explicitly or through an `entrypoint.sh` script to avoid re-running on every restart.

To run migrations and seed data for the first time:

```bash
docker-compose exec backend npx sequelize db:migrate --env production
docker-compose exec backend npx sequelize db:seed:all --env production
```
Ensure you use `--env production` here.

### 5.6. Nginx Configuration (for SSL and custom domain)

The `frontend/nginx.conf` handles basic serving and API proxying. For a production setup with SSL and a custom domain:

1.  **Install Certbot (for Let's Encrypt SSL):**
    ```bash
    sudo apt install certbot python3-certbot-nginx -y
    ```
2.  **Modify `frontend/nginx.conf`:**
    *   Change `listen 80;` to `listen 80 default_server;`
    *   Add `server_name yourdomain.com www.yourdomain.com;`
    *   **Crucially, comment out or remove the `frontend` service's port mapping `80:80` in `docker-compose.yml`** so that the host's Nginx can listen on port 80/443 directly.
    *   **Consider a separate host Nginx:** A common pattern is to have Nginx running directly on the host machine to handle SSL termination, serve other static files, and proxy to the Dockerized frontend/backend.
        *   Example Nginx config on host for `yourdomain.com`:
            ```nginx
            server {
                listen 80;
                server_name yourdomain.com www.yourdomain.com;
                return 301 https://$host$request_uri;
            }

            server {
                listen 443 ssl http2;
                server_name yourdomain.com www.yourdomain.com;

                ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
                ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

                location / {
                    proxy_pass http://localhost:80; # Proxy to the Dockerized Nginx (frontend service)
                    proxy_set_header Host $host;
                    proxy_set_header X-Real-IP $remote_addr;
                    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                    proxy_set_header X-Forwarded-Proto $scheme;
                }
            }
            ```
            In this setup, your Dockerized frontend Nginx (listening on internal Docker port 80) would no longer expose `80:80` and would be accessed by the host Nginx. The backend `3000:3000` port mapping would then only be for direct debugging, and the host Nginx would handle proxying `/api` requests (if it also proxies the backend directly).

3.  **Obtain SSL certificate:**
    ```bash
    sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
    ```
    Follow the prompts. Certbot will automatically configure Nginx for SSL.

### 5.7. CI/CD Integration

The `deploy` job in `.github/workflows/ci-cd.yml` is a placeholder. You'd typically:
1.  **Configure SSH keys:** Add your server's SSH private key as a GitHub secret (e.g., `SSH_PRIVATE_KEY`).
2.  **Add server IP/hostname:** As a GitHub secret or environment variable.
3.  **Update the deployment script:** Replace the `echo` commands with actual SSH commands to:
    *   Log in to your Docker registry on the server.
    *   Navigate to your deployment directory (`/opt/pmapi`).
    *   `docker-compose pull` to get the latest images.
    *   `docker-compose up -d --remove-orphans` to update and restart services without downtime (or minimal downtime with graceful shutdown).
    *   Run migrations if necessary (e.g., a migration script that checks if migrations are already applied).

## 6. Post-Deployment Checks

1.  **Access the application:** Open `https://yourdomain.com` in your browser.
2.  **Check container status:**
    ```bash
    docker-compose ps
    ```
    All services should be `Up`.
3.  **View container logs:**
    ```bash
    docker-compose logs -f backend
    docker-compose logs -f frontend
    ```
    Look for any errors or warnings.
4.  **Test API endpoints:** Use Postman or cURL to hit your API endpoints directly (if exposed) or via the frontend.
    `https://yourdomain.com/api/v1/health` (example health check)
    `https://yourdomain.com/api/v1/auth/login`
5.  **Monitor server resources:** Keep an eye on CPU, memory, and disk usage.

## 7. Updating the Application

When you push new code to `main` (or the branch configured for deployment), your CI/CD pipeline will:
1.  Run tests.
2.  Build new Docker images.
3.  Push new images to Docker Hub.
4.  Execute the deployment script.

On your server, the deployment script should:
1.  `docker-compose pull` to download the new images.
2.  `docker-compose up -d --remove-orphans` to stop old containers, start new ones, and remove any orphaned services. This is a common pattern for "zero-downtime" updates with Docker Compose if your application handles graceful shutdowns.

## 8. Troubleshooting

*   **Containers not starting:**
    *   Check `docker-compose logs <service_name>` for specific errors.
    *   Verify `.env` variables are correctly set and referenced.
    *   Ensure no port conflicts on the host.
*   **Backend errors:**
    *   Check `backend` container logs for application-level errors.
    *   Verify database connection settings (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).
    *   Ensure migrations and seeds ran successfully.
*   **Frontend not loading/API calls failing:**
    *   Check browser console for JavaScript errors or network errors.
    *   Ensure Nginx is correctly configured to serve static files and proxy API requests to the backend service.
    *   Verify the `frontend` container's Nginx `access.log` and `error.log`.
*   **`401 Unauthorized` / `403 Forbidden`:**
    *   Check if JWT `secret` in `backend/.env` is identical to what the application expects.
    *   Verify that the user roles and permissions are correctly set up (via seed data or registration).
    *   Check token expiration.
*   **Redis connection issues:**
    *   Check `redis` container logs.
    *   Verify `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` in `backend/.env`.

This guide provides a robust foundation for deploying the PMApi. Adjustments might be needed based on your specific cloud provider, server setup, and scaling requirements.
```