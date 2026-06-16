# Task Management System - Deployment Guide

This document outlines the steps to deploy the Task Management System to a production environment. The recommended approach utilizes Docker and Docker Compose for ease of deployment and environment consistency. For a true production setup, you would typically use an orchestration service like Kubernetes or cloud-specific deployment services (e.g., AWS ECS, Azure Kubernetes Service, Google Cloud Run).

## 1. Prerequisites

*   A server (VM, EC2 instance, DigitalOcean Droplet, etc.) with:
    *   **Docker** installed (latest stable version)
    *   **Docker Compose** installed (latest stable version)
    *   **Git** installed
    *   **SSH access**
*   A domain name (optional, but recommended for production)
*   **Nginx** or another reverse proxy (recommended for SSL termination and static file serving)

## 2. Prepare the Production Environment

1.  **SSH into your server:**
    ```bash
    ssh user@your_server_ip
    ```

2.  **Update system packages:**
    ```bash
    sudo apt update && sudo apt upgrade -y
    ```

3.  **Install Docker and Docker Compose (if not already installed):**
    Follow the official Docker documentation for your operating system.
    *   [Install Docker Engine](https://docs.docker.com/engine/install/)
    *   [Install Docker Compose](https://docs.docker.com/compose/install/)

4.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/task-management-system.git
    cd task-management-system
    ```

5.  **Create `.env` file:**
    Copy the `.env.example` file and populate it with your production-ready environment variables.
    ```bash
    cp .env.example .env
    ```
    **Key `.env` considerations for production:**
    *   `NODE_ENV=production`
    *   `PORT=5000` (or your desired port for the backend)
    *   `CLIENT_URL=https://your-frontend-domain.com` (your actual frontend URL)
    *   `DB_HOST=db` (if using `docker-compose.yml` DB service)
    *   `DB_PORT=5432`
    *   `DB_USERNAME=your_db_user` (use strong, unique credentials)
    *   `DB_PASSWORD=your_strong_db_password` (use strong, unique credentials)
    *   `DB_DATABASE=your_production_db`
    *   `DB_SYNC=false` (CRITICAL: Never set to `true` in production to prevent data loss)
    *   `JWT_SECRET=YOUR_VERY_LONG_AND_COMPLEX_SECRET_KEY` (CRITICAL: Generate a strong, random key)
    *   `JWT_EXPIRES_IN=1d`
    *   `REDIS_HOST=redis` (if using `docker-compose.yml` Redis service)
    *   `REDIS_PORT=6379`
    *   Adjust `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS` as needed.

## 3. Build and Run with Docker Compose

1.  **Build Docker images:**
    Ensure you are in the root directory of the project. This command will build the `backend` and `frontend` images based on their respective `Dockerfile`s.
    ```bash
    docker-compose build
    ```

2.  **Run database migrations:**
    It's crucial to run migrations to set up or update your database schema before starting the application.
    ```bash
    docker-compose run --rm backend npm run migrate:run
    ```
    *   `docker-compose run --rm backend`: Runs a one-off command in a new `backend` service container, then removes it.
    *   `npm run migrate:run`: Executes the migration script defined in `package.json`.

3.  **Start all services:**
    ```bash
    docker-compose up -d
    ```
    *   `-d` runs the containers in detached mode (in the background).
    *   Verify all containers are running: `docker-compose ps`

## 4. (Recommended) Configure Nginx as a Reverse Proxy

For production, it's highly recommended to use Nginx for:
*   **SSL/TLS Termination:** Secure communication with HTTPS (e.g., using Certbot).
*   **Static File Serving:** Nginx is very efficient at serving frontend static assets.
*   **Load Balancing:** If you scale your backend horizontally.
*   **Security:** Additional security headers and request filtering.

1.  **Install Nginx on your host:**
    ```bash
    sudo apt install nginx -y
    sudo ufw allow 'Nginx Full' # If using UFW firewall
    ```

2.  **Create an Nginx configuration file:**
    Create a new file, e.g., `/etc/nginx/sites-available/task-management.conf`:
    ```nginx
    # /etc/nginx/sites-available/task-management.conf
    server {
        listen 80;
        listen [::]:80;
        server_name your_frontend_domain.com; # Replace with your domain

        # Redirect HTTP to HTTPS (optional, if you set up SSL)
        # return 301 https://$host$request_uri;

        location / {
            # Serve frontend static files
            # Assuming frontend Docker container serves on port 3000
            # If Nginx is serving files directly from build folder,
            # you would copy the frontend build artifacts to Nginx's static folder.
            # For simplicity with docker-compose, we proxy to the frontend container.
            proxy_pass http://localhost:3000; # Points to the exposed port of the frontend container
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        location /api/ {
            # Proxy API requests to the backend container
            proxy_pass http://localhost:5000/api/; # Points to the exposed port of the backend container
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Add more locations for static assets if you serve them directly from Nginx,
        # for example:
        # location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
        #    root /path/to/frontend/build; # Path where frontend build output is stored
        #    expires 30d;
        #    add_header Cache-Control "public, no-transform";
        # }
    }
    ```
    *   **Note:** The `proxy_pass http://localhost:3000;` and `http://localhost:5000/api/;` assumes Docker maps container ports to host's `localhost`. If containers are on a custom Docker network, you might need to use container names and ports directly within Nginx if Nginx is also containerized on that network.

3.  **Enable the Nginx configuration:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/task-management.conf /etc/nginx/sites-enabled/
    sudo rm /etc/nginx/sites-enabled/default # Remove default config if it exists
    sudo nginx -t # Test Nginx configuration for syntax errors
    sudo systemctl restart nginx
    ```

4.  **Install SSL with Certbot (highly recommended for HTTPS):**
    ```bash
    sudo apt install certbot python3-certbot-nginx -y
    sudo certbot --nginx -d your_frontend_domain.com
    ```
    Follow the prompts. Certbot will automatically configure Nginx for HTTPS.

## 5. Continuous Deployment (Optional)

For real continuous deployment, you'd integrate this into a CI/CD pipeline (e.g., GitHub Actions, GitLab CI, Jenkins). The `.github/workflows/ci.yml` provides a starting point for automated testing. For deployment:

1.  Pushing to `main` branch triggers a build.
2.  The workflow builds Docker images.
3.  Pushes images to a container registry (e.g., Docker Hub, AWS ECR).
4.  Connects to your production server (via SSH).
5.  Pulls the latest images.
6.  Restarts the Docker Compose services.

**Example deployment script (simplified, to be run on server or via CI):**

```bash
#!/bin/bash
# deploy.sh
set -e

# Change to project directory
cd /path/to/your/task-management-system

# Stop existing services
docker-compose down

# Pull latest code
git pull origin main

# Rebuild images
docker-compose build

# Run migrations (crucial for database updates)
docker-compose run --rm backend npm run migrate:run

# Start new services
docker-compose up -d

echo "Deployment complete!"
```

## 6. Monitoring and Logging

*   **Docker Logs:** Use `docker-compose logs -f backend` to stream logs from the backend container.
*   **Winston:** The backend uses Winston for structured logging, making it easier to parse and analyze.
*   **System Monitoring:** Use tools like `htop`, `docker stats` or cloud-provider specific monitoring dashboards to observe server resource usage.
*   **Error Tracking:** Integrate with services like Sentry or Bugsnag for real-time error reporting.

## 7. Troubleshooting

*   **Container not starting:**
    *   Check `docker-compose logs <service_name>` (e.g., `backend`, `db`).
    *   Ensure port numbers in `.env` and `docker-compose.yml` don't conflict.
    *   Verify environment variables are correctly set.
*   **Database connection issues:**
    *   Check `db` service logs.
    *   Ensure `DB_HOST` in `backend`'s `.env` (or `docker-compose.yml` environment section) points to the database service name (`db`).
    *   Verify database credentials.
    *   Ensure the `db` service is healthy (`docker-compose ps`).
*   **API requests failing:**
    *   Check backend logs for errors.
    *   Verify `nginx` configuration if you're using it.
    *   Check browser developer console for frontend errors.
*   **Frontend build issues:**
    *   Ensure `REACT_APP_API_BASE_URL` is correctly configured in `src/frontend/.env` (if used) or `src/frontend/src/api.ts` to point to your deployed backend.

By following these steps, you should be able to deploy your Task Management System effectively.