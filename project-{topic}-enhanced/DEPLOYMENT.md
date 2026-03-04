# Deployment Guide: Data Visualization Tools System

This document provides a guide for deploying the Data Visualization Tools System to a production environment. We will focus on a Docker-based deployment, which is highly portable and scalable.

## 1. Deployment Environment Considerations

Before deployment, consider the following:

*   **Cloud Provider**: AWS, GCP, Azure, DigitalOcean, etc.
*   **Container Orchestration**: Kubernetes (EKS, GKE, AKS), Docker Swarm, AWS ECS. Docker Compose is suitable for smaller deployments or single-server setups.
*   **Load Balancing**: Essential for distributing traffic across multiple backend instances and providing high availability.
*   **Database Management**: Use a managed database service (e.g., AWS RDS, GCP Cloud SQL) for easier scaling, backups, and maintenance.
*   **Secret Management**: Securely manage database credentials, API keys, JWT secrets.
*   **Domain and SSL/TLS**: A custom domain with HTTPS is critical for production.

## 2. Prerequisites

*   **Deployed Docker Compose or Kubernetes Cluster**: This guide assumes you have a target environment ready.
*   **Docker Images**: Your backend and (if applicable) frontend Docker images pushed to a container registry (e.g., Docker Hub, AWS ECR, GCP Container Registry). The CI/CD pipeline automates this.
*   **Database Instance**: A managed PostgreSQL database instance or a self-hosted PostgreSQL server.
*   **Environment Variables**: All required environment variables (e.g., `DATABASE_URL`, `JWT_SECRET`) configured for your production environment.
*   **SSH Access**: To your deployment server(s) if using a VM-based approach.

## 3. Production Environment Setup (Example: Docker Compose on a VM)

This section details a common deployment scenario using Docker Compose on a single (or multiple with manual orchestration) Linux VM.

### 3.1. Server Setup

1.  **Provision a VM**: Create a Linux VM (e.g., Ubuntu 20.04+) with sufficient CPU, RAM, and disk space for your expected load.
2.  **Install Docker and Docker Compose**:
    ```bash
    sudo apt-get update
    sudo apt-get install -y docker.io docker-compose
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER # Add your user to the docker group
    # Log out and log back in for group changes to take effect
    ```
3.  **Install Nginx (or similar reverse proxy)**:
    ```bash
    sudo apt-get install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    ```

### 3.2. Configure Environment Variables

Create a `.env` file on your production server. **Do NOT commit this file to your repository.**

```bash
# /path/to/your/app/.env
DATABASE_URL="postgresql://<prod_user>:<prod_password>@<your_managed_db_host>:5432/datavizdb"
HTTP_ADDRESS="0.0.0.0" # Bind to all interfaces inside the container
HTTP_PORT="8080"
JWT_SECRET="YOUR_SUPER_LONG_AND_COMPLEX_PRODUCTION_JWT_SECRET" # Generate a truly random string
LOG_LEVEL="INFO" # Or WARN/ERROR for less verbose production logging
```
**Important Security Note**: For even higher security, consider using your cloud provider's secret manager (e.g., AWS Secrets Manager, GCP Secret Manager) and retrieve these secrets at runtime, rather than storing them in a `.env` file on the server.

### 3.3. Update `docker-compose.yml` for Production

Adjust `docker-compose.yml` for production-specific needs:

*   **Image Pull**: Use pre-built images from your container registry.
*   **Logging**: Configure log drivers (e.g., `json-file` with `max-size`/`max-file` or `syslog`).
*   **Resource Limits**: Define CPU and memory limits for containers.
*   **Network**: Ensure containers are on an isolated bridge network.
*   **Frontend**: Include your frontend service if it's also containerized.

```yaml
# /path/to/your/app/docker-compose.prod.yml
version: '3.8'

services:
  db:
    image: postgres:13 # Or use your managed DB endpoint directly in backend
    # If using a managed DB, this service would be removed, and DATABASE_URL updated.
    container_name: dataviz_db_prod
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER} # Get from .env or secret manager
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: datavizdb
    # Do NOT expose DB port to public internet in production unless necessary and secured
    # ports:
    #   - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d datavizdb"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    image: your_docker_username/dataviztool:latest # Use your pushed image
    container_name: dataviz_backend_prod
    restart: always
    # Map to an internal port, Nginx will proxy to it
    # Do NOT expose 8080 directly to the public internet
    # ports:
    #   - "127.0.0.1:8080:8080" # Bind to localhost only
    environment:
      DATABASE_URL: ${DATABASE_URL}
      HTTP_ADDRESS: "0.0.0.0"
      HTTP_PORT: "8080"
      JWT_SECRET: ${JWT_SECRET}
      LOG_LEVEL: ${LOG_LEVEL}
    volumes:
      - data_uploads:/app/data_uploads # Persist uploaded files
      - ./database/migrations:/app/database/migrations # For DBManager::initializeSchema
    depends_on:
      db:
        condition: service_healthy
    # Optional: Resource limits
    # deploy:
    #   resources:
    #     limits:
    #       cpus: '1.0'
    #       memory: 1G
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"

  # frontend:
  #   image: your_docker_username/dataviz-frontend:latest
  #   container_name: dataviz_frontend_prod
  #   restart: always
  #   # Map to an internal port, Nginx will proxy to it
  #   # ports:
  #   #   - "127.0.0.1:3000:80" # Assuming React build serves on port 80
  #   environment:
  #     REACT_APP_API_BASE_URL: "https://yourdomain.com/api/v1" # Public facing URL
  #   depends_on:
  #     - backend
  #   logging:
  #     driver: "json-file"
  #     options:
  #       max-size: "10m"
  #       max-file: "5"

volumes:
  db_data: # Only needed if running DB in Docker
  data_uploads:
```

### 3.4. Nginx Reverse Proxy and SSL/TLS

Nginx will serve as the entry point for all external traffic. It handles SSL termination and proxies requests to the appropriate Docker containers.

1.  **Configure Nginx**: Create a new Nginx configuration file (e.g., `/etc/nginx/sites-available/dataviz.conf`).

    ```nginx
    # /etc/nginx/sites-available/dataviz.conf
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$host$request_uri; # Redirect HTTP to HTTPS
    }

    server {
        listen 443 ssl;
        server_name yourdomain.com www.yourdomain.com;

        # SSL Configuration (obtain from Certbot/Let's Encrypt)
        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384";
        ssl_prefer_server_ciphers on;

        # Frontend (if served by Nginx)
        root /var/www/dataviz-frontend/build; # Path to your frontend static files
        index index.html index.htm;

        location / {
            try_files $uri $uri/ /index.html;
        }

        # Backend API Proxy
        location /api/v1/ {
            proxy_pass http://localhost:8080; # Points to the backend container's exposed port (internal to VM)
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 90;
            proxy_connect_timeout 90;
            proxy_send_timeout 90;
        }

        # Optionally, for static assets not covered by frontend root or API
        # location /static/ {
        #     alias /var/www/dataviz-static/;
        # }

        # Error pages
        error_page 404 /404.html;
        location = /404.html {
            internal;
        }

        # Rate Limiting (example)
        # limit_req_zone $binary_remote_addr zone=req_limit_per_ip:10m rate=100r/s;
        # location /api/v1/ {
        #     limit_req zone=req_limit_per_ip burst=20 nodelay;
        #     proxy_pass http://localhost:8080;
        #     # ... other proxy headers
        # }
    }
    ```
2.  **Enable Configuration**:
    ```bash
    sudo ln -s /etc/nginx/sites-available/dataviz.conf /etc/nginx/sites-enabled/
    sudo nginx -t # Test Nginx configuration
    sudo systemctl reload nginx
    ```
3.  **Obtain SSL Certificate (Certbot/Let's Encrypt)**:
    ```bash
    sudo snap install core; sudo snap refresh core
    sudo snap install --classic certbot
    sudo ln -s /snap/bin/certbot /usr/bin/certbot
    sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
    ```
    Follow the prompts to configure HTTPS. Certbot will automatically update your Nginx configuration and set up renewals.

### 3.5. Deploy Application

1.  **Clone Repository**: On your server, clone the repository.
    ```bash
    git clone https://github.com/your-org/data-viz-tool.git /path/to/your/app
    cd /path/to/your/app
    ```
2.  **Place `.env`**: Ensure your production `.env` file is in `/path/to/your/app`.
3.  **Start Services**:
    ```bash
    docker compose -f docker-compose.prod.yml pull # Pull latest images
    docker compose -f docker-compose.prod.yml up -d --remove-orphans
    ```
    The `--remove-orphans` flag will remove containers that are no longer defined in the `docker-compose.prod.yml` but were created by a previous run.

### 3.6. Database Initialization and Seeding

On initial deployment:

1.  **Connect to Managed DB (if applicable)**: If using a managed PostgreSQL, connect using `psql` from a machine that has network access.
2.  **Run Migrations**: The C++ backend `DBManager::initializeSchema()` is designed to run migrations on startup. Ensure your `database/migrations` directory is mounted correctly.
3.  **Seed Data (Optional, for initial content)**:
    ```bash
    docker compose -f docker-compose.prod.yml exec db psql -U user -d datavizdb -f /path/to/your/app/database/seed_data.sql
    ```
    **Warning**: Do not run seed data in production unless it's strictly for initial setup of non-sensitive data.

## 4. CI/CD for Production Deployment

The `ci_cd.yml` file already provides a foundation for CI/CD:

*   **Build**: Compiles C++ code, runs tests.
*   **Docker Build & Push**: Builds and pushes Docker images to a registry. Includes a Trivy vulnerability scan.
*   **Deploy**: On `main` branch push, connects to the server via SSH and executes commands to pull the latest images and restart containers.

**Enhancements for Production CI/CD**:

*   **Blue/Green or Canary Deployments**: For zero-downtime updates, especially with Kubernetes.
*   **Rollback Strategy**: Automate rollback to previous stable versions if a new deployment fails.
*   **Approval Gates**: Manual approval steps for deployments to production.
*   **Integration with Monitoring**: Trigger alerts if post-deployment health checks fail.

## 5. Monitoring and Logging

*   **Backend Logs**: Configure your C++ `Logger` to output to `stdout`/`stderr` within Docker. Docker will capture these logs.
*   **Log Aggregation**: Use a centralized log management system (ELK stack, Splunk, Loki, DataDog) to collect, store, and analyze logs from all containers and Nginx.
*   **Metrics**: Expose Prometheus-compatible metrics from your C++ backend (e.g., via a library like `Prometheus-cpp` or custom implementation).
*   **Monitoring Tools**: Use Prometheus for metrics collection and Grafana for dashboarding and alerting. Set up alerts for high error rates, low disk space, high CPU/memory usage, etc.
*   **Uptime Monitoring**: Use external services (UptimeRobot, Pingdom) to monitor the availability of your public endpoints.

## 6. Scaling

*   **Backend**: Horizontally scale the `backend` service by increasing the number of replicas in your `docker-compose.prod.yml` (if using Docker Swarm or Kubernetes) or by running multiple Docker Compose instances on different VMs behind a load balancer.
*   **Database**: Utilize PostgreSQL read replicas for read-heavy workloads. Consider connection pooling (PgBouncer) for efficient connection management.
*   **Caching**: Scale Redis independently if caching becomes a bottleneck. Use a Redis cluster for high availability and sharding.
*   **Data Processing**: For very large datasets or complex, long-running processing tasks, offload them to dedicated worker services and message queues (e.g., RabbitMQ, Kafka) to prevent the API server from blocking.

By following this guide, you can establish a robust and scalable deployment pipeline for your Data Visualization Tools System.