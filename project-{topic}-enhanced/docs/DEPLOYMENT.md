```markdown
# CMS Deployment Guide

This guide provides instructions for deploying the Comprehensive CMS to a production environment using Docker and CI/CD with GitHub Actions.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Deployment Steps](#deployment-steps)
  - [1. Server Setup](#1-server-setup)
  - [2. Environment Variables](#2-environment-variables)
  - [3. Docker Registry Login](#3-docker-registry-login)
  - [4. GitHub Actions CI/CD](#4-github-actions-cicd)
  - [5. Manual Deployment (Alternative)](#5-manual-deployment-alternative)
- [Post-Deployment](#post-deployment)
- [Maintenance & Updates](#maintenance-updates)

## Overview

The recommended deployment strategy involves:
1.  **Containerization:** Using Docker to package the backend and frontend applications.
2.  **Orchestration:** Using Docker Compose for multi-service application management (PostgreSQL, Redis, Backend, Frontend).
3.  **CI/CD:** Automating build, test, and deployment processes using GitHub Actions.
4.  **Reverse Proxy:** Using Nginx (already part of frontend container) to serve the React app and potentially proxy API requests (not covered in detail here as backend is directly exposed).

## Prerequisites

*   **Production Server:** A Linux-based server (e.g., AWS EC2, DigitalOcean Droplet, GCP Compute Engine) with:
    *   Docker and Docker Compose installed.
    *   SSH access.
    *   Ports 80 (for frontend), 443 (for HTTPS), 5000 (for backend API, if not proxied) open in firewall/security groups.
*   **Domain Name:** A registered domain name pointing to your server's IP address (for HTTPS).
*   **SSL/TLS Certificates:** For HTTPS (e.g., Let's Encrypt with Certbot).
*   **GitHub Repository:** Your CMS project pushed to a GitHub repository.
*   **Docker Hub Account (or similar registry):** For storing Docker images.

## Deployment Steps

### 1. Server Setup

1.  **Connect to your server via SSH:**
    ```bash
    ssh username@your_server_ip
    ```

2.  **Install Docker and Docker Compose:**
    Follow the official Docker documentation for your specific Linux distribution.
    *   [Install Docker Engine](https://docs.docker.com/engine/install/)
    *   [Install Docker Compose](https://docs.docker.com/compose/install/)

3.  **Create a deployment directory:**
    ```bash
    sudo mkdir -p /opt/cms-project
    sudo chown -R $USER:$USER /opt/cms-project # Grant ownership to your user
    cd /opt/cms-project
    ```

4.  **Create Docker volumes:**
    These will persist your database and Redis data even if containers are removed.
    ```bash
    docker volume create cms_db_data
    docker volume create cms_redis_data
    ```

### 2. Environment Variables

In a production environment, never hardcode sensitive information. Use environment variables.

1.  **Create a `.env` file** in your `/opt/cms-project` directory on the server.
2.  **Populate it with production-ready values:**

    ```dotenv
    # Production Environment Variables

    # Backend (Node.js/Express)
    NODE_ENV=production
    PORT=5000
    # IMPORTANT: Replace with strong, complex values for production
    DATABASE_URL=postgres://your_db_user:your_db_password@db:5432/your_cms_db
    JWT_SECRET=YOUR_SUPER_STRONG_RANDOM_JWT_SECRET_KEY_HERE
    JWT_EXPIRES_IN=1d # e.g., 1 day
    SESSION_SECRET=ANOTHER_SUPER_STRONG_RANDOM_SESSION_SECRET_KEY_HERE
    FRONTEND_URL=https://your-cms-domain.com # Your actual production frontend URL

    # Redis (Caching and Sessions)
    REDIS_HOST=redis
    REDIS_PORT=6379
    # IMPORTANT: Set a strong password for Redis in production
    REDIS_PASSWORD=YOUR_STRONG_REDIS_PASSWORD

    # Frontend (React)
    REACT_APP_API_BASE_URL=https://your-cms-domain.com/api/v1 # Your production backend API URL
    ```
    *   **Security Note:** Generate truly strong, random secrets for `JWT_SECRET`, `SESSION_SECRET`, and `REDIS_PASSWORD`. Consider using a secret manager.
    *   Ensure your `FRONTEND_URL` and `REACT_APP_API_BASE_URL` match your actual domain.

3.  **Copy `docker-compose.yml` to the server:**
    Transfer the `docker-compose.yml` file from your local project to `/opt/cms-project` on your server.
    ```bash
    scp docker-compose.yml username@your_server_ip:/opt/cms-project/
    ```
    *   **Modification for Production:** In `docker-compose.yml`, for the `backend` and `frontend` services, **remove or comment out the `volumes` section** that mounts local source code. This ensures the containers use the built images, not local development files, and prevents permission issues.

### 3. Docker Registry Login

Your CI/CD pipeline (GitHub Actions) will push Docker images to a registry (e.g., Docker Hub). Your server needs to be able to pull these images.

1.  **Log in to Docker Hub (or your chosen registry) on your server:**
    ```bash
    docker login -u your_dockerhub_username
    # Enter your Docker Hub password when prompted
    ```
    This creates a credential file, allowing your server to pull private images.

### 4. GitHub Actions CI/CD

Configure your GitHub Actions workflow (`.github/workflows/main.yml`) for automated deployment.

1.  **Update `.github/workflows/main.yml`:**
    *   Uncomment the `deploy` job.
    *   Replace `your-dockerhub-username` with your actual Docker Hub username.
    *   Update `/path/to/your/cms-project` in the `script` section to `/opt/cms-project`.
    *   Ensure the `docker-compose.yml` in your repo matches the production-ready version (no dev volumes).

2.  **Set up GitHub Secrets:**
    Go to your GitHub repository -> Settings -> Security -> Secrets and variables -> Actions. Add the following repository secrets:
    *   `DOCKER_USERNAME`: Your Docker Hub username.
    *   `DOCKER_PASSWORD`: Your Docker Hub password or an access token.
    *   `SSH_HOST`: `your_server_ip` (or hostname).
    *   `SSH_USERNAME`: `username` (your SSH user on the server).
    *   `SSH_PRIVATE_KEY`: The **private key** corresponding to the public key authorized on your server. Ensure it's correctly formatted (PEM, starting with `-----BEGIN OPENSSH PRIVATE KEY-----` or `-----BEGIN RSA PRIVATE KEY-----`).

3.  **Trigger Deployment:**
    Push your changes to the `main` branch. The GitHub Actions workflow will:
    *   Build and test backend and frontend.
    *   Build Docker images for backend and frontend.
    *   Push images to Docker Hub.
    *   SSH into your server.
    *   Pull the latest images, take down existing containers, and bring them up with the new images.

### 5. Manual Deployment (Alternative to CI/CD)

If you're not using CI/CD, you can manually build and deploy from your server.

1.  **Clone the repository on your server:**
    ```bash
    cd /opt/cms-project
    git clone https://github.com/your-username/cms-project.git . # Clone into current dir
    ```

2.  **Build and start services:**
    ```bash
    docker-compose up --build -d
    ```
    This will build the images directly on your server.

3.  **Run Migrations and Seed Data:**
    ```bash
    docker-compose exec backend npm run db:migrate
    docker-compose exec backend npm run db:seed
    ```

## Post-Deployment

1.  **Verify Services:**
    Check that all containers are running and healthy:
    ```bash
    docker-compose ps
    ```
    Check backend logs for errors:
    ```bash
    docker-compose logs backend
    ```

2.  **Access the Application:**
    Open `http://your_server_ip:3000` (for frontend) and `http://your_server_ip:5000/api/v1` (for backend API).

3.  **Set up HTTPS (Crucial for Production):**
    *   **Install Nginx (if not already used by frontend container):** If you wish to use a separate Nginx instance as a reverse proxy for both frontend and backend and handle SSL termination.
    *   **Obtain SSL Certificates:** Use `Certbot` with Let's Encrypt to get free SSL certificates for your domain.
    *   **Configure Nginx for HTTPS:** Set up server blocks to redirect HTTP to HTTPS and proxy requests to your Docker containers.
        *   Example `nginx.conf` snippet for reverse proxy (assuming frontend on port 80 in container, backend on port 5000 in container):
        ```nginx
        server {
            listen 80;
            listen [::]:80;
            server_name your-cms-domain.com;
            return 301 https://$host$request_uri;
        }

        server {
            listen 443 ssl http2;
            listen [::]:443 ssl http2;
            server_name your-cms-domain.com;

            # SSL Configuration (generated by Certbot or manually)
            ssl_certificate /etc/letsencrypt/live/your-cms-domain.com/fullchain.pem;
            ssl_certificate_key /etc/letsencrypt/live/your-cms-domain.com/privkey.pem;
            ssl_session_cache shared:SSL:10m;
            ssl_protocols TLSv1.2 TLSv1.3;
            ssl_ciphers "ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20";
            ssl_prefer_server_ciphers on;

            # Frontend
            location / {
                proxy_pass http://localhost:3000; # Points to the frontend service port on host
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
            }

            # Backend API
            location /api/v1/ {
                proxy_pass http://localhost:5000/api/v1/; # Points to the backend service port on host
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
            }
        }
        ```
        *   Remember to restart Nginx after changes: `sudo systemctl restart nginx`

## Maintenance & Updates

*   **Regular Updates:** Keep Docker, Node.js, and other dependencies updated.
*   **Monitoring:** Set up monitoring for server resources (CPU, RAM, Disk), application logs, and API health checks.
*   **Backups:** Regularly back up your `cms_db_data` Docker volume.
*   **Security Patches:** Stay informed about security vulnerabilities in your stack and apply patches promptly.
*   **CI/CD for Updates:** For application updates, simply push changes to `main` (if CI/CD is configured) or perform a manual `git pull` followed by `docker-compose up --build -d` on the server.
*   **Database Migrations:** Remember to run database migrations (`docker-compose exec backend npm run db:migrate`) after deploying new code that includes schema changes.
```