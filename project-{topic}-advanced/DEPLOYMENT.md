# Deployment Guide: Task Management Platform

This document provides instructions for deploying the Task Management Platform. It covers local deployment using Docker Compose and conceptual steps for a production deployment on a cloud VM (e.g., AWS EC2).

## 1. Local Deployment with Docker Compose (Recommended for Dev/Test)

This is the easiest way to get the entire application stack (application + PostgreSQL database) up and running on your local machine.

### Prerequisites (Local)
*   [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running.
*   **Git** for cloning the repository.

### Steps

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/task-management-platform.git
    cd task-management-platform
    ```

2.  **Create a `.env` file:**
    In the root directory of the project, create a file named `.env` and add the following environment variables. These will be used by `docker-compose.yml`.

    ```bash
    # .env
    DB_NAME=taskmanager
    DB_USERNAME=user
    DB_PASSWORD=password
    JWT_SECRET=your_super_secret_jwt_key_that_is_at_least_32_chars_long_and_random # CHANGE THIS!
    ```

3.  **Build and run the containers:**
    The `docker-compose.yml` orchestrates both the `db` (PostgreSQL) and `app` (Spring Boot) services.

    ```bash
    docker compose up --build -d
    ```
    *   `--build`: This command ensures your Docker image is built from the `Dockerfile` if there are any changes or if it's the first time running.
    *   `-d`: Runs the containers in detached mode (in the background).

4.  **Verify services are running:**
    ```bash
    docker compose ps
    ```
    You should see both `taskmanager-db` and `taskmanager-app` with a `healthy` status (for the DB) and `Up` status.

5.  **View logs (optional):**
    ```bash
    docker compose logs -f
    ```
    This will show the combined logs from both services.

6.  **Access the application:**
    *   **API Base URL:** `http://localhost:8080/api`
    *   **Swagger UI (API Documentation):** `http://localhost:8080/swagger-ui.html`

7.  **Stop and remove containers:**
    When you're done, you can stop and remove the containers and their associated networks:
    ```bash
    docker compose down
    ```
    To also remove volumes (which store database data), use:
    ```bash
    docker compose down --volumes
    ```

## 2. Production Deployment on a Cloud VM (e.g., AWS EC2)

This section outlines the steps for deploying the application to a single cloud virtual machine (VM). This is a common starting point for production deployments, often referred to as a "single-server deployment" or "monolithic deployment on VM".

### Prerequisites (Production VM)

*   **A Cloud VM:** (e.g., AWS EC2, GCP Compute Engine, Azure Virtual Machines) running a Linux distribution (e.g., Ubuntu, CentOS).
*   **SSH Access:** Configured SSH key pair for secure access to the VM.
*   **Essential Software Installed on VM:**
    *   **Docker Engine:** `sudo apt update && sudo apt install docker.io -y && sudo systemctl start docker && sudo systemctl enable docker`
    *   **Docker Compose:** `sudo apt install docker-compose -y`
    *   **Git:** `sudo apt install git -y`
*   **Firewall Configuration:** Ensure ports `80` (for web server/proxy if used) and `8080` (for direct access to app, or from proxy) are open to necessary IP ranges.
*   **Database:** While you can run PostgreSQL in Docker on the same VM, for production, it's highly recommended to use a managed database service (e.g., AWS RDS, GCP Cloud SQL) for better scalability, reliability, and automated backups. For this guide, we'll assume a managed PostgreSQL or a local Dockerized PostgreSQL.

### Steps for Manual Deployment (initial setup)

1.  **SSH into your VM:**
    ```bash
    ssh -i /path/to/your/key.pem <username>@<your-vm-ip>
    ```

2.  **Create deployment directory:**
    ```bash
    sudo mkdir -p /opt/task-management-platform
    sudo chown -R $USER:$USER /opt/task-management-platform
    cd /opt/task-management-platform
    ```

3.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/task-management-platform.git . # Clones into current directory
    ```

4.  **Configure Environment Variables (Production Secrets):**
    Create a `.env` file in the `/opt/task-management-platform` directory. **These should be your production-grade secrets, NOT development ones.**

    ```bash
    # .env
    DB_HOST=your_production_db_host # e.g., your-rds-endpoint.amazonaws.com
    DB_PORT=5432
    DB_NAME=taskmanager_prod
    DB_USERNAME=prod_user
    DB_PASSWORD=prod_password
    JWT_SECRET=YOUR_SUPER_SECURE_RANDOM_PRODUCTION_JWT_SECRET_THAT_IS_LONG_AND_UNIQUE
    ```
    **Security Note:** For true production, environment variables are better managed via cloud secret managers (e.g., AWS Secrets Manager, GCP Secret Manager) rather than static `.env` files directly on the VM.

5.  **Login to Docker Hub (or your chosen container registry):**
    This allows your VM to pull the application's Docker image that was pushed by the CI/CD pipeline.

    ```bash
    docker login -u <your-docker-username> -p <your-docker-access-token>
    ```
    Replace `<your-docker-username>` and `<your-docker-access-token>` with your actual Docker Hub credentials or tokens.

6.  **Pull the latest Docker image and run with Docker Compose:**
    ```bash
    docker compose up --build -d
    ```
    *   The `build` step is usually skipped in CD if using a pre-built image, but here it ensures the image is created if needed. In CD, `docker pull` followed by `docker compose up -d` (without `--build`) is more common.

7.  **Set up reverse proxy (Recommended for Production - e.g., Nginx):**
    For production, it's best to run your application behind a reverse proxy like Nginx. This allows for:
    *   SSL/TLS termination (HTTPS).
    *   Load balancing (if you scale to multiple app instances).
    *   Static file serving (if you had a separate frontend).
    *   Caching, Gzip compression, etc.

    **Example Nginx Configuration (`/etc/nginx/sites-available/taskmanager`):**
    ```nginx
    server {
        listen 80;
        listen [::]:80;
        server_name your_domain.com your_vm_ip; # Replace with your domain or IP

        location / {
            proxy_pass http://localhost:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # For API documentation
        location /swagger-ui/ {
            proxy_pass http://localhost:8080/swagger-ui/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # For Actuator endpoints (Admin only)
        location /actuator/ {
            proxy_pass http://localhost:8080/actuator/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            # Restrict access further with Nginx basic auth or IP whitelisting
        }
    }
    ```
    *   Enable the Nginx config:
        ```bash
        sudo ln -s /etc/nginx/sites-available/taskmanager /etc/nginx/sites-enabled/
        sudo nginx -t # Test Nginx configuration
        sudo systemctl restart nginx
        ```
    *   Install Certbot to enable HTTPS: `sudo apt install certbot python3-certbot-nginx -y`
    *   Obtain SSL certificate: `sudo certbot --nginx -d your_domain.com`

### Steps for Automated CI/CD Deployment (after initial setup)

Once the initial setup is done on your VM (Docker, Docker Compose, Git, Nginx, etc.), and your GitHub Actions secrets are configured, the deployment process becomes automated:

1.  **Develop features** and push changes to a feature branch.
2.  **Create a Pull Request** to `main`. The CI job runs tests.
3.  **Merge the Pull Request** into `main`.
4.  The **CI/CD workflow (`.github/workflows/ci-cd.yml`)** is triggered:
    *   It builds, tests, and pushes the new Docker image to your container registry.
    *   It then connects to your production VM via SSH.
    *   On the VM, it executes a script:
        *   Stops the running containers.
        *   Pulls the **latest** Docker image from the registry.
        *   Starts new containers with the updated image using `docker compose up -d`.

This automated process ensures that every validated change on your `main` branch is quickly and reliably deployed to production.

## 3. Post-Deployment Checks

After any deployment, always perform these checks:

*   **Application Health:**
    *   Check `docker compose ps` on the VM.
    *   Access `http://your_domain.com/actuator/health` (or `http://your_vm_ip:8080/actuator/health` if no proxy).
*   **API Functionality:** Perform basic CRUD operations using Swagger UI or cURL to verify the API is working as expected.
*   **Logs:** Check application logs for any errors or warnings: `docker compose logs taskmanager-app`.
*   **Performance:** Monitor response times and resource utilization if under load.

By following these guidelines, you can ensure a smooth and reliable deployment of your Task Management Platform.