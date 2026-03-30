# Task Management System: Deployment Guide

This guide outlines the steps to deploy the Task Management System to a production environment using Docker and a reverse proxy (e.g., Nginx). This setup assumes you have a Linux server with Docker and Docker Compose installed.

## Prerequisites

*   A Linux server (e.g., Ubuntu, CentOS)
*   Docker and Docker Compose installed on the server.
    *   [Install Docker Engine](https://docs.docker.com/engine/install/)
    *   [Install Docker Compose](https://docs.docker.com/compose/install/)
*   Git installed on the server.
*   A domain name (e.g., `yourtaskapp.com`) pointing to your server's IP address.
*   SSH access to your server.
*   (Optional but Recommended) Certbot for SSL/TLS certificates (Let's Encrypt).

## 1. Prepare Your Server

1.  **SSH into your server:**
    ```bash
    ssh user@your_server_ip
    ```
2.  **Update your package list:**
    ```bash
    sudo apt update && sudo apt upgrade -y
    ```
3.  **Install Git (if not already installed):**
    ```bash
    sudo apt install git -y
    ```
4.  **Create a directory for your project:**
    ```bash
    mkdir ~/task-management-system
    cd ~/task-management-system
    ```

## 2. Clone the Repository

```bash
git clone https://github.com/your-username/task-management-system.git . # Clone into current directory
```
*Note: Replace `your-username` with your actual GitHub username or repository URL.*

## 3. Configure Environment Variables

Create `.env` files for production in the root directory, and for backend within `backend/` as per `backend/.env.example` and `frontend/.env.example`.

**Important Considerations for Production `.env`:**

*   **`backend/.env`**:
    *   `NODE_ENV=production`
    *   `PORT=5000` (internal container port)
    *   `DB_HOST=db` (Docker service name)
    *   `REDIS_HOST=redis` (Docker service name)
    *   `JWT_SECRET`: **Generate a strong, unique secret key.**
    *   `CORS_ORIGINS`: Your frontend's public URL (e.g., `https://yourtaskapp.com`).
    *   `LOG_LEVEL=info` (or `error` for less verbosity)
*   **`frontend/.env`**:
    *   `REACT_APP_API_BASE_URL`: The public URL of your backend (e.g., `https://api.yourtaskapp.com` or `https://yourtaskapp.com/api/v1` if using a single domain with Nginx path routing). This will be passed as a build-arg to the frontend Dockerfile.
*   **`docker-compose.yml` (root directory)**:
    *   The `docker-compose.yml` itself relies on variables like `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`, `JWT_SECRET` etc. You can either define these in a `.env` file in the same directory as `docker-compose.yml`, or directly in the `docker-compose.yml` file. Using a `.env` file at the root is generally preferred for sensitive data.

**Example Production `.env` (at project root):**
```dotenv
# .env (at project root)
# These variables will be picked up by docker-compose for PostgreSQL, Redis, and Backend
DB_USERNAME=your_db_user
DB_PASSWORD=your_strong_db_password
DB_DATABASE=task_prod_db
JWT_SECRET=a_very_long_and_complex_secret_for_jwt_prod_env_12345!@#$%^&*()
REDIS_PASSWORD=your_strong_redis_password # If you configure Redis with auth
CORS_ORIGINS=https://yourtaskapp.com
```

## 4. Build and Run Docker Containers

1.  **Build Docker images:**
    ```bash
    docker-compose build
    ```
    This will build the `backend` and `frontend` images based on their `Dockerfile`s and the `nginx` configuration. Ensure `REACT_APP_API_BASE_URL` in `frontend/.env` is correctly set to your *production* backend URL before building the frontend image.

2.  **Run migrations and seed data (One-time setup):**
    Before starting the backend service, you need to run database migrations. You can do this by overriding the `command` in `docker-compose.yml` temporarily, or running it manually after the `db` service is up.

    *Option A (Manual):*
    ```bash
    # Start only the database and redis
    docker-compose up -d db redis

    # Wait a few seconds for DB to initialize
    sleep 15

    # Run migrations and then seeds (adjust path/command if needed)
    docker-compose run --rm backend npm run migration:run
    docker-compose run --rm backend npm run seed
    ```

    *Option B (Via docker-compose command, as in `docker-compose.yml` provided):*
    The `docker-compose.yml` includes a `command` for the `backend` service that runs `migration:run` and `seed` before `npm start`. This is convenient for a fresh deploy but ensures data is initialized. For subsequent updates, you'd typically manage migrations separately (`docker-compose run --rm backend npm run migration:run`) to avoid re-seeding or running potentially destructive commands on every container restart.
    
    If using the provided `docker-compose.yml` command, simply start all services:
    ```bash
    docker-compose up -d
    ```
    Monitor logs to ensure migrations and seeding are successful: `docker-compose logs backend`.

## 5. Set up Nginx as a Reverse Proxy (for SSL and Domain Mapping)

While the `frontend` container includes Nginx, a separate Nginx instance on the host is usually used for:
*   Serving multiple applications on one server.
*   Handling SSL termination (HTTPS).
*   Routing traffic based on domain/path.

1.  **Install Nginx on your host:**
    ```bash
    sudo apt install nginx -y
    sudo systemctl enable nginx
    sudo systemctl start nginx
    ```

2.  **Create an Nginx configuration file for your domain:**
    ```bash
    sudo nano /etc/nginx/sites-available/yourtaskapp.com
    ```
    Add the following configuration (replace `yourtaskapp.com` with your domain):

    ```nginx
    server {
        listen 80;
        server_name yourtaskapp.com api.yourtaskapp.com; # Add your API subdomain if any

        location / {
            proxy_pass http://localhost:3000; # Points to the frontend container's exposed port
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Optional: Route API requests through a specific path
        location /api/v1/ {
            proxy_pass http://localhost:5000/api/v1/; # Points to the backend container's exposed port
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
    ```
    *Note:* `localhost:3000` and `localhost:5000` here refer to the ports exposed by your Docker Compose setup on the host machine.

3.  **Enable the Nginx configuration:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/yourtaskapp.com /etc/nginx/sites-enabled/
    sudo nginx -t # Test Nginx configuration for syntax errors
    sudo systemctl restart nginx
    ```

## 6. Secure with SSL/TLS (HTTPS) using Certbot (Recommended)

1.  **Install Certbot and its Nginx plugin:**
    ```bash
    sudo apt install certbot python3-certbot-nginx -y
    ```
2.  **Run Certbot to obtain and install certificates:**
    ```bash
    sudo certbot --nginx -d yourtaskapp.com -d api.yourtaskapp.com # Include all your domains/subdomains
    ```
    Follow the prompts. Certbot will automatically configure Nginx to use HTTPS and set up automatic renewal.

## 7. Access Your Application

Open your web browser and navigate to `https://yourtaskapp.com`.

## 8. Continuous Deployment Considerations

For a more robust CD pipeline:

*   **Webhook/Git Hooks:** Configure your Git repository (e.g., GitHub) to send a webhook to your server when changes are pushed to `main`.
*   **Deployment Script:** On the server, have a script that listens for the webhook, pulls the latest code, runs `docker-compose build`, and `docker-compose up -d`.
*   **Zero-Downtime Deployment:** For truly zero-downtime, consider strategies like blue-green deployments or rolling updates with a more advanced orchestrator (Kubernetes, Docker Swarm) which are beyond the scope of this basic guide.
*   **Database Migrations:** In production, migrations should be run carefully. It's often safer to run them as a separate step *before* deploying new application code that depends on the new schema, possibly using `docker-compose run --rm backend npm run migration:run`.
*   **Rollback Strategy:** Always have a plan to roll back to a previous working version in case of issues.

## 9. Monitoring and Logging

*   **Container Logs:** `docker-compose logs -f [service_name]` to view real-time logs.
*   **Backend Logs:** Winston writes logs to `backend/logs/combined.log` and `backend/logs/error.log` within the container. You can mount these log directories to the host using Docker volumes (`- ./logs:/app/logs`) to persist them.
*   **Health Checks:** Docker Compose includes basic health checks for `db`. For `backend` and `frontend`, you might add more specific health checks that hit API endpoints.
*   **External Monitoring:** Integrate with tools like Prometheus/Grafana, ELK stack, or cloud-specific monitoring solutions for comprehensive insights.

By following these steps, you will have a production-ready Task Management System deployed and secured.
```