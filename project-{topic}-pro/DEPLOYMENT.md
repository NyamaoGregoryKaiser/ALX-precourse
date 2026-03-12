```markdown
# Deployment Guide for Payment Processing System

This document outlines the steps and considerations for deploying the Payment Processing System to a production environment. The recommended deployment strategy leverages Docker for containerization and Docker Compose for orchestration, which can be extended to Kubernetes for larger-scale deployments.

## 1. Prerequisites

Before deployment, ensure you have:

*   **A Linux Server**: (e.g., Ubuntu, CentOS) with Docker and Docker Compose installed.
*   **Domain Name**: Configured to point to your server's IP address.
*   **SSL/TLS Certificates**: For HTTPS (e.g., from Let's Encrypt).
*   **Reverse Proxy**: (e.g., Nginx, Caddy) to handle SSL termination, load balancing, and possibly rate limiting.
*   **Monitoring and Logging Setup**: (e.g., Prometheus, Grafana, ELK Stack) for production visibility.
*   **Environment Variables**: Prepared with all sensitive configuration (database credentials, JWT secret, etc.).

## 2. Environment Variables

Never hardcode sensitive information directly into `config/default.json` for production. Use environment variables to inject sensitive data.

Example `.env` file for production (place this alongside your `docker-compose.prod.yml`):

```dotenv
# Database Configuration
DB_HOST=payment-processor-db
DB_PORT=5432
DB_NAME=paymentdb_prod
DB_USER=prod_user
DB_PASSWORD=YOUR_STRONG_DB_PASSWORD

# Application Configuration
APP_PORT=9080
LOG_LEVEL=info
APP_THREADS=8 # More threads for production
JWT_SECRET=YOUR_VERY_LONG_AND_COMPLEX_JWT_SECRET_KEY_FOR_PRODUCTION
JWT_EXPIRY_MINUTES=120 # Adjust as needed
# GATEWAY_MOCK_URL=http://your.external.gateway.com/api # Replace with real gateway URL
```

**Security Best Practices for Environment Variables:**
*   Do not commit `.env` files to version control.
*   Use a secure method for injecting these variables into your deployment environment (e.g., Kubernetes Secrets, cloud provider secrets management, Ansible Vault).

## 3. Production Docker Compose

Create a `docker-compose.prod.yml` file for production deployment. This will be similar to `docker-compose.yml` but with production-specific settings (e.g., no volumes for migrations, separate data volume, stronger resource limits).

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  payment-processor-db:
    image: postgres:14-alpine
    container_name: payment-processor-db-prod
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - payment_processor_data_prod:/var/lib/postgresql/data
    ports:
      - "5432:5432" # Expose for management tools, consider restricting access
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 30s # Give DB more time to start

  payment-processor-app:
    image: YOUR_DOCKER_REGISTRY_USERNAME/payment-processor:latest # Use a specific version tag in production
    container_name: payment-processor-app-prod
    depends_on:
      payment-processor-db:
        condition: service_healthy
    environment:
      DB_HOST: payment-processor-db
      DB_PORT: ${DB_PORT}
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      APP_PORT: ${APP_PORT}
      LOG_LEVEL: ${LOG_LEVEL}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRY_MINUTES: ${JWT_EXPIRY_MINUTES}
      # GATEWAY_MOCK_URL: ${GATEWAY_MOCK_URL} # Point to real gateway
    ports:
      - "${APP_PORT}:${APP_PORT}" # Expose to host for reverse proxy
    volumes:
      - ./logs:/app/logs # Persistent logs
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s

volumes:
  payment_processor_data_prod:
```

## 4. Deployment Steps

1.  **Build and Push Docker Image (CI/CD)**:
    *   Ensure your CI/CD pipeline (e.g., GitHub Actions `ci.yml`) is configured to build the Docker image and push it to a private Docker registry (e.g., Docker Hub, AWS ECR, GCR) with a version tag (e.g., `v1.0.0` or `git_sha`).
    *   Update `image: YOUR_DOCKER_REGISTRY_USERNAME/payment-processor:latest` in `docker-compose.prod.yml` to use the correct registry and tag.

2.  **Prepare the Production Server**:
    *   SSH into your production server.
    *   Create a dedicated directory for your application (e.g., `/opt/payment-processor`).
    *   Copy `docker-compose.prod.yml` and your `.env` file into this directory.
    *   Ensure the `logs` directory exists and has correct permissions: `mkdir -p /opt/payment-processor/logs && chmod 775 /opt/payment-processor/logs`.

3.  **Run Database Migrations (One-time or on updates)**:
    *   For the initial deployment, or when your database schema changes, you need to apply migrations.
    *   **Option A (Using a temporary container for migrations):**
        ```bash
        # Ensure your migrations are available
        # You might need to temporarily mount the migrations directory or build a specific migration image
        docker run --rm \
          --env-file ./.env \
          --network host \ # Or connect to specific network
          -v /path/to/your/migrations:/migrations \
          postgres:14-alpine sh -c "for f in /migrations/*.sql; do psql -h localhost -p 5432 -d $DB_NAME -U $DB_USER -f \$f || exit 1; done"
        ```
        A more robust solution involves a dedicated migration container or a pre-migration step.
    *   **Option B (Using the app container's `run_migrations.sh`):**
        Temporarily uncomment the `migrations` volume in `docker-compose.prod.yml` and add a command to run the script, then remove it after initial setup. Or, have a separate migration service.

4.  **Deploy with Docker Compose**:
    ```bash
    cd /opt/payment-processor
    docker-compose -f docker-compose.prod.yml pull # Pull the latest images
    docker-compose -f docker-compose.prod.yml up -d
    ```
    This will start the database and the application.

5.  **Configure Reverse Proxy (Nginx/Caddy)**:
    *   Install and configure Nginx/Caddy on your server.
    *   Set it up to proxy requests from your domain (e.g., `api.yourdomain.com`) to the `payment-processor-app` container's port (e.g., `localhost:9080`).
    *   **Crucially, enable HTTPS** using your SSL/TLS certificates.

    **Example Nginx Configuration (`/etc/nginx/sites-available/payment-processor`):**
    ```nginx
    server {
        listen 80;
        server_name api.yourdomain.com;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name api.yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem; # Your cert path
        ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem; # Your key path
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers off;
        ssl_ciphers "EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH";
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 1d;
        ssl_stapling on;
        ssl_stapling_verify on;
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";

        location / {
            proxy_pass http://localhost:9080; # Points to your Docker container's exposed port
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_redirect off;
        }

        # Optionally, add rate limiting here
        # limit_req_zone $binary_remote_addr zone=api_requests:10m rate=10r/s;
        # location /api/ {
        #    limit_req zone=api_requests burst=20 nodelay;
        #    proxy_pass http://localhost:9080;
        #    # ... headers ...
        # }
    }
    ```
    Enable and reload Nginx:
    ```bash
    sudo ln -s /etc/nginx/sites-available/payment-processor /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
    ```

6.  **Monitoring and Logging**:
    *   Configure your logging system (e.g., ELK Stack) to collect logs from the Docker container (`/opt/payment-processor/logs/payment-processor.log` or Docker stdout logs).
    *   Set up Prometheus and Grafana to scrape metrics from your application (if integrated) and the underlying server.

## 5. Updates and Rollbacks

*   **To Update**:
    1.  Push new code to your main branch, triggering the CI/CD pipeline to build and push a new Docker image (preferably with a new version tag).
    2.  On the production server, update your `docker-compose.prod.yml` to reference the new image tag.
    3.  Run `docker-compose -f docker-compose.prod.yml pull` to get the new image.
    4.  Run `docker-compose -f docker-compose.prod.yml up -d` to restart services with the new image. Docker Compose will handle graceful restarts.
    5.  Apply any new database migrations.

*   **To Rollback**:
    1.  If an update causes issues, revert the `image` tag in `docker-compose.prod.yml` to a previous, stable version.
    2.  Run `docker-compose -f docker-compose.prod.yml pull` and `docker-compose -f docker-compose.prod.yml up -d`.
    3.  Database rollbacks are more complex; ensure your migrations are always backward-compatible or have a robust rollback strategy.

## 6. Security Considerations

*   **Network Security**: Use firewalls (e.g., `ufw`, security groups) to restrict access to only necessary ports (e.g., 80, 443, 22). Database port 5432 should ideally not be exposed publicly.
*   **Secrets Management**: Use environment variables or a dedicated secrets management solution.
*   **HTTPS**: Always enforce HTTPS for all API traffic.
*   **Least Privilege**: Run containers with the least necessary privileges. Configure PostgreSQL users with minimal required permissions.
*   **Regular Updates**: Keep the operating system, Docker, and application dependencies updated.
*   **Vulnerability Scanning**: Regularly scan Docker images for known vulnerabilities.
*   **Input Validation**: Strict input validation on all API endpoints.
*   **Output Encoding**: Properly encode all output to prevent injection attacks.
*   **Error Messages**: Avoid verbose error messages that could leak sensitive information.

## 7. Scalability

*   **Horizontal Scaling**: The C++ API server is designed to be stateless, allowing you to run multiple instances behind a load balancer (e.g., Nginx, cloud load balancers).
*   **Database Scaling**: For high traffic, consider PostgreSQL replication (read replicas) or more advanced sharding strategies.
*   **Caching**: Implement Redis for caching frequently accessed data to reduce database load.

This guide provides a foundation for deploying your payment processing system. Adapt it to your specific infrastructure and organizational security policies.
```