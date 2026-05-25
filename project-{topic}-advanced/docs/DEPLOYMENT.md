# Deployment Guide

This document outlines the steps for deploying the Enterprise-Grade Authentication System to a production environment. The recommended approach involves using Docker and a reverse proxy.

## 1. Production Environment Setup

### 1.1. Server Requirements
*   **Operating System**: Linux distribution (e.g., Ubuntu Server, CentOS).
*   **Resources**: Adequate CPU, RAM, and disk space for the application, PostgreSQL, and Redis.
*   **Docker & Docker Compose**: Installed and running on your server.
*   **SSH Access**: Secure Shell access to your server.
*   **Domain Name**: A registered domain name pointing to your server's IP address.
*   **SSL/TLS Certificate**: Recommended (e.g., Let's Encrypt) for HTTPS.

### 1.2. Environment Variables
Create a production `.env` file on your server. This file *must not* be committed to version control.

```bash
# Example production .env
FLASK_APP=wsgi.py
FLASK_ENV=production

# Strong, unique secrets (DO NOT USE DEFAULTS FROM .env.example)
SECRET_KEY="YOUR_VERY_STRONG_FLASK_SECRET_KEY_HERE"
JWT_SECRET_KEY="YOUR_VERY_STRONG_JWT_SECRET_KEY_HERE"

# PostgreSQL Database (e.g., a managed cloud database or secure Docker setup)
DATABASE_URL="postgresql://prod_user:prod_password@your_db_host:5432/prod_auth_db"
# If running DB in Docker, use the service name 'db' if on the same network
# DATABASE_URL="postgresql://prod_user:prod_password@db:5432/prod_auth_db"

# Redis Cache & Rate Limiting
REDIS_HOST="your_redis_host" # If running Redis in Docker, use 'redis'
REDIS_PORT=6379
REDIS_DB=0
RATELIMIT_STORAGE_URL="redis://your_redis_host:6379/1"

# Mail Server for Production (e.g., SendGrid, Mailgun, AWS SES)
MAIL_SERVER=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USERNAME=apikey
MAIL_PASSWORD=YOUR_SENDGRID_API_KEY
MAIL_DEFAULT_SENDER=noreply@yourdomain.com

# Application Base URL (for email links)
APP_BASE_URL=https://auth.yourdomain.com
```

## 2. Deployment Steps

### 2.1. Initial Server Setup (One-time)

1.  **SSH into your server:**
    ```bash
    ssh username@your_server_ip
    ```
2.  **Install Docker and Docker Compose:**
    Follow the official Docker documentation for your specific Linux distribution.
3.  **Create a deployment directory:**
    ```bash
    sudo mkdir -p /var/www/auth-system
    sudo chown -R username:username /var/www/auth-system
    cd /var/www/auth-system
    ```
4.  **Create your production `.env` file** (as described in 1.2).
5.  **Create `docker-compose.prod.yml`:** This file will be similar to `docker-compose.yml` but without `db_test` and potentially with specific production configurations (e.g., volumes, restart policies).
    ```yaml
    # docker-compose.prod.yml
    version: '3.8'

    services:
      app:
        image: yourdockerhubusername/auth-system:latest # Ensure you push this image
        container_name: auth-app
        restart: always
        env_file:
          - .env
        depends_on:
          - db
          - redis
        # Ports are not exposed directly to host if using Nginx/Caddy reverse proxy
        # If no reverse proxy, expose: - "5000:5000"
        networks:
          - auth_network
        logging: # Configure logging driver for production
          driver: "json-file"
          options:
            max-size: "10m"
            max-file: "5"

      db:
        image: postgres:13-alpine
        container_name: auth-db
        restart: always
        env_file:
          - .env
        environment:
          POSTGRES_USER: ${POSTGRES_USER}
          POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
          POSTGRES_DB: ${POSTGRES_DB}
        volumes:
          - auth_db_data:/var/lib/postgresql/data # Persistent volume for data
        networks:
          - auth_network
        healthcheck: # Health check for database
          test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
          interval: 5s
          timeout: 5s
          retries: 5

      redis:
        image: redis:6-alpine
        container_name: auth-redis
        restart: always
        command: redis-server --appendonly yes # Enable persistence
        volumes:
          - auth_redis_data:/data
        networks:
          - auth_network

    volumes:
      auth_db_data:
      auth_redis_data:

    networks:
      auth_network:
        driver: bridge
    ```
6.  **Setup Reverse Proxy (Nginx/Caddy):**
    Install Nginx or Caddy. This will proxy requests from your domain (e.g., `auth.yourdomain.com`) to your Dockerized Flask application, and handle SSL termination.

    **Example Nginx Configuration (`/etc/nginx/sites-available/auth-system.conf`):**
    ```nginx
    server {
        listen 80;
        server_name auth.yourdomain.com;
        return 301 https://$host$request_uri; # Redirect HTTP to HTTPS
    }

    server {
        listen 443 ssl;
        server_name auth.yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/auth.yourdomain.com/fullchain.pem; # Path to your cert
        ssl_certificate_key /etc/letsencrypt/live/auth.yourdomain.com/privkey.pem; # Path to your key

        location / {
            proxy_pass http://localhost:5000; # Or http://auth-app:5000 if Nginx is in Docker on same network
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 90;
        }
    }
    ```
    *   **Install Certbot**: `sudo apt install certbot python3-certbot-nginx`
    *   **Obtain SSL Certificate**: `sudo certbot --nginx -d auth.yourdomain.com`
    *   **Enable Nginx config**: `sudo ln -s /etc/nginx/sites-available/auth-system.conf /etc/nginx/sites-enabled/`
    *   **Test Nginx config**: `sudo nginx -t`
    *   **Restart Nginx**: `sudo systemctl restart nginx`

### 2.2. Deployment (After initial setup)

The CI/CD pipeline (e.g., GitHub Actions as defined in `.github/workflows/main.yml`) should automate these steps. If deploying manually:

1.  **Stop existing containers (if any):**
    ```bash
    cd /var/www/auth-system
    docker-compose -f docker-compose.prod.yml down
    ```
2.  **Pull the latest Docker image:**
    ```bash
    docker pull yourdockerhubusername/auth-system:latest
    ```
3.  **Start the services:**
    ```bash
    docker-compose -f docker-compose.prod.yml up -d --force-recreate
    ```
    `--force-recreate` ensures new images are used.

4.  **Run Database Migrations:**
    It's crucial to run migrations *after* the new application container is up and connected to the database.
    ```bash
    docker exec auth-app flask db upgrade
    ```
    (Ensure `auth-app` is the name of your application container from `docker-compose.prod.yml`)

5.  **Verify Deployment:**
    *   Check container logs: `docker-compose -f docker-compose.prod.yml logs -f`
    *   Access your application URL (`https://auth.yourdomain.com`) in a browser.
    *   Run health checks or simple API calls to ensure functionality.

## 3. CI/CD Pipeline (GitHub Actions)

The `.github/workflows/main.yml` file provides a blueprint for a CI/CD pipeline.

**Workflow Stages:**
1.  **`build_and_test`**:
    *   Checks out code.
    *   Sets up Python.
    *   Installs dependencies.
    *   Starts `db`, `db_test`, and `redis` services using `docker-compose`.
    *   Waits for services to be healthy.
    *   Runs `flask db upgrade` on the main database (for `main`/`develop` branches).
    *   Runs `pytest` with coverage.
    *   Uploads coverage reports.
2.  **`deploy`**:
    *   **Triggered**: Only after `build_and_test` passes and on `main` branch pushes.
    *   Logs into Docker Hub.
    *   Builds the Docker image for the application.
    *   Pushes the image to Docker Hub.
    *   (Conceptual) Connects to the production server via SSH and pulls the latest image, restarts containers, and runs migrations. This step needs to be customized for your specific deployment target and security practices (e.g., using SSH keys, bastion hosts, cloud-native deployment tools).

**GitHub Secrets Required for CI/CD:**
*   `DOCKER_USERNAME`
*   `DOCKER_PASSWORD`
*   `SSH_USERNAME`
*   `SSH_PASSWORD` (use SSH keys/agent forwarding instead of password for production)
*   `SSH_HOST`
*   `PROD_DATABASE_URL` (for running migrations on prod DB during deploy)
*   Any other production secrets used by your application (e.g., Mail API keys).

## 4. Post-Deployment Checks & Maintenance

*   **Monitoring**: Continuously monitor application logs, performance metrics (CPU, RAM, network), and error rates.
*   **Backups**: Set up regular backups for your PostgreSQL database.
*   **Security Audits**: Periodically review security configurations and scan for vulnerabilities.
*   **Updates**: Keep Docker images, Python dependencies, and system packages updated.
*   **Rollbacks**: Have a strategy for rolling back to a previous stable version in case of issues.

By following this guide, you can establish a robust and automated deployment process for your authentication system.