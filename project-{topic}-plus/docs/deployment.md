# Project Management API - Deployment Guide

This document outlines the steps to deploy the Project Management API to a production environment. The recommended approach leverages Docker and Docker Compose for ease of deployment, scalability, and consistency. For larger-scale deployments, transitioning to a container orchestration platform like Kubernetes is recommended.

## 1. Prerequisites for Deployment Environment

*   **Linux Server**: A modern Linux distribution (e.g., Ubuntu, CentOS, Debian).
*   **Docker**: Docker Engine installed and running.
*   **Docker Compose**: Docker Compose plugin (or standalone binary) installed.
*   **Git**: For cloning the repository.
*   **Network Configuration**: Ensure necessary ports (e.g., 18080 for the API, 5432 for PostgreSQL if exposed directly) are open in your firewall rules but restricted to trusted sources where possible.
*   **Reverse Proxy / Load Balancer**: (Highly Recommended) For production, use Nginx or an equivalent load balancer (AWS ALB, GCP Load Balancer) in front of your Docker container(s) for SSL termination, request routing, rate limiting, and caching.

## 2. Prepare the Production Environment

1.  **Clone the Repository**:
    On your deployment server, clone the project repository:
    ```bash
    git clone https://github.com/your-username/project-management-api.git
    cd project-management-api
    ```

2.  **Create `.env` File for Production**:
    Copy the example `.env.example` and populate it with **production-grade values**:
    ```bash
    cp .env.example .env
    ```
    Edit the `.env` file:
    *   `APP_ENV=production`
    *   `LOG_LEVEL=info` (or `warn`/`error` for less verbose logs)
    *   **Crucially**: Set strong, unique passwords for `DB_PASSWORD` and `JWT_SECRET`. Do NOT use default or weak secrets.
    *   Ensure `DB_HOST` points to `db` (the Docker service name) when running with Docker Compose. If running a standalone external PostgreSQL, provide its IP/hostname.

    Example `.env` (production snippet):
    ```ini
    APP_PORT=18080
    APP_ENV=production
    LOG_LEVEL=info

    DB_HOST=db
    DB_PORT=5432
    DB_NAME=project_management_prod_db
    DB_USER=pma_prod_user
    DB_PASSWORD=YOUR_STRONG_DATABASE_PASSWORD_HERE

    JWT_SECRET="AN_EXTREMELY_LONG_AND_RANDOM_JWT_SECRET_STRING_AT_LEAST_32_CHARS"
    JWT_EXPIRATION_SECONDS=3600
    ```

3.  **Docker Volumes for Persistent Data**:
    The `docker-compose.yml` is already configured to use a named volume `db_data` for PostgreSQL data persistence. This is critical to prevent data loss if the `db` container is removed or recreated.
    ```yaml
    volumes:
      db_data:
    ```

## 3. Deployment Steps (using Docker Compose)

1.  **Build and Deploy**:
    From the `project-management-api` directory, run the following command. The `--build` flag ensures that the application Docker image is built from the `Dockerfile` with the latest code.
    ```bash
    docker-compose up -d --build
    ```
    *   `-d`: Runs the containers in detached mode (in the background).
    *   `--build`: Rebuilds images if Dockerfile or context has changed. This is important for deploying new code.

    This command will:
    *   Build the `app` service Docker image based on `Dockerfile`.
    *   Pull the `postgres:15-alpine` image for the `db` service.
    *   Start the PostgreSQL container.
    *   **Wait for PostgreSQL to be healthy**.
    *   Execute the database migration scripts (`V1__create_tables.sql`, `V2__add_roles_and_seed_data.sql`) and seed data (`seed.sql`) inside the `app` container.
    *   Start the C++ API server.

2.  **Verify Deployment**:
    *   Check container status:
        ```bash
        docker-compose ps
        ```
        You should see both `app` and `db` services running and healthy.
    *   View logs for the API service:
        ```bash
        docker-compose logs app
        ```
        Look for messages indicating that the API server is listening on its port.
    *   Test the API (e.g., login endpoint) using `curl` or Postman from outside the server to ensure it's accessible.

## 4. Scaling (with Docker Compose)

For simple horizontal scaling on a single host, Docker Compose can run multiple instances of your application service.
```bash
docker-compose up -d --scale app=3
```
This will start 3 instances of your `app` service. You would typically put a reverse proxy (like Nginx) in front of these instances to load-balance requests.

**Note**: Docker Compose is not a full-fledged orchestration tool. For robust scaling, self-healing, and zero-downtime deployments, consider Kubernetes.

## 5. Reverse Proxy Setup (Nginx Example)

For production, it's highly recommended to use a reverse proxy like Nginx to handle public traffic.

1.  **Install Nginx** on your host machine.
    ```bash
    sudo apt update
    sudo apt install nginx
    ```

2.  **Configure Nginx**: Create a new Nginx configuration file (e.g., `/etc/nginx/sites-available/project_management_api`)
    ```nginx
    # /etc/nginx/sites-available/project_management_api
    server {
        listen 80;
        server_name api.yourdomain.com; # Replace with your domain

        # Redirect all HTTP traffic to HTTPS (recommended)
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl;
        server_name api.yourdomain.com; # Replace with your domain

        # SSL Configuration (replace with your actual certificate paths)
        ssl_certificate /etc/nginx/ssl/api.yourdomain.com.crt;
        ssl_certificate_key /etc/nginx/ssl/api.yourdomain.com.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384';
        ssl_prefer_server_ciphers on;

        # Rate Limiting (optional, but recommended)
        # limit_req_zone $binary_remote_addr zone=api_limiter:10m rate=10r/s;
        # limit_req zone=api_limiter burst=20 nodelay;

        location / {
            proxy_pass http://localhost:18080; # Matches APP_PORT in .env
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 900; # Adjust as needed for long-running requests
            proxy_connect_timeout 900;
            proxy_send_timeout 900;
        }

        # Handle CORS pre-flight requests at Nginx level if not handled by app (Crow does handle it)
        # location / {
        #     if ($request_method = 'OPTIONS') {
        #         add_header 'Access-Control-Allow-Origin' '*';
        #         add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
        #         add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization';
        #         add_header 'Access-Control-Max-Age' 86400;
        #         add_header 'Content-Type' 'text/plain; charset=utf-8';
        #         add_header 'Content-Length' 0;
        #         return 204;
        #     }
        #     # Other CORS headers for actual requests
        #     add_header 'Access-Control-Allow-Origin' '*';
        #     add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
        #     add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization';
        # }

        access_log /var/log/nginx/project_management_api_access.log;
        error_log /var/log/nginx/project_management_api_error.log;
    }
    ```

3.  **Enable Configuration**:
    ```bash
    sudo ln -s /etc/nginx/sites-available/project_management_api /etc/nginx/sites-enabled/
    sudo nginx -t # Test Nginx configuration
    sudo systemctl restart nginx
    ```

## 6. Monitoring and Logging

*   **Docker Logs**: Use `docker-compose logs -f app` to follow application logs.
*   **Centralized Logging**: For production, forward container logs to a centralized logging system like ELK Stack (Elasticsearch, Logstash, Kibana), Grafana Loki, Splunk, or cloud-provider specific solutions (e.g., AWS CloudWatch Logs).
*   **Health Checks**: `docker-compose.yml` includes a basic health check for the PostgreSQL database. Consider adding a health check endpoint to your C++ application (`/healthz`) that returns 200 OK if the app is running and can connect to the DB.
*   **Resource Monitoring**: Monitor CPU, memory, network I/O of your server and Docker containers using tools like `htop`, `docker stats`, Prometheus/Grafana, or cloud monitoring services.

## 7. Database Backups

*   Implement a robust database backup strategy for your PostgreSQL instance. This can involve:
    *   Regular `pg_dump` commands run from a cron job on the host or a dedicated container.
    *   Streaming replication to a standby server.
    *   Cloud-provider managed backup services if using a managed PostgreSQL instance.

## 8. Updates and Rollbacks

*   **To update the application**:
    1.  Pull the latest code: `git pull origin main`
    2.  Rebuild and restart: `docker-compose up -d --build` (this will gracefully stop old containers and start new ones).
*   **Rollback**: If an update causes issues, you can revert to a previous working commit and redeploy, or use Docker's tagging feature to explicitly deploy a known-good image version.

## 9. Security Considerations

*   **Environment Variables**: Never hardcode sensitive information. Use environment variables and load them securely (e.g., Docker Secrets, Kubernetes Secrets, Vault).
*   **Network Security**: Restrict external access to only necessary ports. Use firewalls.
*   **SSL/TLS**: Always use HTTPS for API communication in production. Terminate SSL at your load balancer/reverse proxy.
*   **Dependencies**: Keep all libraries and base images updated to patch security vulnerabilities. Regular scanning of Docker images for vulnerabilities (e.g., Trivy, Clair) is recommended.
*   **Principle of Least Privilege**: Run containers with minimal necessary permissions.
*   **Docker Daemon Security**: Secure access to the Docker daemon.

By following this guide, you can confidently deploy your Project Management API in a production environment.
```