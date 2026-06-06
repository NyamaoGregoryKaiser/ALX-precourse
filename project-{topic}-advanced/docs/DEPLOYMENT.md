# Data Visualization Platform - Deployment Guide

This document outlines the steps to deploy the Data Visualization Platform to a production environment. The recommended approach is using Docker containers for consistency and scalability.

## Table of Contents

1.  [Prerequisites](#prerequisites)
2.  [Production Environment Variables](#production-environment-variables)
3.  [Building Docker Images](#building-docker-images)
4.  [Deployment Options](#deployment-options)
    *   [Option A: Deploying with Docker Compose (Single Host)](#option-a-deploying-with-docker-compose-single-host)
    *   [Option B: Cloud Deployment (e.g., Render, AWS ECS, Google Cloud Run)](#option-b-cloud-deployment-e.g.-render-aws-ecs-google-cloud-run)
        *   [Render Specific Steps](#render-specific-steps)
5.  [Post-Deployment Steps](#post-deployment-steps)
    *   [Running Migrations in Production](#running-migrations-in-production)
    *   [Seeding Production Data (Optional)](#seeding-production-data-optional)
    *   [Monitoring & Logging](#monitoring--logging)
    *   [Backup Strategy](#backup-strategy)
6.  [CI/CD Configuration](#cicd-configuration)

---

## 1. Prerequisites

*   **Docker & Docker Compose**: Installed on your deployment server(s).
*   **Cloud Provider Account**: (e.g., AWS, GCP, Azure, Render) if deploying to the cloud.
*   **Domain Name**: For custom URL and HTTPS.
*   **SSL/TLS Certificates**: (e.g., Let's Encrypt) or use cloud provider's managed SSL.
*   **Git**: To clone the repository.

## 2. Production Environment Variables

Ensure your `.env` file for production contains secure and appropriate values. **Never hardcode secrets in your code or commit `.env` files with production secrets to your repository.** Use a secret management service provided by your cloud provider or inject them directly into your Docker containers.

```dotenv
# .env (for production)
NODE_ENV=production
PORT=5000
CLIENT_URL=https://your-frontend-domain.com # IMPORTANT: Match your actual frontend domain
ENCRYPTION_KEY=YOUR_VERY_STRONG_32_CHAR_PRODUCTION_SECRET_KEY # Generate a new, unique key
JWT_SECRET=YOUR_VERY_LONG_AND_RANDOM_PRODUCTION_JWT_SECRET
JWT_EXPIRES_IN=1d # Or appropriate duration
DB_HOST=your_production_db_host # e.g., PostgreSQL managed service endpoint
DB_PORT=5432
DB_USER=your_production_db_user
DB_PASSWORD=your_production_db_password
DB_NAME=your_production_db_name
REDIS_URL=redis://your_production_redis_host:6379 # e.g., Redis managed service endpoint
LOG_LEVEL=info # Or higher for critical logs
RATE_LIMIT_WINDOW_MS=60000 # 1 minute
RATE_LIMIT_MAX_REQUESTS=60 # Example: 60 requests per minute
```

**Key considerations for production:**
*   `ENCRYPTION_KEY` and `JWT_SECRET`: Must be truly random and kept secret.
*   `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Connect to a dedicated production PostgreSQL instance (preferably a managed service like AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL).
*   `REDIS_URL`: Connect to a dedicated production Redis instance (e.g., AWS ElastiCache, Azure Cache for Redis, Google Cloud Memorystore).
*   `CLIENT_URL`: Set this to your actual frontend domain for CORS.
*   `LOG_LEVEL`: Adjust as needed. `info` is good for general operations, `error` for critical issues.

## 3. Building Docker Images

Before deploying, you'll need to build the production-ready Docker images.

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/data-viz-platform.git
    cd data-viz-platform
    ```
2.  **Build Server Image**:
    ```bash
    docker build -t your-registry/dataviz-server:latest -f Dockerfile .
    ```
3.  **Build Client Image**:
    ```bash
    docker build -t your-registry/dataviz-client:latest -f client/Dockerfile.client client
    ```
4.  **Push to Container Registry (e.g., Docker Hub, AWS ECR)**:
    ```bash
    docker push your-registry/dataviz-server:latest
    docker push your-registry/dataviz-client:latest
    ```
    (Replace `your-registry` with your actual registry path, e.g., `myusername/` or `123456789012.dkr.ecr.us-east-1.amazonaws.com/`)

## 4. Deployment Options

### Option A: Deploying with Docker Compose (Single Host)

This is suitable for smaller deployments or proofs-of-concept on a single server.

1.  **Prepare your server**:
    *   Install Docker and Docker Compose.
    *   Open necessary firewall ports (e.g., 80, 443 for web, 5000 if directly exposing backend).
2.  **Copy `.env` and `docker-compose.prod.yml` (create this file) to your server**:
    *   Create a `docker-compose.prod.yml` from `docker-compose.yml`, but adjust services to use pre-built images and production configurations.
    *   **Crucially, remove the `volumes` mounts for `/app` in `server` and `client` services to use the built image content, not local dev files.**
    *   Update `server` service `command` to `npm run serve`.
    *   Update `client` service `command` to `nginx -g 'daemon off;'`.
3.  **Pull images and deploy**:
    ```bash
    # On your production server
    cd /path/to/your/app
    # Ensure your .env is correctly configured for production
    docker-compose -f docker-compose.prod.yml pull
    docker-compose -f docker-compose.prod.yml up -d
    ```
4.  **Set up Nginx/Caddy for Reverse Proxy and SSL**:
    It's highly recommended to place Nginx or Caddy in front of your Docker Compose setup to handle SSL termination, serve static files, and reverse proxy requests to the backend.

### Option B: Cloud Deployment (e.g., Render, AWS ECS, Google Cloud Run)

This is the recommended approach for scalable and highly available production environments. The specifics vary by provider, but the general steps are:

1.  **Container Registry**: Push your Docker images to the cloud provider's container registry (e.g., AWS ECR, Google Container Registry).
2.  **Managed Database**: Provision a managed PostgreSQL instance (e.g., AWS RDS, GCP Cloud SQL).
3.  **Managed Cache**: Provision a managed Redis instance (e.g., AWS ElastiCache, GCP Memorystore).
4.  **Compute Service**:
    *   **Backend**: Deploy the backend image to a service like Render Web Services, AWS ECS/Fargate, Google Cloud Run, or Azure App Service. Configure environment variables.
    *   **Frontend**: Deploy the built client static files (from `client/build`) to a static hosting service (e.g., Render Static Sites, AWS S3 + CloudFront, Google Firebase Hosting) or serve it via a separate web server container (e.g., Nginx).
5.  **Load Balancer/CDN**: Set up a load balancer (e.g., AWS ALB, GCP Load Balancer) and optionally a CDN (e.g., CloudFront, Cloudflare) for performance, scalability, and SSL termination.

#### Render Specific Steps (Example)

Render offers easy deployment directly from GitHub repositories.

1.  **Create Render Services**:
    *   **PostgreSQL**: Create a new Render PostgreSQL database. Note down the Internal Database URL, Host, User, Password, Database Name.
    *   **Redis**: Create a new Render Redis instance. Note down the Internal Redis URL.
    *   **Backend (Web Service)**:
        *   Connect your GitHub repository.
        *   Select `server` as the root directory.
        *   Choose `Docker` as the runtime.
        *   Set build command to `npm run build && npm run migration:run && npm run seed` (or separate migration/seed as a pre-deploy hook).
        *   Set start command to `npm run serve`.
        *   Add all production environment variables from your `.env` to Render's environment variables. Ensure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` and `REDIS_URL` match your Render-provisioned database/Redis.
    *   **Frontend (Static Site)**:
        *   Connect your GitHub repository.
        *   Select `client` as the root directory.
        *   Set build command to `npm install && npm run build`.
        *   Set publish directory to `build`.
        *   Configure environment variables (e.g., `REACT_APP_API_BASE_URL` pointing to your deployed backend URL).

2.  **DNS Configuration**: Point your custom domain(s) to the Render service URLs. Render automatically handles SSL.

## 5. Post-Deployment Steps

### Running Migrations in Production

*   **Initial Deploy**: Include `npm run migration:run` in your server's startup command (as shown in `docker-compose.yml` `command` section).
*   **Subsequent Deploys**: For updates, the migration command `npm run migration:run` should be run *before* the new application code starts, or as part of a pre-deploy hook in your CI/CD pipeline. This ensures your database schema is always up-to-date with your application.

### Seeding Production Data (Optional)

If your application requires initial data (e.g., default admin user, initial settings), run the seed script after migrations. This should typically be a one-time operation for initial setup.

*   `docker-compose exec server npm run seed` (for Docker Compose)
*   For cloud providers, this might be a one-off task/job.

### Monitoring & Logging

*   **Backend Logs**: Configure your `winston` logger to output to `stdout` (Docker default) or a file. Use a log aggregation service (e.g., ELK Stack, Splunk, Datadog, CloudWatch Logs) to collect and analyze logs from your containers.
*   **Frontend Monitoring**: Use services like Sentry or LogRocket for error tracking and user session replay in the frontend.
*   **Performance Monitoring**: Integrate APM tools (e.g., New Relic, Datadog, Prometheus) to monitor application performance, database health, and server metrics.

### Backup Strategy

*   **Database**: Implement a regular backup strategy for your PostgreSQL database. Managed services usually provide this (e.g., point-in-time recovery, automated backups).
*   **Configuration**: Keep your `.env` files (or secret manager configurations) backed up securely.

## 6. CI/CD Configuration

The `.github/workflows/ci-cd.yml` file provides a GitHub Actions workflow:

*   **`build-and-test-server`**: Builds the backend, sets up a temporary PostgreSQL, and runs unit/integration tests.
*   **`build-and-test-client`**: Builds the frontend and runs its tests.
*   **`deploy`**: (Conceptual) Triggers deployment to a cloud platform (e.g., Render) upon merges to the `main` branch. This typically involves sending webhooks or using provider-specific deployment actions.

**To enable CI/CD**:
1.  Push your code to a GitHub repository.
2.  Ensure GitHub Actions is enabled for your repository.
3.  Configure any necessary GitHub Secrets (e.g., `RENDER_DEPLOY_WEBHOOK`) in your repository settings `Settings -> Secrets -> Actions`.