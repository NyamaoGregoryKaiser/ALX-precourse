# Web Scraping Tools System - Deployment Guide

This guide outlines the steps to deploy the Web Scraping Tools System to a production environment. The recommended deployment strategy involves using Docker and Docker Compose for a single-host deployment, or extending to Kubernetes for more complex, distributed environments.

## 1. Prerequisites

*   **Server/VM**: A Linux-based server (e.g., Ubuntu, CentOS) with sufficient RAM (at least 2GB, more if running many Puppeteer instances) and CPU.
*   **Docker & Docker Compose**: Installed and configured on your server.
*   **Domain Name**: A registered domain name (e.g., `your-domain.com`) and DNS records configured to point to your server's IP address.
*   **HTTPS (Optional but Recommended)**: SSL/TLS certificate (e.g., from Let's Encrypt) for secure communication. Nginx can handle SSL termination.

## 2. Environment Configuration

Before deploying, configure your environment variables for production.

### `backend/.env`

Create this file in the `backend/` directory on your server. Replace placeholders with actual production values.

```
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://<prod_user>:<prod_password>@<db_host>:<db_port>/<prod_db_name>
REDIS_URL=redis://<redis_host>:<redis_port>
JWT_SECRET=YOUR_VERY_STRONG_AND_RANDOM_SECRET_KEY_HERE_MIN_32_CHARS
JWT_EXPIRES_IN=7d # Shorter expiry for production is often desired
CACHE_ENABLED=true
CACHE_TTL=3600 # seconds
PUPPETEER_HEADLESS=true # Keep true for production
```

*   **`DATABASE_URL`**: If running PostgreSQL in the same `docker-compose.yml`, use `db:5432` for `db_host`. Otherwise, use the IP or hostname of your PostgreSQL server. Ensure `prod_user`, `prod_password`, `prod_db_name` are strong and specific to production.
*   **`REDIS_URL`**: If running Redis in the same `docker-compose.yml`, use `redis:6379` for `redis_host`. Otherwise, use the IP or hostname of your Redis server.
*   **`JWT_SECRET`**: **CRITICAL**. Generate a very long, random string. Never commit this to version control.
*   **`PUPPETEER_HEADLESS`**: Set to `true` for performance and to avoid GUI dependencies on the server.

### `frontend/.env.production`

Create this file in the `frontend/` directory.

```
REACT_APP_API_BASE_URL=/api
```
This configuration assumes Nginx will proxy requests from `/api/` to the backend service.

### `frontend/nginx.conf`

Ensure this file (copied from `frontend/nginx.conf` in the repo) correctly points to your backend service name in `docker-compose.yml` (default `backend`).

```nginx
server {
  listen 80;
  server_name your-domain.com www.your-domain.com; # Replace with your domain

  root /usr/share/nginx/html;
  index index.html index.htm;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://backend:5000/api/; # 'backend' is the name of the backend service in docker-compose
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }

  # Optional: HTTPS configuration
  # listen 443 ssl;
  # ssl_certificate /etc/nginx/certs/fullchain.pem;
  # ssl_certificate_key /etc/nginx/certs/privkey.pem;
  # include /etc/nginx/options-ssl-nginx.conf; # Standard SSL configurations
  # ssl_dhparam /etc/nginx/ssl-dhparams.pem; # Diffie-Hellman parameter

  # Redirect HTTP to HTTPS (if using HTTPS)
  # server {
  #     listen 80;
  #     server_name your-domain.com www.your-domain.com;
  #     return 301 https://$host$request_uri;
  # }
}
```

## 3. Deployment Steps (using Docker Compose)

### 3.1. Clone Repository

SSH into your server and clone the repository:

```bash
git clone https://github.com/your-username/web-scraper-system.git
cd web-scraper-system
```

### 3.2. Place Environment Files

Make sure the `.env` files created in step 2 are in their respective directories:
*   `backend/.env`
*   `frontend/.env.production` (or `frontend/.env` depending on your build process)

### 3.3. Build and Run Docker Containers

Navigate to the root of the cloned repository (where `docker-compose.yml` is located) and run:

```bash
docker-compose up --build -d
```
*   `--build`: Forces a rebuild of images, ensuring the latest code changes are included.
*   `-d`: Runs the containers in detached mode (in the background).

This command will:
1.  Build the `backend` Docker image (installing dependencies, running `npm run build` if you add a build step, and then running migrations/seeds before starting the Node.js server).
2.  Build the `frontend` Docker image (building the React app, then configuring Nginx to serve it).
3.  Pull `postgres` and `redis` images.
4.  Start all services, respecting dependencies (e.g., backend waits for DB/Redis to be healthy).
5.  Database migrations and seeds will run automatically as part of the backend service's `CMD` in its `Dockerfile`.

### 3.4. Verify Deployment

*   **Check container status**:
    ```bash
    docker-compose ps
    ```
    All services should be `Up` and `healthy`.
*   **View logs**:
    ```bash
    docker-compose logs -f
    ```
    Check logs for any errors during startup.
*   **Access the application**:
    Open your browser and navigate to `http://your-domain.com` (or `http://your-server-ip:3000` if you're not using Nginx on port 80/443 directly for the frontend).

## 4. HTTPS Configuration (Recommended for Production)

For production, always use HTTPS. You can achieve this by:

1.  **Using Certbot with Nginx**:
    *   Install Certbot on your server.
    *   Stop your running Nginx container (or temporarily pause it).
    *   Run Certbot to obtain certificates (e.g., `sudo certbot --nginx -d your-domain.com -d www.your-domain.com`). Certbot will automatically configure Nginx.
    *   Mount the generated certificates into your Nginx container (e.g., by adding a volume mount like `- ./nginx/certs:/etc/nginx/certs:ro`).
    *   Update your `frontend/nginx.conf` to include `listen 443 ssl;` and point to the certificate files.
    *   Restart your `docker-compose` stack.
2.  **Using a reverse proxy like Caddy or Traefik**: These proxies can automate SSL certificate management.

## 5. CI/CD Pipeline (GitHub Actions Example)

The `.github/workflows/ci.yml` file provides a basic CI/CD pipeline configuration using GitHub Actions.

```yaml