```markdown
# Deployment Guide: Data Visualization Tools System

This guide covers the basic steps to deploy the Data Visualization Tools System using Docker Compose, suitable for development, staging, or small-scale production environments. For large-scale production, consider orchestrators like Kubernetes.

## Prerequisites

*   A server (VM, cloud instance) with Docker and Docker Compose installed.
*   Basic Linux command-line knowledge.
*   Access to clone the repository.
*   `git` installed.

## 1. Prepare the Server

1.  **Connect to your server:**
    ```bash
    ssh your_user@your_server_ip
    ```

2.  **Install Docker and Docker Compose:**
    Follow the official Docker documentation for your specific operating system:
    *   [Install Docker Engine](https://docs.docker.com/engine/install/)
    *   [Install Docker Compose](https://docs.docker.com/compose/install/)
    *   Ensure your user is in the `docker` group to run Docker commands without `sudo`.

3.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/data-viz-system.git
    cd data-viz-system
    ```
    (Replace `your-username/data-viz-system.git` with your actual repository URL).

## 2. Configure Environment Variables

1.  **Create `.env` file:**
    ```bash
    cp .env.example .env
    ```

2.  **Edit `.env`:**
    Open the `.env` file using a text editor (e.g., `nano .env` or `vi .env`).
    *   **`SECRET_KEY`**: **CRUCIAL!** Generate a strong, random string (e.g., `openssl rand -hex 32`) and replace the placeholder.
    *   **`POSTGRES_SERVER`**: Keep as `db` (the service name in `docker-compose.yml`).
    *   **`REDIS_HOST`**: Keep as `redis` (the service name in `docker-compose.yml`).
    *   **`BACKEND_CORS_ORIGINS`**: Update this to include the public URL of your frontend (e.g., `"https://your.frontend.domain,http://localhost:3000"`).
    *   **`ENVIRONMENT`**: Set to `production`.
    *   Adjust `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` as desired.

    **Example `PRODUCTION .env` snippet:**
    ```ini
    # ... other settings ...
    POSTGRES_SERVER="db"
    POSTGRES_USER="prod_user"
    POSTGRES_PASSWORD="super_strong_db_password"
    POSTGRES_DB="prod_dataviz_db"
    SECRET_KEY="a_very_long_and_extremely_random_secret_key_for_production_env"
    FIRST_SUPERUSER_EMAIL="admin@yourdomain.com"
    FIRST_SUPERUSER_PASSWORD="another_super_strong_password"
    BACKEND_CORS_ORIGINS=["https://dataviz.yourdomain.com"]
    REDIS_HOST="redis"
    ENVIRONMENT="production"
    ```

## 3. Deploy with Docker Compose

1.  **Build and start services:**
    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: Rebuilds the Docker images (important for initial deployment and after code changes).
    *   `-d`: Runs containers in detached mode (in the background).

2.  **Verify services:**
    Check if all containers are running and healthy:
    ```bash
    docker-compose ps
    ```
    Look for `(healthy)` status for `db`, `redis`, `backend`, and `frontend`.

3.  **Check logs (if issues arise):**
    ```bash
    docker-compose logs backend
    docker-compose logs db
    docker-compose logs frontend
    # Or to follow all logs:
    docker-compose logs -f
    ```

## 4. Access the Deployed Application

*   **Frontend:** The frontend Nginx container maps port 80 to host port 3000. Access it at `http://your_server_ip:3000`.
*   **Backend API (Swagger UI):** The backend FastAPI container maps port 8000 to host port 8000. Access it at `http://your_server_ip:8000/api/v1/docs`.

## 5. Post-Deployment Steps (Production Considerations)

For a true production setup, these are highly recommended:

1.  **Set up a Reverse Proxy (Nginx/Caddy):**
    *   Install Nginx or Caddy on your host machine.
    *   Configure it to proxy requests from standard HTTP/HTTPS ports (80/443) to your Docker containers' exposed ports (3000 for frontend, 8000 for backend).
    *   **Crucially, configure SSL/TLS certificates (e.g., with Let's Encrypt) to serve your application over HTTPS.**

    Example Nginx configuration snippet (simplified):
    ```nginx
    server {
        listen 80;
        server_name dataviz.yourdomain.com;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl;
        server_name dataviz.yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/dataviz.yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/dataviz.yourdomain.com/privkey.pem;

        location /api/v1/ {
            proxy_pass http://localhost:8000; # Or internal docker IP if not using host network
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location / {
            proxy_pass http://localhost:3000; # Or internal docker IP
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
    ```

2.  **Firewall Configuration:**
    *   Configure your server's firewall (e.g., `ufw` on Ubuntu) to:
        *   Allow incoming HTTP (port 80) and HTTPS (port 443) traffic.
        *   Block direct access to Docker ports (3000, 8000) from the outside if using a reverse proxy.
        *   Allow SSH (port 22) for your access.

3.  **Monitoring & Logging:**
    *   Integrate with external logging services (e.g., ELK stack, Grafana Loki) by configuring your Docker logging drivers.
    *   Set up application monitoring (e.g., Prometheus and Grafana) to track FastAPI metrics, database performance, etc.

4.  **Backup Strategy:**
    *   Implement a robust backup strategy for your PostgreSQL data volume (`postgres_data`).

5.  **Health Checks and Restarts:**
    *   Docker Compose already has `restart: always` and health checks configured, but monitor these actively.

6.  **Continuous Deployment (CD):**
    *   Extend the GitHub Actions workflow to automatically deploy new versions to your server after successful tests. This might involve SSH-ing into the server and running `git pull`, `docker-compose pull`, `docker-compose up -d --build`.

## Updating the Application

1.  **Pull latest code:**
    ```bash
    git pull origin main # or your deployment branch
    ```

2.  **Rebuild and restart services:**
    ```bash
    docker-compose up --build -d
    ```
    This will pull new images (if `image:` is specified, or rebuild if `build:` is used), apply any new database migrations, and restart the containers with the updated code. Docker Compose will only recreate services where the configuration or image has changed.

3.  **Clean up old images (optional but recommended):**
    ```bash
    docker image prune -f
    ```
    This removes unused Docker images, freeing up disk space.

## Troubleshooting

*   **Container fails to start:** Check `docker-compose logs <service_name>` (e.g., `docker-compose logs backend`).
*   **Database connection issues:**
    *   Ensure `db` service is `(healthy)` in `docker-compose ps`.
    *   Verify `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` in `.env` match `docker-compose.yml`.
    *   Check backend logs for specific database error messages.
*   **API errors:** Check backend logs. If it's a `4xx` or `5xx` error, the custom exception handlers should provide details.
*   **Frontend not loading:** Check browser console for errors. Ensure the `frontend` service is running and accessible. If using Nginx, check Nginx logs.
```