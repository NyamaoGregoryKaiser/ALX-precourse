# ALXChat: Deployment Guide

This document outlines the steps and considerations for deploying the ALXChat application to a production environment. The recommended deployment strategy leverages Docker and Docker Compose for ease of management, with considerations for scaling beyond a single instance.

## Table of Contents

1.  [Deployment Strategy Overview](#1-deployment-strategy-overview)
2.  [Prerequisites](#2-prerequisites)
3.  [Environment Variables](#3-environment-variables)
4.  [Deployment Steps (Single Server)](#4-deployment-steps-single-server)
    *   [1. Prepare the Server](#1-prepare-the-server)
    *   [2. Clone the Repository](#2-clone-the-repository)
    *   [3. Configure Environment Variables](#3-configure-environment-variables)
    *   [4. Pull Docker Images / Build Locally](#4-pull-docker-images--build-locally)
    *   [5. Run the Application](#5-run-the-application)
    *   [6. Verify Deployment](#6-verify-deployment)
5.  [CI/CD Integration](#5-cicd-integration)
6.  [Scaling Considerations](#6-scaling-considerations)
7.  [Monitoring and Logging](#7-monitoring-and-logging)
8.  [Troubleshooting](#8-troubleshooting)

## 1. Deployment Strategy Overview

The primary deployment strategy for ALXChat is containerization using Docker and orchestration with Docker Compose. This approach ensures:

*   **Consistency:** The application runs the same way in development, testing, and production.
*   **Isolation:** Components are isolated from each other and the host system.
*   **Portability:** Easily deployable across various cloud providers or on-premise infrastructure that supports Docker.
*   **Ease of Management:** Docker Compose simplifies starting, stopping, and managing the multi-container application.

For more advanced production environments, migrating to Kubernetes or a similar container orchestration platform would be the next step for high availability and complex scaling.

## 2. Prerequisites

*   **Production Server:** A Linux-based server (e.g., Ubuntu, CentOS) with internet access.
*   **Docker Engine:** Installed and running on the server.
*   **Docker Compose:** Installed on the server.
*   **Git:** Installed on the server.
*   **SSH Access:** Secure Shell access to your production server.
*   **Firewall Configuration:** Ensure ports 80 (for frontend) and 443 (if using HTTPS) are open to the internet. Internal ports (e.g., 5432 for DB, 6379 for Redis, 8080 for backend) should only be accessible within the Docker network or from trusted IPs.
*   **Domain Name (Optional but Recommended):** A registered domain name pointing to your server's IP address if you want to use a custom URL and HTTPS.

## 3. Environment Variables

Sensitive information and environment-specific configurations **must** be managed using environment variables. Create a `.env` file in your project's root directory on the production server.

**Example `.env` file for Production:**

```dotenv
# Database Configuration
# Use a strong, unique password for production
DB_NAME=alxchat_prod_db
DB_USERNAME=alx_prod_user
DB_PASSWORD=YOUR_STRONG_PROD_DATABASE_PASSWORD
DB_HOST=db # Internal Docker service name

# Redis Configuration
REDIS_HOST=redis # Internal Docker service name
REDIS_PORT=6379

# JWT Configuration (CRITICAL for security)
# This MUST be a very long, complex, and securely generated random string.
# Example: openssl rand -base64 64 (for 512-bit key)
JWT_SECRET=YOUR_VERY_SECURE_AND_LONG_JWT_SECRET_KEY_FOR_PRODUCTION_ALXCHATAPP_PLEASE_CHANGE_ME
JWT_EXPIRATION=3600000 # 1 hour in milliseconds (adjust as needed)

# Other production-specific settings
# For frontend Nginx
REACT_APP_API_BASE_URL=/api # Frontend will proxy to Nginx
REACT_APP_WEBSOCKET_URL=/websocket # Frontend will proxy to Nginx
```

**Security Best Practices for `JWT_SECRET` and `DB_PASSWORD`:**

*   **Do not commit these to version control.**
*   Use a secrets management service (e.g., AWS Secrets Manager, HashiCorp Vault) for large-scale deployments.
*   For single-server deployments, ensure the `.env` file has restricted permissions (`chmod 600 .env`).

## 4. Deployment Steps (Single Server)

This section details deploying the application on a single server using `docker compose`.

### 1. Prepare the Server

1.  **SSH into your server:**
    ```bash
    ssh user@your_server_ip
    ```
2.  **Update system packages:**
    ```bash
    sudo apt update && sudo apt upgrade -y # For Ubuntu/Debian
    ```
3.  **Install Docker and Docker Compose:**
    Follow the official Docker documentation for your specific OS:
    *   [Install Docker Engine](https://docs.docker.com/engine/install/)
    *   [Install Docker Compose](https://docs.docker.com/compose/install/)

### 2. Clone the Repository

1.  Choose a deployment directory on your server, e.g., `/opt/alxchat`.
2.  Clone your Git repository:
    ```bash
    sudo mkdir -p /opt/alxchat
    sudo chown $USER:$USER /opt/alxchat # Give current user ownership
    cd /opt/alxchat
    git clone https://github.com/your-username/alx-chat.git . # Clone into current directory
    ```

### 3. Configure Environment Variables

1.  Create the `.env` file in the `/opt/alxchat` directory:
    ```bash
    nano .env
    ```
2.  Paste the production `.env` content (from section 3) and fill in your actual production values.
3.  Save and exit (`Ctrl+X`, `Y`, `Enter`).
4.  **Secure the `.env` file:**
    ```bash
    chmod 600 .env
    ```

### 4. Pull Docker Images / Build Locally

You have two options:

*   **Option A: Pull from Docker Hub (Recommended for CI/CD)**
    If your CI/CD pipeline (e.g., GitHub Actions as configured in `main.yml`) pushes images to Docker Hub, you can pull them directly:
    ```bash
    docker compose pull
    ```
    *Ensure your `docker-compose.yml` uses the correct image tags (e.g., `your_docker_username/alx-chat-backend:latest`).*

*   **Option B: Build Locally on Server (If no CI/CD or private registry)**
    ```bash
    docker compose build
    ```
    This will build the Docker images for backend and frontend on your server. This might take longer but ensures the latest code is used.

### 5. Run the Application

Execute Docker Compose to start all services:

```bash
docker compose up -d
```
*   `-d`: Runs the containers in detached mode.

This command will:
*   Start `db` (PostgreSQL), `redis`, `alx-chat-backend`, and `alx-chat-frontend` containers.
*   Apply Flyway database migrations automatically when the backend starts.
*   The `alx-chat-frontend` container, which includes Nginx, will be listening on port 80.

### 6. Verify Deployment

1.  **Check container status:**
    ```bash
    docker compose ps
    ```
    All services should be `Up` and `healthy` (after initial startup time).

2.  **View logs:**
    ```bash
    docker compose logs -f alx-chat-backend
    docker compose logs -f alx-chat-frontend
    ```
    Look for any errors during startup.

3.  **Access the application:**
    Open your web browser and navigate to your server's public IP address or configured domain name.
    *   `http://your_server_ip` or `http://your_domain.com`
    *   You should see the ALXChat login page.

4.  **API Documentation:**
    *   `http://your_server_ip:8080/swagger-ui.html` (direct backend access)

## 5. CI/CD Integration

The provided `.github/workflows/main.yml` demonstrates a basic CI/CD pipeline using GitHub Actions:

1.  **Build & Test:** On every push to `main` or pull request, it builds both backend and frontend, runs unit/integration tests, and generates coverage reports.
2.  **Docker Build & Push:** If tests pass on the `main` branch, it builds production Docker images and pushes them to Docker Hub.
3.  **Deployment (Placeholder):** A placeholder `deploy` job shows where you would integrate your actual deployment logic. This typically involves SSHing to your production server and executing `docker compose pull && docker compose up -d` or updating a Kubernetes deployment.

**To enable the CI/CD pipeline:**

1.  **Configure GitHub Secrets:**
    *   `DOCKER_USERNAME`: Your Docker Hub username.
    *   `DOCKER_PASSWORD`: Your Docker Hub Access Token (preferred over password for security).
2.  **Adjust `main.yml`:** Modify the `deploy` job to match your actual deployment process (e.g., specific server IPs, SSH keys, Kubernetes config).

## 6. Scaling Considerations

*   **Backend (alx-chat-backend):**
    *   Can be scaled horizontally by running multiple instances behind a load balancer (e.g., Nginx, AWS ALB, Kubernetes Service).
    *   Redis is crucial here to manage WebSocket sessions and user presence across instances.
*   **Redis:** For high availability and performance, consider a Redis cluster or sentinel setup.
*   **PostgreSQL:**
    *   Read replicas for read-heavy operations.
    *   For extreme scale, sharding might be necessary.
    *   Use a managed database service (e.g., AWS RDS, Azure Database for PostgreSQL) for easier management, backups, and scaling.
*   **Frontend (alx-chat-frontend):**
    *   Can be scaled by deploying multiple Nginx instances behind a load balancer or by serving static assets from a CDN.

## 7. Monitoring and Logging

*   **Application Logs:** Docker Compose allows viewing logs with `docker compose logs -f <service_name>`. For production, consider centralized logging solutions like ELK stack (Elasticsearch, Logstash, Kibana) or cloud-native options (e.g., AWS CloudWatch, Google Cloud Logging).
*   **Health Checks:** Spring Boot Actuator exposes `/actuator/health` endpoints, which Docker Compose uses for service health checks.
*   **Metrics:** For deeper insights, integrate Prometheus and Grafana to collect and visualize metrics from Spring Boot Actuator, JVM, and operating system.

## 8. Troubleshooting

*   **Container not starting/unhealthy:**
    *   Check `docker compose logs <service_name>` for error messages.
    *   Ensure all necessary environment variables are set correctly in `.env`.
    *   Verify port conflicts on the host machine.
    *   Ensure database/Redis are accessible from the backend container (check `docker network inspect alxchat_network`).
*   **Frontend not loading:**
    *   Check Nginx logs (`docker compose logs alx-chat-frontend`).
    *   Ensure frontend build files are correctly copied into the Nginx container.
    *   Verify `REACT_APP_API_BASE_URL` and `REACT_APP_WEBSOCKET_URL` are correct.
*   **API calls failing:**
    *   Check backend logs for exceptions.
    *   Verify JWT token is being sent correctly in `Authorization` header.
    *   Check network connectivity between frontend (via Nginx) and backend.
*   **WebSocket connection issues:**
    *   Check backend and frontend logs.
    *   Ensure Nginx is correctly proxying WebSocket upgrade headers (see `nginx.conf`).
    *   Verify JWT token is passed during WebSocket handshake.

---
This guide provides a solid foundation for deploying ALXChat. Remember to adapt it to your specific infrastructure and security requirements.