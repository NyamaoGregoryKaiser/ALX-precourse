# ALX E-commerce Solution - Deployment Guide

This document outlines the considerations and steps for deploying the ALX E-commerce Solution to a production environment. The primary deployment strategy suggested is using Docker for containerization, which simplifies dependency management and ensures consistency across environments.

## Table of Contents

1.  [Deployment Strategy Overview](#1-deployment-strategy-overview)
2.  [Production Environment Prerequisites](#2-production-environment-prerequisites)
3.  [Configuration for Production](#3-configuration-for-production)
4.  [Building and Pushing Docker Images](#4-building-and-pushing-docker-images)
5.  [Server Setup](#5-server-setup)
6.  [Running on a Single Server (Docker Compose)](#6-running-on-a-single-server-docker-compose)
7.  [Running on a Cluster (Kubernetes - Conceptual)](#7-running-on-a-cluster-kubernetes---conceptual)
8.  [Monitoring and Logging](#8-monitoring-and-logging)
9.  [Security Best Practices](#9-security-best-practices)
10. [Backup and Recovery](#10-backup-and-recovery)

---

## 1. Deployment Strategy Overview

The recommended deployment strategy involves:

*   **Containerization with Docker**: Packaging the backend and frontend into Docker images.
*   **Orchestration with Docker Compose**: For single-server deployments, managing the application services (backend, database, cache).
*   **CI/CD Pipeline**: Automating the build, test, and deployment process using GitHub Actions.

For larger-scale or high-availability deployments, a container orchestration platform like **Kubernetes** would be the next logical step (covered conceptually).

## 2. Production Environment Prerequisites

Before deploying, ensure your production server(s) meet the following requirements:

*   **Operating System**: A Linux distribution (e.g., Ubuntu Server, CentOS) is recommended.
*   **Docker Engine**: Installed and running.
*   **Docker Compose**: Installed (usually comes with Docker Desktop or can be installed separately).
*   **Network Access**:
    *   Public IP address for external access (or behind a load balancer).
    *   Necessary ports open (e.g., 80 for HTTP, 443 for HTTPS, 8080 for backend if directly exposed, though not recommended).
*   **Resource Allocation**:
    *   Sufficient CPU, Memory, and Disk I/O for your expected load.
    *   Disk space for PostgreSQL data and application logs.
*   **Security**: SSH access configured for secure remote management.
*   **DNS**: A registered domain name pointing to your server's IP.

## 3. Configuration for Production

It's crucial to adjust configurations for a production environment.

### Backend (`application.yml` and Environment Variables)

*   **Database Credentials**: Use strong, unique passwords for the PostgreSQL database user. **Do not hardcode them in `application.yml`**. Use environment variables (as shown in `docker-compose.yml`) or a secrets management solution.
*   **JWT Secret**: Generate a truly strong, random 256-bit (32 characters or longer) key. Store it securely as an environment variable (`JWT_SECRET`).
*   **Redis Host/Port**: Ensure Redis connection details are correct for your production Redis instance.
*   **Logging**: Configure `logback-spring.xml` for production logging, including log rotation, retention, and potentially shipping logs to a centralized logging system.
*   **CORS**: Adjust CORS settings in `SecurityConfig.java` to allow only your production frontend domain.
*   **Actuator Security**: Secure Actuator endpoints (e.g., `/actuator/prometheus`) if they are exposed publicly. Ideally, they should only be accessible internally or via monitoring tools.
*   **Spring Profiles**: Use `SPRING_PROFILES_ACTIVE=prod` to enable production-specific configurations if you define them.

### Frontend (`.env` file)

*   **API Base URL**: Update `REACT_APP_API_BASE_URL` in `frontend/.env` to point to your deployed backend API URL (e.g., `https://api.your-ecommerce-domain.com/api`).
*   **Build**: Always use `npm run build` to create optimized production assets.

### Docker Compose (`docker-compose.yml`)

*   **Volumes**: Ensure persistent volumes for database data (`db_data`) and Redis data (`redis_data`) are configured correctly to prevent data loss upon container restarts.
*   **Ports**:
    *   For the backend, map `8080:8080` or to an internal port if using a reverse proxy.
    *   For the frontend, if using Nginx, map `80:80` (or `443:443` for HTTPS).
*   **Restart Policy**: Add `restart: always` to services to ensure they automatically restart if they crash or the Docker daemon restarts.
*   **Resource Limits**: Consider adding `deploy.resources.limits` to prevent a single service from consuming all server resources.
*   **Networking**: If you have multiple servers or complex network setups, define custom Docker networks.

## 4. Building and Pushing Docker Images

The CI/CD pipeline (GitHub Actions) is configured to automatically build and push Docker images to Docker Hub upon successful pushes to the `main` branch.

**Manual Steps (if not using CI/CD):**

1.  **Login to Docker Hub**:
    ```bash
    docker login -u your_docker_username -p your_docker_password
    ```

2.  **Build Backend Image**:
    ```bash
    cd ecommerce-solution/backend
    docker build -t your_docker_username/alx-ecommerce-backend:latest .
    ```

3.  **Push Backend Image**:
    ```bash
    docker push your_docker_username/alx-ecommerce-backend:latest
    ```

4.  **Build Frontend Image**:
    ```bash
    cd ecommerce-solution/frontend
    docker build -t your_docker_username/alx-ecommerce-frontend:latest .
    ```

5.  **Push Frontend Image**:
    ```bash
    docker push your_docker_username/alx-ecommerce-frontend:latest
    ```

## 5. Server Setup

1.  **SSH into your server**:
    ```bash
    ssh your_user@your_server_ip
    ```

2.  **Install Docker and Docker Compose**:
    Follow the official Docker documentation for your Linux distribution.

3.  **Create application directory**:
    ```bash
    mkdir -p /opt/ecommerce
    cd /opt/ecommerce
    ```

4.  **Copy `docker-compose.yml` and `.env`**:
    *   Securely copy the `docker-compose.yml` file and the production `.env` file (containing sensitive configurations like `JWT_SECRET`, `DB_PASSWORD`) to `/opt/ecommerce` on your server.
    *   **NEVER** commit your production `.env` file to source control.

5.  **Set up Nginx as a Reverse Proxy (Recommended)**:
    For a production setup, it's highly recommended to place Nginx in front of your frontend and backend services for:
    *   **HTTPS Termination**: Handle SSL certificates (e.g., with Let's Encrypt using Certbot).
    *   **Load Balancing**: If you scale your backend.
    *   **Static File Serving**: Efficiently serve frontend static assets.
    *   **CORS Management**: Centralized CORS configuration.
    *   **Request Routing**: Route `/api` requests to the backend container and other requests to the frontend container.

    Example `nginx.conf` snippet for reverse proxying:
    ```nginx
    server {
        listen 80;
        server_name your-ecommerce-domain.com;

        # Redirect HTTP to HTTPS
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-ecommerce-domain.com;

        ssl_certificate /etc/letsencrypt/live/your-ecommerce-domain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/your-ecommerce-domain.com/privkey.pem;

        # Frontend application
        location / {
            root /usr/share/nginx/html; # Path inside frontend Docker container
            try_files $uri $uri/ /index.html;
        }

        # Backend API
        location /api/ {
            proxy_pass http://ecommerce_backend:8080/api/; # 'ecommerce_backend' is service name in docker-compose
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 600;
            proxy_send_timeout 600;
            proxy_read_timeout 600;
            send_timeout 600;
        }

        # Swagger UI
        location /swagger-ui.html {
            proxy_pass http://ecommerce_backend:8080/swagger-ui.html;
            # ... other proxy headers
        }
        location /v3/api-docs {
            proxy_pass http://ecommerce_backend:8080/v3/api-docs;
            # ... other proxy headers
        }

        # Actuator endpoints (secure these appropriately)
        location /actuator {
            proxy_pass http://ecommerce_backend:8080/actuator;
            # ... other proxy headers, e.g., for IP restrictions or basic auth
        }
    }
    ```
    You would run Nginx in a separate Docker container and map its configuration and SSL certificates via volumes. Update `docker-compose.yml` to include the Nginx service.

## 6. Running on a Single Server (Docker Compose)

From your application directory (`/opt/ecommerce`):

1.  **Pull latest images**:
    ```bash
    docker compose pull
    ```

2.  **Start services**:
    ```bash
    docker compose up -d --remove-orphans
    ```
    *   `--remove-orphans`: Removes containers for services that are no longer defined in the `docker-compose.yml` file (useful after updating the file).

3.  **Verify services are running and healthy**:
    ```bash
    docker compose ps
    docker compose logs -f backend # Check backend logs for errors
    ```

4.  **Access the application**:
    *   If using Nginx, navigate to `https://your-ecommerce-domain.com`.
    *   If directly exposing backend, `http://your_server_ip:8080/api`.

## 7. Running on a Cluster (Kubernetes - Conceptual)

For high-availability, auto-scaling, and more complex deployments, Kubernetes is the industry standard. This involves:

1.  **Writing Kubernetes manifests**: Convert `docker-compose.yml` services into `Deployment`, `Service`, `Ingress`, `PersistentVolumeClaim` (for database), `Secret`, and `ConfigMap` resources.
2.  **Container Registry**: Using a private registry (e.g., AWS ECR, Google Container Registry) to store your Docker images.
3.  **Cloud Provider**: Deploying to a managed Kubernetes service (AWS EKS, Azure AKS, Google GKE).
4.  **Helm Charts**: For managing and deploying complex Kubernetes applications.

This is a significant architectural step beyond basic Docker Compose.

## 8. Monitoring and Logging

*   **Logs**: Configure log aggregation (e.g., ELK Stack - Elasticsearch, Logstash, Kibana; or Grafana Loki) to collect and centralize logs from all services. Logback is already configured for file output.
*   **Metrics**:
    *   Spring Boot Actuator exposes `/actuator/prometheus` endpoint, which can be scraped by **Prometheus**.
    *   **Grafana** can then visualize these metrics, providing dashboards for application performance, JVM health, HTTP request metrics, etc.
*   **Health Checks**: Docker Compose and Kubernetes leverage built-in health checks (`healthcheck` in `docker-compose.yml`) to ensure services are truly ready and responsive.

## 9. Security Best Practices

*   **HTTPS Everywhere**: Always use HTTPS for all public-facing communication. Obtain SSL/TLS certificates (e.g., from Let's Encrypt).
*   **Firewall**: Configure server firewalls (e.g., `ufw` on Ubuntu, AWS Security Groups) to open only necessary ports (80, 443, 22 for SSH).
*   **Principle of Least Privilege**:
    *   Run containers with non-root users.
    *   Grant minimal necessary permissions to database users.
    *   Limit access to production servers (SSH keys only, strong passwords for users).
*   **Secrets Management**: Do not hardcode sensitive information. Use environment variables (for Docker Compose) or dedicated secrets management solutions (e.g., HashiCorp Vault, Kubernetes Secrets).
*   **Regular Updates**: Keep your OS, Docker, Java, and application dependencies updated to patch security vulnerabilities.
*   **Security Scans**: Integrate static application security testing (SAST) and dynamic application security testing (DAST) into your CI/CD pipeline.
*   **Backup & Recovery**: Implement a robust backup and recovery strategy for your database (see below).

## 10. Backup and Recovery

*   **Database Backups**:
    *   Regularly back up your PostgreSQL database (e.g., daily full backups, hourly incremental backups).
    *   Store backups securely in a separate location (e.g., cloud storage like S3).
    *   Test your backup restoration process periodically to ensure data integrity and a smooth recovery.
*   **Application Configuration Backups**: Keep `docker-compose.yml` and production `.env` files version-controlled (for `docker-compose.yml`) and securely backed up.

By following this guide, you can establish a solid foundation for deploying and maintaining your ALX E-commerce Solution in a production environment.