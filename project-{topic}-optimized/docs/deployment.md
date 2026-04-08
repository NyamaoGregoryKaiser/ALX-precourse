# Deployment Guide

This document provides a step-by-step guide for deploying the Enterprise-Grade API Development System to a production environment. The recommended deployment strategy involves Docker for containerization and a reverse proxy for traffic management and SSL.

## 1. Prerequisites for Production Server

Before you begin, ensure your production server (e.g., a cloud VM, dedicated server) has:

*   **Docker & Docker Compose:** Installed and configured.
*   **Git:** For cloning the repository.
*   **Open Ports:** Ensure ports 80 (HTTP) and 443 (HTTPS) are open if you're using a reverse proxy, and any other specific ports your services might need (e.g., 5000 if directly exposing backend, though not recommended).
*   **DNS Configuration:** A domain name pointing to your server's IP address (e.g., `api.yourdomain.com`, `app.yourdomain.com`).

## 2. Environment Variables

**CRITICAL:** Never hardcode sensitive information in your application code. Use environment variables.

1.  **Create `.env` files for production:**
    *   `backend/.env`: For the backend application.
    *   `frontend/.env`: For the frontend application (if serving via backend or Nginx).

2.  **Populate `.env` files with production values:**

    **`backend/.env` (Example Production Configuration):**
    ```env
    PORT=5000
    NODE_ENV=production

    # Database Configuration (Use a managed database service like AWS RDS, GCP Cloud SQL)
    DB_DIALECT=postgres
    DB_HOST=your_production_db_host.com # e.g., an RDS endpoint
    DB_PORT=5432
    DB_USER=your_db_user
    DB_PASSWORD=your_strong_db_password
    DB_NAME=your_prod_database_name

    # Redis Configuration (Use a managed Redis service like AWS ElastiCache, GCP Memorystore)
    REDIS_HOST=your_production_redis_host.com # e.g., an ElastiCache endpoint
    REDIS_PORT=6379
    REDIS_PASSWORD=your_strong_redis_password # if applicable

    # JWT Configuration - **CHANGE THESE SECRETS!** Generate strong, long random strings.
    JWT_SECRET=SUPER_SECRET_PRODUCTION_KEY_THAT_IS_LONG_AND_RANDOM
    JWT_EXPIRES_IN=1h
    REFRESH_TOKEN_SECRET=ANOTHER_SUPER_SECRET_KEY_FOR_REFRESH_TOKENS
    REFRESH_TOKEN_EXPIRES_IN=7d

    # Logging
    LOG_LEVEL=info # or error, warn

    # Rate Limiting
    RATE_LIMIT_WINDOW_MS=60000 # 1 minute
    RATE_LIMIT_MAX_REQUESTS=100

    # CORS Origin
    CORS_ORIGIN=https://app.yourdomain.com # Your frontend domain
    ```

    **`frontend/.env` (Example Production Configuration):**
    ```env
    REACT_APP_API_BASE_URL=https://api.yourdomain.com/api/v1
    # Other frontend specific variables if any
    ```
    Ensure these files are securely managed and *not* committed to your Git repository. Consider using tools like HashiCorp Vault, AWS Secrets Manager, or Kubernetes Secrets for managing production secrets.

## 3. Production `docker-compose.yml`

A separate `docker-compose.prod.yml` can be beneficial to manage production-specific settings that differ from development.

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    image: your-docker-registry/backend-api:latest # Use your own image name and tag
    container_name: backend-api
    restart: always
    env_file:
      - ./backend/.env # Point to your production .env file
    # Expose port 5000 only to the internal network (if using Nginx reverse proxy)
    # ports:
    #   - "5000:5000" # Only if you want to expose directly, not recommended with Nginx
    networks:
      - app-network

  # Nginx Reverse Proxy (Example)
  nginx:
    image: nginx:stable-alpine
    container_name: nginx-proxy
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.prod.conf:/etc/nginx/conf.d/default.conf # Your production Nginx config
      - ./nginx/certbot/conf:/etc/nginx/ssl # SSL certificates (from Certbot)
      - ./nginx/certbot/www:/var/www/certbot # For Certbot challenges
      - ./frontend/build:/var/www/frontend # Serve frontend static files
    depends_on:
      - backend
    command: "/bin/sh -c 'while :; do sleep 6h & wait $!; nginx -s reload; done & nginx -g \"daemon off;\"'" # Auto-reload Nginx for certs
    networks:
      - app-network

  certbot:
    image: certbot/certbot
    container_name: certbot
    volumes:
      - ./nginx/certbot/conf:/etc/letsencrypt
      - ./nginx/certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $!; done;'" # Auto-renew SSL
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### Nginx Configuration (`./nginx/nginx.prod.conf`)

This Nginx configuration serves two purposes:
1.  Serves the React frontend static files.
2.  Acts as a reverse proxy for the backend API.
3.  Handles SSL termination (via Certbot/Let's Encrypt).

```nginx
# ./nginx/nginx.prod.conf
server {
    listen 80;
    server_name api.yourdomain.com app.yourdomain.com; # Your domains

    # Redirect HTTP to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }

    # For Certbot ACME challenges
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}

server {
    listen 443 ssl;
    server_name api.yourdomain.com; # Backend API domain

    ssl_certificate /etc/nginx/ssl/live/api.yourdomain.com/fullchain.pem; # Managed by Certbot
    ssl_certificate_key /etc/nginx/ssl/live/api.yourdomain.com/privkey.pem; # Managed by Certbot
    include /etc/nginx/ssl/options-ssl-nginx.conf; # Recommended SSL settings
    ssl_dhparam /etc/nginx/ssl/ssl-dhparams.pem; # Generated DH params

    location /api/ {
        proxy_pass http://backend-api:5000; # Points to the backend service name in docker-compose
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Deny access to other paths on API domain
    location / {
        return 404;
    }
}

server {
    listen 443 ssl;
    server_name app.yourdomain.com; # Frontend application domain

    ssl_certificate /etc/nginx/ssl/live/app.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/live/app.yourdomain.com/privkey.pem;
    include /etc/nginx/ssl/options-ssl-nginx.conf;
    ssl_dhparam /etc/nginx/ssl/ssl-dhparams.pem;

    root /var/www/frontend; # Path to your built React app
    index index.html index.htm;

    location / {
        try_files $uri $uri/ /index.html; # Serve React app, handle client-side routing
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

**SSL Configuration (`./nginx/ssl/options-ssl-nginx.conf` and `ssl-dhparams.pem`)**
These files enhance SSL security. You can generate them:

*   **`options-ssl-nginx.conf`**: Download from [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/#server=nginx&version=1.17.7&config=intermediate&guideline=5.6)
*   **`ssl-dhparams.pem`**: Generate on your server:
    ```bash
    sudo openssl dhparam -out ./nginx/ssl/ssl-dhparams.pem 2048 # Or 4096 for stronger security
    ```

## 4. Deployment Steps

1.  **SSH into your production server.**

2.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/enterprise-api-system.git
    cd enterprise-api-system
    ```

3.  **Create `.env` files:**
    Create the `backend/.env` and `frontend/.env` files with your production configurations as described in Section 2.

4.  **Prepare Nginx configuration:**
    Create the `nginx` directory and the configuration files:
    ```bash
    mkdir -p nginx/certbot/conf nginx/certbot/www nginx/ssl
    # Copy/create nginx.prod.conf, options-ssl-nginx.conf, ssl-dhparams.pem as described above
    # Example:
    # cp ./nginx.prod.conf.example ./nginx/nginx.prod.conf
    # curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/resources/options-ssl-nginx.conf > ./nginx/ssl/options-ssl-nginx.conf
    # sudo openssl dhparam -out ./nginx/ssl/ssl-dhparams.pem 2048
    ```
    **Important:** Replace `api.yourdomain.com` and `app.yourdomain.com` in `nginx/nginx.prod.conf` with your actual domain names.

5.  **Build Frontend for Production:**
    ```bash
    cd frontend
    npm install
    npm run build # This creates the 'build' folder
    cd ..
    ```
    This `build` folder will be mounted into the Nginx container.

6.  **Initial Nginx & Certbot setup (without SSL for first run):**
    Initially, run Nginx to respond to HTTP requests for Certbot challenges. Modify `nginx.prod.conf` temporarily or run Nginx only for port 80.
    For the first `certbot` run, you might need to comment out the `ssl_certificate` and `ssl_certificate_key` lines in `nginx.prod.conf` or use a simplified Nginx config for HTTP only.

    A common approach is to initially run `nginx` and `certbot` services from `docker-compose.prod.yml` but without the SSL directives enabled in Nginx. This allows Certbot to acquire certificates, then you re-enable SSL in Nginx and reload.

    **Start services for initial cert acquisition:**
    ```bash
    # Temporarily remove SSL config from nginx.prod.conf or use a simpler config for HTTP
    # (Or remove 'certbot' service and manually acquire outside compose initially)
    docker-compose -f docker-compose.prod.yml up -d nginx certbot
    ```

    **Acquire initial SSL Certificates (run this manually if certbot service doesn't work out of the box):**
    ```bash
    docker-compose -f docker-compose.prod.yml run --rm certbot certonly --webroot -w /var/www/certbot \
        -d api.yourdomain.com -d app.yourdomain.com \
        --email your-email@example.com --no-eff-email --agree-tos
    ```
    *   **NOTE:** Ensure your DNS records (`A` records) are correctly pointing to your server's IP address *before* running Certbot.

7.  **Run full production services:**
    After certificates are acquired, update your `nginx.prod.conf` (if you temporarily changed it) to include the SSL configurations.

    Then, build and run all services:
    ```bash
    docker-compose -f docker-compose.prod.yml build
    docker-compose -f docker-compose.prod.yml up -d
    ```

8.  **Run Database Migrations and Seeders:**
    This should be done *after* the backend container is up and connected to the database.
    ```bash
    docker-compose -f docker-compose.prod.yml exec backend npm run migrate
    docker-compose -f docker-compose.prod.yml exec backend npm run seed # Only if you need seed data in production
    ```
    *   **Important**: Only run `npm run seed` if you genuinely need initial data in your production database. Do not run it on subsequent deployments if you already have live data.

## 5. Post-Deployment Checks

*   **Access Frontend:** Navigate to `https://app.yourdomain.com` in your browser. Verify the UI loads correctly.
*   **Test API:** Use a tool like Postman or your browser's developer console to make requests to `https://api.yourdomain.com/api/v1/health` (or similar public endpoint) to ensure the API is responding.
*   **Check Logs:** Use `docker-compose logs -f backend` and `docker-compose logs -f nginx` to monitor application and proxy logs for errors.
*   **SSL Certificate:** Verify your SSL certificate is valid by checking the padlock icon in your browser.
*   **Functionality:** Test user registration, login, product creation, etc., to ensure all core features work.

## 6. Updates and Rollbacks

### Updating the Application

1.  **Push new changes to Git.**
2.  **Pull changes on the server:**
    ```bash
    cd enterprise-api-system
    git pull origin main # or your main branch
    ```
3.  **Rebuild frontend (if frontend changes):**
    ```bash
    cd frontend
    npm run build
    cd ..
    ```
4.  **Rebuild and restart services:**
    ```bash
    docker-compose -f docker-compose.prod.yml build backend # Only rebuild backend if code changed
    docker-compose -f docker-compose.prod.yml up -d --no-deps backend # Restart backend without rebuilding other services
    # Or, for all services (if Nginx/Certbot also updated):
    # docker-compose -f docker-compose.prod.yml up -d --build
    ```
5.  **Run new migrations (if database schema changed):**
    ```bash
    docker-compose -f docker-compose.prod.yml exec backend npm run migrate
    ```

### Rollbacks

In case of a critical issue after deployment:

1.  **Rollback Git:** Revert to a previous stable commit on your production branch.
2.  **Rebuild and restart:** Follow the update steps to deploy the older, stable version.
3.  **Database Rollback:** If a migration introduced breaking changes, you might need to run `docker-compose -f docker-compose.prod.yml exec backend npm run migrate:undo` to revert the last migration. **Exercise extreme caution with database rollbacks on production with live data!** Always have backups.

## 7. Further Enhancements for Production

*   **Monitoring and Alerting:** Integrate with Prometheus/Grafana or cloud-specific monitoring solutions.
*   **Log Aggregation:** Send logs to a centralized system (e.g., ELK Stack, Splunk, Datadog).
*   **Load Balancing:** Use a cloud load balancer (AWS ALB, GCP Load Balancer) for high availability and distributing traffic across multiple instances.
*   **Managed Services:** Utilize managed database (AWS RDS, GCP Cloud SQL) and caching (AWS ElastiCache, GCP Memorystore) services for easier maintenance and scalability.
*   **Secrets Management:** Use AWS Secrets Manager, HashiCorp Vault, or Kubernetes Secrets to manage sensitive environment variables.
*   **Blue/Green or Canary Deployments:** For zero-downtime deployments and safer rollouts.
*   **Container Orchestration:** For larger deployments, consider Kubernetes, AWS ECS, or similar.
*   **Backup Strategy:** Implement regular database and Redis backups.
```