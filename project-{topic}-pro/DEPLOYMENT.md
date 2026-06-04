```markdown
# Deployment Guide

This guide provides instructions for deploying the CMS application to a production environment using Docker and `docker-compose`.

## Prerequisites

*   **Git**: For cloning the repository.
*   **Docker & Docker Compose**: Installed on your production server.
*   **Linux Server**: (e.g., Ubuntu, CentOS)
*   **Domain Name**: Configured to point to your server's IP address.
*   **DNS records**: A record for your domain (e.g., `yourdomain.com`) pointing to your server.

## 1. Setup Production Environment

### 1.1 Clone the Repository

```bash
git clone <your-repo-url>
cd <your-repo-directory>
```

### 1.2 Configure Environment Variables

Create a `.env` file in the root directory of the project, based on `.env.example`.
**Crucially, generate strong, unique secrets for `SECRET_KEY` and `JWT_SECRET_KEY` in production.** Do NOT use the default values.

```env
# .env (example for production)

FLASK_APP=wsgi.py
FLASK_ENV=production
SECRET_KEY="YOUR_SUPER_STRONG_FLASK_SECRET_KEY_HERE"
APP_SETTINGS_MODULE="config.ProductionConfig"
DEBUG=False

# Database Settings (use strong credentials and map to your docker-compose.yml)
DATABASE_URL="postgresql://cmsuser:strongdbpassword@db:5432/cms_prod_db"
POSTGRES_USER=cmsuser
POSTGRES_PASSWORD=strongdbpassword
POSTGRES_DB=cms_prod_db

# JWT Settings
JWT_SECRET_KEY="YOUR_SUPER_STRONG_JWT_SECRET_KEY_HERE"
JWT_ACCESS_TOKEN_EXPIRES_SECONDS=3600
JWT_REFRESH_TOKEN_EXPIRES_DAYS=30

# Caching Settings
CACHE_REDIS_URL="redis://redis:6379/0"
CACHE_DEFAULT_TIMEOUT=300

# Rate Limiting Settings
RATELIMIT_ENABLED=True
RATELIMIT_STORAGE_URL="redis://redis:6379/1"
RATELIMIT_DEFAULT_LIMIT="50 per minute"

# Logging Settings
LOG_LEVEL=INFO
LOG_FILE_PATH="/var/log/cms_app/app.log" # Ensure this path is mounted as a volume if persistent logs are needed
```

**Important Security Notes:**
*   Never expose your `.env` file publicly.
*   Use a secret management service (e.g., AWS Secrets Manager, HashiCorp Vault) for highly sensitive production secrets, rather than `.env` files.
*   For `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, ensure they match the `DATABASE_URL` and `docker-compose.yml` configurations.

### 1.3 Configure Nginx (Optional but Recommended)

If you're using the Nginx service in `docker-compose.yml`, edit `nginx.conf` to reflect your domain name and configure SSL.

```nginx
# nginx.conf
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com; # Replace with your actual domain

    # ... rest of the config ...

    # Redirect HTTP to HTTPS (after SSL setup)
    # return 301 https://$host$request_uri;
}

# Add HTTPS configuration if you have SSL certificates
# server {
#     listen 443 ssl;
#     server_name yourdomain.com www.yourdomain.com;
#     ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
#     # ... include other SSL config, e.g., from certbot ...
#
#     location / {
#         proxy_pass http://app:5000;
#         # ... proxy headers ...
#     }
# }
```
**Setting up SSL:**
For production, it's highly recommended to use HTTPS. Tools like [Certbot](https://certbot.eff.org/) can automate the process of obtaining and renewing free SSL certificates from Let's Encrypt. You would typically run Certbot outside of `docker-compose` to generate certificates and then mount them into your Nginx container.

## 2. Build and Deploy with Docker Compose

Navigate to your project's root directory where `docker-compose.yml` and `Dockerfile` are located.

### 2.1 Build Docker Images

```bash
docker-compose build
```
This command builds the Docker image for your `app` service and pulls images for `db` and `redis`.

### 2.2 Start Services

```bash
docker-compose up -d
```
This command starts all services defined in `docker-compose.yml` in detached mode (runs in the background).

### 2.3 Verify Services

Check if containers are running:
```bash
docker-compose ps
```
You should see `app`, `db`, and `redis` containers (and `nginx` if enabled) in a `Up` state.

Check application logs:
```bash
docker-compose logs app
```

### 2.4 Initialize and Seed Database

You need to run database migrations and seed initial data.
```bash
# Run migrations to create tables
docker-compose exec app flask db_manage upgrade

# Seed initial data (e.g., admin user, categories, tags, posts)
docker-compose exec app flask db_manage seed --users 1 --categories 5 --tags 10 --posts 20
```
Remember the admin user credentials (`admin`/`adminpassword` by default, or your custom seeded values) to log into the CMS.

## 3. Post-Deployment Steps

### 3.1 Health Checks

*   Access your API: `curl http://localhost:5000` (or `yourdomain.com` if using Nginx and DNS).
*   Test a simple protected endpoint to ensure JWT is working.

### 3.2 Continuous Integration/Continuous Deployment (CI/CD)

For a production-ready setup, integrate CI/CD pipelines (e.g., GitHub Actions, GitLab CI, Jenkins, CircleCI) to automate:
1.  **Code Changes**: Push code to version control.
2.  **Continuous Integration**:
    *   Run linting and static analysis.
    *   Execute unit, integration, and API tests.
    *   Build Docker images.
    *   Push Docker images to a container registry (e.g., Docker Hub, AWS ECR).
3.  **Continuous Deployment**:
    *   After successful CI, trigger deployment to a staging environment.
    *   Run acceptance tests on staging.
    *   Manually approve or automatically deploy to production.
    *   Deployment scripts would typically pull the latest Docker image, stop/remove old containers, and start new ones. Example for `docker-compose`:
        ```bash
        # On production server
        git pull origin main # or whichever branch you deploy from
        docker-compose pull # Pull latest images from registry
        docker-compose down # Stop and remove old containers
        docker-compose up -d # Start new containers
        docker-compose exec app flask db_manage upgrade # Run any new migrations
        ```

### 3.3 Monitoring and Logging

*   **Centralized Logging**: For production, direct container logs to a centralized logging solution (e.g., ELK Stack, Splunk, Datadog, AWS CloudWatch Logs). Configure your Docker daemon or application to send logs to these services.
*   **Application Performance Monitoring (APM)**: Integrate APM tools (e.g., Sentry, New Relic, Prometheus/Grafana) to monitor application health, performance, and errors in real-time.
*   **System Monitoring**: Monitor CPU, memory, disk usage of your Docker host and containers.

### 3.4 Backups

*   Implement a robust backup strategy for your PostgreSQL database. This could involve periodic snapshots, logical backups (`pg_dump`), or streaming replication.
*   Store backups securely in a separate location.

### 3.5 Security Best Practices

*   Regularly update dependencies.
*   Scan Docker images for vulnerabilities.
*   Implement a firewall on your server.
*   Rotate secrets periodically.
*   Ensure proper network segmentation (e.g., database not directly exposed to public internet).

By following these steps, you can deploy your CMS application to a robust and scalable production environment.
```