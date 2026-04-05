```markdown
# PerformancePulse - Deployment Guide

This guide provides instructions for deploying PerformancePulse using Docker and Docker Compose, suitable for a production environment.

## Table of Contents

1.  [Overview](#1-overview)
2.  [Prerequisites](#2-prerequisites)
3.  [Environment Configuration](#3-environment-configuration)
4.  [Deployment Steps](#4-deployment-steps)
    *   [Docker Compose Deployment](#41-docker-compose-deployment)
    *   [Database Migrations and Seeding](#42-database-migrations-and-seeding)
5.  [Post-Deployment Checks](#5-post-deployment-checks)
6.  [Scaling](#6-scaling)
7.  [Monitoring PerformancePulse Itself](#7-monitoring-performancepulse-itself)
8.  [Troubleshooting](#8-troubleshooting)

## 1. Overview

We will deploy PerformancePulse using Docker containers orchestrated by Docker Compose. This includes:

*   **Backend:** Node.js/Express application.
*   **Frontend:** React application.
*   **Database:** PostgreSQL.
*   **Cache:** Redis.
*   **Monitoring:** Prometheus and Grafana for monitoring PerformancePulse's own operational metrics.
*   **Reverse Proxy (Optional but Recommended):** NGINX for SSL termination, load balancing, and serving static files.

## 2. Prerequisites

*   A server (VM, cloud instance) with Docker and Docker Compose installed.
*   Domain names configured to point to your server's IP address (e.g., `api.yourdomain.com` for backend, `app.yourdomain.com` for frontend).
*   (Optional but Recommended) NGINX installed on the host or as a separate container.
*   (Optional but Recommended) Certbot or a similar tool for SSL certificates.

## 3. Environment Configuration

It's crucial to properly configure environment variables for a production deployment.

1.  **Backend (`backend/.env`):**
    *   `NODE_ENV=production`
    *   `PORT=5000` (or your desired internal port)
    *   `DB_HOST=<YOUR_DB_HOST>` (e.g., `postgres` if running in same docker-compose network, or an external DB IP)
    *   `DB_PORT=5432`
    *   `DB_USER=<YOUR_DB_USER>`
    *   `DB_PASSWORD=<YOUR_DB_PASSWORD>` (Strong password!)
    *   `DB_DATABASE=<YOUR_DB_NAME>`
    *   `JWT_SECRET=<YOUR_STRONG_JWT_SECRET>` (Generate a long, random string)
    *   `JWT_EXPIRES_IN=1h`
    *   `REDIS_HOST=<YOUR_REDIS_HOST>` (e.g., `redis` if running in same docker-compose network)
    *   `REDIS_PORT=6379`
    *   `LOG_LEVEL=info` (or `error`, `warn` for less verbosity)
    *   `RATE_LIMIT_WINDOW_MS=60000`
    *   `RATE_LIMIT_MAX_REQUESTS=100`

2.  **Frontend (`frontend/.env`):**
    *   `REACT_APP_BACKEND_URL=https://api.yourdomain.com/api/v1` (The public URL of your backend API)
    *   `REACT_APP_ENVIRONMENT=production`

3.  **`docker-compose.yml`:**
    *   Review `docker-compose.yml` for network configurations, port mappings, and volume mounts.
    *   Ensure your `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` in the `docker-compose.yml` (under `services.postgres.environment`) match the `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` in `backend/.env`.
    *   The Grafana admin password can be set with `GF_SECURITY_ADMIN_PASSWORD`.

## 4. Deployment Steps

### 4.1. Docker Compose Deployment

1.  **Clone the repository on your server:**
    ```bash
    git clone https://github.com/your-username/performance-pulse.git
    cd performance-pulse
    ```

2.  **Create `.env` files:**
    ```bash
    cp backend/.env.example backend/.env
    cp frontend/.env.example frontend/.env
    ```
    **Crucially, edit these `.env` files with your production-specific values as described in Section 3.**

3.  **Build and run the containers:**
    ```bash
    docker-compose -f docker-compose.yml up --build -d
    ```
    This command will:
    *   Build optimized production Docker images for the backend and frontend.
    *   Start PostgreSQL, Redis, Prometheus, and Grafana containers.
    *   The `-d` flag runs the containers in detached mode.

4.  **(Optional) Configure NGINX (if not using NGINX container):**
    If you're using a host-level NGINX, you'll need to configure it to proxy requests to your Docker containers.

    Example NGINX configuration for `api.yourdomain.com` (backend) and `app.yourdomain.com` (frontend):

    ```nginx
    # /etc/nginx/sites-available/performance-pulse.conf

    server {
        listen 80;
        server_name api.yourdomain.com;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl;
        server_name api.yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem; # Your SSL cert path
        ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem; # Your SSL key path

        location / {
            proxy_pass http://localhost:5000; # Or internal Docker IP if NGINX is outside the Docker network
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    server {
        listen 80;
        server_name app.yourdomain.com;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl;
        server_name app.yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem; # Your SSL cert path
        ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem; # Your SSL key path

        location / {
            # Serve static files directly from the frontend container volume or a host path
            # For simplicity, if NGINX is external, it would proxy to the frontend container's exposed port.
            # Example:
            proxy_pass http://localhost:3000; # Frontend container's exposed port
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
    ```
    *   Enable the NGINX configuration: `sudo ln -s /etc/nginx/sites-available/performance-pulse.conf /etc/nginx/sites-enabled/`
    *   Test NGINX configuration: `sudo nginx -t`
    *   Reload NGINX: `sudo systemctl reload nginx`

### 4.2. Database Migrations and Seeding

When deploying with Docker Compose, the `backend` service's `command` in `docker-compose.yml` is set up to run migrations and then seeds automatically before starting the server. This happens on the *first* startup.

If you need to run migrations manually later (e.g., after updating the backend code with new migrations), you can execute:

```bash
docker-compose exec backend npm run typeorm migration:run -d dist/database/data-source.js
```
*Note: For production, we build the TypeScript to JavaScript, so the data-source path changes from `src/...` to `dist/...`.*

## 5. Post-Deployment Checks

1.  **Verify container status:**
    ```bash
    docker-compose ps
    ```
    All services should be `Up`.

2.  **Check logs:**
    ```bash
    docker-compose logs -f
    ```
    Look for errors or unexpected behavior in the backend and frontend logs.

3.  **Access the application:**
    *   Navigate to your frontend URL (e.g., `https://app.yourdomain.com`).
    *   Try registering a new user, creating a project, and adding a monitor.
    *   Check if monitors are being checked and metrics are recorded.

4.  **Access Grafana & Prometheus:**
    *   If exposed via NGINX or direct port, verify Grafana (`https://grafana.yourdomain.com` or `http://your_server_ip:3001`) and Prometheus (`http://your_server_ip:9090`) are accessible.
    *   Log into Grafana (default admin/admin, or your configured password), add Prometheus as a data source, and import/create dashboards to visualize PerformancePulse's own metrics.

## 6. Scaling

### 6.1. Backend

The backend is stateless (besides its interaction with PostgreSQL and Redis). You can scale it horizontally by increasing the number of replicas:

```bash
docker-compose up --scale backend=3 -d
```
This will run 3 instances of your backend service. A load balancer (like NGINX or a cloud provider's load balancer) is essential to distribute traffic across these instances.

### 6.2. Frontend

The frontend is a static asset application. It's scaled by serving these assets efficiently, usually through a CDN or NGINX. If you proxy to multiple frontend containers, they would all serve the same static content.

### 6.3. Database & Redis

For high-availability and extreme scaling, PostgreSQL and Redis would require dedicated setups (e.g., master-replica configurations, clustering). This `docker-compose.yml` provides single instances, which is suitable for many production scenarios but might need to be replaced with managed services (AWS RDS, ElastiCache, etc.) for large-scale deployments.

## 7. Monitoring PerformancePulse Itself

PerformancePulse exposes its own operational metrics via a Prometheus endpoint at `/metrics`.

1.  **Prometheus Integration:**
    *   The `prometheus.yml` (mounted into the Prometheus container) should already be configured to scrape the `backend` service at `http://backend:9999/metrics`.
    *   Verify this in Prometheus UI (`http://your_server_ip:9090/targets`).

2.  **Grafana Dashboards:**
    *   In Grafana (`http://your_server_ip:3001`), add Prometheus as a data source.
    *   You can then create custom dashboards to visualize metrics like:
        *   API request count/rate (`http_requests_total`)
        *   API request duration (`http_request_duration_seconds_bucket`, `_sum`, `_count`)
        *   Active Redis connections (`redis_connections`)
        *   Database connection pool usage, etc.

## 8. Troubleshooting

*   **"Container exited unexpectedly":** Check `docker-compose logs <service_name>` for error messages.
*   **"Database connection refused":** Verify `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` in `backend/.env` and ensure the PostgreSQL container is running. Check network connectivity between backend and PostgreSQL containers.
*   **"Frontend not loading":** Check NGINX configuration (if used), ensure `REACT_APP_BACKEND_URL` in `frontend/.env` is correct. Check browser developer console for network errors.
*   **"JWT_SECRET not set":** Ensure `JWT_SECRET` is defined in `backend/.env` with a strong value.
*   **"Migrations failed":** Check backend container logs for TypeORM errors. Ensure database is accessible and clean if starting fresh.

For further assistance, consult the specific service logs, `README.md`, or the `ARCHITECTURE.md` for design details.
```