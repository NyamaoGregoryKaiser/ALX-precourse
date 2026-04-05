```markdown
# Task Management System - Deployment Guide

This guide provides instructions and considerations for deploying the Task Management System to a production environment.

## 1. Prerequisites

Before deploying, ensure you have:

*   **Production Server:** A Linux-based server (e.g., Ubuntu, CentOS) with Docker and Docker Compose installed.
*   **Domain Name:** A registered domain name pointing to your server's IP address.
*   **SSL/TLS Certificate:** For securing HTTPS traffic (e.g., Let's Encrypt).
*   **Firewall Configuration:** Properly configured firewall (e.g., `ufw`, `firewalld`, AWS Security Groups) to allow traffic only on necessary ports (e.g., 80, 443).
*   **Git:** For cloning the repository.
*   **Nginx/Caddy/Envoy:** A reverse proxy server installed on your host.

## 2. Environment Configuration

### 2.1. `.env` File

Create a `config/.env` file on your production server. **This file should never be committed to source control.**

```bash
mkdir -p /path/to/your/app/config
nano /path/to/your/app/config/.env
```

Populate `config/.env` with production-ready values. Key considerations:

*   **`APP_ENV=production`**: Ensures production-specific logging and error handling.
*   **`APP_PORT=8080`**: The internal port of the C++ application inside the Docker container.
*   **`DATABASE_PATH=/app/data/app.db`**: Keep this path, as it maps to a Docker volume.
*   **`JWT_SECRET_KEY`**: **CRITICAL!** Generate a very strong, unique, and long (e.g., 64+ characters) secret key. Use a strong random generator. Never reuse this key.
    ```bash
    # Example for generating a strong secret (use a more robust tool for production)
    openssl rand -base64 64
    ```
*   **`JWT_EXPIRATION_SECONDS`**: Adjust based on security needs (e.g., 3600 for 1 hour).
*   **`LOG_LEVEL=info`** (or `warn`, `error`): Reduce verbosity for production.
*   **`LOG_FILE=/app/logs/app.log`**: Ensure logs go to the designated volume.
*   **`CACHE_TTL_SECONDS`**: Adjust based on your caching strategy.
*   **`RATE_LIMIT_REQUESTS`, `RATE_LIMIT_WINDOW_SECONDS`**: Tune these values to prevent abuse while allowing legitimate traffic.
*   **`ADMIN_USERNAME`, `ADMIN_PASSWORD`**: Set secure credentials for the initial admin user. The application will hash this password on first run/update. **Change this after initial setup if it's a default!**

### 2.2. Docker Compose File

The `docker-compose.yml` provided in the repository is suitable for production, but ensure the `volumes` section for `.env` is correctly mapped:

```yaml
# ...
services:
  app:
    # ...
    volumes:
      - app_data:/app/data
      - app_logs:/app/logs
      - /path/to/your/app/config/.env:/app/.env:ro # Mount the production .env file
    # Ensure environment variables are correctly passed or read by the app
    environment:
      JWT_SECRET_KEY: ${JWT_SECRET_KEY} # Passed from host env to docker-compose
      ADMIN_USERNAME: ${ADMIN_USERNAME}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      # Other variables will be read by the app from the mounted .env file.
      # It's good practice to explicitly pass critical secrets like JWT_SECRET_KEY
      # as Docker environment variables as well, for redundancy and direct access.
# ...
```
Ensure that `JWT_SECRET_KEY`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD` are set as environment variables on your *host machine* where `docker-compose` is run, or directly in the `docker-compose.yml` if you embed them (less secure for secrets).

Example for setting host environment variables:
```bash
export JWT_SECRET_KEY="your_strong_production_jwt_secret"
export ADMIN_USERNAME="prod_admin"
export ADMIN_PASSWORD="your_super_secure_admin_password"
```

## 3. Deployment Steps

### 3.1. Clone Repository

```bash
git clone https://github.com/your-repo/task-management-system.git /path/to/your/app
cd /path/to/your/app
```

### 3.2. Build and Run Docker Containers

```bash
# Ensure you are in the project root directory /path/to/your/app
docker-compose up --build -d
```
This command will:
1.  Build the Docker image for the C++ application.
2.  Create `app_data` and `app_logs` Docker volumes for persistent storage.
3.  Mount your `config/.env` file into the container.
4.  Run the `migrations.sh` script (which applies schema and seeds data).
5.  Start the C++ application.

### 3.3. Verify Deployment

Check the container status:
```bash
docker-compose ps
```
Check logs for any errors:
```bash
docker-compose logs -f app
```
Verify the health check:
```bash
curl http://localhost:18080/health # If accessing directly on the host
```

## 4. Setting up a Reverse Proxy (Nginx Example)

In a production environment, you should always place a reverse proxy in front of your Docker container. This handles SSL/TLS termination, HTTP to HTTPS redirection, request logging, and potentially load balancing if you scale horizontally.

### 4.1. Install Nginx

```bash
sudo apt update
sudo apt install nginx -y
```

### 4.2. Configure Nginx

Create a new Nginx configuration file for your domain:

```bash
sudo nano /etc/nginx/sites-available/your_domain.conf
```

Add the following configuration (replace `your_domain.com` with your actual domain):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your_domain.com www.your_domain.com;

    # Redirect all HTTP traffic to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your_domain.com www.your_domain.com;

    # SSL Certificate configuration (replace with your certificate paths)
    ssl_certificate /etc/letsencrypt/live/your_domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your_domain.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/your_domain.com/chain.pem;

    # Recommended SSL settings for security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers "EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH";
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    location / {
        # Proxy requests to your Docker container (replace 18080 with your APP_PORT)
        proxy_pass http://localhost:18080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        send_timeout 60s;
    }

    # Optional: Log directory for Nginx access and error logs
    access_log /var/log/nginx/your_domain.access.log;
    error_log /var/log/nginx/your_domain.error.log;
}
```

### 4.3. Enable Nginx Configuration

```bash
sudo ln -s /etc/nginx/sites-available/your_domain.conf /etc/nginx/sites-enabled/
sudo nginx -t # Test Nginx configuration for syntax errors
sudo systemctl restart nginx
```

### 4.4. Obtain SSL/TLS Certificate (e.g., Let's Encrypt with Certbot)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your_domain.com -d www.your_domain.com
```
Follow the prompts. Certbot will automatically configure Nginx for HTTPS and set up auto-renewal.

## 5. Security Best Practices for Production

*   **Firewall:** Only open ports 80 (HTTP) and 443 (HTTPS) to the public. Internal services (like your Docker container's 18080) should only be accessible from `localhost` or specific internal IPs.
*   **Secrets Management:** Never hardcode secrets. Use environment variables. For highly sensitive secrets, consider dedicated secret management services (e.g., HashiCorp Vault, AWS Secrets Manager, Azure Key Vault).
*   **User Privileges:** Run containers with a non-root user. Our `Dockerfile` aims for this in the runtime stage.
*   **Docker Security:**
    *   Use minimal base images (e.g., `debian:bullseye-slim`).
    *   Regularly update base images.
    *   Scan images for vulnerabilities.
*   **Backup Strategy:** Implement regular backups for your `app_data` Docker volume containing the SQLite database.
*   **Monitoring & Alerting:** Set up robust monitoring for application health, performance metrics, and security events (from `app.log`). Configure alerts for critical issues.
*   **Log Management:** Centralize logs using a log aggregator (e.g., ELK Stack, Splunk, Graylog).
*   **Regular Updates:** Keep your OS, Docker, Nginx, and application dependencies updated to patch security vulnerabilities.
*   **Code Audits:** Periodically review your code for security flaws.
*   **Penetration Testing:** Conduct professional penetration tests.

## 6. Scaling Considerations

*   **Horizontal Scaling:** For higher traffic, run multiple instances of your C++ application behind a load balancer (e.g., Nginx, HAProxy, AWS ALB).
*   **Database:** SQLite is excellent for small to medium scale. For very high concurrency or large datasets, migrate to a dedicated, external relational database (e.g., PostgreSQL, MySQL).
*   **Caching:** For a distributed cache, replace the in-memory `CacheService` with an external solution like Redis or Memcached.

By following this deployment guide and adhering to security best practices, you can successfully deploy your Task Management System in a production environment.
```