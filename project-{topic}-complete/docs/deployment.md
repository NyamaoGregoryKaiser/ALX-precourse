```markdown
# E-commerce System Deployment Guide

This document outlines the steps for deploying the E-commerce Solution System to a production environment using Docker and Docker Compose. This guide assumes you have a cloud server (e.g., AWS EC2, DigitalOcean Droplet, GCP Compute Engine) with Docker and Docker Compose installed.

## Table of Contents

1.  [Prerequisites](#1-prerequisites)
2.  [Server Setup](#2-server-setup)
3.  [Application Deployment](#3-application-deployment)
4.  [Reverse Proxy with Nginx](#4-reverse-proxy-with-nginx)
5.  [HTTPS with Certbot (Let's Encrypt)](#5-https-with-certbot-lets-encrypt)
6.  [CI/CD for Automated Deployments](#6-cicd-for-automated-deployments)
7.  [Monitoring & Logging](#7-monitoring--logging)
8.  [Scaling Considerations](#8-scaling-considerations)

---

## 1. Prerequisites

*   **A Cloud Server**: An Ubuntu 20.04+ or similar Linux VM with at least 2GB RAM (4GB+ recommended) and 2 vCPUs.
*   **Domain Name**: A registered domain name (e.g., `your-ecommerce.com`) pointing to your server's public IP address via A records.
    *   `A record` for `your-ecommerce.com` -> your server IP
    *   `A record` for `www.your-ecommerce.com` -> your server IP
*   **SSH Access**: To connect to your server.
*   **Docker & Docker Compose**: Installed on your server.
    *   Install Docker: `sudo apt update && sudo apt install docker.io -y`
    *   Add user to docker group: `sudo usermod -aG docker $USER && newgrp docker`
    *   Install Docker Compose: `sudo apt install docker-compose -y` (or use `pip install docker-compose` for latest)
*   **Git**: Installed on your server.

---

## 2. Server Setup

1.  **SSH into your server**:
    ```bash
    ssh your_user@your_server_ip
    ```

2.  **Update system packages**:
    ```bash
    sudo apt update && sudo apt upgrade -y
    ```

3.  **Install Nginx**: (Will be used as a reverse proxy for HTTPS termination and static file serving)
    ```bash
    sudo apt install nginx -y
    ```

4.  **Create application directory**:
    ```bash
    sudo mkdir -p /var/www/ecommerce-prod
    sudo chown -R $USER:$USER /var/www/ecommerce-prod
    cd /var/www/ecommerce-prod
    ```

5.  **Clone your repository**:
    ```bash
    git clone https://github.com/your-username/ecommerce-system.git . # Clone into current directory
    ```

6.  **Create production `.env` files**:
    *   Copy `backend/.env.example` to `backend/.env`
    *   Copy `frontend/.env.example` to `frontend/.env`
    *   **Crucially, edit these files with production-ready values**:
        *   **`backend/.env`**:
            *   `NODE_ENV=production`
            *   `DB_HOST=db` (important for Docker Compose internal network)
            *   `REDIS_HOST=redis`
            *   Set strong, unique passwords for `DB_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET`.
            *   Update `ADMIN_EMAIL` and `ADMIN_PASSWORD` for your production admin account.
        *   **`frontend/.env`**:
            *   `REACT_APP_API_BASE_URL=https://your-api-domain.com/api/v1` (or `https://your-ecommerce.com/api/v1`)
            *   Note: The `frontend/Dockerfile` uses Nginx which will serve the build assets. The `REACT_APP_API_BASE_URL` is configured for the frontend build process.

---

## 3. Application Deployment

1.  **Navigate to the application root directory**:
    ```bash
    cd /var/www/ecommerce-prod
    ```

2.  **Build Docker images**:
    ```bash
    docker-compose build
    ```
    This will build the `backend` and `frontend` images as defined in `docker-compose.yml`. The `frontend` image will also include an Nginx server to serve its static files.

3.  **Start the services**:
    ```bash
    docker-compose up -d
    ```
    This command brings up all services (PostgreSQL, Redis, Backend, Frontend Nginx) in detached mode.

4.  **Run database migrations**:
    ```bash
    docker-compose exec backend npm run migration:run
    ```

5.  **Seed the database (if needed for initial data)**:
    ```bash
    docker-compose exec backend npm run seed:run
    ```

6.  **Verify services are running**:
    ```bash
    docker-compose ps
    docker-compose logs -f
    ```
    Check logs for any errors. Ensure `db` service is healthy and `backend`/`frontend` are up.

---

## 4. Reverse Proxy with Nginx

We'll use Nginx on the host machine to proxy requests to the Dockerized frontend service (serving static files) and the backend API. This Nginx instance will also handle SSL termination.

1.  **Create Nginx configuration file**:
    ```bash
    sudo nano /etc/nginx/sites-available/ecommerce.conf
    ```
    Paste the following configuration, replacing `your-ecommerce.com` and `www.your-ecommerce.com` with your actual domain names.

    ```nginx
    server {
        listen 80;
        listen [::]:80;
        server_name your-ecommerce.com www.your-ecommerce.com;

        location / {
            # Redirect all HTTP to HTTPS
            return 301 https://$host$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name your-ecommerce.com www.your-ecommerce.com;

        # SSL configuration - these will be generated by Certbot later
        ssl_certificate /etc/letsencrypt/live/your-ecommerce.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/your-ecommerce.com/privkey.pem;
        ssl_trusted_certificate /etc/letsencrypt/live/your-ecommerce.com/chain.pem;

        # Recommended SSL settings from Certbot
        include /etc/letsencrypt/options-ssl-nginx.conf;
        ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # Generate this with: sudo openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048

        # Frontend application (served by Dockerized Nginx)
        location / {
            proxy_pass http://localhost:3000; # Points to the Docker Compose frontend service
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_redirect off;
        }

        # Backend API
        location /api/v1/ {
            proxy_pass http://localhost:5000/api/v1/; # Points to the Docker Compose backend service
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_redirect off;
            # Optional: Increase buffer sizes for large API responses
            proxy_buffer_size   128k;
            proxy_buffers   4 256k;
            proxy_busy_buffers_size   256k;
        }

        # Optional: WebSocket proxy for future features (e.g., chat)
        # location /ws/ {
        #     proxy_pass http://localhost:5000/ws/;
        #     proxy_http_version 1.1;
        #     proxy_set_header Upgrade $websocket_upgrade;
        #     proxy_set_header Connection $connection_upgrade;
        #     proxy_set_header Host $host;
        # }

        # Error pages
        error_page 500 502 503 504 /50x.html;
        location = /50x.html {
            root /usr/share/nginx/html;
        }
    }
    ```

2.  **Create a symlink to enable the configuration**:
    ```bash
    sudo ln -s /etc/nginx/sites-available/ecommerce.conf /etc/nginx/sites-enabled/
    ```

3.  **Test Nginx configuration**:
    ```bash
    sudo nginx -t
    ```
    If successful, you should see: `syntax is ok` and `test is successful`.

4.  **Reload Nginx**:
    ```bash
    sudo systemctl reload nginx
    ```
    At this point, your site should be accessible via HTTP, but HTTPS won't work yet because certificates are missing.

---

## 5. HTTPS with Certbot (Let's Encrypt)

1.  **Install Certbot Nginx plugin**:
    ```bash
    sudo apt install certbot python3-certbot-nginx -y
    ```

2.  **Generate SSL certificates**:
    ```bash
    sudo certbot --nginx -d your-ecommerce.com -d www.your-ecommerce.com
    ```
    Follow the prompts. Certbot will automatically configure Nginx to use the certificates and set up automatic renewal.

3.  **Generate strong DH parameters (recommended)**:
    ```bash
    sudo openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
    ```
    Then, ensure `ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;` is uncommented in your Nginx config.

4.  **Test automatic renewal**:
    ```bash
    sudo certbot renew --dry-run
    ```
    This command should run without errors.

5.  **Verify HTTPS**:
    Open your browser and navigate to `https://your-ecommerce.com`. Your site should load securely.

---

## 6. CI/CD for Automated Deployments

The `/.github/workflows/main.yml` file sets up a GitHub Actions pipeline.

1.  **Configure GitHub Secrets**:
    In your GitHub repository settings, go to `Settings -> Secrets -> Actions` and add the following:
    *   `DOCKER_USERNAME`: Your Docker Hub username.
    *   `DOCKER_PASSWORD`: Your Docker Hub Access Token (recommended over password).
    *   `DEV_SERVER_HOST`: IP address or hostname of your development server.
    *   `DEV_SERVER_USER`: SSH username for your development server.
    *   `DEV_SERVER_SSH_KEY`: Private SSH key for your development server (paste the *entire* key, including `-----BEGIN ...-----` and `-----END ...-----`).
    *   `PROD_SERVER_HOST`: IP address or hostname of your production server.
    *   `PROD_SERVER_USER`: SSH username for your production server.
    *   `PROD_SERVER_SSH_KEY`: Private SSH key for your production server.

2.  **Adjust `main.yml`**:
    *   Review the `deploy-to-development` and `deploy-to-production` jobs.
    *   The current `script` in the SSH action performs a `docker-compose down` followed by `up -d --build`. This will pull fresh code and rebuild images. For zero-downtime deployments, consider blue/green deployments or Kubernetes rolling updates.
    *   Ensure the `docker-compose.yml` on the server is using the correct image tags (e.g., `image: your-username/ecommerce-backend:prod-${{ github.sha }}`). This typically involves a `sed` command or templating the `docker-compose.yml` on the server. For simplicity, the current script relies on `docker-compose up -d --build` to re-build from the cloned source.

3.  **Push changes**:
    Pushing to `develop` branch will trigger deployment to the development server. Pushing to `main` branch will trigger deployment to the production server.

---

## 7. Monitoring & Logging

*   **Host-level Monitoring**: Use `htop`, `top`, `docker stats` to monitor CPU, memory, and network usage. Cloud providers offer their own monitoring dashboards.
*   **Application Logging**: Backend logs are written to `logs/combined.log` and `logs/error.log` within the backend container. You can set up log aggregation tools (e.g., ELK stack, Datadog, Grafana Loki) to centralize and analyze these logs.
*   **Error Reporting**: Integrate an error reporting service like Sentry or Bugsnag into your backend for real-time error alerts.
*   **Health Checks**: Ensure your Docker Compose `healthcheck` configurations are robust. Nginx can also check backend health.

---

## 8. Scaling Considerations

*   **Database**: PostgreSQL can be scaled vertically (more powerful server) or horizontally (read replicas, sharding, managed database services like AWS RDS).
*   **Redis**: Can be scaled vertically or horizontally (Redis Cluster).
*   **Backend**: The Node.js backend is stateless (due to JWT, Redis for caching). It can be scaled horizontally by running multiple instances behind a load balancer.
*   **Frontend**: The frontend (static files) can be served efficiently from a CDN (Content Delivery Network).
*   **Container Orchestration**: For more advanced scaling, resilience, and automated deployments, consider moving from Docker Compose to a container orchestration platform like **Docker Swarm** or **Kubernetes**.
    *   This would involve defining your services in Kubernetes YAML files (Deployments, Services, Ingresses) or Docker Swarm stacks.

This guide provides a robust starting point for deploying your e-commerce system. Remember to continuously monitor your application in production and iterate on your deployment strategy as your needs evolve.
```