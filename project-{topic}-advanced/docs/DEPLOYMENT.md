```markdown
# ALX-ECommerce-Pro: Deployment Guide

This guide outlines the steps to deploy the ALX-ECommerce-Pro application to a production environment. We'll focus on a cloud-agnostic approach using Docker, which can be adapted for various cloud providers like AWS, DigitalOcean, Render, or any Linux server.

## 1. Pre-deployment Checklist

Before deploying, ensure you have:

*   **A cloud provider account** (e.g., AWS, DigitalOcean, Azure, Google Cloud, Render, Vercel for frontend).
*   **Domain Name** configured with DNS records pointing to your server/load balancer.
*   **SSH access** to your server if deploying manually.
*   **Docker & Docker Compose** installed on your production server.
*   **Container Registry access** (e.g., Docker Hub, AWS ECR, GitHub Container Registry) for storing your Docker images.
*   **Environment Variables**: All sensitive information and environment-specific configurations externalized.
    *   `JWT_SECRET` (Backend)
    *   `DATABASE_URL` (Backend, pointing to your production PostgreSQL)
    *   `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (Backend, pointing to your production Redis)
    *   `FRONTEND_URL` (Backend, for CORS)
    *   `VITE_API_BASE_URL` (Frontend, pointing to your deployed backend API URL)
    *   `NODE_ENV=production` (Backend)

## 2. Setting up Production Infrastructure

### 2.1. Database (PostgreSQL)

**Recommendation:** Use a Managed Database Service provided by your cloud provider (e.g., AWS RDS, DigitalOcean Managed PostgreSQL, Azure Database for PostgreSQL). This handles backups, scaling, and maintenance.

1.  **Provision a PostgreSQL database instance.**
2.  **Note the connection string** (host, port, user, password, database name). This will be your `DATABASE_URL`.
3.  **Configure firewall rules** to allow connections from your backend server.

### 2.2. Caching (Redis)

**Recommendation:** Use a Managed Redis Service (e.g., AWS ElastiCache, DigitalOcean Managed Redis).

1.  **Provision a Redis instance.**
2.  **Note the connection details** (host, port, password). These will be your `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`.
3.  **Configure firewall rules** to allow connections from your backend server.

### 2.3. Compute Instance (Server)

You'll need a virtual machine or container orchestration service to run your backend and frontend Docker containers.

**Options:**
*   **Virtual Machine (EC2, Droplet):** A single VM running Docker and Docker Compose. Simpler for smaller deployments.
*   **Container Orchestration (ECS, Kubernetes):** For larger, highly scalable, and fault-tolerant deployments. More complex initial setup.

For this guide, we assume a single VM running Docker Compose.

## 3. Building and Pushing Docker Images

This step is typically integrated into your CI/CD pipeline.

1.  **Login to your container registry:**
    ```bash
    docker login your-registry.com # e.g., docker login
    ```

2.  **Build Backend Image:**
    ```bash
    cd backend
    docker build -t your-registry.com/your-username/alx-ecommerce-backend:latest .
    cd ..
    ```

3.  **Build Frontend Image:**
    ```bash
    cd frontend
    docker build -t your-registry.com/your-username/alx-ecommerce-frontend:latest .
    cd ..
    ```

4.  **Push Images to Registry:**
    ```bash
    docker push your-registry.com/your-username/alx-ecommerce-backend:latest
    docker push your-registry.com/your-username/alx-ecommerce-frontend:latest
    ```

## 4. Deployment to Production Server (using Docker Compose)

1.  **SSH into your production server.**

2.  **Create a deployment directory:**
    ```bash
    mkdir alx-ecommerce-prod
    cd alx-ecommerce-prod
    ```

3.  **Create `docker-compose.prod.yml`:**
    Modify the `docker-compose.yml` to use your pushed images and production environment variables.

    ```yaml
    # docker-compose.prod.yml
    version: '3.8'

    services:
      db:
        # We assume a managed database, so 'db' service might not be needed
        # Or you might run a simple PostgreSQL container if your deployment is small
        image: postgres:16-alpine
        restart: always
        environment:
          POSTGRES_USER: ${DB_USER}
          POSTGRES_PASSWORD: ${DB_PASSWORD}
          POSTGRES_DB: ${DB_NAME}
        volumes:
          - postgres_data:/var/lib/postgresql/data
        # Remove ports mapping if DB is only accessible within the Docker network
        # or if using a managed service (then this service is omitted).
        # ports:
        #   - "5432:5432"
        healthcheck:
          test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
          interval: 5s
          timeout: 5s
          retries: 5

      redis:
        # Similar to DB, prefer managed Redis.
        image: redis:7-alpine
        restart: always
        environment:
          REDIS_PASSWORD: ${REDIS_PASSWORD} # If your Redis has a password
        volumes:
          - redis_data:/data
        command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD} # Ensure persistence and password
        # ports:
        #   - "6379:6379"
        healthcheck:
          test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
          interval: 5s
          timeout: 3s
          retries: 5

      backend:
        image: your-registry.com/your-username/alx-ecommerce-backend:latest
        restart: always
        environment:
          PORT: 5000
          DATABASE_URL: ${PROD_DATABASE_URL} # Use your production DB URL
          JWT_SECRET: ${PROD_JWT_SECRET}
          JWT_EXPIRATION_TIME: 1h
          REDIS_HOST: ${PROD_REDIS_HOST} # Use your production Redis host
          REDIS_PORT: ${PROD_REDIS_PORT}
          REDIS_PASSWORD: ${PROD_REDIS_PASSWORD} # If your Redis has a password
          NODE_ENV: production
          FRONTEND_URL: ${PROD_FRONTEND_URL} # Your actual frontend domain
        ports:
          - "5000:5000" # Expose backend port to host
        depends_on:
          db: # Only if you run DB as a container
            condition: service_healthy
          redis: # Only if you run Redis as a container
            condition: service_healthy
        # Important: Apply migrations and seed only once or when needed.
        # For production, it's safer to run `prisma migrate deploy` as a separate step
        # or as part of a release process, not on every container startup.
        # For simplicity in this demo, it's in CMD. In real production, separate this.
        # command: sh -c "npx prisma migrate deploy && npm start"
        command: ["npm", "start"] # Or an entrypoint script that handles migrations safely

      frontend:
        image: your-registry.com/your-username/alx-ecommerce-frontend:latest
        restart: always
        environment:
          VITE_API_BASE_URL: ${PROD_BACKEND_API_URL} # Your actual backend API URL
        ports:
          - "80:80" # Map host port 80 to Nginx container's port 80
          # - "443:443" # For HTTPS with a reverse proxy like Nginx or Caddy on the host
        depends_on:
          - backend

    volumes:
      postgres_data: # If you manage Postgres in Docker
      redis_data:    # If you manage Redis in Docker
    ```
    **Note on `db` and `redis` services in `docker-compose.prod.yml`:**
    *   If you're using **managed cloud services** for PostgreSQL and Redis, you should **REMOVE** the `db` and `redis` service definitions from `docker-compose.prod.yml`. Your `backend` service will then connect directly to the cloud service endpoints using the `PROD_DATABASE_URL`, `PROD_REDIS_HOST`, etc., defined in your environment variables. This is the recommended approach for production.
    *   If your deployment is small and you're hosting everything on a **single VM**, you can keep them, but ensure their environment variables are robust and externalized.

4.  **Create a `.env` file for Docker Compose:**
    This file will hold all your production environment variables.
    ```bash
    touch .env
    # Add your production variables to this .env file, e.g.:
    # PROD_DATABASE_URL="postgresql://user:password@my-prod-db-host:5432/ecommerce_prod_db?schema=public"
    # PROD_JWT_SECRET="YOUR_VERY_STRONG_PROD_JWT_SECRET"
    # PROD_REDIS_HOST="my-prod-redis-host"
    # PROD_REDIS_PORT=6379
    # PROD_REDIS_PASSWORD="your-redis-password" # If applicable
    # PROD_FRONTEND_URL="https://www.yourdomain.com"
    # PROD_BACKEND_API_URL="https://api.yourdomain.com/api"
    # DB_USER=your_docker_db_user (if using local docker db)
    # DB_PASSWORD=your_docker_db_password
    # DB_NAME=your_docker_db_name
    ```
    **Important:** This `.env` file should be secure and not committed to source control.

5.  **Run Docker Compose:**
    ```bash
    docker compose -f docker-compose.prod.yml up --build -d
    ```
    *   `--build` is generally not needed after initial image push if you're pulling from a registry, but harmless.
    *   `docker compose pull` can be used beforehand to ensure latest images are downloaded.

6.  **Initial Database Migrations & Seeding (Crucial First-Time Step):**
    If your backend `CMD` does not automatically run `prisma migrate deploy` and `prisma db seed` (recommended for safety in prod), you need to run them manually *after* the `db` service is up and accessible, and *before* the backend attempts to connect for the first time.

    ```bash
    # Ensure backend container is running, but don't hit its API yet.
    # Connect to the backend container to run prisma commands.
    docker compose -f docker-compose.prod.yml exec backend sh -c "npx prisma migrate deploy"
    docker compose -f docker-compose.prod.yml exec backend sh -c "npx prisma db seed" # Only if you need seed data
    ```
    Restart the backend container if necessary after migrations:
    ```bash
    docker compose -f docker-compose.prod.yml restart backend
    ```

## 5. Setting up HTTPS (SSL/TLS)

For a production environment, HTTPS is mandatory.

**Recommendation:** Use a reverse proxy (like Nginx or Caddy) on your host machine or as a separate Docker container, configured to handle SSL termination using certificates from Let's Encrypt (via Certbot).

**Example Nginx (Host) Configuration:**

```nginx
# /etc/nginx/sites-available/yourdomain.conf
server {
    listen 80;
    server_name www.yourdomain.com yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name www.yourdomain.com yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem; # Managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem; # Managed by Certbot

    # Standard SSL settings
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers "TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384";
    ssl_prefer_server_ciphers on;

    # Frontend (React)
    location / {
        proxy_pass http://localhost:80/; # Forward to frontend container (Nginx)
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000/api/; # Forward to backend container
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Optional: Log files
    access_log /var/log/nginx/yourdomain.access.log;
    error_log /var/log/nginx/yourdomain.error.log;
}
```
**Steps to configure Nginx with Certbot:**
1.  **Install Nginx** on your host server.
2.  **Install Certbot** and obtain SSL certificates for your domain:
    ```bash
    sudo snap install --classic certbot
    sudo ln -s /snap/bin/certbot /usr/bin/certbot
    sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
    ```
3.  **Create the Nginx configuration file** (`/etc/nginx/sites-available/yourdomain.conf`) as above, linking to the Docker container ports.
4.  **Enable the configuration:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/yourdomain.conf /etc/nginx/sites-enabled/
    sudo nginx -t # Test Nginx configuration
    sudo systemctl restart nginx
    ```
5.  Ensure your Docker Compose ports are mapped correctly: `frontend` should map `80:80` (if Nginx directly accesses it, or no mapping if host Nginx handles external traffic), `backend` should map `5000:5000`.

## 6. Monitoring and Logging

*   **Backend Logs:** Configure Winston to write logs to files or a centralized logging service (e.g., ELK Stack, Loggly, Papertrail). Docker container logs can be collected by tools like `fluentd` or cloud-native log collectors.
*   **Performance Monitoring:** Use tools like Prometheus/Grafana or cloud-specific monitoring (e.g., AWS CloudWatch) to track CPU, memory, network, and application metrics (response times, error rates).
*   **Health Checks:** `health` endpoint on backend (`GET /health`) can be used by load balancers and monitoring systems.

## 7. CI/CD for Production Deployment

Extend the GitHub Actions workflows (`.github/workflows/`) to include deployment steps:

1.  **Build Docker Images.**
2.  **Push Images to Container Registry.**
3.  **SSH into production server.**
4.  **Pull latest images.**
5.  **Run `docker compose -f docker-compose.prod.yml up -d --force-recreate`** to update containers with new images.
6.  **Execute database migrations** (safely) if not done automatically by the `CMD` of the backend.

This ensures a repeatable and automated deployment process, reducing manual errors.
```