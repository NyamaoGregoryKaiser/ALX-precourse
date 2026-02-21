```markdown
# DataVizPro Deployment Guide

This document outlines the steps to deploy the DataVizPro application to a production environment using Docker and a cloud provider. For this guide, we'll assume a generic Linux server or a managed container service.

## 1. Prerequisites

*   A cloud provider account (e.g., AWS, GCP, Azure, DigitalOcean).
*   A Linux server (VM or EC2 instance) with Docker and Docker Compose installed, or a managed Kubernetes cluster.
*   Domain name configured with DNS records pointing to your server/load balancer.
*   Git installed on your deployment machine.
*   `ssh` access to your server.
*   For CI/CD, GitHub Actions configured.

## 2. Environment Configuration

### 2.1. Server Setup

1.  **SSH into your server:**
    ```bash
    ssh user@your-server-ip
    ```
2.  **Install Docker and Docker Compose (if not already present):**
    Follow the official Docker installation guides for your Linux distribution.
    *   [Docker Engine Installation Guide](https://docs.docker.com/engine/install/)
    *   [Docker Compose Installation Guide](https://docs.docker.com/compose/install/)
3.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/datavizpro.git
    cd datavizpro
    ```
4.  **Create `.env` files:**
    Copy `.env.example` to `.env` in the project root.
    ```bash
    cp .env.example .env
    ```
    Edit the `.env` file with production-ready values:
    *   `JWT_SECRET`: A very strong, long, random string.
    *   `REFRESH_TOKEN_SECRET`: Another strong, long, random string.
    *   `DATABASE_URL`: Ensure this points to a persistent PostgreSQL instance (either containerized within Docker Compose or a managed cloud database). If using Docker Compose, the `db` service name will resolve internally.
    *   `REDIS_HOST`: `redis` if using Docker Compose Redis service, otherwise the host of your managed Redis instance.
    *   `LOG_LEVEL`: Set to `info` or `warn` for production.
    *   **Frontend `REACT_APP_API_BASE_URL`**: This needs to point to your *publicly accessible backend URL*, e.g., `https://api.yourdomain.com/api`. This value will be baked into the frontend Docker image during build. It should be passed to the frontend build command or Dockerfile.

    **Example `.env` (root level):**
    ```env
    # For Docker Compose
    JWT_SECRET=YOUR_VERY_STRONG_AND_SECRET_JWT_KEY_HERE_PROD
    JWT_EXPIRATION_TIME=1h
    REFRESH_TOKEN_SECRET=YOUR_VERY_STRONG_AND_SECRET_REFRESH_KEY_HERE_PROD
    REFRESH_TOKEN_EXPIRATION_TIME=7d
    RATE_LIMIT_WINDOW_MS=60000
    RATE_LIMIT_MAX_REQUESTS=100
    LOG_LEVEL=info
    ```

    **Frontend-specific `REACT_APP_API_BASE_URL` (usually set during build or `docker-compose.yml`)**
    When building the frontend Docker image, `REACT_APP_API_BASE_URL` should be passed as a build argument or defined in `docker-compose.yml` to be injected into the static assets.

## 3. Deployment Steps (Docker Compose)

This is suitable for smaller deployments or staging environments.

1.  **Build and Run Docker Containers:**
    From the project root (`datavizpro/`), execute:
    ```bash
    docker-compose -f docker-compose.yml up --build -d
    ```
    *   `--build`: Rebuilds images if changes are detected.
    *   `-d`: Runs containers in detached mode (in the background).

    **Important considerations for production `docker-compose.yml`:**
    *   **Database Migrations**: The current `docker-compose.yml` runs migrations and seeds during `backend` service startup (`command: sh -c "yarn migration:run && yarn seed && yarn start"`). In a true production environment, migrations should be run as a *separate step* (e.g., a one-off container, or during CI/CD) and **not** on every container restart, especially seeding.
        *   **Recommended production `command` for backend:** `command: ["node", "dist/server.js"]`
        *   **Separate migration container (example in `docker-compose.override.yml` for production):**
            ```yaml
            version: '3.8'
            services:
              backend-migration:
                image: datavizpro-backend:latest # or specific tag
                depends_on:
                  db:
                    condition: service_healthy
                command: ["yarn", "migration:run"]
                # Ensure it has access to DB environment variables
                environment:
                  DATABASE_URL: postgres://user:password@db:5432/datavizpro_db
                  NODE_ENV: production
                # Set a different restart policy, e.g., "no" or "on-failure"
                restart: "no"
            ```
            You would run `docker-compose up -d backend-migration` first, then `docker-compose up -d backend frontend`
    *   **Frontend Nginx Port**: The frontend is exposed on port 80 inside the container, mapped to host port 3000. For public access, you would likely map it to host port 80 (e.g., `80:80`).
    *   **Volumes**: Ensure `pgdata` and `redisdata` volumes are properly managed for persistence, especially for backups. The `data_uploads` volume for CSV files is also critical.
    *   **Resource Limits**: Add `deploy` section for resource limits and restart policies.
    *   **SSL/TLS**: Use a reverse proxy like Nginx or Caddy on the host machine to terminate SSL/TLS for your domain (e.g., `https://yourdomain.com`). This proxy would then forward traffic to `http://localhost:3000` (for frontend) and `http://localhost:5000` (for backend).

2.  **Verify Deployment:**
    *   Check Docker logs: `docker-compose logs -f`
    *   Check container status: `docker-compose ps`
    *   Access the frontend in your browser: `http://your-server-ip:3000` (or `http://yourdomain.com` if configured with Nginx proxy).
    *   Access the backend API: `http://your-server-ip:5000/api`

## 4. Setting up a Reverse Proxy with Nginx (for SSL/TLS and cleaner URLs)

For production, it's highly recommended to use a reverse proxy (like Nginx) in front of your Docker containers to handle SSL termination, domain routing, and potentially serve static files more efficiently.

1.  **Install Nginx on your host machine (if not already done).**
2.  **Configure Nginx (e.g., `/etc/nginx/sites-available/datavizpro.conf`):**
    ```nginx
    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name yourdomain.com api.yourdomain.com;
        return 301 https://$host$request_uri;
    }

    # HTTPS server for frontend
    server {
        listen 443 ssl;
        server_name yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem; # Path to your SSL cert
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem; # Path to your SSL key

        location / {
            proxy_pass http://localhost:3000; # Points to frontend container exposed port
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # HTTPS server for backend API
    server {
        listen 443 ssl;
        server_name api.yourdomain.com; # Or yourdomain.com/api if you prefer

        ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem; # Path to your SSL cert
        ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem; # Path to your SSL key

        location /api/ {
            proxy_pass http://localhost:5000/api/; # Points to backend container exposed port
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
    ```
3.  **Obtain SSL Certificates:**
    Use Certbot to get free Let's Encrypt SSL certificates:
    ```bash
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
    ```
4.  **Enable Nginx configuration:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/datavizpro.conf /etc/nginx/sites-enabled/
    sudo nginx -t # Test configuration
    sudo systemctl restart nginx
    ```
5.  **Update Frontend `REACT_APP_API_BASE_URL`:**
    Ensure your `frontend/.env` (or build process) sets `REACT_APP_API_BASE_URL` to `https://api.yourdomain.com/api` (or `https://yourdomain.com/api` if using a single domain for both). You will need to rebuild your frontend Docker image after this change.

## 5. CI/CD Pipeline (GitHub Actions)

Refer to `.github/workflows/ci-cd.yml` for the CI/CD pipeline configuration. This typically involves:

*   **Build**: Building Docker images for backend and frontend.
*   **Test**: Running unit, integration, and API tests.
*   **Lint**: Running code quality checks.
*   **Deploy**: Pushing images to a container registry (e.g., Docker Hub, AWS ECR) and then deploying to your server (e.g., via SSH to run `docker-compose pull && docker-compose up -d`).

For production deployments, consider:
*   **Blue/Green or Canary Deployments**: For zero-downtime updates.
*   **Rollback Strategy**: Ability to revert to previous stable versions.
*   **Secrets Management**: Using cloud provider secret stores (e.g., AWS Secrets Manager, Vault) instead of `.env` files directly on the server.

## 6. Monitoring and Logging

*   **Host-level Monitoring**: Use `htop`, `top`, `docker stats` for basic resource usage.
*   **Application Logs**: Configure Winston to send logs to a centralized logging system (e.g., ELK Stack, Splunk, LogDNA) for easy aggregation and analysis.
*   **Container Monitoring**: Use Prometheus + Grafana or cloud-native monitoring solutions (e.g., AWS CloudWatch, GCP Monitoring) to track container health, resource utilization, and application-specific metrics.

## 7. Backups

*   **Database**: Set up automated backups for your PostgreSQL database (snapshotting volumes, `pg_dump`).
*   **Data Uploads**: Ensure the `data_uploads` volume is also backed up.

This guide provides a robust starting point for deploying DataVizPro to a production environment. Adapt it based on your specific cloud provider and operational requirements.
```