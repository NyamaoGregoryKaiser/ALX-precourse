# Deployment Guide: Data Visualization Tools System

This guide provides instructions for deploying the Data Visualization Tools System, focusing on a containerized approach using Docker. The recommended production deployment strategy would involve a container orchestration platform (like Kubernetes, AWS ECS, GCP GKE, Azure AKS) and a cloud-managed database service.

## 1. Prerequisites

*   **Docker & Docker Compose**: Installed on your deployment server.
*   **Git**: To clone the repository.
*   **Cloud Provider Account**: (e.g., AWS, Google Cloud, Azure) for production deployments.
*   **Domain Name**: (Optional, but recommended for production) Configured with DNS records.
*   **SSL/TLS Certificate**: (Optional, but highly recommended for production) For HTTPS.

## 2. Environment Configuration

Before deploying, ensure your `.env` files are properly configured for the production environment.

### `backend/.env`
Create or modify `backend/.env` with production-specific values:

```env
NODE_ENV=production
PORT=5000

# PostgreSQL Database (use a managed service in production)
DB_HOST=<your_production_db_host>
DB_PORT=5432
DB_USERNAME=<your_production_db_user>
DB_PASSWORD=<your_production_db_password>
DB_DATABASE=data_viz_db

# JWT Secret (generate a strong, unique secret)
JWT_SECRET=<a_very_strong_and_long_secret_key>
JWT_EXPIRES_IN=1h

# Redis (use a managed service in production)
REDIS_HOST=<your_production_redis_host>
REDIS_PORT=6379
REDIS_PASSWORD=<your_production_redis_password>

# Mock CSV path - only if you intend to use it in production (generally not recommended)
MOCK_CSV_DATA_PATH=/app/src/db/mock_data/sample_data.csv
```
**Important**: In a real production setup, `DB_HOST` and `REDIS_HOST` would point to external, managed services, not `db` or `redis` from `docker-compose`.

### `frontend/.env`
Create or modify `frontend/.env` with production-specific values:

```env
REACT_APP_API_BASE_URL=https://your-backend-api-domain.com/api
```
**Important**: `REACT_APP_API_BASE_URL` should point to the public URL of your deployed backend.

## 3. Deployment Steps (Docker Compose for Single Server)

This method is suitable for small-scale deployments or as a starting point. For high availability and scalability, consider Kubernetes or similar orchestration.

1.  **Clone the repository on your server:**
    ```bash
    git clone https://github.com/your-username/data-viz-system.git
    cd data-viz-system
    ```

2.  **Place `.env` files:**
    Ensure your `backend/.env` and `frontend/.env` files are present in their respective directories and contain the correct production configurations.

3.  **Build and Run Docker Containers:**
    From the project root directory:
    ```bash
    docker-compose -f docker-compose.prod.yml build
    docker-compose -f docker-compose.prod.yml up -d
    ```
    **Note**: You would typically create a `docker-compose.prod.yml` that uses the `production-serve` stage of the frontend `Dockerfile` and skips `npm run dev` for the backend. Below is an example modification to `docker-compose.yml` for "production" usage.

    **Example `docker-compose.prod.yml` (modify from `docker-compose.yml`)**
    ```yaml
    # docker-compose.prod.yml
    version: '3.8'

    services:
      db:
        image: postgres:14-alpine
        container_name: data-viz-db
        restart: always
        environment:
          POSTGRES_USER: ${DB_USERNAME}
          POSTGRES_PASSWORD: ${DB_PASSWORD}
          POSTGRES_DB: ${DB_DATABASE}
        volumes:
          - data-viz-db-data:/var/lib/postgresql/data
        # Remove direct ports mapping if using internal network for security
        # ports:
        #   - "5432:5432"
        healthcheck:
          test: ["CMD-SHELL", "pg_isready -U ${DB_USERNAME} -d ${DB_DATABASE}"]
          interval: 5s
          timeout: 5s
          retries: 5

      redis:
        image: redis:6-alpine
        container_name: data-viz-redis
        restart: always
        command: redis-server --requirepass ${REDIS_PASSWORD}
        # Remove direct ports mapping if using internal network for security
        # ports:
        #   - "6379:6379"
        healthcheck:
          test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
          interval: 5s
          timeout: 3s
          retries: 5

      backend:
        build:
          context: ./backend
          dockerfile: Dockerfile
        container_name: data-viz-backend
        restart: always
        env_file:
          - ./backend/.env
        # Map to a host port or expose via a reverse proxy (Nginx/Traefik)
        ports:
          - "5000:5000"
        depends_on:
          db:
            condition: service_healthy
          redis:
            condition: service_healthy
        # In production, remove volume mounts for src to ensure built code is used
        # volumes:
        #   - ./backend/src:/app/src
        command: sh -c "npm run migrate:run && npm start" # Run migrations, then start prod server

      frontend:
        build:
          context: ./frontend
          dockerfile: Dockerfile
          target: production-serve # Use the Nginx serving stage
          args:
            REACT_APP_API_BASE_URL: ${REACT_APP_API_BASE_URL} # Pass env var at build
        container_name: data-viz-frontend
        restart: always
        env_file:
          - ./frontend/.env
        ports:
          - "80:80" # Standard HTTP port, map to 443 with Nginx for HTTPS
        depends_on:
          - backend
        # In production, remove volume mounts for src
        # volumes:
        #   - ./frontend/src:/app/src
        # command: npm start # Nginx stage handles CMD
    volumes:
      data-viz-db-data:
    ```

4.  **Verify Deployment:**
    Check container status:
    ```bash
    docker-compose -f docker-compose.prod.yml ps
    ```
    View logs:
    ```bash
    docker-compose -f docker-compose.prod.yml logs -f
    ```
    Access the frontend in your browser: `http://<your-server-ip>:80` (or `https://your-domain.com` if using Nginx/Certbot).

## 4. Advanced Deployment Considerations (Cloud & Orchestration)

For a truly enterprise-grade deployment, consider these steps:

1.  **Container Registry**: Push your Docker images (backend and frontend) to a private container registry (e.g., AWS ECR, Docker Hub, Google Container Registry).
    ```bash
    docker tag data-viz-backend:latest <your-registry>/data-viz-backend:latest
    docker push <your-registry>/data-viz-backend:latest
    # Repeat for frontend
    ```

2.  **Managed Database & Cache Services**: Use cloud-managed services for PostgreSQL (e.g., AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL) and Redis (e.g., AWS ElastiCache, Azure Cache for Redis, Google Cloud Memorystore). This offloads database administration, backups, and scaling.

3.  **Container Orchestration**: Deploy your containers using a platform like Kubernetes, AWS ECS, or Azure Container Apps.
    *   **Kubernetes**: Define deployments for backend and frontend, services for load balancing, and ingress for external access. You'll need YAML manifests for each component.
    *   **AWS ECS**: Define task definitions, create an ECS service, and configure a load balancer (ALB) for routing traffic.

4.  **Reverse Proxy & Load Balancing**:
    *   Use a dedicated load balancer (e.g., AWS ALB, Nginx, Traefik) to distribute traffic to multiple backend instances.
    *   Configure it for **SSL/TLS termination** to enable HTTPS, ensuring secure communication.
    *   Set up URL rewriting/routing to direct `/api/*` traffic to the backend and other traffic to the frontend.

5.  **CI/CD Pipeline**: Enhance your GitHub Actions workflow (`.github/workflows/ci-cd.yml`) to:
    *   Authenticate with your cloud provider.
    *   Build Docker images and push them to your container registry.
    *   Trigger deployment updates in your orchestration platform (e.g., `kubectl apply -f`, `ecs deploy`).
    *   Run post-deployment health checks.

6.  **Monitoring & Alerting**:
    *   Integrate with cloud monitoring services (e.g., AWS CloudWatch, Prometheus, Grafana).
    *   Monitor application logs, server metrics (CPU, memory), database performance, and API response times.
    *   Set up alerts for errors, high latency, or resource exhaustion.

7.  **Backup & Recovery**: Implement a strategy for regular database backups and a disaster recovery plan.

By following these advanced steps, you can achieve a highly available, scalable, and secure deployment suitable for production environments.