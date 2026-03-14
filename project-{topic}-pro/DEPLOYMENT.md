# Deployment Guide for Task Management System

This document outlines the steps required to deploy the Task Management System to a production environment. The recommended deployment strategy leverages Docker and Docker Compose for ease of management and consistency.

## Table of Contents

1.  [Deployment Prerequisites](#1-deployment-prerequisites)
2.  [Server Setup](#2-server-setup)
3.  [Configuration](#3-configuration)
4.  [Database Setup (Production)](#4-database-setup-production)
5.  [Building and Deploying with Docker Compose](#5-building-and-deploying-with-docker-compose)
6.  [Setting up Nginx as a Reverse Proxy](#6-setting-up-nginx-as-a-reverse-proxy)
7.  [SSL/TLS with Certbot](#7-ssltls-with-certbot)
8.  [Monitoring & Logging](#8-monitoring--logging)
9.  [CI/CD Integration](#9-cicd-integration)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Deployment Prerequisites

*   **A Cloud Virtual Machine (VM)**: (e.g., AWS EC2, DigitalOcean Droplet, GCP Compute Engine).
    *   Minimum recommended: 2 vCPUs, 4GB RAM (for smaller deployments, scale up as needed).
    *   Operating System: Ubuntu 20.04+ or Debian 10+.
*   **Domain Name**: A registered domain name pointing to your VM's public IP address (e.g., `app.yourdomain.com`).
*   **SSH Access**: To your VM.
*   **Software Installed on VM**:
    *   [Docker](https://docs.docker.com/engine/install/)
    *   [Docker Compose](https://docs.docker.com/compose/install/)
    *   [Nginx](https://www.nginx.com/resources/wiki/start/topics/tutorials/installingnginx/)
    *   [Certbot](https://certbot.eff.org/instructions) (for SSL)
*   **GitHub Personal Access Token (PAT)**: If your Docker images are hosted privately on GitHub Container Registry (GHCR).

## 2. Server Setup

1.  **Connect to your VM via SSH:**
    ```bash
    ssh username@your_server_ip
    ```

2.  **Update system packages:**
    ```bash
    sudo apt update && sudo apt upgrade -y
    ```

3.  **Install Docker & Docker Compose:**
    Follow the official Docker documentation for your specific OS.
    ```bash
    # Example for Ubuntu:
    sudo apt install apt-transport-https ca-certificates curl software-properties-common -y
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin -y # For newer docker compose v2
    # For older docker compose v1
    # sudo curl -L "https://github.com/docker/compose/releases/download/v1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    # sudo chmod +x /usr/local/bin/docker-compose

    # Add your user to the docker group to run docker commands without sudo
    sudo usermod -aG docker ${USER}
    # Log out and log back in, or run `newgrp docker`
    ```

4.  **Install Nginx:**
    ```bash
    sudo apt install nginx -y
    sudo ufw allow 'Nginx Full' # If you are using UFW firewall
    ```

## 3. Configuration

1.  **Create application directory:**
    ```bash
    sudo mkdir -p /var/www/task-management-system
    sudo chown ${USER}:${USER} /var/www/task-management-system
    cd /var/www/task-management-system
    ```

2.  **Clone your repository:**
    ```bash
    git clone https://github.com/your-username/task-management-system.git .
    ```
    *Note: If your repo is private, you'll need to set up SSH keys or use a PAT for Git clone.*

3.  **Create production `.env` files:**
    Copy `.env.example` and populate it with production-specific values.
    *   **`backend/.env`**:
        ```
        NODE_ENV=production
        PORT=5000
        DATABASE_URL=postgresql://user:password@db:5432/taskdb # Adjust if using external DB
        JWT_SECRET=YOUR_VERY_LONG_AND_COMPLEX_JWT_SECRET_FOR_PROD
        JWT_EXPIRES_IN=1h
        REDIS_URL=redis://redis:6379 # Adjust if using external Redis
        RATE_LIMIT_WINDOW_MS=900000
        RATE_LIMIT_MAX_REQUESTS=100
        CACHE_TTL_SECONDS=3600
        ```
    *   **`frontend/.env`**:
        ```
        REACT_APP_API_BASE_URL=https://api.yourdomain.com/api # Your public backend API URL
        ```
    *Make sure these files are NOT committed to your repository.*

## 4. Database Setup (Production)

You have two options for your PostgreSQL database:

### Option A: Dockerized PostgreSQL (Simple, good for small deployments)

This is already configured in `docker-compose.yml`. The `db` service will create a PostgreSQL container.
*   Ensure `pgdata` volume is mounted for persistence.
*   Update `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` in `docker-compose.yml` for production-grade security.

### Option B: Managed Database Service (Recommended for Scalability/Reliability)

Use a cloud-managed PostgreSQL service (e.g., AWS RDS, DigitalOcean Managed Database, Supabase).
1.  Provision your managed database instance.
2.  Obtain the connection URL, username, and password.
3.  **Update `backend/.env`**: Change `DATABASE_URL` to point to your managed service's connection string.
    *   Example: `DATABASE_URL=postgresql://prod_user:prod_password@your-managed-db-host.com:5432/prod_taskdb`
4.  **Remove the `db` service from `docker-compose.yml`**:
    *   You will also need to remove `depends_on: db` from the `backend` service.

Similarly, for Redis, you can use a managed Redis service or let Docker Compose handle it. If using managed Redis, update `REDIS_URL` in `backend/.env` and remove the `redis` service from `docker-compose.yml`.

## 5. Building and Deploying with Docker Compose

1.  **Login to GitHub Container Registry (if using private images):**
    ```bash
    echo YOUR_GITHUB_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
    ```
    *Replace `YOUR_GITHUB_PAT` and `YOUR_GITHUB_USERNAME`.*

2.  **Pull latest images and start services:**
    If you're pulling pre-built images from GHCR (as configured in CI/CD):
    ```bash
    docker compose pull
    docker compose up -d --force-recreate
    ```
    If you want to build locally on the server (useful if you don't use GHCR or want to ensure latest code):
    ```bash
    docker compose up --build -d --force-recreate
    ```

3.  **Run migrations:**
    Even with managed DB, you need to run migrations. The `command` in `docker-compose.yml` (for backend) handles this on startup for development, but for production, you might want to run it explicitly after `up`:
    ```bash
    docker compose exec backend npm run migration:run
    ```

4.  **Seed data (if needed):**
    ```bash
    docker compose exec backend npm run seed
    ```

Your backend should now be running on port 5000 and frontend (Nginx) on port 80.

## 6. Setting up Nginx as a Reverse Proxy

Nginx will serve your frontend static files and proxy API requests to your backend container.

1.  **Create Nginx configuration file:**
    ```bash
    sudo nano /etc/nginx/sites-available/task-management-system
    ```

2.  **Add the following configuration:**
    *Replace `yourdomain.com` and `api.yourdomain.com` with your actual domain and API subdomain.*
    ```nginx
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com; # Frontend domain
        return 301 https://$host$request_uri; # Redirect HTTP to HTTPS
    }

    server {
        listen 80;
        server_name api.yourdomain.com; # Backend API domain
        return 301 https://$host$request_uri; # Redirect HTTP to HTTPS
    }

    # HTTPS configuration will be added by Certbot later
    # For now, just focus on redirecting to HTTPS
    ```

3.  **Enable the Nginx configuration:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/task-management-system /etc/nginx/sites-enabled/
    sudo nginx -t # Test Nginx configuration for syntax errors
    sudo systemctl restart nginx
    ```

## 7. SSL/TLS with Certbot

1.  **Install Certbot Nginx plugin:**
    ```bash
    sudo apt install python3-certbot-nginx -y
    ```

2.  **Run Certbot to obtain and install SSL certificates:**
    ```bash
    sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
    ```
    Follow the prompts. Certbot will automatically configure Nginx to use HTTPS and set up automatic renewals.

    After Certbot runs, your `task-management-system` Nginx config will be updated to include HTTPS blocks.
    **Example of Certbot-generated Nginx config (partially):**
    ```nginx
    server {
        listen 443 ssl; # managed by Certbot
        server_name yourdomain.com www.yourdomain.com; # Frontend domain

        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem; # managed by Certbot
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem; # managed by Certbot
        include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
        ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

        # Serve frontend static files
        root /var/www/task-management-system/frontend/build;
        index index.html index.htm;

        location / {
            try_files $uri $uri/ /index.html;
        }
    }

    server {
        listen 443 ssl; # managed by Certbot
        server_name api.yourdomain.com; # Backend API domain

        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem; # managed by Certbot
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem; # managed by Certbot
        include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
        ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

        # Proxy API requests to the backend container
        location /api/ {
            proxy_pass http://localhost:5000; # Or http://backend:5000 if Nginx is in same Docker network
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Health Check
        location /health {
            proxy_pass http://localhost:5000/health;
        }
    }
    ```
    **Important:** Notice `proxy_pass http://localhost:5000`. If Nginx is running directly on the host, `localhost` works for the `backend` container mapped to host port 5000. If Nginx itself were also containerized in the same `docker-compose.yml` network, you'd use `http://backend:5000`. This setup assumes Nginx on host.

## 8. Monitoring & Logging

*   **Backend Logs**: Winston configured to write logs to files (`logs/error.log`, `logs/combined.log`, `logs/production.log`). You can collect these logs using a tool like Filebeat and send them to a centralized logging system (e.g., ELK Stack, Grafana Loki).
*   **Docker Logs**: Use `docker compose logs -f` to view container logs.
*   **Nginx Logs**: Nginx access and error logs are typically in `/var/log/nginx/`.
*   **System Monitoring**: Tools like `htop`, ` glances`, Prometheus/Grafana can be used to monitor VM resource usage.

## 9. CI/CD Integration

The `deploy` job in `.github/workflows/ci-cd.yml` automates the deployment process.

1.  **Configure GitHub Actions Secrets**:
    In your GitHub repository settings, navigate to `Settings > Secrets and variables > Actions`.
    Add the following repository secrets:
    *   `PROD_SSH_HOST`: IP address or hostname of your production VM.
    *   `PROD_SSH_USER`: SSH username (e.g., `ubuntu`).
    *   `PROD_SSH_KEY`: Your private SSH key (ensure it's formatted correctly, including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` lines).
    *   `PROD_DATABASE_URL`: Production database connection string.
    *   `PROD_JWT_SECRET`: Production JWT secret.
    *   `PROD_REDIS_URL`: Production Redis URL.
    *   `PROD_FRONTEND_API_URL`: The public API base URL for your frontend (e.g., `https://api.yourdomain.com/api`).
    *   (Add any other environment variables your backend needs in production).

2.  **Trigger Deployment**:
    Pushing changes to the `main` branch will automatically trigger the `deploy` job after `backend-ci` and `frontend-ci` jobs pass. This will connect to your server via SSH, pull the latest Docker images, and restart the services.

## 10. Troubleshooting

*   **Check Docker container status**: `docker compose ps`
*   **View container logs**: `docker compose logs -f <service_name>` (e.g., `docker compose logs -f backend`)
*   **Check Nginx status**: `sudo systemctl status nginx`
*   **Test Nginx config**: `sudo nginx -t`
*   **Check firewall rules**: `sudo ufw status`
*   **Verify domain DNS records**: Ensure your domain and API subdomain point to your server's public IP.
*   **Check `.env` files**: Ensure all environment variables are correctly set for the `production` environment.
*   **Database connectivity**: From within the backend container, try to connect to the database manually (e.g., `docker compose exec backend psql -h db -U user -d taskdb` for dockerized DB, or adjust host for managed DB).
*   **Certbot renewal**: Check `sudo certbot renew --dry-run` to ensure renewals are working.