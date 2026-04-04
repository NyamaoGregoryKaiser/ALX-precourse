# Mobile Task Manager Backend - Deployment Guide

This document outlines the steps to deploy the FastAPI backend application in a production environment. The recommended approach leverages Docker and Docker Compose for containerization and orchestration, but notes on traditional deployments are also included.

## 1. Prerequisites

*   **Server Environment**: A Linux-based server (e.g., Ubuntu, CentOS).
*   **Docker & Docker Compose**: Installed and configured on the server.
*   **Git**: For cloning the repository.
*   **Domain Name**: (Optional but recommended) A domain name pointing to your server's IP address.
*   **SSL Certificate**: (Optional but highly recommended) For HTTPS, e.g., using Let's Encrypt.
*   **Reverse Proxy**: (Optional but recommended) Nginx or Caddy for SSL termination, load balancing, and serving static files (if any).

## 2. Production Deployment using Docker Compose

This is the recommended approach for simpler production setups or staging environments.

1.  **Clone the Repository:**
    Log in to your server and clone the project.

    ```bash
    git clone https://github.com/your-username/mobile-task-manager-backend.git
    cd mobile-task-manager-backend
    ```

2.  **Create Production `.env` File:**
    Create a `.env` file based on `.env.example`. **Crucially, ensure:**
    *   `SECRET_KEY`: Is a **very strong, unique, and securely generated** string. Do not use the example value.
    *   `POSTGRES_PASSWORD`: Is a strong password for your database.
    *   `LOG_LEVEL`: Set to `INFO` or `WARNING` for production, to avoid excessive logging.
    *   `REDIS_HOST`, `POSTGRES_SERVER`: Should remain `redis` and `db` respectively, as these are the service names within the Docker Compose network.
    *   Other sensitive credentials (e.g., API keys for external services) should also be added here.

    ```bash
    cp .env.example .env
    # nano .env (or your preferred editor) and fill in production values
    ```

3.  **Adjust `docker-compose.yml` for Production:**
    Open `docker-compose.yml` and modify the `backend` service's `command` to use `gunicorn` for production-grade serving, which provides better performance and reliability than `uvicorn` directly.
    *   **Uncomment the `gunicorn` command and comment out the `uvicorn` command.**
    *   Adjust `--workers` based on your server's CPU cores (e.g., `2 * num_cores + 1`).

    ```yaml
    # ... inside backend service ...
    # volumes:
    #   - ./app:/app/app # Comment out or remove for production to prevent accidental host file changes
    #   - ./alembic:/app/alembic
    #   - ./scripts:/app/scripts
    #   - ./alembic.ini:/app/alembic.ini
    # command: sh -c "alembic upgrade head && python scripts/seed.py && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
    command: gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
    ```
    *It's highly recommended to perform migrations and seeding as separate steps or as part of a CI/CD process, rather than directly in the `command` for a production deployment.* For initial setup, `alembic upgrade head` can be run once before starting the `gunicorn` command.

4.  **Build and Run Services:**

    ```bash
    docker-compose build
    docker-compose run --rm backend alembic upgrade head # Run migrations once
    docker-compose run --rm backend python scripts/seed.py # Run seed data once (optional)
    docker-compose up -d
    ```
    *   `docker-compose build`: Builds the Docker images.
    *   `alembic upgrade head`: Applies any pending database migrations.
    *   `python scripts/seed.py`: Seeds initial data (e.g., admin user).
    *   `docker-compose up -d`: Starts all services in detached mode.

5.  **Monitor Logs:**
    Check the logs to ensure all services are starting correctly:

    ```bash
    docker-compose logs -f
    ```

### 2.1. Integrating with a Reverse Proxy (Nginx/Caddy - Recommended)

For production, it's best to place Nginx or Caddy in front of your Docker Compose setup. This provides:
*   **SSL/TLS Termination**: Secure HTTPS communication.
*   **Load Balancing**: Distribute traffic across multiple backend containers (if scaled).
*   **Static File Serving**: (If your application had static files, though this backend doesn't).
*   **DDoS Protection / Rate Limiting**: Additional layers of security.

**Example Nginx Configuration (`nginx.conf`):**

```nginx
# Add this to your server's Nginx configuration (e.g., /etc/nginx/sites-available/your_domain)

server {
    listen 80;
    server_name api.yourdomain.com; # Replace with your domain

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com; # Replace with your domain

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem; # Path to your cert
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem; # Path to your key
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers "ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20";

    location / {
        proxy_pass http://localhost:8000; # Or the IP:PORT of your backend service
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
}
```
*   You would typically run Nginx directly on the host or in a separate Docker container, connecting to the `backend` service using `localhost:8000` (if `8000` is exposed on the host) or by placing Nginx in the same Docker Compose network.

## 3. Scaling the Application

To handle more traffic, you can scale the `backend` service.

1.  **Manual Scaling (Docker Compose):**
    ```bash
    docker-compose up -d --scale backend=4 # Starts 4 instances of the backend service
    ```
    You would need a load balancer (like Nginx configured in round-robin mode or an API Gateway) to distribute requests among these instances.

2.  **Container Orchestration (Kubernetes):**
    For enterprise-grade scaling and management, consider deploying to a Kubernetes cluster. This involves creating Kubernetes Deployment, Service, Ingress, and Persistent Volume Claim configurations based on your Docker images. This is beyond the scope of this document but is the next logical step for large-scale deployments.

## 4. Database Backups

Regular database backups are critical. Implement a strategy to periodically back up your PostgreSQL data volume (`postgres_data` in `docker-compose.yml`). Tools like `pg_dump` or cloud provider managed backup solutions are recommended.

## 5. Monitoring

*   **Logs**: Configure log aggregation (e.g., ELK stack, Grafana Loki) to collect and analyze logs from all services. The `app.main.py` is configured with `loguru`.
*   **Metrics**: Integrate Prometheus and Grafana to collect and visualize application metrics (CPU, memory, request rates, error rates).
*   **Health Checks**: Leverage the `/health` endpoint and Docker Compose health checks to monitor service availability.

## 6. CI/CD for Production Deployment

The `.github/workflows/ci.yml` provides a basic CI setup. For full CI/CD, you would extend this to:

1.  **Build Docker Image**: Push the built Docker image to a container registry (e.g., Docker Hub, AWS ECR, GCR) upon successful CI.
2.  **Deployment Trigger**: Configure a CD pipeline (e.g., using GitHub Actions, Jenkins, GitLab CI, ArgoCD) to:
    *   Pull the latest image from the registry.
    *   Run database migrations.
    *   Update the running containers (e.g., `docker-compose up -d` with a new image tag, or Kubernetes rolling update).

This ensures automated, consistent, and reliable deployments to production.
```