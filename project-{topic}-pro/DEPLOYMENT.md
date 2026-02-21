# ML-Utilities-Pro: Deployment Guide

This document outlines the steps to deploy the ML-Utilities-Pro application to a production environment. We will focus on a Docker-centric deployment strategy, which is highly recommended for consistency and scalability.

## 1. Prerequisites

Before you begin, ensure you have the following:

*   **A cloud provider account:** AWS, Google Cloud, Azure, DigitalOcean, etc.
*   **Docker Hub account (or similar container registry):** To store your built Docker images.
*   **A virtual machine (VM) or container orchestration service:**
    *   For simple deployments: A VM with Docker Engine and Docker Compose installed (e.g., using `docker-machine` or manually setting up a Linux VM).
    *   For scalable deployments: A Kubernetes cluster (EKS, GKE, AKS, DigitalOcean Kubernetes, etc.). This guide will primarily cover the VM approach, with notes for Kubernetes.
*   **Domain name (optional but recommended):** With DNS records configured.
*   **SSL/TLS certificate (optional but highly recommended):** For HTTPS (e.g., Let's Encrypt).

## 2. Environment Configuration

### 2.1. Production `.env` Files

Create secure `.env` files for both your `backend` and `frontend` applications on your production server. These files should **not** be committed to your Git repository.

#### `backend/.env` (Production)

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgres://prod_user:prod_password@your_db_host:5432/ml_utilities_prod_db
JWT_SECRET=YOUR_SUPER_STRONG_PRODUCTION_JWT_SECRET_KEY_HERE
JWT_EXPIRES_IN=1h # Shorter expiry for production is often better
REDIS_HOST=your_redis_host # e.g., an external Redis service IP or hostname
REDIS_PORT=6379
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=60 # Stricter rate limiting for production
CACHE_TTL_SECONDS=3600
# Sentry DSN for error tracking (if integrated)
SENTRY_DSN=
```
**Important:**
*   Replace placeholders with actual production values.
*   `DATABASE_URL` and `REDIS_HOST` should point to your dedicated production database and Redis instances, which should ideally be separate managed services (e.g., AWS RDS, Azure Database for PostgreSQL, Redis Cloud) rather than running within the same Docker Compose stack for robustness and scalability.
*   `JWT_SECRET` **must** be a long, complex, randomly generated string.

#### `frontend/.env` (Production)

```env
NODE_ENV=production
REACT_APP_API_BASE_URL=https://api.yourdomain.com/api # Your actual API domain
```
**Important:** `REACT_APP_API_BASE_URL` must point to the public URL of your backend API.

### 2.2. Database Setup

Provision a dedicated PostgreSQL database instance in your cloud provider (e.g., AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL). Configure security groups/firewalls to allow connections only from your application server(s).

## 3. Containerization and Image Building

### 3.1. Build Docker Images

From the root of your project:

```bash
# Build backend image
docker build -t your-dockerhub-username/ml-utilities-pro-backend:latest ./backend

# Build frontend image
docker build -t your-dockerhub-username/ml-utilities-pro-frontend:latest ./frontend
```
Replace `your-dockerhub-username` with your actual Docker Hub username. It's good practice to tag images with version numbers (`:v1.0.0`) in addition to `latest`.

### 3.2. Push to Container Registry

Log in to your Docker Hub account and push the images:

```bash
docker login

docker push your-dockerhub-username/ml-utilities-pro-backend:latest
docker push your-dockerhub-username/ml-utilities-pro-frontend:latest
```

## 4. Deployment to a VM using Docker Compose

This method is suitable for smaller-scale deployments or as a starting point.

### 4.1. Prepare the VM

1.  **Provision a VM:** Create a Linux VM (e.g., Ubuntu, CentOS) in your cloud provider.
2.  **Install Docker & Docker Compose:** Follow the official Docker documentation to install Docker Engine and Docker Compose on your VM.
3.  **SSH Access:** Ensure you can SSH into your VM.

### 4.2. Copy Configuration & Docker Compose File

Create a directory on your VM (e.g., `/opt/ml-utilities-pro`). Copy the `docker-compose.prod.yml` (we'll create this) and your production `.env` files into this directory.

#### `docker-compose.prod.yml`

Create this file in your project root, alongside the `docker-compose.yml`.

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    image: your-dockerhub-username/ml-utilities-pro-backend:latest
    container_name: ml-utilities-pro-backend
    restart: always
    env_file:
      - ./backend/.env # Ensure this path is correct on your VM
    ports:
      - "5000:5000" # Expose backend to host
    networks:
      - ml-utilities-network
    # volumes:
    #   - /path/to/your/backend/logs:/app/logs # Persistent logs
    depends_on:
      - redis

  frontend:
    image: your-dockerhub-username/ml-utilities-pro-frontend:latest
    container_name: ml-utilities-pro-frontend
    restart: always
    env_file:
      - ./frontend/.env # Ensure this path is correct on your VM
    ports:
      - "80:80" # Frontend served directly on port 80, or via Nginx
    networks:
      - ml-utilities-network

  redis:
    image: redis:6-alpine
    container_name: ml-utilities-pro-redis
    restart: always
    command: redis-server --appendonly yes
    # If using an external Redis, remove this service and point backend to external Redis.
    # volumes:
    #   - redis-data:/data
    networks:
      - ml-utilities-network

networks:
  ml-utilities-network:
    driver: bridge

# volumes:
#   redis-data: # For Redis persistence
```
**Notes for `docker-compose.prod.yml`:**
*   `ports` for the frontend should ideally go through an Nginx reverse proxy for SSL termination and static file serving. If serving directly, use port 80.
*   For `backend` and `frontend`, `image` should point to your images on Docker Hub.
*   `DATABASE_URL` in `backend/.env` should point to your external PostgreSQL instance, not `db` (unless you add a PostgreSQL service to this production compose file, which is generally not recommended for production).
*   `REDIS_HOST` in `backend/.env` should point to the `redis` service name *if* Redis is part of this compose file, or an external Redis hostname/IP.

### 4.3. Run the Application

On your VM, navigate to the directory where you copied the files and run:

```bash
docker compose -f docker-compose.prod.yml pull # Pull latest images
docker compose -f docker-compose.prod.yml up -d
```

### 4.4. Database Migrations

You'll need to run migrations against your production database. You can do this by executing the command inside the running backend container:

```bash
docker exec -it ml-utilities-pro-backend npx sequelize-cli db:migrate
# Optional: Seed data if necessary for production
# docker exec -it ml-utilities-pro-backend npx sequelize-cli db:seed:all
```

### 4.5. Nginx Reverse Proxy (Highly Recommended)

For a production environment, it's best to place an Nginx reverse proxy in front of your frontend and backend containers for:
*   **SSL Termination:** Serving content over HTTPS.
*   **Static File Serving:** More efficient serving of frontend build assets.
*   **Load Balancing:** Distributing requests (if multiple instances).
*   **Compression, Caching, Security Headers.**

1.  **Add Nginx service to `docker-compose.prod.yml`:**
    ```yaml
    # ... other services
    nginx:
      image: nginx:stable-alpine
      container_name: ml-utilities-pro-nginx
      restart: always
      ports:
        - "80:80"
        - "443:443" # For HTTPS
      volumes:
        - ./nginx.conf:/etc/nginx/conf.d/default.conf # Your Nginx config
        # - /etc/letsencrypt:/etc/letsencrypt # For SSL certs
      depends_on:
        - frontend
        - backend
      networks:
        - ml-utilities-network
    ```
2.  **Create `nginx.conf` in your project root:**
    ```nginx
    # nginx.conf
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com; # Replace with your domain

        # Redirect HTTP to HTTPS
        # return 301 https://$host$request_uri;

        location / {
            proxy_pass http://frontend:80; # Points to the frontend service
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        location /api/ {
            proxy_pass http://backend:5000/api/; # Points to the backend service
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Add location for /api-docs if you want to expose Swagger UI via Nginx
        location /api-docs {
            proxy_pass http://backend:5000/api-docs;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }

    # Example HTTPS server block (requires SSL certs)
    # server {
    #     listen 443 ssl;
    #     server_name yourdomain.com www.yourdomain.com;
    #
    #     ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    #     ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    #
    #     include /etc/letsencrypt/options-ssl-nginx.conf; # Recommended SSL settings
    #     ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    #
    #     location / {
    #         proxy_pass http://frontend:80;
    #         # ... other proxy headers
    #     }
    #
    #     location /api/ {
    #         proxy_pass http://backend:5000/api/;
    #         # ... other proxy headers
    #     }
    # }
    ```
3.  **Update DNS:** Point your domain A record to your VM's public IP address.
4.  **Re-run Docker Compose:**
    ```bash
    docker compose -f docker-compose.prod.yml up -d --build
    ```

## 5. CI/CD with GitHub Actions

The `ci.yml` in `.github/workflows` handles automated testing and building of Docker images. For deployment, you would extend this workflow.

### 5.1. Example CI/CD Workflow (Extended for Deployment)

To deploy to a VM, you would typically add a step to:
1.  **Log in to Docker Hub.**
2.  **Push built images to Docker Hub.**
3.  **SSH into your VM.**
4.  **Execute deployment commands:** `docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d`

This requires storing sensitive VM credentials (SSH private key) and Docker Hub credentials as GitHub Secrets.

**Example `ci.yml` (Deployment steps are illustrative and require proper secret configuration):**

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # --- Backend ---
      - name: Setup Node.js (Backend)
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install Backend Dependencies
        run: cd backend && npm ci
      - name: Run Backend Tests
        run: cd backend && npm test

      # --- Frontend ---
      - name: Setup Node.js (Frontend)
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install Frontend Dependencies
        run: cd frontend && npm ci
      - name: Run Frontend Tests
        run: cd frontend && npm test -- --coverage --watchAll=false

  deploy:
    runs-on: ubuntu-latest
    needs: build-and-test # Only deploy if tests pass
    if: github.ref == 'refs/heads/main' # Only deploy on push to main branch
    steps:
      - uses: actions/checkout@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_TOKEN }}

      - name: Build and Push Backend Docker Image
        run: |
          docker build -t ${{ secrets.DOCKER_USERNAME }}/ml-utilities-pro-backend:latest ./backend
          docker push ${{ secrets.DOCKER_USERNAME }}/ml-utilities-pro-backend:latest

      - name: Build and Push Frontend Docker Image
        run: |
          docker build -t ${{ secrets.DOCKER_USERNAME }}/ml-utilities-pro-frontend:latest ./frontend
          docker push ${{ secrets.DOCKER_USERNAME }}/ml-utilities-pro-frontend:latest

      - name: Deploy to Production Server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_SSH_HOST }}
          username: ${{ secrets.PROD_SSH_USERNAME }}
          key: ${{ secrets.PROD_SSH_PRIVATE_KEY }}
          script: |
            cd /opt/ml-utilities-pro # Your deployment directory on VM
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d --remove-orphans
            docker exec ml-utilities-pro-backend npx sequelize-cli db:migrate
```
**GitHub Secrets you'll need:**
*   `DOCKER_USERNAME`: Your Docker Hub username.
*   `DOCKER_TOKEN`: A Docker Hub Personal Access Token with push/pull permissions.
*   `PROD_SSH_HOST`: The IP address or hostname of your production VM.
*   `PROD_SSH_USERNAME`: The SSH username for your production VM (e.g., `ubuntu`).
*   `PROD_SSH_PRIVATE_KEY`: The SSH private key corresponding to a public key authorized on your VM.

## 6. Deployment to Kubernetes (Advanced)

For larger-scale, highly available, and auto-scaling deployments, Kubernetes is the preferred choice. This involves:

1.  **Containerizing:** (Already done) Build and push Docker images.
2.  **Kubernetes Manifests:** Create `Deployment`, `Service`, `Ingress`, `ConfigMap`, `Secret`, and `PersistentVolume` definitions for your backend, frontend, Redis (if not external), and PostgreSQL (if not external).
3.  **Helm/Kustomize:** Use a package manager like Helm or a customization tool like Kustomize to manage and deploy your Kubernetes manifests.
4.  **CI/CD:** Integrate Kubernetes deployment into your CI/CD pipeline, potentially using tools like ArgoCD or Flux for GitOps.

This is a significant topic on its own and outside the scope of this detailed guide, but the containerized nature of this project makes it Kubernetes-ready.

## 7. Monitoring and Logging

*   **Logging:** Backend uses `Winston` for structured logging. Ensure these logs are collected from your containers and sent to a centralized logging system (e.g., ELK Stack, Grafana Loki, CloudWatch Logs, Datadog).
*   **Monitoring:**
    *   **Container Metrics:** Monitor CPU, memory, network usage of your Docker containers.
    *   **Application Metrics:** Implement custom metrics (e.g., request latency, error rates) in your backend and expose them via a Prometheus endpoint or push to an APM tool (e.g., New Relic, Datadog, Dynatrace).
    *   **Database Metrics:** Monitor your PostgreSQL instance for performance and health.
*   **Alerting:** Set up alerts for critical errors, performance degradation, or resource exhaustion.

## 8. Rollback Strategy

Always have a rollback plan. With Docker and Docker Compose (or Kubernetes), this typically involves deploying the previous stable Docker image version.

---