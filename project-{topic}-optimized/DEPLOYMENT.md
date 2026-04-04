# Mobile App Backend Deployment Guide

This document provides instructions for deploying the Mobile App Backend. The primary deployment strategy demonstrated here uses **Docker and Docker Compose** for local development and simplified single-server deployment. For production, concepts for container orchestration platforms like Kubernetes or cloud-specific services (AWS ECS, Google Cloud Run) are discussed.

## 1. Prerequisites

Before you begin, ensure you have the following installed:

*   **Git**: For cloning the repository.
*   **Docker**: Docker Engine and Docker Compose (version 1.28.0+ or Docker Desktop which includes Compose v2).
    *   [Install Docker Engine](https://docs.docker.com/engine/install/)
    *   [Install Docker Compose](https://docs.docker.com/compose/install/)

## 2. Local Deployment with Docker Compose (Development & Testing)

This method is ideal for setting up the entire stack (FastAPI app, PostgreSQL, Redis) quickly on your local machine.

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-username/mobile-backend.git
cd mobile-backend
```
**(Replace `your-username/mobile-backend.git` with the actual repository URL)**

### Step 2: Configure Environment Variables

Create a `.env` file in the root of the project by copying the example:

```bash
cp .env.example .env
```

Now, edit the `.env` file to customize your settings.
**Important**:
*   Change `SECRET_KEY` to a strong, unique value.
*   Keep `POSTGRES_HOST=db` and `REDIS_HOST=redis` as they are, as these refer to the service names within the Docker network.
*   You can change database credentials (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`) if desired.
*   Set `DEBUG=True` for development, `False` for production.
*   `DATABASE_URL` will be automatically constructed by `docker-compose` based on the host `db`.

Example `.env` snippet:
```
# ... (other settings) ...
SECRET_KEY="YOUR_SUPER_STRONG_AND_UNIQUE_SECRET_KEY_FOR_PRODUCTION_OR_DEVELOPMENT"
DATABASE_URL="postgresql+asyncpg://admin:admin@db:5432/mobile_db"
# ... (other settings) ...
```

### Step 3: Build and Run with Docker Compose

From the project root directory, execute:

```bash
docker-compose up --build -d
```

*   `docker-compose up`: Starts the services defined in `docker-compose.yml`.
*   `--build`: Forces Docker to rebuild the application image. Useful if you've changed the `Dockerfile` or `requirements.txt`.
*   `-d`: Runs the containers in detached mode (in the background).

This command will:
1.  Build the `app` Docker image based on the `Dockerfile`.
2.  Pull the `postgres` and `redis` images.
3.  Create the `db`, `redis`, and `app` containers.
4.  Run Alembic migrations (`alembic upgrade head`) inside the `app` container on startup.
5.  Run the seeding script (`python scripts/seed_db.py`) to populate initial data.
6.  Start the FastAPI application using Gunicorn and Uvicorn workers.

### Step 4: Verify Deployment

Once the containers are up, you can check their status:

```bash
docker-compose ps
```

You should see `db`, `redis`, and `app` containers running.

The API should now be accessible at `http://localhost:8000`.

*   **API Documentation (Swagger UI)**: `http://localhost:8000/docs`
*   **Health Check**: `http://localhost:8000/`

To view logs from all services:

```bash
docker-compose logs -f
```

To stop and remove the containers:

```bash
docker-compose down
```

## 3. Production Deployment Considerations

While Docker Compose is excellent for local development and simple single-server deployments, for a true production environment, consider more robust solutions:

### A. Container Orchestration Platforms (Recommended for Scale)

*   **Kubernetes (K8s)**:
    *   **Pros**: Industry-standard, highly scalable, self-healing, advanced networking, service discovery, rolling updates, secrets management.
    *   **Cons**: Complex to set up and manage.
    *   **Deployment Steps**:
        1.  Create Docker image and push to a container registry (e.g., Docker Hub, ECR, GCR).
        2.  Write Kubernetes YAML manifests (`Deployment`, `Service`, `Ingress`, `PersistentVolumeClaim`, `Secret`, `ConfigMap`) for your app, database, and Redis.
        3.  Apply manifests to your K8s cluster using `kubectl`.
        4.  Configure `HorizontalPodAutoscaler` for automatic scaling.
*   **AWS ECS (Elastic Container Service)**:
    *   **Pros**: AWS-native container orchestration, simpler than K8s, integrates well with other AWS services (ECR, Fargate, ALB, CloudWatch).
    *   **Cons**: Vendor lock-in, less flexible than raw K8s.
    *   **Deployment Steps**:
        1.  Create Docker image and push to Amazon ECR.
        2.  Define an ECS Task Definition (specifies container, resources, environment).
        3.  Create an ECS Service in a cluster (e.g., Fargate for serverless, EC2 for self-managed nodes).
        4.  Attach an Application Load Balancer (ALB) for traffic distribution.
*   **Google Cloud Run / Azure Container Apps**:
    *   **Pros**: Serverless container platform, scales to zero, pay-per-request, minimal operational overhead. Ideal for stateless web services.
    *   **Cons**: May not be suitable for long-running background tasks or stateful services without external databases.
    *   **Deployment Steps**:
        1.  Create Docker image and push to Google Container Registry (GCR) or Azure Container Registry (ACR).
        2.  Deploy the image to Cloud Run/Container Apps, configuring environment variables, CPU/memory, and scaling rules.

### B. Virtual Private Server (VPS) / Cloud VM with Docker

This is a step up from local Docker Compose for single-server production.

1.  **Provision a VM**: Create a Linux VM (e.g., AWS EC2, DigitalOcean Droplet, Linode) and install Docker and Docker Compose.
2.  **Clone Repository**: `git clone ...`
3.  **Configure `.env`**: Create a production-ready `.env` file with strong `SECRET_KEY`, `DEBUG=False`, and potentially external database/Redis URLs if you're not running them in Docker on the same VM.
4.  **Run Docker Compose**: `docker-compose up --build -d`.
5.  **Reverse Proxy (Nginx)**: Configure Nginx on the host VM to:
    *   Proxy requests to your FastAPI app (e.g., `proxy_pass http://localhost:8000;`).
    *   Handle SSL termination (install Certbot for Let's Encrypt certificates).
    *   Serve static files (if any).
6.  **Monitoring & Logging**: Set up tools like Prometheus/Grafana or send logs to a centralized service (ELK, Datadog, Splunk).

**Example Nginx Configuration (`/etc/nginx/sites-available/your_domain.conf`):**

```nginx
server {
    listen 80;
    server_name your_domain.com www.your_domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your_domain.com www.your_domain.com;

    ssl_certificate /etc/letsencrypt/live/your_domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your_domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES128-GCM-SHA256;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "no-referrer-when-downgrade";

    location / {
        proxy_pass http://localhost:8000; # Or the internal IP of your Docker app container
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    # Optional: Serve static files directly from Nginx (if your app has any)
    # location /static/ {
    #    alias /app/static/; # Path inside your Docker container or mounted volume
    # }
}
```

## 4. CI/CD Integration (GitHub Actions)

The `.github/workflows/ci.yml` file defines a GitHub Actions workflow that:

1.  **Builds** the Docker image (without pushing it).
2.  **Installs dependencies** in a Python environment.
3.  **Sets up a test database and Redis** using `docker-compose.test.yml`.
4.  **Runs Alembic migrations** against the test database.
5.  **Executes Pytest unit and integration tests**.
6.  (Optional) **Uploads coverage reports** to Codecov.

**To enable the CI/CD pipeline:**

1.  **Commit your code** to a GitHub repository.
2.  **Push your changes** to the `main` or `develop` branch, or open a pull request.
3.  GitHub Actions will automatically trigger the workflow. You can monitor its progress under the "Actions" tab in your GitHub repository.

**For full CI/CD (including deployment):**

*   **Docker Hub/Container Registry Integration**: Uncomment and configure the `build-and-push-docker` job in `ci.yml`. You'll need to set up `DOCKER_USERNAME` and `DOCKER_PASSWORD` as GitHub Secrets.
*   **Deployment Automation**: For pushing to a server, the `deploy-to-server` step (commented out) would typically use SSH to connect to your production server and pull the latest Docker image, then restart the application containers. This would require `SSH_HOST`, `SSH_USERNAME`, and `SSH_KEY` as GitHub Secrets.

## 5. Post-Deployment Steps

*   **Monitoring**: Set up real-time monitoring for your application (CPU, memory, request latency, error rates) using tools like Prometheus/Grafana, Datadog, or cloud-specific services.
*   **Logging**: Ensure all application logs are aggregated to a centralized logging system (ELK, Loki, CloudWatch Logs) for easy debugging and auditing.
*   **Alerting**: Configure alerts for critical errors, performance degradation, or security incidents.
*   **Backups**: Set up regular backups for your PostgreSQL database.
*   **Security Updates**: Regularly update your base Docker images, Python dependencies, and system packages to patch security vulnerabilities.
*   **Scaling**: Based on traffic patterns, scale your application instances (horizontally) and database/Redis resources (vertically or horizontally) as needed.
*   **Load Testing**: Perform regular load tests (e.g., using Locust, JMeter) to identify performance bottlenecks and ensure the application can handle expected traffic.

By following this guide, you can successfully deploy and manage your FastAPI mobile backend in various environments.