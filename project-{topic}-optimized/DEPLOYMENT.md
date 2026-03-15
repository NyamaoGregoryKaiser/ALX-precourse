# Deployment Guide for Payment Processing System

This guide outlines the steps to deploy the Payment Processing System to a production environment. We will focus on a Docker-based deployment, which offers consistency and ease of management.

## 1. Production Environment Setup

### Prerequisites
*   A Linux server (e.g., Ubuntu, CentOS)
*   Docker and Docker Compose installed on the server.
*   Nginx installed (for reverse proxy and SSL termination).
*   Domain name configured to point to your server's IP address.
*   SSL/TLS Certificate (e.g., from Let's Encrypt using Certbot).
*   Git installed.

### Server Preparation

1.  **Update System:**
    ```bash
    sudo apt update && sudo apt upgrade -y
    ```
2.  **Install Docker & Docker Compose:**
    Follow the official Docker documentation for your OS.
    *   [Install Docker Engine](https://docs.docker.com/engine/install/)
    *   [Install Docker Compose](https://docs.docker.com/compose/install/)
3.  **Install Nginx:**
    ```bash
    sudo apt install nginx -y
    ```
4.  **Install Certbot (for SSL):**
    ```bash
    sudo snap install core
    sudo snap refresh core
    sudo snap install --classic certbot
    sudo ln -s /snap/bin/certbot /usr/bin/certbot
    ```

## 2. Project Deployment

### 1. Clone the Repository

On your production server:

```bash
git clone https://github.com/your-username/payment-processing-system.git
cd payment-processing-system
```

### 2. Configure Environment Variables

Create a `.env` file in the root of your project. **Crucially, use strong, unique passwords and secrets for production.**

```bash
# Example .env for Production (replace with your actual values)
NODE_ENV=production
PORT=3000

# JWT Configuration - GENERATE A NEW, VERY LONG RANDOM SECRET
JWT_SECRET=YOUR_PRODUCTION_JWT_SECRET_VERY_LONG_AND_RANDOM_STRING
JWT_EXPIRES_IN=30d # Or whatever your security policy dictates
JWT_COOKIE_EXPIRES_IN=30

# Database Configuration (Production) - Use a managed database service or a dedicated DB server
PROD_DB_HOST=your_production_postgres_host_or_ip
PROD_DB_PORT=5432
PROD_DB_USER=your_production_db_user
PROD_DB_PASSWORD=YOUR_PRODUCTION_DB_PASSWORD_STRONG
PROD_DB_NAME=payment_processor_prod

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000 # Adjust based on expected load

# Cache (if using Redis, configure Redis host/port)
CACHE_TTL=600

# Webhook Secret - GENERATE A NEW, VERY LONG RANDOM SECRET
WEBHOOK_SIGNING_SECRET=YOUR_PRODUCTION_WEBHOOK_SECRET_VERY_LONG_AND_RANDOM_STRING
```
*   **Important:** For production, it's highly recommended to use a managed database service (e.g., AWS RDS, Google Cloud SQL, Azure Database for PostgreSQL) instead of running PostgreSQL in a Docker container on the same server as your application. This provides better reliability, backups, and scaling. If you must run it locally, ensure proper data persistence and backup strategies.

### 3. Build and Start Docker Containers

Ensure your `docker-compose.yml` is configured to use `PROD_DB_` variables if using external database. For the provided `docker-compose.yml`, it uses `DB_` variables; ensure your `.env` reflects these (e.g., `DB_HOST=...` instead of `PROD_DB_HOST=...` if you stick with the included PostgreSQL container).

```bash
docker-compose -f docker-compose.yml up --build -d
```
This command builds the Docker image for your application, and starts both the application and the PostgreSQL database (if included in `docker-compose.yml`).

### 4. Run Database Migrations and Seeders

After the containers are up and healthy:

```bash
docker exec -it <container-id-of-app> npm run db:migrate
docker exec -it <container-id-of-app> npm run db:seed # Optional, for initial data
```
Replace `<container-id-of-app>` with the actual ID or name of your running app container.

### 5. Configure Nginx as a Reverse Proxy

Create an Nginx configuration file for your domain (e.g., `/etc/nginx/sites-available/yourdomain.com`):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem; # Managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem; # Managed by Certbot
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers "EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH";
    ssl_stapling on;
    ssl_stapling_verify on;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Serve static frontend files directly from Nginx
    root /app/public; # Assuming /app/public inside your Docker container is mapped to host
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # Proxy requests to your Node.js API
    location /api/ {
        proxy_pass http://localhost:3000; # Or your Docker service name and port
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy Swagger UI to your Node.js app
    location /api-docs/ {
        proxy_pass http://localhost:3000/api-docs/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
*   **Note on `root /app/public;`**: If you're mapping your project directory into the container (`- .:/app`), then `root /app/public;` refers to the `public` folder inside your container. Make sure Nginx can access this path. A more robust approach might be to serve static files from the host directly or from a dedicated static file server.
*   **`proxy_pass http://localhost:3000;`**: If Nginx is running directly on the host, and your Docker container exposes port 3000 to the host's 3000, this is fine. If Nginx is also in a Docker container and needs to reach the `app` service, you'd use `proxy_pass http://app:3000;` and ensure Nginx is part of the same Docker network.

Create a symlink to enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
```
Test Nginx configuration:
```bash
sudo nginx -t
```
If successful, reload Nginx:
```bash
sudo systemctl reload nginx
```

### 6. Obtain SSL Certificate (with Certbot)

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Follow the prompts. Certbot will automatically configure Nginx for SSL.

### 7. Process Management (Optional but Recommended)

For maximum reliability, use a process manager like PM2 to keep your Docker containers running and manage restarts. While Docker Compose handles basic restarts, PM2 can add more sophisticated monitoring and logging for the Node.js application *within* the container, if you were to run it without `npm start` as the root command. However, for a typical Docker Compose setup, Docker's restart policies are often sufficient.

### 8. Monitoring and Logging

*   **Logs:** `docker-compose logs -f` to view container logs. Use a log aggregator like ELK stack (Elasticsearch, Logstash, Kibana) or Splunk for centralized logging in a production environment.
*   **Monitoring:** Integrate with external monitoring tools (e.g., Prometheus/Grafana, Datadog) to track application performance, resource usage, and error rates.
*   **Health Checks:** Configure health checks in `docker-compose.yml` to ensure services are truly ready.

### 9. Continuous Integration/Continuous Deployment (CI/CD)

Configure a CI/CD pipeline (e.g., GitHub Actions, GitLab CI, Jenkins) to automate testing, building Docker images, and deploying to your production server.

## Rollback Strategy

In case of issues with a new deployment, ensure you have a rollback strategy:
1.  Tag Docker images with versions (e.g., `app:v1.0.0`, `app:v1.0.1`).
2.  Maintain previous `docker-compose.yml` or a version control system that allows reverting to a stable commit.
3.  Back up your database before major deployments.

By following these steps, you can deploy your Payment Processing System to a production environment with robustness and scalability in mind.