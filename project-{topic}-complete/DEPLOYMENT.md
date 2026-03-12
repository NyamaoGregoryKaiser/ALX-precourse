# Deployment Guide for Data Visualization Platform

This guide provides instructions for deploying the Data Visualization Platform to a production environment. The recommended approach leverages Docker and Docker Compose for easy container orchestration.

## 1. Prerequisites for Deployment Server

*   A Linux-based server (e.g., Ubuntu LTS, CentOS, Debian).
*   **Docker Engine:** [Install Docker](https://docs.docker.com/engine/install/)
*   **Docker Compose:** [Install Docker Compose](https://docs.docker.com/compose/install/)
*   **Nginx:** (Optional, if not using Dockerized Nginx) For reverse proxy and SSL termination. The `docker-compose.yml` includes an Nginx service which handles this.
*   **Git:** To clone the repository.
*   **SSH Access:** To connect to your server.

## 2. Server Setup Steps

### 2.1. Clone the Repository

Log in to your deployment server via SSH and clone your project repository:

```bash
ssh user@your_server_ip
git clone https://github.com/your-username/data-visualization-platform.git
cd data-visualization-platform
```

### 2.2. Configure Environment Variables

Create the `.env` file in the project root directory. This file will contain sensitive information and environment-specific settings for all services (backend and database).

**Example `.env` file for production:**

```
# .env
# --- Application Settings ---
NODE_ENV=production
PORT=5000 # Backend internal port, Nginx handles external access
FRONTEND_URL=https://your-domain.com # Your public frontend domain

# --- Database Configuration (PostgreSQL) ---
DB_NAME=dataviz_prod_db
DB_USER=your_prod_db_user
DB_PASSWORD=your_super_secret_db_password
DB_HOST=db # Hostname of the database service within Docker Compose network
DB_PORT=5432

# --- JWT Secret ---
# IMPORTANT: Generate a strong, unique secret for production
JWT_SECRET=a_very_long_and_random_jwt_secret_for_production_env
JWT_EXPIRES_IN=24h # Tokens can expire less frequently in prod

# --- Logging ---
LOG_LEVEL=info # Adjust log level as needed
LOG_FILE_PATH=/app/logs/app.log # Path within the backend container

# --- Caching (if Redis is integrated) ---
# CACHE_REDIS_HOST=redis
# CACHE_REDIS_PORT=6379
# CACHE_TTL=3600

# --- Rate Limiting ---
RATE_LIMIT_WINDOW_MS=60000 # 1 minute
RATE_LIMIT_MAX_REQUESTS=60 # 60 requests per minute
```

**Security Note:** Ensure this `.env` file has restricted permissions (`chmod 600 .env`) and is not committed to version control.

### 2.3. Prepare Nginx Configuration

The `docker-compose.yml` uses an Nginx service for the frontend. You need to provide an Nginx configuration file for it. Create a `nginx` directory in your project root and add `nginx/nginx.conf`:

```nginx
# nginx/nginx.conf
server {
    listen 80;
    server_name your-domain.com www.your-domain.com; # Replace with your domain

    location / {
        root /usr/share/nginx/html; # Points to the React build files
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to the backend service
    location /api/ {
        proxy_pass http://backend:5000/api/; # 'backend' is the service name in docker-compose
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Optional: Redirect HTTP to HTTPS (requires SSL setup outside this config)
    # listen 443 ssl;
    # ssl_certificate /etc/nginx/ssl/your-domain.com.crt;
    # ssl_certificate_key /etc/nginx/ssl/your-domain.com.key;
    # ... other SSL settings ...
}
```

**Important:** For production, you **must** set up HTTPS (SSL/TLS certificates). You can achieve this with:
1.  **Let's Encrypt with Certbot:** Highly recommended. Certbot can often automatically configure Nginx for SSL. You might run Certbot outside Docker or use a Dockerized Certbot setup.
2.  **Manual SSL Certificates:** Place your `.crt` and `.key` files in a volume mounted into the Nginx container (e.g., `/etc/nginx/ssl`).

### 2.4. Run Database Migrations and Seed Data

For a fresh deployment, you need to run database migrations and seed initial data *before* the backend starts accepting requests.

Modify the `command` section of your `backend` service in `docker-compose.yml` temporarily, or run these commands manually once the `db` service is up:

**Temporary `command` in `docker-compose.yml` for initial setup:**

```yaml
  backend:
    # ...
    command: sh -c "npm run migrate && npm run seed && npm start" # Run migrations, seed, then start
    # ...
```
**Important:** Remove `npm run seed` if you don't want seed data on every deployment (e.g., if you only want it for initial setup). After the first successful migration/seed, revert `command` back to `npm start` for faster restarts.

### 2.5. Deploy with Docker Compose

Ensure you are in the project root directory.

```bash
# Pull latest images (if you're using pre-built images from a registry)
# docker-compose pull

# Build images and start services in detached mode (-d)
# Use --no-cache if you want to rebuild images from scratch
docker-compose up -d --build --force-recreate
```

This command will:
1.  Build your Docker images (backend, frontend, Nginx).
2.  Start the `db`, `backend`, and `frontend` services.
3.  The `db` service will wait for its health check to pass.
4.  The `backend` will run migrations, seed data (if configured), and start.
5.  The `frontend` (Nginx) will serve the React app.

### 2.6. Verify Deployment

*   Check Docker container status: `docker-compose ps`
*   View logs: `docker-compose logs -f` (use `Ctrl+C` to exit)
*   Access your application in a web browser using your configured domain or server IP address on port 80 (or 443 if SSL is set up).

## 3. CI/CD Integration (GitHub Actions)

As outlined in `.github/workflows/ci-cd.yml`, GitHub Actions can automate this process:

1.  **Push to `main` (or `develop`) branch:** Triggers the CI/CD pipeline.
2.  **CI (Continuous Integration):**
    *   Backend and Frontend tests run.
    *   Docker images are built.
3.  **CD (Continuous Deployment):**
    *   If CI passes, Docker images are pushed to a container registry (e.g., Docker Hub).
    *   An SSH connection is established to your deployment server.
    *   The latest images are pulled, and Docker Compose is used to update and restart the services.

**To enable the CD part of the GitHub Actions workflow:**

1.  **Docker Hub/Registry Credentials:** Add `DOCKER_USERNAME` and `DOCKER_PASSWORD` as [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets) to your repository.
2.  **Deployment Server SSH Credentials:** Add the following as GitHub Secrets:
    *   `SSH_PRIVATE_KEY`: The private SSH key for `DEPLOY_USER`.
    *   `DEPLOY_HOST`: The IP address or hostname of your deployment server.
    *   `DEPLOY_USER`: The username for SSH access on your deployment server.
    *   **Important:** Ensure the public part of `SSH_PRIVATE_KEY` is added to `~/.ssh/authorized_keys` on your deployment server.
3.  **Configure `deploy` job in `ci-cd.yml`:** Update placeholders like `your-docker-username` and `/path/to/your/app` with actual values.

## 4. Maintenance and Monitoring

*   **Logs:** Regularly check container logs (`docker-compose logs`) and application logs (Winston logs saved to a volume, if configured) for errors.
*   **Health Checks:** Configure more robust health checks for your application containers within `docker-compose.yml` to ensure services are truly ready.
*   **Updates:** Keep your Docker images (Node.js, PostgreSQL, Nginx) updated regularly to patch security vulnerabilities.
*   **Database Backups:** Implement a strategy for regular database backups.
*   **Monitoring Tools:** Integrate with external monitoring services (e.g., Prometheus, Grafana, Datadog) for deeper insights into application performance and resource usage.

## 5. Rollback Strategy

In case of a failed deployment, you can usually roll back to a previous working state by:
1.  **Git:** Checkout a previous stable commit.
2.  **Docker:** If you tagged your Docker images with versions, you can revert `docker-compose.yml` to use older image tags and run `docker-compose up -d`.
3.  **Database:** Restore from a recent backup (use with caution, as this can lose recent data).

This comprehensive guide should provide a solid foundation for deploying your Data Visualization Platform.