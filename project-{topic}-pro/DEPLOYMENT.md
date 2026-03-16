# Deployment Guide

This document outlines the steps for deploying the Task Management System, covering both local development with Docker Compose and a high-level overview for production environments using cloud services.

## 1. Local Deployment with Docker Compose (Recommended for Development)

This method provides a quick and consistent way to run all services (backend, frontend, database) locally within Docker containers.

**Prerequisites:**
*   Docker Desktop installed and running.

**Steps:**

1.  **Navigate to the project root directory:**
    ```bash
    cd task-management-system
    ```

2.  **Create a `.env` file:**
    In the project root, create a file named `.env` and populate it with the following environment variables. **Ensure to replace placeholders with strong, secure values.**

    ```env
    # .env
    DB_NAME=taskmgrdb
    DB_USERNAME=taskmgruser
    DB_PASSWORD=a_very_secure_db_password_here # Use a strong password!
    JWT_SECRET=YOUR_VERY_LONG_AND_SECURE_JWT_SECRET_KEY_HERE_MIN_32_BYTES_BASE64_ENCODED # Generate a long random string (e.g., openssl rand -base64 32)
    SERVER_PORT=8080
    ```

3.  **Build and Start Services:**
    ```bash
    docker-compose up --build
    ```
    *   `--build`: This flag tells Docker Compose to build images from the Dockerfiles (if they don't exist or if the `Dockerfile` has changed) before starting the containers.
    *   This command will:
        *   Build the `backend` image from `backend/Dockerfile`.
        *   Build the `frontend` image from `frontend/Dockerfile` (if you implement it).
        *   Pull the `postgres:15-alpine` image.
        *   Create a Docker network.
        *   Start the `db`, `backend`, and `frontend` services in detached mode (you'll see logs directly in the terminal).

4.  **Verify Services:**
    *   **Backend API:** `http://localhost:8080` (Swagger UI at `http://localhost:8080/swagger-ui/index.html`)
    *   **Frontend UI:** `http://localhost:3000` (if implemented and running)
    *   **PostgreSQL:** Accessible on `localhost:5432` from your host machine.

5.  **Stop Services:**
    To stop and remove all services, networks, and volumes created by `docker-compose`:
    ```bash
    docker-compose down -v
    ```
    *   `-v`: Removes named volumes declared in the `volumes` section of the `docker-compose.yml`. This will delete your database data. Omit `-v` if you want to preserve data.

## 2. Production Deployment (High-Level Overview)

Deploying to production involves ensuring scalability, reliability, security, and observability. This guide provides a general roadmap. Specific steps will vary based on your chosen cloud provider and infrastructure.

**Key Principles for Production Deployment:**
*   **Infrastructure as Code (IaC):** Use tools like Terraform or CloudFormation to define and manage your infrastructure.
*   **Managed Services:** Leverage cloud provider's managed services (DB, Load Balancers, Container Orchestration) to reduce operational overhead.
*   **Secrets Management:** Never hardcode secrets. Use dedicated secret management services.
*   **Monitoring & Alerting:** Implement comprehensive monitoring and alerting for all components.
*   **Automated CI/CD:** Automate the entire deployment pipeline.

### 2.1 Choose Your Cloud Provider and Services

Common choices include AWS, Azure, Google Cloud Platform (GCP).

*   **Database:** Use a managed relational database service (e.g., AWS RDS PostgreSQL, Azure Database for PostgreSQL, Google Cloud SQL for PostgreSQL).
    *   Configure automated backups, multi-AZ deployment for high availability, and appropriate sizing.
*   **Container Registry:** A secure place to store your Docker images (e.g., AWS ECR, Azure Container Registry, Google Container Registry, Docker Hub).
*   **Compute (Container Orchestration):**
    *   **Kubernetes (AWS EKS, Azure AKS, Google GKE):** For advanced scalability, self-healing, and complex deployments. Requires more setup.
    *   **Serverless Containers (AWS Fargate, Azure Container Apps, Google Cloud Run):** Simpler, scales automatically, pay-per-use.
    *   **Container Instances (AWS ECS, Azure Container Instances):** Good balance for simpler container deployments.
*   **Load Balancer:** To distribute traffic across multiple backend instances and handle SSL termination (e.g., AWS Application Load Balancer, Azure Application Gateway, Google Cloud Load Balancing).
*   **Content Delivery Network (CDN):** For caching static frontend assets and improving global performance (e.g., AWS CloudFront, Azure CDN, Google Cloud CDN).

### 2.2 Build and Push Docker Images

Your CI/CD pipeline (e.g., GitHub Actions as defined in `.github/workflows/main.yml`) should automate this.

1.  **Build Backend and Frontend:** The CI/CD workflow compiles your application code (Maven for Java, npm/yarn for React).
2.  **Create Docker Images:** Dockerfiles for backend and frontend are used to build production-ready Docker images.
3.  **Push to Registry:** The built images are tagged (e.g., `latest`, `git_sha`) and pushed to your chosen container registry.

    ```bash
    # Example for pushing backend to Docker Hub (handled by GitHub Actions)
    docker push your_docker_username/task-management-backend:latest
    docker push your_docker_username/task-management-backend:git_sha
    ```

### 2.3 Database Setup and Migration

1.  **Provision Managed Database:** Set up your chosen managed PostgreSQL instance (e.g., AWS RDS).
2.  **Configure Access:** Ensure your backend service can connect to the database (e.g., using security groups, VPC peering).
3.  **Run Migrations:** Flyway is configured to run automatically when the Spring Boot backend starts. Ensure your production database is initially empty or only contains the `flyway_schema_history` table. The first deployment of the backend will create the schema and seed data.

### 2.4 Deploy Backend Service

1.  **Environment Variables / Secrets:**
    *   **Database Credentials:** Use your cloud provider's secrets manager (e.g., AWS Secrets Manager, Azure Key Vault, Google Secret Manager) to store and inject database credentials into your backend containers.
    *   **JWT Secret:** Store your `JWT_SECRET` securely in the secrets manager.
    *   Other configurations (e.g., `SERVER_PORT`) can be injected as standard environment variables.
2.  **Deployment Configuration:**
    *   **Kubernetes:** Create `Deployment` (for backend pods), `Service` (for internal access), and `Ingress` (for external HTTP/HTTPS access) YAML manifests.
    *   **AWS ECS/Fargate:** Define an `ECS Task Definition` specifying the Docker image, environment variables, resource limits, and port mappings.
3.  **Deploy:** Use `kubectl apply -f your_manifests.yaml` for Kubernetes or equivalent commands/APIs for other services.
4.  **Health Checks:** Configure health checks (e.g., `/actuator/health` endpoint) to allow your orchestration platform to monitor the backend's status and automatically restart unhealthy instances.

### 2.5 Deploy Frontend Service (SPA)

1.  **Build Production Assets:** The frontend CI/CD step should run `npm run build` to generate optimized static files (HTML, CSS, JS).
2.  **Deployment:**
    *   **Object Storage (Recommended):** Deploy static frontend assets to a cloud object storage bucket (e.g., AWS S3, Azure Blob Storage, Google Cloud Storage). Configure the bucket for static website hosting.
    *   **CDN Integration:** Integrate a CDN (CloudFront, Azure CDN) in front of your object storage bucket for faster global delivery and SSL.
    *   **Container:** If deploying frontend as a Docker container, deploy it to your chosen compute service similar to the backend. Ensure it's configured to serve static files (e.g., using NGINX inside the container).

### 2.6 Networking and Domain Configuration

1.  **Load Balancer:** Configure a Load Balancer to direct traffic to your backend service. It should handle SSL termination (HTTPS) and forward requests to your backend instances.
2.  **Domain Name:** Register a domain name for your application.
3.  **DNS Configuration:** Update your domain's DNS records to point to your Load Balancer or CDN.
4.  **SSL/TLS Certificates:** Obtain and configure SSL certificates for HTTPS (e.g., AWS Certificate Manager, Let's Encrypt). The Load Balancer typically handles certificate management.

### 2.7 Monitoring, Logging, and Alerting

*   **Logs:** Configure your backend (Spring Boot) logs to be sent to a centralized logging system (e.g., AWS CloudWatch Logs, Azure Monitor, Google Cloud Logging, or an ELK/EFK stack).
*   **Metrics:** Collect application metrics (e.g., JVM, HTTP requests, custom business metrics from Spring Boot Actuator) and send them to a monitoring system (e.g., Prometheus with Grafana, Datadog).
*   **Alerting:** Set up alerts for critical events (e.g., high error rates, low disk space, unresponsive services) to notify your team.

By following these guidelines, you can establish a robust and scalable production environment for your Task Management System.
```