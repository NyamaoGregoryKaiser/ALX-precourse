```markdown
# E-commerce Solution: Deployment Guide

This document provides a guide for deploying the E-commerce solution. The project is containerized using Docker, making it portable and scalable across various environments.

## Table of Contents

1.  [Deployment Strategy Overview](#1-deployment-strategy-overview)
2.  [Prerequisites](#2-prerequisites)
3.  [Local Deployment (Docker Compose)](#3-local-deployment-docker-compose)
4.  [Cloud Deployment (Conceptual Examples)](#4-cloud-deployment-conceptual-examples)
    *   [General Steps](#general-steps)
    *   [AWS ECS/EKS](#aws-ecsecs)
    *   [Google Cloud GKE](#google-cloud-gke)
    *   [Azure AKS](#azure-aks)
    *   [DigitalOcean Droplet with Docker Compose](#digitalocean-droplet-with-docker-compose)
5.  [Post-Deployment Checks](#5-post-deployment-checks)
6.  [Maintenance and Operations](#6-maintenance-and-operations)

## 1. Deployment Strategy Overview

The recommended deployment strategy for this application involves containerization with Docker. This allows for:

*   **Consistency**: Identical environments from development to production.
*   **Isolation**: Services run in isolated containers.
*   **Scalability**: Easily scale individual services horizontally.
*   **Portability**: Deploy to any environment that supports Docker (local, cloud VMs, Kubernetes clusters).

For production, HTTPS should always be enabled, usually managed by a Load Balancer or an Nginx/Caddy reverse proxy.

## 2. Prerequisites

*   **Docker & Docker Compose**: Installed on your deployment target (server, local machine).
*   **Git**: For cloning the repository.
*   **Cloud Provider Account**: (If deploying to cloud) e.g., AWS, GCP, Azure, DigitalOcean.
*   **Domain Name**: (Optional but recommended for production) Configured with DNS records.
*   **Container Registry Account**: (For cloud deployments) e.g., Docker Hub, AWS ECR, Google Container Registry.
*   **CI/CD Pipeline**: Configured (e.g., GitHub Actions, GitLab CI) to automate builds and pushes to your container registry.

## 3. Local Deployment (Docker Compose)

This is ideal for development, testing, and demonstrating the full stack on a single machine.

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/ecommerce-app.git
    cd ecommerce-app
    ```
2.  **Create a `.env` file**:
    Create a `.env` file in the root of the project (next to `docker-compose.yml`). This file contains environment variables for all services.
    Copy the `backend/.env.example` content and modify `DB_HOST` to `db` (the service name in `docker-compose.yml`).
    ```bash
    cp backend/.env.example .env
    # Modify .env to:
    # DB_HOST=db
    # FRONTEND_URL=http://localhost:3000
    # Add your JWT_SECRET and other production-appropriate values
    ```
3.  **Build and Run**:
    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: Rebuilds images if Dockerfiles or context change.
    *   `-d`: Runs containers in detached mode (in the background).

4.  **Verify Services**:
    *   Check container status: `docker-compose ps`
    *   View logs: `docker-compose logs -f` (use `Ctrl+C` to exit logs)
    *   Frontend: Access `http://localhost:3000`
    *   Backend API (direct): Access `http://localhost:5000/api/v1`
    *   PostgreSQL: Connect to `localhost:5432` with user `ecommerce_user`, password `ecommerce_password`, database `ecommerce_db`.

5.  **Stop Services**:
    ```bash
    docker-compose down
    ```
    This will stop and remove containers, networks, and volumes (unless explicitly configured not to).
    To remove volumes: `docker-compose down -v` (useful for a clean slate, but will delete database data).

## 4. Cloud Deployment (Conceptual Examples)

For production environments, deploying to a cloud provider is recommended. The general steps are similar, but specific commands and services vary by provider.

### General Steps:

1.  **Containerize**: Ensure your `Dockerfile`s are optimized for production (multi-stage builds, minimal images). (Already done in this project).
2.  **Container Registry**: Build your Docker images locally or via CI/CD and push them to a private/public container registry.
    ```bash
    # Example for Docker Hub
    docker build -t your_docker_username/ecommerce-backend:latest ./backend
    docker push your_docker_username/ecommerce-backend:latest

    docker build -t your_docker_username/ecommerce-frontend:latest ./frontend
    docker push your_docker_username/ecommerce-frontend:latest
    ```
3.  **Database Service**: Use a managed database service (e.g., AWS RDS, GCP Cloud SQL, Azure Database for PostgreSQL). This provides automated backups, scaling, and high availability.
4.  **Compute/Orchestration**:
    *   **Virtual Machine (VM)**: Deploy on a single VM (e.g., EC2, Compute Engine, Droplet) and use Docker Compose. Simpler but less scalable and resilient.
    *   **Container Orchestration (Kubernetes/ECS/AKS)**: For highly scalable and resilient deployments.
5.  **Load Balancer & HTTPS**: Place a Load Balancer (e.g., AWS ALB, GCP Load Balancer) in front of your application instances to distribute traffic and terminate SSL/TLS (HTTPS).
6.  **Environment Variables**: Configure sensitive data (DB credentials, JWT secret) securely using secrets management services (e.g., AWS Secrets Manager, Kubernetes Secrets) rather than embedding them directly in container images or plain text files.
7.  **CI/CD Integration**: Automate the entire process using your chosen CI/CD tool (e.g., GitHub Actions, GitLab CI, Jenkins).

### AWS ECS/EKS (Elastic Container Service / Elastic Kubernetes Service)

*   **Database**: AWS RDS for PostgreSQL.
*   **Container Registry**: AWS ECR.
*   **Compute**:
    *   **ECS (Fargate)**: Serverless option, manage tasks and services, less infrastructure overhead.
    *   **ECS (EC2 Launch Type)**: More control over underlying EC2 instances.
    *   **EKS**: Managed Kubernetes for ultimate control and scalability, higher learning curve.
*   **Networking**: AWS VPC, ALB for load balancing, Route 53 for DNS.
*   **Secrets**: AWS Secrets Manager.
*   **Logs**: AWS CloudWatch Logs.

**Deployment Flow (ECS Fargate Example):**

1.  **Setup ECR**: Create repositories for `ecommerce-backend` and `ecommerce-frontend`.
2.  **Build & Push**: Your CI/CD pipeline builds Docker images and pushes to ECR.
3.  **RDS Setup**: Create a PostgreSQL RDS instance. Configure security groups to allow connections from your ECS tasks.
4.  **ECS Task Definitions**: Create task definitions for `backend` and `frontend`.
    *   Specify image URI from ECR.
    *   Define container ports (e.g., `5000` for backend, `80` for frontend/Nginx).
    *   Map environment variables, especially DB credentials and JWT secret (from Secrets Manager/SSM).
5.  **ECS Services**: Create ECS services for each task definition.
    *   Associate with an ALB Target Group.
    *   Configure desired count (number of instances).
    *   Set up auto-scaling policies.
6.  **Application Load Balancer (ALB)**:
    *   Create an ALB.
    *   Create Listener for HTTPS (port 443) with an ACM certificate.
    *   Create Target Groups: one for backend (port 5000) and one for frontend (port 80).
    *   Create Listener Rules:
        *   `Host: yourdomain.com, Path: /api/*` -> Forward to backend Target Group.
        *   `Host: yourdomain.com, Path: /*` -> Forward to frontend Target Group.
7.  **Route 53**: Create A record mapping `yourdomain.com` to the ALB DNS name.

### Google Cloud GKE (Google Kubernetes Engine)

*   **Database**: GCP Cloud SQL for PostgreSQL.
*   **Container Registry**: Google Container Registry (GCR) or Artifact Registry.
*   **Compute**: GKE Cluster.
*   **Networking**: Google Cloud Load Balancer (GCLB), Cloud DNS.
*   **Secrets**: Kubernetes Secrets.
*   **Logs**: Google Cloud Logging.

**Deployment Flow (GKE Example):**

1.  **Setup GCR/Artifact Registry**: Push Docker images.
2.  **Cloud SQL Setup**: Create PostgreSQL Cloud SQL instance.
3.  **GKE Cluster**: Create a Kubernetes cluster.
4.  **Kubernetes Manifests (YAML files)**:
    *   **Deployments**: Define deployments for `backend` and `frontend` (Nginx). Specify container images, environment variables (from Secrets), and resource limits.
    *   **Services**: Expose your deployments within the cluster.
    *   **Secrets**: Create Kubernetes Secrets for sensitive data.
    *   **Ingress**: Configure an Ingress resource to expose services externally via the GCLB. Define hostnames and path-based routing (`/api` to backend, `/` to frontend).
5.  **kubectl**: Apply the manifests to your GKE cluster.
    ```bash
    kubectl apply -f k8s/backend-deployment.yaml
    kubectl apply -f k8s/frontend-deployment.yaml
    kubectl apply -f k8s/backend-service.yaml
    kubectl apply -f k8s/frontend-service.yaml
    kubectl apply -f k8s/ingress.yaml
    ```
6.  **Cloud DNS**: Map your domain to the IP address provided by the GCLB (managed by Ingress).

### Azure AKS (Azure Kubernetes Service)

*   **Database**: Azure Database for PostgreSQL.
*   **Container Registry**: Azure Container Registry (ACR).
*   **Compute**: AKS Cluster.
*   **Networking**: Azure Load Balancer, Azure DNS.
*   **Secrets**: Kubernetes Secrets, Azure Key Vault integration.
*   **Logs**: Azure Monitor, Azure Log Analytics.

Deployment flow is similar to GKE, using `az aks` CLI commands and Kubernetes YAML manifests.

### DigitalOcean Droplet with Docker Compose

This is a simpler, more hands-on approach for smaller deployments or where you need full control over the VM.

1.  **Create Droplet**:
    *   Choose a Droplet size (e.g., 2GB RAM, 2 CPUs).
    *   Select an OS (e.g., Ubuntu 20.04 LTS).
    *   Add your SSH key for secure access.
2.  **SSH into Droplet**:
    ```bash
    ssh root@your_droplet_ip
    ```
3.  **Install Docker & Docker Compose**:
    ```bash
    sudo apt update
    sudo apt install docker.io docker-compose -y
    sudo systemctl start docker
    sudo systemctl enable docker
    # Add your user to the docker group to run docker commands without sudo (optional)
    # sudo usermod -aG docker ${USER}
    # newgrp docker
    ```
4.  **Clone Project**:
    ```bash
    git clone https://github.com/your-username/ecommerce-app.git
    cd ecommerce-app
    ```
5.  **Create `.env` file**:
    Create `.env` file at the root of the project. Make sure `DB_HOST` is `db`.
    *Important*: Use strong, production-ready values for `JWT_SECRET` and database credentials.
6.  **Run Docker Compose**:
    ```bash
    docker-compose up --build -d
    ```
7.  **Firewall Configuration**:
    *   Configure Droplet firewall (or `ufw`) to allow incoming traffic on ports `80` (for frontend/Nginx), `443` (for HTTPS), and `5000` (if you want direct backend access, though generally not recommended).
    *   Example `ufw` rules:
        ```bash
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        sudo ufw allow OpenSSH
        sudo ufw enable
        ```
8.  **HTTPS (Recommended)**:
    *   For production, you **must** use HTTPS.
    *   You can set up another Nginx instance *outside* the `docker-compose.yml` to act as a reverse proxy for your Dockerized services and handle SSL termination using Let's Encrypt with `certbot`.
    *   Alternatively, integrate `certbot` directly into your `frontend` Nginx Docker container (more complex but keeps everything containerized).

## 5. Post-Deployment Checks

After deployment, perform these checks:

*   **Application Access**: Can you access the frontend in your browser?
*   **API Calls**: Are API requests from the frontend successfully reaching the backend? (Check network tab in browser dev tools).
*   **Database Connectivity**: Verify that the backend can connect to the database.
*   **Admin Access**: Log in as an admin user and verify admin functionalities.
*   **User Registration/Login**: Test the full user lifecycle.
*   **Error Handling**: Intentionally trigger errors (e.g., invalid input) to see if error responses are handled gracefully and logged.
*   **Logs**: Check application logs for any errors or warnings.
*   **Performance**: Run basic load tests if possible.
*   **HTTPS**: Ensure all traffic is encrypted if deploying to production.
*   **Health Checks**: If using orchestration, ensure health checks for containers are passing.

## 6. Maintenance and Operations

*   **Monitoring & Alerting**: Set up Prometheus/Grafana or cloud-native monitoring to track key metrics (CPU, Memory, Disk, Network I/O, API response times, error rates) and receive alerts on anomalies.
*   **Logging**: Centralize logs (e.g., ELK stack, Grafana Loki, CloudWatch, Stackdriver) for easy debugging and auditing.
*   **Backups**: Implement automated database backups with a recovery plan.
*   **Updates**: Regularly update dependencies, operating system, and Docker images to patch security vulnerabilities.
*   **Security Audits**: Periodically review security configurations and code.
*   **Scalability**: Monitor resource usage and adjust scaling policies or upgrade infrastructure as traffic grows.
*   **Disaster Recovery**: Have a plan for recovering from major outages.
```