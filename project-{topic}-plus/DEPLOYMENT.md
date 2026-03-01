```markdown
# ShopSwift E-commerce Solution: Deployment Guide

This document outlines the steps to deploy the ShopSwift application to a production environment. We will focus on a Dockerized deployment using Gunicorn as the WSGI server and Nginx as a reverse proxy, with PostgreSQL and Redis as backing services.

## 1. Prerequisites

*   **A Linux Server (e.g., Ubuntu LTS)**: With SSH access.
*   **Docker & Docker Compose**: Installed on the server.
*   **Domain Name**: Pointing to your server's IP address.
*   **SSL Certificate**: (Highly recommended) For HTTPS (e.g., Let's Encrypt with Certbot).
*   **Environment Variables**: All sensitive configuration (`.env` values) should be securely managed.

## 2. Server Setup

### 2.1. Update and Install Docker

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add your user to the docker group to run docker commands without sudo (optional, but convenient)
sudo usermod -aG docker ${USER}
# Log out and log back in for the group change to take effect
```

### 2.2. Clone the Repository

Clone your project to a suitable directory on your server, e.g., `/srv/shopsift`.

```bash
sudo mkdir -p /srv/shopsift
sudo chown ${USER}:${USER} /srv/shopsift
git clone https://github.com/your-username/shopsift.git /srv/shopsift
cd /srv/shopsift
```

## 3. Configuration

### 3.1. Environment Variables

Create a `.env` file in the project root (`/srv/shopsift/.env`).
**It is crucial that you set strong, unique values for all production secrets.**

```ini
# Production Specific Settings
FLASK_APP=manage.py
FLASK_ENV=production # IMPORTANT: Set to production

# Database Configuration
# Use a strong password and a dedicated user for production
DATABASE_URL=postgresql://shopsift_user:YOUR_DB_PASSWORD@db:5432/shopsift_db

# JWT Configuration
# GENERATE A NEW, LONG, RANDOM KEY FOR PRODUCTION!
JWT_SECRET_KEY=YOUR_PRODUCTION_JWT_SECRET_KEY_HERE
JWT_ACCESS_TOKEN_EXPIRES_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRES_DAYS=7

# Cache Configuration (Redis)
REDIS_URL=redis://redis:6379/0

# Rate Limiting
RATELIMIT_STORAGE_URL=redis://redis:6379/1

# Sentry DSN (Optional, for error monitoring)
# SENTRY_DSN=https://examplepublickey@o0.ingest.sentry.io/0
```
**Best Practice**: For real production, consider using a dedicated secrets management solution (e.g., AWS Secrets Manager, HashiCorp Vault, Kubernetes Secrets) instead of `.env` files directly on the server.

### 3.2. Docker Compose for Production

The `docker-compose.yml` file defines our services. For production, ensure it's configured appropriately:
*   Use `restart: always` for services.
*   Map persistent volumes for `db` and `redis` data.
*   The `app` service uses `gunicorn` to serve the Flask app.
*   **Remove development-specific commands** like `flask seed-db` from the `command` section of the `app` service. You'll run migrations/seeds manually or as part of a CI/CD script.

```yaml
# /srv/shopsift/docker-compose.yml (adjust if different from development version)
version: '3.8'

services:
  db:
    image: postgres:13-alpine
    restart: always
    env_file: ./.env
    # The DATABASE_URL in .env points to 'db' service name
    # You will likely want to define individual POSTGRES_* env vars too,
    # or ensure DATABASE_URL is sufficient for the container to setup its internal user/db.
    # For simplicity, if .env has DATABASE_URL, docker-entrypoint will often
    # parse it or you might need specific POSTGRES_DB/USER/PASSWORD envs.
    environment:
      POSTGRES_DB: shopsift_db
      POSTGRES_USER: shopsift_user
      POSTGRES_PASSWORD: YOUR_DB_PASSWORD # Matches .env, but directly set for Postgres image
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck: # Added healthcheck for robust startup
      test: ["CMD-SHELL", "pg_isready -U shopsift_user -d shopsift_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:6-alpine
    restart: always
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD-SHELL", "redis-cli ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build: .
    restart: always
    env_file: ./.env
    volumes:
      # In production, you typically don't mount the app code directly,
      # it's baked into the image. Comment out or remove this line:
      # - .:/app
    depends_on:
      db:
        condition: service_healthy # Wait for DB to be healthy
      redis:
        condition: service_healthy # Wait for Redis to be healthy
    command: gunicorn --bind 0.0.0.0:5000 --workers 4 manage:app # Use Gunicorn

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443" # For HTTPS
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./certs:/etc/nginx/certs:ro # For SSL certificates
      # If serving static files directly from Nginx:
      # - ./app/static:/app/static:ro # Example, assuming static files are in app/static
    depends_on:
      - app

volumes:
  postgres_data:
  redis_data:
```

### 3.3. Nginx Configuration

Create an `nginx` directory in your project root (`/srv/shopsift/nginx`) with the following files:

**`/srv/shopsift/nginx/nginx.conf`**:
```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    include /etc/nginx/conf.d/*.conf;
}
```

**`/srv/shopsift/nginx/conf.d/default.conf`**:
Replace `your_domain.com` with your actual domain.

```nginx
server {
    listen 80;
    server_name your_domain.com www.your_domain.com;

    # Redirect all HTTP traffic to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your_domain.com www.your_domain.com;

    ssl_certificate /etc/nginx/certs/fullchain.pem; # Managed by Certbot/Let's Encrypt
    ssl_certificate_key /etc/nginx/certs/privkey.pem; # Managed by Certbot/Let's Encrypt

    ssl_session_cache shared:SSL:1m;
    ssl_session_timeout 5m;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Optional: Enable HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://app:5000; # 'app' is the name of your Flask service in docker-compose
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    # If you have static files to serve (e.g., frontend built assets, images)
    # location /static/ {
    #     alias /app/static/; # Matches the volume mount in docker-compose for app/static
    #     expires 30d;
    #     access_log off;
    #     log_not_found off;
    # }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

### 3.4. SSL Certificates (Certbot/Let's Encrypt)

1.  **Stop Nginx if running outside Docker**: If you previously had Nginx running on the host for setup, stop it. For Docker, Certbot can issue certificates using the `webroot` plugin.
2.  **Install Certbot on host**:
    ```bash
    sudo snap install core; sudo snap refresh core
    sudo snap install --classic certbot
    sudo ln -s /snap/bin/certbot /usr/bin/certbot
    ```
3.  **Create dummy Nginx config for Certbot validation (if needed, often handled by certbot itself)**:
    Sometimes it's easier to run Nginx on port 80 initially, then use `certbot certonly --webroot` with your Nginx container, or even stop Nginx and use `--standalone`.
    A simpler approach for Docker-based Nginx:
    ```bash
    # Temporarily run Nginx on port 80 only to allow Certbot to validate
    # Modify docker-compose.yml to only map port 80:80 for nginx
    # docker-compose up -d nginx

    # Then use Certbot on your host, pointing it to the Nginx webroot for validation
    # This assumes Nginx serves a static directory accessible by Certbot
    # It's generally better to use --standalone or --nginx plugin if possible
    
    # Easiest: Use Certbot's `nginx` plugin if you installed Nginx on the host
    sudo certbot --nginx -d your_domain.com -d www.your_domain.com
    # Or, if running webroot via docker:
    sudo docker-compose run --rm certbot certonly --webroot --webroot-path /var/www/certbot -d your_domain.com -d www.your_domain.com
    # You'd need a certbot service and volume mount for /var/www/certbot in docker-compose.yml
    ```
    For a simplified setup using `webroot` with Nginx inside Docker, create a `certs` directory and map it in Nginx.

    **Recommended Docker-native Certbot setup**:
    Add `certbot` service to `docker-compose.yml` to manage certificates:
    ```yaml
    # ... inside docker-compose.yml
    services:
      # ... db, redis, app, nginx services

      certbot:
        image: certbot/certbot
        restart: unless-stopped
        volumes:
          - ./certs:/etc/letsencrypt
          - ./nginx/data/certbot:/var/www/certbot # Path for webroot challenges
        command: certonly --webroot -w /var/www/certbot --email your_email@example.com -d your_domain.com --rsa-key-size 4096 --agree-tos --non-interactive
        # Use depends_on if Nginx needs to be running for validation, or run manually.
        # This will obtain the certificate once. For renewal, set up a cron job or a more advanced orchestrator.
    # ... at the bottom with other volumes
    volumes:
      # ... postgres_data, redis_data
      nginx_data_certbot: # If Nginx needs to write here for webroot challenge
    ```
    You would run `docker-compose up certbot` *after* Nginx is running and configured for the webroot path.

4.  **Create `/srv/shopsift/certs` directory**:
    This is where Certbot will place your certificates.
    ```bash
    sudo mkdir -p /srv/shopsift/certs
    ```
    After running Certbot, copy `fullchain.pem` and `privkey.pem` into this `certs` directory if Certbot created them elsewhere (e.g., `/etc/letsencrypt/live/your_domain.com/`). The Nginx container will mount these.

## 4. Deploy the Application

1.  **Build the Docker image (if not done by CI/CD)**:
    ```bash
    docker-compose build app
    ```
    Or, if you push to Docker Hub from CI/CD, simply `docker-compose pull app`.

2.  **Run Database Migrations and Seed Data**:
    It's critical to run migrations before starting the `app` service fully, especially for the first deploy.
    ```bash
    docker-compose run --rm app flask db upgrade
    docker-compose run --rm app flask seed-db # Optional, for initial data
    docker-compose run --rm app flask create-admin admin@yourdomain.com your_admin_password # Create production admin
    ```
    The `--rm` flag ensures the container is removed after the command runs.

3.  **Start all services**:
    ```bash
    docker-compose up -d
    ```
    The `-d` flag runs containers in detached mode (in the background).

4.  **Verify**:
    Check Docker logs: `docker-compose logs -f`
    Check Nginx logs: `docker-compose logs -f nginx`
    Access your domain `https://your_domain.com` in a browser.

## 5. Continuous Deployment (CI/CD)

The `.github/workflows/ci-cd.yml` file provides a GitHub Actions pipeline example.
*   It builds the application and runs tests on push/pull requests.
*   For `develop` branch pushes, it deploys to a staging environment.
*   For `main` branch pushes, it deploys to production (can be made manual approval).

**Key steps in CI/CD deployment:**
1.  **Build Docker Image**: Build the application image with a unique tag (e.g., Git SHA).
2.  **Push to Container Registry**: Push the image to Docker Hub, AWS ECR, GCP GCR, etc.
3.  **SSH to Server**: Connect to your deployment server via SSH.
4.  **Pull Latest Image**: `docker-compose pull app`.
5.  **Run Migrations**: `docker-compose run --rm app flask db upgrade`.
6.  **Restart Application**: `docker-compose up -d --no-deps app` (restarts only the app service, preserving DB/Redis).
7.  **Cleanup**: `docker system prune -f` to remove old Docker images.

## 6. Monitoring and Maintenance

*   **Logs**: Set up a centralized logging solution (e.g., ELK stack, Grafana Loki, Datadog) to collect logs from all containers.
*   **Error Tracking**: Integrate Sentry or a similar service (`SENTRY_DSN` in `.env`) for real-time error alerts.
*   **Metrics**: Use Prometheus and Grafana to monitor application and infrastructure metrics (CPU, memory, network, request latency, error rates).
*   **Backups**: Implement a robust database backup strategy for PostgreSQL.
*   **Security Updates**: Regularly update your server's OS, Docker, and application dependencies.
*   **Container Updates**: Periodically update base images (e.g., `python:3.10-slim-buster`, `postgres:13-alpine`).

This guide provides a solid foundation for deploying your ShopSwift application. Remember to adapt it to your specific infrastructure, security requirements, and organizational practices.
```