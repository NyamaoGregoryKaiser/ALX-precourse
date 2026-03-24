# Deployment Guide: Product Management System

This document provides instructions for deploying the Product Management System to various environments. The primary method for deployment utilizes Docker and Docker Compose for easy local setup and can be extended for cloud deployments.

## Table of Contents

1.  [Local Deployment with Docker Compose](#1-local-deployment-with-docker-compose)
    *   [Prerequisites](#prerequisites)
    *   [Steps](#steps)
2.  [Cloud Deployment Strategy (Conceptual)](#2-cloud-deployment-strategy-conceptual)
    *   [AWS ECS (Elastic Container Service)](#aws-ecs-elastic-container-service)
    *   [Kubernetes (EKS/GKE/AKS)](#kubernetes-eksgkeaks)
    *   [Managed Service (e.g., AWS Elastic Beanstalk)](#managed-service-eg-aws-elastic-beanstalk)
3.  [Post-Deployment Checks](#3-post-deployment-checks)
4.  [Rollback Strategy](#4-rollback-strategy)

## 1. Local Deployment with Docker Compose

This is the recommended way to run the application in a local development or testing environment, ensuring consistency with production-like setups.

### Prerequisites

*   **Docker & Docker Compose:** Installed on your deployment machine. [Download Docker Desktop](https://www.docker.com/products/docker-desktop).
*   **Git:** To clone the repository.
*   **`.env` file:** A `.env` file containing environment variables for the database and JWT secret should be present in the project root. Refer to `README.md` for its content.

### Steps

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/your-username/alx-devops-product-service.git
    cd alx-devops-product-service
    ```

2.  **Ensure `.env` file is present:**
    Verify that the `.env` file is in the root directory and configured correctly with your `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, and `JWT_SECRET`.

3.  **Build and Run Services:**
    Execute the following command to build the Docker images (if not already built or if code changes) and start the application and database containers:

    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: This flag forces Docker Compose to rebuild the images. Use it when you've made changes to the `Dockerfile` or your application code. If only environment variables or volumes change, you can omit `--build` to save time.
    *   `-d`: Runs the containers in "detached" mode, meaning they run in the background.

4.  **Verify Deployment:**
    *   Check container status:
        ```bash
        docker-compose ps
        ```
        Both `app` and `db` services should show `Up` status.
    *   Check application logs (optional, for debugging):
        ```bash
        docker-compose logs -f app
        ```
    *   Access the application in your browser: [http://localhost:8080](http://localhost:8080)
    *   Access Swagger UI: [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)

5.  **Stop and Clean Up (when done):**
    To stop the running containers:
    ```bash
    docker-compose down
    ```
    To stop containers and remove all associated data volumes (including PostgreSQL data, be careful!):
    ```bash
    docker-compose down --volumes
    ```

## 2. Cloud Deployment Strategy (Conceptual)

For production environments, deploying to a cloud provider offers scalability, reliability, and advanced management features. Here are common strategies:

### AWS ECS (Elastic Container Service)

AWS ECS is a fully managed container orchestration service that supports Docker containers.

1.  **Container Image:** The CI/CD pipeline (GitHub Actions) already builds and pushes the Docker image to Docker Hub (or AWS ECR if configured). This image will be used by ECS.

2.  **VPC Setup:**
    *   Create a Virtual Private Cloud (VPC) with public and private subnets across multiple Availability Zones for high availability.
    *   Configure Internet Gateway, NAT Gateway, and Route Tables.

3.  **ECS Cluster:**
    *   Create an ECS Cluster (e.g., Fargate launch type for serverless containers or EC2 launch type for more control over instances). Fargate is often preferred for simplicity.

4.  **Task Definition:**
    *   Define an ECS Task Definition for the `product-service` application.
    *   Specify the Docker image URL (e.g., `your_docker_username/alx-product-service:latest`).
    *   Configure CPU and memory allocations.
    *   Map container port `8080` to host port (Fargate handles this automatically).
    *   Pass environment variables (DB credentials, JWT secret) securely using AWS Secrets Manager or Parameter Store.
    *   Define a health check path (e.g., `/actuator/health`).

5.  **Service:**
    *   Create an ECS Service that runs and maintains the desired number of tasks (instances) of your `product-service`.
    *   Associate it with an Application Load Balancer (ALB) for traffic distribution and HTTPS termination.
    *   Configure auto-scaling policies based on CPU utilization, request count, etc.

6.  **Database (AWS RDS PostgreSQL):**
    *   Provision an AWS RDS (Relational Database Service) instance for PostgreSQL.
    *   Configure it in a private subnet for security.
    *   Ensure proper Security Group rules allow the ECS service to connect to RDS.
    *   Flyway will handle migrations on application startup.

7.  **CI/CD Integration:**
    *   Extend the GitHub Actions pipeline to trigger an ECS service update after a successful Docker image push to a registry like ECR. This can be done using AWS CLI commands or a dedicated GitHub Action for ECS deployment.

### Kubernetes (EKS/GKE/AKS)

For larger, more complex deployments or multi-cloud strategies, Kubernetes is a powerful choice.

1.  **Container Image:** Similar to ECS, the Docker image is built and pushed to a container registry.

2.  **Kubernetes Cluster:**
    *   Provision a managed Kubernetes cluster (e.g., AWS EKS, Google GKE, Azure AKS).

3.  **Deployment:**
    *   Create a Kubernetes `Deployment` manifest for the `product-service` specifying:
        *   Number of replicas (for horizontal scaling).
        *   Docker image name.
        *   Resource limits (CPU, memory).
        *   Readiness and Liveness probes (using `/actuator/health`).
        *   Environment variables from Kubernetes `Secrets` (for DB credentials, JWT secret) and `ConfigMaps`.

4.  **Service:**
    *   Create a Kubernetes `Service` (e.g., `LoadBalancer` type) to expose the application to external traffic and integrate with the cloud provider's load balancer.

5.  **Ingress:**
    *   Use an `Ingress` controller (e.g., Nginx Ingress Controller) to manage external access, routing, and SSL termination.

6.  **Database (Managed Service or StatefulSet):**
    *   **Recommended:** Use a managed database service like AWS RDS, Google Cloud SQL, or Azure Database for PostgreSQL.
    *   **Alternative (complex):** Deploy PostgreSQL within Kubernetes using a `StatefulSet` and persistent volumes, but this adds significant operational overhead.

7.  **CI/CD Integration:**
    *   Extend GitHub Actions to apply Kubernetes manifests (e.g., using `kubectl apply -f .`) or use tools like Argo CD/Flux for GitOps-style continuous deployment after a new image is available.

### Managed Service (e.g., AWS Elastic Beanstalk)

For simpler deployments where you want to abstract away much of the infrastructure, managed services can be beneficial.

1.  **Deployment Bundle:** Elastic Beanstalk can deploy Docker containers. You would provide your `Dockerfile` and `docker-compose.yml` (for a single container environment) directly to Beanstalk.

2.  **Environment Configuration:**
    *   Elastic Beanstalk handles the provisioning of EC2 instances, load balancers, and auto-scaling.
    *   You configure environment variables securely within the Beanstalk environment.

3.  **Database:**
    *   Link the Beanstalk application to an external AWS RDS PostgreSQL instance.

4.  **CI/CD Integration:**
    *   The GitHub Actions could build the Docker image, then use the AWS CLI to deploy the `Dockerfile` and `docker-compose.yml` (or a pre-built image) to an Elastic Beanstalk environment.

## 3. Post-Deployment Checks

After any deployment, perform these checks:

*   **Health Endpoints:**
    *   `GET /actuator/health`: Ensure the application is reporting `UP`.
    *   Check status of all microservices if applicable.
*   **Logs:**
    *   Monitor application logs for any errors or unexpected behavior.
    *   Verify successful Flyway migrations.
*   **Basic API Functionality:**
    *   Perform a sample `POST /api/auth/register` and `POST /api/auth/login` to ensure authentication works.
    *   Execute `GET /api/products` (with a valid JWT) to confirm data retrieval.
    *   Perform a sample `POST`, `PUT`, `DELETE` operation if possible (with admin role).
*   **Monitoring Dashboards:**
    *   Verify that application metrics are being collected (e.g., in Prometheus/Grafana, CloudWatch).
    *   Check CPU, memory, network usage.

## 4. Rollback Strategy

A robust rollback strategy is crucial for production deployments.

*   **Versioned Docker Images:** Our CI/CD pipeline tags Docker images with the Git SHA and a timestamp (`${{ github.sha }}` and `$(date +%Y%m%d%H%M%S)`). This allows easy identification and deployment of previous stable versions.

*   **Stateless Application:** The `product-service` is stateless (JWT handles session), making it easier to roll back application instances without complex session management.

*   **Database Rollback:**
    *   **Flyway:** Flyway is designed for "forward-only" migrations. Rolling back a database schema can be complex and requires careful planning.
    *   **Strategy:**
        *   **Backup:** Always perform a database backup before a major deployment or migration.
        *   **Reverse Migrations (Rare):** Avoid creating "down" migration scripts if possible. Instead, focus on additive changes. If a rollback is absolutely necessary, it often involves restoring a database backup, which can lead to data loss.
        *   **Forward Fix:** For most issues, creating a new "forward" migration to fix the problem in the existing schema is preferred over rolling back.
    *   **Data Integrity:** Ensure that any application rollback is compatible with the current database schema, or that the database is also rolled back to a compatible state (which is riskier).

*   **Deployment Platform Rollback:**
    *   **Docker Compose:** Simply execute `docker-compose up -d --build` with the desired older commit checked out.
    *   **ECS/Kubernetes:** These platforms have built-in rollback capabilities.
        *   **ECS:** Update the service to point to a previous Task Definition version (which uses an older Docker image tag).
        *   **Kubernetes:** Use `kubectl rollout undo deployment/<deployment-name>` to revert to a previous `Deployment` revision.

**General Rollback Best Practices:**
*   Have clear go/no-go criteria for deployments.
*   Monitor closely immediately after deployment.
*   Automate rollback procedures where possible.
*   Practice rollbacks in lower environments.