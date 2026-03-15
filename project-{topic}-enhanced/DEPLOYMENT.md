# Deployment Guide for ML Utilities System

This document outlines the steps to deploy the ML Utilities System. The recommended approach for production is using Docker and Docker Compose, or container orchestration platforms like Kubernetes.

## 1. Local Deployment with Docker Compose

This is the easiest way to get the application and its database running on a single machine for development or demonstration.

### Prerequisites

*   Docker installed and running.
*   Docker Compose installed.
*   Git for cloning the repository.

### Steps

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/your-username/ml-utilities-system.git
    cd ml-utilities-system
    ```

2.  **Create `.env` file:**
    Create a `.env` file in the project root to define environment variables for your database and JWT secret.
    ```env
    # .env
    DB_NAME=ml_util_db
    DB_USER=admin
    DB_PASSWORD=password123 # Choose a strong password!
    JWT_SECRET=your_super_secret_jwt_key_that_is_at_least_256_bit_long # IMPORTANT: GENERATE A STRONG KEY!
    JWT_EXPIRATION_MS=86400000 # 24 hours
    ```
    **Security Note:** For production, `JWT_SECRET` must be a strong, randomly generated key and should be securely managed (e.g., using Docker Secrets, Kubernetes Secrets, or a dedicated secret management service).

3.  **Build and Run with Docker Compose:**
    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: Builds the Docker images from the `Dockerfile` before starting the containers. Only needed on first run or after code changes.
    *   `-d`: Runs the containers in detached mode (in the background).

4.  **Verify Deployment:**
    *   Check container status: `docker-compose ps`
    *   View logs: `docker-compose logs -f app` (or `db`)
    *   Wait for the `app` container to start and log "Started MlUtilitiesSystemApplication".

5.  **Access the Application:**
    *   The application will be accessible at `http://localhost:8080`.
    *   Swagger UI (API documentation) will be at `http://localhost:8080/swagger-ui.html`.

6.  **Stop and Clean Up:**
    To stop the running containers:
    ```bash
    docker-compose down
    ```
    To remove containers, networks, and volumes (database data will be lost):
    ```bash
    docker-compose down --volumes
    ```

## 2. CI/CD Deployment with GitHub Actions (Conceptual Production Setup)

The `.github/workflows/main.yml` file demonstrates a CI/CD pipeline using GitHub Actions. This pipeline performs the following:

1.  **Build and Test:**
    *   On `push` or `pull_request` to `main`, it checks out the code.
    *   Sets up Java 17 and Maven.
    *   Starts a temporary PostgreSQL container using `docker-compose` specifically for integration tests.
    *   Runs `mvn clean package` to build the application and execute all tests (unit and integration).
    *   Generates a JaCoCo code coverage report and uploads it to Codecov.
    *   Stops the test database.
    *   **Note:** For integration tests against a real DB in CI, ensure your tests are configured to connect to the `db` service. The `application.yml` has a `test` profile for H2, which is faster for most unit/integration tests. For specific database-dependent integration tests, you might need to adjust the `SPRING_PROFILES_ACTIVE` or use Testcontainers directly in tests if not using a shared compose service.

2.  **Deploy (on `main` branch push):**
    *   This step runs *only* on successful merges/pushes to the `main` branch.
    *   **Docker Login:** Logs into Docker Hub using credentials stored as GitHub Secrets (`DOCKER_USERNAME`, `DOCKER_PASSWORD`).
    *   **Build and Push Docker Image:** Builds the production-ready Docker image for the application and pushes it to Docker Hub (or your chosen container registry) with the `latest` tag.
    *   **Deployment to Production Server via SSH:**
        *   This is a **conceptual step** using `appleboy/ssh-action`.
        *   It logs into a remote production server via SSH using GitHub Secrets (`PROD_HOST`, `PROD_USERNAME`, `PROD_SSH_KEY`).
        *   It then executes commands on the remote server to:
            *   Log into Docker.
            *   Pull the newly built `latest` Docker image.
            *   Stop and remove any existing application container.
            *   Restart the application (and potentially the database if also managed by compose on the server) using a `docker-compose.yml` file located on the production server. This `docker-compose.yml` on the server would typically use the pulled images.

### Production Server Setup (Remote Host)

For the GitHub Actions deployment step to work, your production server needs:

*   **Docker and Docker Compose:** Installed and running.
*   **SSH Access:** Configured for the GitHub Actions runner (using an SSH key).
*   **`docker-compose.yml`:** A `docker-compose.yml` file (similar to the local one, but potentially optimized for production) should be present on your production server. This file will reference the Docker images pushed to your registry.

**Example `docker-compose.yml` on Production Server:**

```yaml
# /path/to/your/docker-compose.yml on production server
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: ml-utilities-postgres-prod
    restart: always
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - /data/ml-utilities/postgres_data:/var/lib/postgresql/data # Persist data outside container
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    image: your-dockerhub-username/ml-utilities-system:latest # IMPORTANT: Use your actual Docker Hub username
    container_name: ml-utilities-app-prod
    restart: always
    ports:
      - "80:8080" # Map to port 80 for production access (or 443 with Nginx/Caddy proxy)
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET} # Passed from GitHub Actions or server environment
      JWT_EXPIRATION_MS: ${JWT_EXPIRATION_MS}
      SPRING_PROFILES_ACTIVE: production # Use a production-specific profile if needed
    depends_on:
      db:
        condition: service_healthy
```

**GitHub Secrets for Deployment:**

You need to configure the following secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

*   `DOCKER_USERNAME`: Your Docker Hub username.
*   `DOCKER_PASSWORD`: Your Docker Hub access token or password.
*   `PROD_HOST`: The IP address or hostname of your production server.
*   `PROD_USERNAME`: The SSH username for your production server.
*   `PROD_SSH_KEY`: The private SSH key that has access to your production server (ensure it's base64 encoded if needed, or plain text if `ssh-action` supports it, but usually a file content).
*   `CODECOV_TOKEN`: Token for Codecov integration.

## 3. Kubernetes Deployment (Advanced - Not provided in full)

For highly scalable and resilient deployments, you would typically use a Kubernetes cluster (e.g., AWS EKS, GCP GKE, Azure AKS). This would involve:

*   **Docker Images:** Building and pushing Docker images to a container registry (like Docker Hub, Amazon ECR, Google Container Registry).
*   **Kubernetes Manifests:** Creating YAML files (`Deployment.yaml`, `Service.yaml`, `Ingress.yaml`, `PersistentVolumeClaim.yaml`, `Secret.yaml`, `ConfigMap.yaml`) to define how your application and database should run within Kubernetes.
*   **Helm Charts:** For managing complex Kubernetes deployments and their configurations.
*   **Database:** For production, you would typically use a managed database service (e.g., AWS RDS PostgreSQL, Google Cloud SQL for PostgreSQL) instead of deploying PostgreSQL directly inside Kubernetes.

This setup offers high availability, auto-scaling, self-healing capabilities, and simplified management of secrets and configurations.

---