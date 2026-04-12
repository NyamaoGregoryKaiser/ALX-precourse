# Deployment Guide

This document outlines the steps and considerations for deploying the Web Scraping Tools System to a production environment. The recommended deployment strategy leverages Docker and Docker Compose for ease of management and portability.

## 1. Prerequisites for Production Server

Before you begin, ensure your production server (e.g., a cloud VM, dedicated server) has:

*   **Operating System**: Linux (e.g., Ubuntu, Debian)
*   **Docker**: Docker Engine and Docker Compose installed.
*   **SSH Access**: Secure Shell (SSH) access configured for deployment.
*   **Firewall**: Appropriate firewall rules (e.g., `ufw` on Linux, security groups in cloud) to allow incoming traffic on necessary ports (e.g., 80, 443, 8080).
*   **DNS Configuration**: A domain name pointing to your server's IP address (optional but recommended for production).

## 2. Environment Variables Management

**Crucial**: Never hardcode sensitive information directly into your application code or `docker-compose.yml`. Use environment variables.

The application expects the following environment variables:

| Variable                     | Description                                            | Example Value                                  |
| :--------------------------- | :----------------------------------------------------- | :--------------------------------------------- |
| `APP_PORT`                   | Port for the C++ application to listen on.             | `8080`                                         |
| `DATABASE_URL`               | PostgreSQL connection string.                          | `postgresql://user:password@db:5432/webscraper_db` |
| `JWT_SECRET`                 | Secret key for signing/verifying JWT tokens.           | `a_very_long_and_complex_secret_key_at_least_32_chars_for_HS256` |
| `REDIS_HOST`                 | Hostname or IP of the Redis server.                    | `redis`                                        |
| `REDIS_PORT`                 | Port of the Redis server.                              | `6379`                                         |
| `RATE_LIMIT_REQUESTS`        | Max requests allowed per IP in the window.             | `100`                                          |
| `RATE_LIMIT_WINDOW_SECONDS`  | Time window for rate limiting in seconds.              | `60`                                           |
| `SCHEDULER_INTERVAL_SECONDS` | Interval (in seconds) for the scheduler to check jobs. | `300` (5 minutes)                              |

**Recommendation for production:**
*   Use a `.env` file **not checked into version control** on your production server alongside your `docker-compose.yml`. Docker Compose automatically picks up variables from a `.env` file in the same directory.
*   For CI/CD (e.g., GitHub Actions), use GitHub Secrets to store these variables and inject them into the deployment script.

## 3. Database & Redis Setup

The `docker-compose.yml` file already provisions PostgreSQL and Redis containers.

*   **Persistence**: The `volumes:` section in `docker-compose.yml` ensures that database data (`postgres_data`) and Redis data (`redis_data`) are persisted even if containers are stopped or removed. These volumes should be backed up regularly.
*   **Initialization**: `db/init.sql` and `db/seed.sql` are automatically run on the first startup of the PostgreSQL container to set up the schema and initial data. Subsequent restarts will not re-run them if the data volume already exists.
*   **Backups**: Implement a robust backup strategy for your PostgreSQL data volume.

## 4. Docker-Compose Deployment

1.  **Transfer Files**: Copy the `docker-compose.yml`, `Dockerfile`, `db/`, `frontend/` (if serving static files from C++ app), and `src/` (if using mounted volumes for dev, otherwise not needed) directories to your production server. A common location is `/opt/webscraper/`.

    ```bash
    # On your local machine
    scp -r docker-compose.yml Dockerfile db frontend src user@your-prod-server:/opt/webscraper/
    ```

2.  **Create `.env` file**: On the production server, navigate to `/opt/webscraper/` and create a `.env` file. Fill it with your production environment variables.

    ```bash
    # On your production server
    cd /opt/webscraper/
    nano .env
    # Add your variables here, especially the sensitive ones
    APP_PORT=8080
    DATABASE_URL="postgresql://user:password@db:5432/webscraper_db"
    JWT_SECRET="YOUR_SUPER_STRONG_PRODUCTION_SECRET_KEY_HERE"
    REDIS_HOST="redis"
    REDIS_PORT="6379"
    RATE_LIMIT_REQUESTS="1000"
    RATE_LIMIT_WINDOW_SECONDS="3600" # 1 hour
    SCHEDULER_INTERVAL_SECONDS="600" # 10 minutes
    ```
    **Note**: Ensure `DATABASE_URL` uses the service name `db` (not `localhost`) to connect to the PostgreSQL container. Similarly for `REDIS_HOST`.

3.  **Deploy**: From the `/opt/webscraper/` directory on your production server:

    ```bash
    docker-compose pull # Pull latest base images
    docker-compose up --build -d # Build (if changes), run, and detach
    ```

4.  **Verify**:
    ```bash
    docker-compose ps
    docker-compose logs -f app
    ```
    Check the logs for any errors and ensure all services are running.

## 5. Security Enhancements

### 5.1. HTTPS (SSL/TLS)

For any production application exposed to the internet, HTTPS is mandatory.

**Recommendation**: Use a reverse proxy like Nginx or Caddy in front of your Docker containers.

1.  **Reverse Proxy Setup (Nginx example):**
    *   Add an Nginx service to your `docker-compose.yml` or run it separately.
    *   Configure Nginx to listen on ports 80 and 443.
    *   Obtain SSL certificates (e.g., using Certbot with Let's Encrypt).
    *   Proxy requests from Nginx to your `app` service (e.g., `http://app:8080`).

    ```nginx
    # Example Nginx configuration (nginx.conf)
    server {
        listen 80;
        listen [::]:80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

        location / {
            proxy_pass http://app:8080; # 'app' is the service name in docker-compose
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
    ```

### 5.2. Firewall Rules

*   **Only allow necessary ports**:
    *   `22` (SSH) for administration.
    *   `80` (HTTP) and `443` (HTTPS) if using a reverse proxy.
    *   Do **NOT** expose PostgreSQL (5432) or Redis (6379) directly to the internet. They should only be accessible from within your Docker network.

### 5.3. Secrets Management

*   For very sensitive data (e.g., `JWT_SECRET`), consider more advanced secrets management solutions like Docker Secrets or HashiCorp Vault.

## 6. Monitoring & Logging

*   **Container Logs**: Use `docker-compose logs -f <service_name>` to view real-time logs.
*   **Centralized Logging**: For production, integrate with a centralized logging solution (e.g., ELK Stack, Grafana Loki, CloudWatch Logs). Configure `spdlog` to send logs to `stdout` (which Docker captures) or directly to a logging agent.
*   **Metrics**: Consider integrating a metrics collection agent (e.g., Prometheus Node Exporter) if you need detailed system and application metrics.

## 7. CI/CD Integration

The `.github/workflows/main.yml` provides a basic CI/CD pipeline.

*   **Build**: Compiles the C++ application and runs tests on push/pull request.
*   **Docker Build & Push**: Builds the Docker image and pushes it to Docker Hub (or a private registry). Requires `DOCKER_USERNAME` and `DOCKER_PASSWORD` GitHub Secrets.
*   **Deploy**: SSH into the production server and pulls the latest Docker image, then restarts services via `docker-compose`. Requires `PROD_SSH_HOST`, `PROD_SSH_USER`, `PROD_SSH_KEY` GitHub Secrets.

**To set up the deploy job:**

1.  Create a deploy key on your production server (e.g., `ssh-keygen -f ~/.ssh/id_rsa_github_actions`).
2.  Add the **public key** to your GitHub repository's deploy keys with write access.
3.  Add the **private key** as a GitHub Secret named `PROD_SSH_KEY`.
4.  Add `PROD_SSH_HOST` (your server's IP/hostname) and `PROD_SSH_USER` (the SSH user) as GitHub Secrets.
5.  Ensure the `docker-compose.yml` file and its environment variables are correctly placed on the production server as described in section 4.

## 8. Updates and Maintenance

*   **Rolling Updates**: For zero-downtime updates, investigate advanced deployment orchestrators like Kubernetes or use blue/green deployment strategies.
*   **Security Patches**: Regularly update your base Docker images, dependencies, and underlying OS.
*   **Monitoring Alerts**: Set up alerts for critical application errors, high resource usage, or service downtime.

By following this guide, you can successfully deploy and manage your Web Scraping Tools System in a production environment.