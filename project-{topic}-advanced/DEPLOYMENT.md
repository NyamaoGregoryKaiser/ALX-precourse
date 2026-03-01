# Deployment Guide for the Authentication System

This document outlines the steps to deploy the C++ Authentication System to a production environment using Docker and Docker Compose. For more complex deployments (e.g., Kubernetes), these steps can be adapted.

## 1. Prerequisites for Production Server

*   **Docker Engine:** Version 20.10+
*   **Docker Compose:** Version 2.0+
*   **Git:** For cloning the repository.
*   **HTTPS/SSL Certificate:** Crucial for production. We recommend using a reverse proxy like Nginx or a load balancer to handle SSL termination. The Drogon app itself will run on HTTP (port 8080 by default) behind the proxy.
*   **Secrets Management:** A secure way to manage `JWT_SECRET` and database credentials (e.g., environment variables, Docker Secrets, HashiCorp Vault, Kubernetes Secrets).

## 2. Prepare the Environment

1.  **Clone the repository:**
    On your production server, clone the project:
    ```bash
    git clone --recursive https://github.com/your-username/auth-system.git
    cd auth-system
    ```

2.  **Create `.env` file for secrets:**
    Copy the example environment file and fill in your actual production secrets. **Never commit this file to Git.**
    ```bash
    cp config/.env.example .env
    ```
    Edit the `.env` file:
    ```
    # config/.env.example
    JWT_SECRET="YOUR_VERY_LONG_RANDOM_SECURE_JWT_SECRET" # !!! CRITICAL for security
    POSTGRES_USER="production_user"
    POSTGRES_PASSWORD="your_strong_db_password"
    POSTGRES_DB="auth_db_prod"
    ```
    *   **`JWT_SECRET`**: Generate a strong, random string (e.g., 32+ characters). This is used to sign and verify JWTs. Keep it highly confidential.
    *   **`POSTGRES_USER`**, **`POSTGRES_PASSWORD`**, **`POSTGRES_DB`**: Set strong, dedicated credentials for your production PostgreSQL instance.

3.  **Ensure `config/default.json` matches:**
    Verify that the `db_clients` section in `config/default.json` matches the values set in your `.env` file (especially `user`, `password`, `db_name`). The `host` should be `db` if you are using the provided `docker-compose.yml`.

## 3. Database Setup

The `docker-compose.yml` includes a PostgreSQL service. When you run `docker-compose up`, it will automatically:
*   Create the `postgres_data` volume for persistent database storage.
*   Initialize the database with the user and database name from your `.env` file.
*   The application container's `CMD` automatically runs migrations and seed data on startup.

**Important Considerations:**
*   **Separate Database:** For large-scale production, it's often better to use a managed PostgreSQL service (e.g., AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL) rather than running PostgreSQL in Docker Compose on the same host as the application. If you use an external DB, remove the `db` service from `docker-compose.yml` and update the `db_clients` in `config/default.json` with the external database's host, port, and credentials.
*   **Database Backups:** Implement a robust backup strategy for your PostgreSQL data.

## 4. Deploy with Docker Compose

1.  **Build and Deploy:**
    From the project root directory, run:
    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: Forces rebuilding of the application image, ensuring you have the latest code.
    *   `-d`: Runs the services in detached mode (in the background).

2.  **Verify Deployment:**
    Check if containers are running:
    ```bash
    docker-compose ps
    ```
    You should see `app` and `db` services running.
    Check application logs:
    ```bash
    docker-compose logs -f app
    ```
    Look for messages indicating successful startup, e.g., "Auth System started on port 8080."

## 5. Configure a Reverse Proxy (Recommended for Production)

For production, you *must* run the application behind a reverse proxy (like Nginx) to handle:
*   **SSL/TLS Termination (HTTPS):** Encrypts traffic between clients and your server.
*   **Load Balancing:** Distributes requests across multiple application instances (for horizontal scaling).
*   **Static File Serving:** Nginx is highly efficient at serving static files (CSS, JS, images).
*   **Rate Limiting:** Nginx can provide additional layers of rate limiting if needed.

**Example Nginx Configuration (`/etc/nginx/sites-available/auth-system`):**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name auth.yourdomain.com; # Replace with your domain

    # Redirect all HTTP traffic to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name auth.yourdomain.com; # Replace with your domain

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/auth.yourdomain.com/fullchain.pem; # Use your actual path
    ssl_certificate_key /etc/letsencrypt/live/auth.yourdomain.com/privkey.pem; # Use your actual path
    ssl_trusted_certificate /etc/letsencrypt/live/auth.yourdomain.com/chain.pem;

    # Basic security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' data: https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;" always;

    # Nginx cache for static files
    location /static/ {
        # Assuming Drogon serves static files from client/public/static/
        # Or, ideally, Nginx serves them directly from a host volume mount
        # In this setup, Drogon serves them, so proxy pass them
        proxy_pass http://localhost:8080/static/;
        proxy_cache_valid 200 302 10m;
        proxy_cache_valid 404 1m;
        add_header X-Cache-Status $upstream_cache_status;
    }

    location / {
        proxy_pass http://localhost:8080; # Proxy to your Drogon application
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;

        # WebSocket support (if your application uses WebSockets)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Error pages (optional)
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```
*   **Install Nginx:** `sudo apt-get install nginx`
*   **Configure SSL:** Use Certbot (Let's Encrypt) for free SSL certificates: `sudo apt-get install certbot python3-certbot-nginx` then `sudo certbot --nginx -d auth.yourdomain.com`.
*   **Enable Nginx config:** `sudo ln -s /etc/nginx/sites-available/auth-system /etc/nginx/sites-enabled/`
*   **Test and restart Nginx:** `sudo nginx -t && sudo systemctl restart nginx`

## 6. Monitoring and Logging

*   **Logging:** Drogon writes logs to `stdout` (which Docker captures) and to files within the container's `/app/logs` directory.
    *   **Docker:** Use `docker-compose logs -f app` to view live logs.
    *   **Centralized Logging:** For production, forward Docker logs to a centralized logging system (e.g., ELK stack, Grafana Loki, Datadog, Splunk). This is typically done by configuring Docker's logging driver.
*   **Monitoring:**
    *   Monitor CPU, memory, and network usage of your Docker containers and the host server.
    *   Monitor PostgreSQL performance (CPU, memory, disk I/O, active connections, query times).
    *   Consider integrating application-specific metrics (e.g., request latency, error rates) using a library that exports to Prometheus or similar systems. (Not directly implemented in this project).

## 7. Health Checks

Docker Compose doesn't have built-in health checks for dependent services in `depends_on`. The `CMD` in the `Dockerfile` for the app container will implicitly wait for the database by trying to run migrations/seed.

For robust health checks:
*   **Add `HEALTHCHECK` instructions to your `Dockerfile`**:
    ```dockerfile
    # In Dockerfile, after EXPOSE 8080
    HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
      CMD curl -f http://localhost:8080/health || exit 1
    ```
    (You'd need to implement a `/health` endpoint in Drogon that returns 200 OK.)
*   **Drogon Health Endpoint Example:**
    ```cpp
    // In a new controller or existing one
    // Add METHOD_ADD(HealthController::check, "/health", drogon::Get);
    void HealthController::check(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
        // Optional: Check database connectivity here
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k200OK);
        resp->setBody("OK");
        callback(resp);
    }
    ```

## 8. Scaling

*   **Horizontal Scaling (Application):**
    To scale the Drogon application (assuming a reverse proxy is set up):
    ```bash
    docker-compose up --scale app=3 -d # Run 3 instances of the 'app' service
    ```
    Your reverse proxy (e.g., Nginx) needs to be configured to load balance requests across these instances.
*   **Vertical Scaling (Application & Database):**
    Upgrade server resources (CPU, RAM) for the application or database.
*   **Database Scaling:**
    PostgreSQL can be scaled vertically (more powerful server) or horizontally using techniques like replication (read replicas) or sharding for very high loads. This is beyond the scope of a basic Docker Compose setup.

## 9. Updating the Application

1.  **Pull latest code:**
    ```bash
    git pull
    ```
2.  **Stop current services:**
    ```bash
    docker-compose down
    ```
3.  **Build and deploy new images:**
    ```bash
    docker-compose up --build -d
    ```
    This will build a new image with the latest code, apply any new migrations, and restart the containers.
    *(Consider a zero-downtime deployment strategy for critical applications, which would involve rolling updates, blue/green deployments, etc., often managed by orchestrators like Kubernetes.)*

## 10. Security Best Practices

*   **Secrets Management:** Never hardcode secrets. Use environment variables, Docker Secrets, or a dedicated secrets manager.
*   **Firewall Rules:** Restrict network access to only necessary ports (e.g., 80/443 for Nginx, internal network for DB access).
*   **Regular Updates:** Keep Docker, Docker Compose, operating system, and all dependencies updated to patch security vulnerabilities.
*   **Least Privilege:** Run containers with the minimum necessary privileges.
*   **Security Scanning:** Use Docker image scanners (e.g., Clair, Trivy) to detect vulnerabilities in your base images and dependencies.
*   **Input Validation:** Ensure all user inputs are validated on the server-side to prevent injection attacks.
```