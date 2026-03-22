```markdown
# ALX E-commerce System - Deployment Guide

This guide outlines the steps to deploy the ALX E-commerce System to various environments. We will focus on a Docker-based deployment, which is highly portable and suitable for self-hosting on a Virtual Private Server (VPS) or cloud instances (e.g., AWS EC2, DigitalOcean Droplets).

---

## Table of Contents

1.  [Deployment Strategy Overview](#1-deployment-strategy-overview)
2.  [Prerequisites](#2-prerequisites)
3.  [Server Setup (VPS/Cloud Instance)](#3-server-setup-vpscloud-instance)
    *   [Operating System](#31-operating-system)
    *   [Docker and Docker Compose Installation](#32-docker-and-docker-compose-installation)
    *   [User and Permissions](#33-user-and-permissions)
    *   [Firewall Configuration](#34-firewall-configuration)
4.  [Application Configuration for Deployment](#4-application-configuration-for-deployment)
    *   [Environment Variables](#41-environment-variables)
    *   [Database Volume](#42-database-volume)
    *   [Redis Configuration](#43-redis-configuration)
    *   [Logging](#44-logging)
5.  [Deployment Steps](#5-deployment-steps)
    *   [Manual Deployment](#51-manual-deployment)
    *   [CI/CD Deployment (GitHub Actions)](#52-cicd-deployment-github-actions)
6.  [Post-Deployment Verification](#6-post-deployment-verification)
7.  [Monitoring and Logging](#7-monitoring-and-logging)
8.  [Scaling Considerations](#8-scaling-considerations)
9.  [Frontend Deployment (Conceptual)](#9-frontend-deployment-conceptual)

---

## 1. Deployment Strategy Overview

The recommended deployment strategy leverages Docker and Docker Compose. This provides:

*   **Containerization:** The application and its dependencies (PostgreSQL, Redis) run in isolated containers, ensuring consistency across environments.
*   **Orchestration:** Docker Compose manages the multi-container application, handling networking, volume mounts, and service startup order.
*   **Portability:** The same `Dockerfile` and `docker-compose.yml` can be used from development to production.
*   **CI/CD Integration:** Easy to integrate with automated pipelines (e.g., GitHub Actions) for continuous deployment.

## 2. Prerequisites

*   A **VPS or Cloud Instance** (e.g., AWS EC2, DigitalOcean Droplet, Linode) with at least 2GB RAM (4GB recommended for production) and sufficient disk space.
*   **Domain Name** (optional but highly recommended for production) pointing to your server's IP address.
*   **SSH Access** to your server.
*   **GitHub Repository** (if using CI/CD).
*   **Docker Hub Account** (if pushing images to Docker Hub).

## 3. Server Setup (VPS/Cloud Instance)

### 3.1. Operating System

A Linux-based OS is recommended (e.g., Ubuntu LTS, Debian). This guide assumes Ubuntu.

### 3.2. Docker and Docker Compose Installation

Connect to your server via SSH and install Docker and Docker Compose:

```bash
# Update package list
sudo apt update

# Install Docker
sudo apt install apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io

# Install Docker Compose (latest version from GitHub)
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
# Link to /usr/bin for easier access
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Add your user to the docker group to run docker commands without sudo
sudo usermod -aG docker ${USER}
# Log out and log back in, or run 'newgrp docker' for changes to take effect
```

### 3.3. User and Permissions

Create a dedicated directory for your application on the server:

```bash
sudo mkdir -p /opt/alx-ecommerce-prod
sudo chown -R ${USER}:${USER} /opt/alx-ecommerce-prod
```
Adjust `/opt/alx-ecommerce-prod` to `/opt/alx-ecommerce-dev` for development environments.

### 3.4. Firewall Configuration

Configure the firewall (e.g., UFW on Ubuntu) to allow necessary traffic:

```bash
sudo ufw allow OpenSSH # To keep SSH access
sudo ufw allow 8080/tcp # For the Spring Boot application
sudo ufw allow 80/tcp # If you plan to use Nginx for HTTP
sudo ufw allow 443/tcp # If you plan to use Nginx for HTTPS
sudo ufw enable
sudo ufw status
```

## 4. Application Configuration for Deployment

The `docker/docker-compose.yml` file is configured with environment variables that can be overridden for specific deployments.

### 4.1. Environment Variables

**Crucial for production security and flexibility.**
Modify `docker/docker-compose.yml` to use secrets or direct environment variables for production.

**Example `docker-compose.yml` for Production (simplified, using `.env` file for secrets):**

Create an `.env` file in the same directory as `docker-compose.yml` (e.g., `/opt/alx-ecommerce-prod/.env`):

```dotenv
# .env file
DB_NAME=ecommerce_prod_db
DB_USER=prod_ecommerce_user
DB_PASSWORD=YOUR_STRONG_POSTGRES_PASSWORD

REDIS_HOST=redis
REDIS_PORT=6379
# REDIS_PASSWORD=YOUR_REDIS_PASSWORD # Uncomment if Redis has a password

JWT_SECRET=YOUR_SUPER_STRONG_AND_UNIQUE_JWT_SECRET_KEY_AT_LEAST_32_BYTES_LONG # Use a robust key generator
```

Then, modify your `docker-compose.yml` to reference these variables and set the `SPRING_PROFILES_ACTIVE` to `prod` (if you have a production-specific profile in `application.yml`). Our current `application.yml` has a `docker` profile that sets the `DB_HOST` to `ecommerce-db`, which is suitable for Docker Compose.

```yaml
# docker/docker-compose.yml (updated snippet)
services:
  ecommerce-db:
    # ...
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    # ...

  ecommerce-app:
    # ...
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://ecommerce-db:5432/${DB_NAME}
      SPRING_DATASOURCE_USERNAME: ${DB_USER}
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
      SPRING_DATA_REDIS_HOST: ${REDIS_HOST}
      SPRING_DATA_REDIS_PORT: ${REDIS_PORT}
      JWT_SECRET: ${JWT_SECRET}
      SPRING_PROFILES_ACTIVE: docker # Use the 'docker' profile defined in application.yml
    # ...
```
This `.env` file should **NOT** be committed to version control.

### 4.2. Database Volume

The `docker-compose.yml` already includes a named volume `db_data` for PostgreSQL. This ensures that your database data persists even if the `ecommerce-db` container is removed or updated.

```yaml
volumes:
  db_data:
    driver: local
```

### 4.3. Redis Configuration

Redis is configured in `docker-compose.yml` to use `redis:7-alpine`. The `spring.data.redis.host` will be `redis` (the service name in Docker Compose).

### 4.4. Logging

The `logback-spring.xml` configuration outputs logs to both console and a rolling file (`logs/ecommerce-system.log`) within the container. For production, consider mounting a volume for the `logs` directory to persist logs outside the container, or use a log aggregator (e.g., Fluentd, Logstash) to send logs to a centralized system (ELK Stack, Grafana Loki).

Example of mounting log volume in `docker-compose.yml`:

```yaml
  ecommerce-app:
    # ...
    volumes:
      - ./logs:/app/logs # Persist logs to a directory on the host
```

## 5. Deployment Steps

### 5.1. Manual Deployment

1.  **Build and Push Docker Image:**
    On your local machine (or CI server), build the application's Docker image and push it to Docker Hub (or your private registry).
    ```bash
    cd ecommerce-system
    docker build -t YOUR_DOCKER_USERNAME/alx-ecommerce-app:latest .
    docker push YOUR_DOCKER_USERNAME/alx-ecommerce-app:latest
    ```
    Replace `YOUR_DOCKER_USERNAME` with your Docker Hub username.

2.  **SSH into your server:**
    ```bash
    ssh your_user@your_server_ip
    ```

3.  **Navigate to application directory:**
    ```bash
    cd /opt/alx-ecommerce-prod # Or /opt/alx-ecommerce-dev
    ```

4.  **Copy `docker-compose.yml` and `.env`:**
    You'll need to manually copy your `docker-compose.yml` (from `ecommerce-system/docker`) and your secret `.env` file to this directory.
    ```bash
    # On your local machine:
    scp ecommerce-system/docker/docker-compose.yml your_user@your_server_ip:/opt/alx-ecommerce-prod/
    scp your_secrets_file.env your_user@your_server_ip:/opt/alx-ecommerce-prod/.env
    ```
    Ensure `your_secrets_file.env` has the correct values as discussed in [4.1 Environment Variables](#41-environment-variables).

5.  **Pull and Start Services:**
    ```bash
    docker compose pull ecommerce-app # Pulls the latest image you pushed
    docker compose up -d
    ```

6.  **Verify (optional, but recommended):**
    Check container status:
    ```bash
    docker ps
    ```
    View logs:
    ```bash
    docker compose logs -f
    ```

### 5.2. CI/CD Deployment (GitHub Actions)

If you've configured the `.github/workflows/ci-cd.yml` file and the necessary GitHub Secrets (as detailed in `README.md`), deployments will be automated:

*   Push to `develop` branch -> Automatic deployment to `development` server.
*   Push to `main` branch -> Automatic deployment to `production` server.

The CI/CD pipeline will:
1.  Build and test the application.
2.  Build the Docker image.
3.  Push the image to Docker Hub.
4.  SSH into the target server (dev/prod).
5.  Pull the latest Docker image.
6.  Restart the Docker Compose services.

Ensure your server's `docker-compose.yml` and `.env` files are correctly set up in the `/opt/alx-ecommerce-prod` (or `dev`) directory. The `ssh-action` will simply trigger `docker compose pull` and `docker compose up -d` on the remote host, relying on the existing `docker-compose.yml` and `.env` files on that host.

## 6. Post-Deployment Verification

After deployment, perform these checks:

*   **Access API:** Open `http://your_server_ip:8080/api/v1/swagger-ui.html` in your browser. You should see the Swagger UI.
*   **Health Check:** Access `http://your_server_ip:8080/api/v1/actuator/health`. It should return `{"status":"UP"}`.
*   **Basic API Test:** Use a tool like Postman or `curl` to perform a simple GET request, e.g., `curl http://your_server_ip:8080/api/v1/products`.
*   **Admin Login:** Log in as the seeded admin user (`admin` / `adminpass` by default - **CHANGE THIS IN PRODUCTION**). Then, try to access an admin-only endpoint.

## 7. Monitoring and Logging

*   **Spring Boot Actuator:** Provides `/actuator/health` for health checks and `/actuator/prometheus` for metrics. Configure your monitoring system (e.g., Prometheus) to scrape metrics from this endpoint.
*   **Centralized Logging:** For production, integrate with a centralized logging solution (e.g., ELK Stack - Elasticsearch, Logstash, Kibana; or Grafana Loki). This involves configuring Logback to send logs to a log shipper (e.g., Filebeat, Fluentd).
*   **Container Logging:** `docker compose logs -f` is useful for immediate debugging. For long-term log retention and analysis, offload logs as mentioned above.

## 8. Scaling Considerations

*   **Horizontal Scaling (Application):** Increase the number of `ecommerce-app` replicas in your `docker-compose.yml` and use a load balancer to distribute traffic.
    ```yaml
    services:
      ecommerce-app:
        # ...
        deploy:
          replicas: 3 # Example for 3 instances
    ```
*   **Database Scaling:** For high-traffic applications, consider PostgreSQL read replicas for read-heavy operations, or sharding for extreme scale.
*   **Caching Scale:** Redis can also be clustered for high availability and larger cache capacity.
*   **Kubernetes:** For advanced container orchestration, self-healing, and auto-scaling, migrate from Docker Compose to Kubernetes.

## 9. Frontend Deployment (Conceptual)

This backend system is designed to be consumed by a separate frontend application.
Typical frontend deployment involves:

1.  Building the frontend application (e.g., `npm run build` for React).
2.  Serving the static assets (HTML, CSS, JS) using a web server like Nginx, or a CDN.
3.  Configuring Nginx or the frontend build to proxy API requests to your backend server (e.g., `proxy_pass http://localhost:8080/api/v1;`).
4.  Ensuring CORS (Cross-Origin Resource Sharing) is correctly configured on the backend if the frontend is served from a different domain/port. Spring Boot allows configuring CORS globally or per controller.
```