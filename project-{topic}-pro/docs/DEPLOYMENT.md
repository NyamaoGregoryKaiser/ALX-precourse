# ALXPay Deployment Guide

This guide provides instructions for deploying the ALXPay system to a production environment using Docker and Docker Compose. For more advanced deployments (e.g., Kubernetes), these steps can be adapted.

## Table of Contents

1.  [Prerequisites](#prerequisites)
2.  [Production Environment Setup](#production-environment-setup)
3.  [Configuration](#configuration)
    *   [Backend .env](#backend-env)
    *   [Frontend .env](#frontend-env)
4.  [Building and Deploying with Docker Compose](#building-and-deploying-with-docker-compose)
5.  [Post-Deployment Steps](#post-deployment-steps)
    *   [Database Migrations](#database-migrations)
    *   [Database Seeding](#database-seeding)
    *   [Webhook Processing](#webhook-processing)
6.  [Monitoring and Logging](#monitoring-and-logging)
7.  [Scaling](#scaling)
8.  [CI/CD with GitHub Actions](#cicd-with-github-actions)

## 1. Prerequisites

*   A Linux server (e.g., Ubuntu, CentOS)
*   Git installed
*   Docker installed (`sudo apt-get install docker.io`)
*   Docker Compose installed (`sudo apt-get install docker-compose`)
*   SSH access to your server
*   Domain name configured with DNS records pointing to your server's IP.
*   (Optional but Recommended) Nginx installed on the host or as a separate container for reverse proxy and SSL termination.

## 2. Production Environment Setup

1.  **SSH into your server:**
    ```bash
    ssh user@your_server_ip
    ```

2.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/alxpay-system.git
    cd alxpay-system
    ```

## 3. Configuration

### Backend `.env`

Create a `.env` file in the `alxpay-system/backend` directory. **Crucially, fill in strong, unique secrets and production-ready database/Redis credentials.**

```dotenv
# Backend/.env (example production values)
PORT=5000
NODE_ENV=production

# Database (PostgreSQL) - Use external managed DB if possible or ensure strong passwords
DB_HOST=postgres # If running as docker-compose service
# DB_HOST=your_managed_db_host.com # If using external cloud DB
DB_PORT=5432
DB_USER=alxpay_prod_user
DB_PASSWORD=YOUR_VERY_STRONG_DB_PASSWORD
DB_NAME=alxpay_production
DB_SSL=false # Set to true if connecting to a cloud DB requiring SSL

# JWT Authentication - GENERATE A LONG, RANDOM, UNIQUE KEY
JWT_SECRET=super_long_random_jwt_secret_for_production_env
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=super_long_random_refresh_token_secret_for_production_env

# Hashing
HASH_SALT_ROUNDS=12 # Higher rounds for production

# Redis Cache & Rate Limiting - Use external managed Redis if possible
REDIS_URL=redis://redis:6379 # If running as docker-compose service
# REDIS_URL=redis://your_managed_redis_host.com:6379 # If using external cloud Redis

# External Payment Gateway URL (Replace with actual production URL)
PAYMENT_GATEWAY_URL=https://api.stripe.com/v1 # Or Paystack/Flutterwave etc.

# Webhook Secret - GENERATE A LONG, RANDOM, UNIQUE KEY
WEBHOOK_SECRET=super_long_random_webhook_secret_for_production

# Other settings
MAX_PAYMENT_AMOUNT=500000
FRONTEND_URL=https://your-frontend-domain.com
```

### Frontend `.env`

Create a `.env` file in the `alxpay-system/frontend` directory.

```dotenv
# Frontend/.env
NODE_ENV=production
REACT_APP_API_BASE_URL=https://api.your-domain.com/api # Points to your Nginx proxy that routes to backend
```

## 4. Building and Deploying with Docker Compose

1.  **Ensure `.env` files are correctly set up** in both `backend` and `frontend` directories.
    *   **Crucial:** For production, you might want to remove the `volumes` for `./backend` and `./frontend` in `docker-compose.yml` to ensure that only the built images are used, and no local changes overwrite the container's files.
    *   Modify the `command` for `backend` service in `docker-compose.yml` from `npm run dev` to `npm run start` or `node dist/server.js`. Also consider making migrations/seeds a separate `exec` step, not part of the `command`.

    **Modified `docker-compose.yml` (for production):**
    ```yaml
    # ... (other services like postgres, redis)
    backend:
      build:
        context: ./backend
        dockerfile: Dockerfile
      container_name: alxpay_backend
      environment:
        # ... your .env variables here ...
      ports:
        - "5000:5000" # Expose internally, Nginx will handle external
      depends_on:
        postgres: { condition: service_healthy }
        redis: { condition: service_healthy }
      # Remove volumes for production to avoid local code overriding built image
      # volumes:
      #   - ./backend:/app
      #   - /app/node_modules
      command: sh -c "npm install --production && npm run start" # Install only production deps and start
      # Alternatively, use a multi-stage build in Dockerfile to copy only build artifacts.
      restart: always

    frontend:
      build:
        context: ./frontend
        dockerfile: Dockerfile
      container_name: alxpay_frontend
      environment:
        # ... your .env variables here ...
      # Remove volumes for production
      # volumes:
      #   - ./frontend:/app
      #   - /app/node_modules
      # Frontend typically runs behind Nginx. Only expose to Nginx internally.
      # ports:
      #   - "3000:3000"
      restart: always

    # Add Nginx service for reverse proxy and SSL
    nginx:
      image: nginx:alpine
      container_name: alxpay_nginx
      ports:
        - "80:80"
        - "443:443"
      volumes:
        - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf # Your Nginx config
        - ./certbot/conf:/etc/letsencrypt # For SSL certificates
        - ./certbot/www:/var/www/certbot # For SSL challenges
      depends_on:
        - backend
        - frontend
      command: "/bin/sh -c 'while :; do sleep 6h & wait $!; nginx -s reload; done & nginx -g \"daemon off;\"'"
      restart: always
    ```
    **Example `nginx/nginx.conf`:**
    ```nginx
    # nginx/nginx.conf
    server {
        listen 80;
        server_name your-domain.com api.your-domain.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://your-domain.com$request_uri;
        }
    }

    server {
        listen 443 ssl;
        server_name your-domain.com;

        ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
        include /etc/letsencrypt/options-ssl-nginx.conf;
        ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

        location / {
            proxy_pass http://frontend:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    server {
        listen 443 ssl;
        server_name api.your-domain.com;

        ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;
        include /etc/letsencrypt/options-ssl-nginx.conf;
        ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

        location /api/ {
            proxy_pass http://backend:5000/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
    ```
    You would use Certbot to generate the SSL certificates for your domains.

2.  **Build and run the Docker containers:**
    ```bash
    docker-compose up -d --build
    ```
    *   `-d` runs containers in detached mode (background).
    *   `--build` rebuilds images to ensure latest code is used.

3.  **Verify container status:**
    ```bash
    docker-compose ps
    ```
    All containers should be `Up` and `healthy`.

## 5. Post-Deployment Steps

### Database Migrations

It's safer to run migrations as a separate step rather than part of the main `command` in `docker-compose.yml`, especially if you have sensitive data.

1.  **Run migrations:**
    ```bash
    docker-compose exec backend npm run typeorm migration:run
    ```

### Database Seeding (Optional, for initial setup)

1.  **Run seed script:**
    ```bash
    docker-compose exec backend npm run seed
    ```
    *   **Caution:** This typically clears the database. Use only for initial setup or test environments.

### Webhook Processing

The `WebhookService.processPendingWebhooks` method is designed to be called periodically. In a production environment, you would set up a cron job on your host machine or a dedicated job processing service within your containerized setup.

**Example Cron Job (on host machine):**
```bash
# Add to cron: `crontab -e`
# Run every 5 minutes
*/5 * * * * cd /path/to/alxpay-system/backend && docker-compose exec backend ts-node src/services/WebhookService.ts processPendingWebhooks > /dev/null 2>&1
```
*(Note: This requires `ts-node` to be installed globally or available in the container and the command to correctly execute the method.)* A better approach would be to expose an internal API endpoint on the backend that a cron job (or another service) can hit, or use a dedicated job queue.

## 6. Monitoring and Logging

*   **Logging:** The backend uses `winston` for structured logging. In production, configure `winston` to output to files or directly to a log aggregation service (e.g., ELK stack, Datadog, CloudWatch Logs).
*   **Container Logs:** `docker-compose logs -f` can be used to view real-time logs from all services.
*   **Health Checks:** Configure health checks for your containers (already in `docker-compose.yml`) to ensure services are running correctly.

## 7. Scaling

*   **Horizontal Scaling:** For more traffic, you can scale the `backend` and `frontend` services by running multiple instances. This requires a load balancer (like Nginx configured in `docker-compose.yml`) to distribute traffic.
    *   `docker-compose up --scale backend=3 -d`
*   **Database:** For heavy database loads, consider using a managed cloud database service (AWS RDS, Google Cloud SQL) which offers easy scaling, backups, and high availability.
*   **Redis:** Similarly, use a managed Redis service for high availability and performance.

## 8. CI/CD with GitHub Actions

The `.github/workflows/main.yml` file provides a basic CI/CD pipeline.

**`alxpay-system/.github/workflows/main.yml`**
```yaml