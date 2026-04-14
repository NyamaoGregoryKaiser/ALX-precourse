```markdown
# Web Scraping Tools System - Deployment Guide

This guide provides instructions for deploying the Web Scraping Tools System to a production environment using Docker and Docker Compose. While the `docker-compose.yml` is suitable for local development and small-scale deployments, for larger-scale production, consider Kubernetes or cloud-specific container services (AWS ECS, Google Cloud Run, Azure Container Apps).

## 1. Prerequisites

*   A Linux-based server (Ubuntu, CentOS, etc.)
*   Docker installed on the server
*   Docker Compose installed on the server
*   Git installed on the server
*   Domain name (optional, but recommended for HTTPS)
*   SSL/TLS certificate (e.g., Let's Encrypt with Nginx or Caddy)
*   Access to `sudo` or root privileges

## 2. Server Setup

1.  **Connect to your server**:
    ```bash
    ssh user@your_server_ip
    ```

2.  **Update packages and install Docker/Docker Compose (if not already installed)**:
    ```bash
    sudo apt update
    sudo apt upgrade -y
    sudo apt install -y docker.io docker-compose git
    sudo usermod -aG docker ${USER} # Add current user to docker group
    # You might need to log out and log back in for the changes to take effect
    exit
    ```
    (Log back in)

3.  **Verify Docker installation**:
    ```bash
    docker --version
    docker-compose --version
    ```

## 3. Clone the Repository

1.  **Choose a directory for your project (e.g., `/opt/web-scraper`)**:
    ```bash
    sudo mkdir -p /opt/web-scraper
    sudo chown ${USER}:${USER} /opt/web-scraper
    cd /opt/web-scraper
    git clone https://github.com/your-username/web-scraping-tools.git .
    ```

## 4. Configure Environment Variables

1.  **Create a `.env` file**:
    ```bash
    cp .env.example .env
    ```

2.  **Edit the `.env` file**:
    ```bash
    nano .env
    ```
    **Crucial variables to change for production:**

    ```dotenv
    # Application Configuration
    PORT=8000 # Keep 8000 for internal container port, expose differently via reverse proxy
    NODE_ENV=production # IMPORTANT!

    # Database Configuration (PostgreSQL)
    # Use strong, random passwords. If using an external managed DB, adjust DB_HOST, DB_PORT
    DB_HOST=db # Internal Docker service name if using docker-compose db
    DB_PORT=5432
    DB_USER=your_secure_db_user
    DB_PASSWORD=your_secure_db_password
    DB_NAME=your_production_db_name

    # JWT Configuration - GENERATE A NEW, LONG, RANDOM SECRET
    JWT_SECRET=super_long_and_random_production_jwt_secret_!!!!!!!
    JWT_ACCESS_EXPIRATION_MINUTES=60
    JWT_REFRESH_EXPIRATION_DAYS=30

    # Redis Configuration
    REDIS_HOST=redis # Internal Docker service name
    REDIS_PORT=6379

    # Admin User Seed Data - CHANGE THIS TO SECURE VALUES FOR PROD SEEDING
    # This will only be used if the database is empty and seeds are run.
    ADMIN_EMAIL=your_admin_email@example.com
    ADMIN_PASSWORD=your_super_strong_admin_password

    # Scraper Configuration
    SCRAPER_CONCURRENCY=5 # Adjust based on server resources and target site policies

    # Frontend API URL - This should point to your public API endpoint (e.g., https://api.yourdomain.com/api)
    REACT_APP_API_URL=http://localhost:8000/api # During build, this is used. For production, the backend serves the frontend.

    # Puppeteer Specific - If using different chrome path
    # CHROME_BIN=/usr/bin/chromium-browser
    ```

    **Important Considerations**:
    *   **Passwords**: Use strong, unique passwords for DB, JWT, and admin user.
    *   **`NODE_ENV=production`**: This enables production optimizations, stricter error handling, and security measures in the backend.
    *   **`JWT_SECRET`**: Generate a cryptographically secure random string. Never share it.
    *   **`ADMIN_EMAIL` / `ADMIN_PASSWORD`**: These are used for seeding the initial admin user. Once seeded, you can manage users via the application. It's recommended to remove them from `.env` or comment them out after the first successful deployment/seeding.

## 5. Docker Compose Configuration for Production

The provided `docker-compose.yml` is generally suitable. However, ensure the backend `command` is set for production.

**Modify `docker-compose.yml` (if needed)**:

Open `docker-compose.yml` and locate the `backend` service.
Change the `command` line from development to production:

```yaml
  backend:
    # ... other configurations ...
    command: sh -c "npm run migrate:latest && npm start" # For production
    # command: sh -c "npm run migrate:latest && npm run seed:run && npm run dev" # For dev
```

*   `npm run migrate:latest`: Ensures all database migrations are applied.
*   `npm start`: Starts the Node.js backend in production mode.
*   **Optional `seed:run`**: If you want to re-seed data on every `up --build` (e.g., for staging environments), you can add `npm run seed:run` before `npm start`. For a persistent production database, you typically seed once manually or via CI/CD.

## 6. Build and Run the Stack

1.  **Build the Docker images**:
    This step will build the backend image, which includes building the React frontend and placing its static assets into the backend's `src/public` directory.
    ```bash
    docker-compose build
    ```

2.  **Start the services**:
    ```bash
    docker-compose up -d
    ```
    The `-d` flag runs the containers in detached mode (in the background).

3.  **Verify services are running**:
    ```bash
    docker-compose ps
    ```
    You should see `Up (healthy)` for `db` and `redis`, and `Up` for `backend`.

4.  **Check logs for initial setup**:
    ```bash
    docker-compose logs backend
    ```
    Look for messages indicating successful DB connection, migrations, and server listening.

## 7. Setup a Reverse Proxy (Nginx/Caddy - Recommended for Production)

Directly exposing the Node.js app on port 8000 is not recommended for production. A reverse proxy (like Nginx or Caddy) provides:
*   **HTTPS**: Essential for securing traffic.
*   **Load Balancing**: If you scale your backend to multiple instances.
*   **Static File Serving**: Nginx/Caddy can efficiently serve static files (like your React build) directly, offloading this from your Node.js app.
*   **Security**: Additional layer of protection.

### Example Nginx Configuration

1.  **Install Nginx**:
    ```bash
    sudo apt install nginx -y
    ```

2.  **Create a new Nginx configuration file**:
    ```bash
    sudo nano /etc/nginx/sites-available/web-scraper
    ```

3.  **Add the following configuration (replace `yourdomain.com` with your actual domain):**

    ```nginx
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$host$request_uri; # Redirect HTTP to HTTPS
    }

    server {
        listen 443 ssl;
        server_name yourdomain.com www.yourdomain.com;

        # SSL Configuration (replace with your actual certificate paths)
        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
        include /etc/letsencrypt/options-ssl-nginx.conf; # Recommended SSL settings
        ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # Diffie-Hellman parameters

        location / {
            proxy_pass http://localhost:8000; # Pass requests to your backend container
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Optional: If you want Nginx to serve static files from the backend container directly
        # You would need to map the /app/backend/src/public volume from backend service
        # to a host path and then configure Nginx to serve from that host path.
        # This is not implemented in the current Dockerfile/docker-compose.yml for simplicity.
        # The current Dockerfile bundles frontend into backend, so backend serves it.
    }
    ```
    *   **HTTPS**: You'll need to obtain SSL certificates (e.g., using Certbot for Let's Encrypt). Follow Certbot's instructions for Nginx.
    *   `proxy_pass http://localhost:8000;`: This assumes Nginx is running directly on the host and can access port 8000 of the Docker container (which is mapped in `docker-compose.yml`).

4.  **Enable the Nginx configuration**:
    ```bash
    sudo ln -s /etc/nginx/sites-available/web-scraper /etc/nginx/sites-enabled/
    sudo nginx -t # Test Nginx configuration for syntax errors
    sudo systemctl restart nginx
    ```

## 8. Continuous Integration / Continuous Deployment (CI/CD)

The `.github/workflows/main.yml` provides a basic GitHub Actions workflow.

### `.github/workflows/main.yml`