```markdown
# Product Management System - Deployment Guide

This document outlines the deployment strategy for the Product Management System. It covers both manual deployment steps (useful for understanding) and the automated CI/CD approach for production environments.

## 1. Deployment Strategy Overview

The primary deployment strategy for this application is **container-based**, utilizing Docker images. This ensures consistency across development, testing, and production environments.

The deployment process generally involves:
1.  **Building** the application and its Docker image.
2.  **Pushing** the Docker image to a container registry (e.g., Docker Hub).
3.  **Pulling** the image onto a target server.
4.  **Running** the container, typically alongside a database and potentially monitoring tools.

For production, **orchestration tools** like Docker Compose (for single-server deployments) or Kubernetes (for clustered, scalable deployments) are recommended.

## 2. Prerequisites for Production Deployment

Before deploying to a production server, ensure the following are in place:

*   **Production Server(s):**
    *   A Linux VM (e.g., AWS EC2, Azure VM, DigitalOcean Droplet) with Docker Engine and Docker Compose installed.
    *   Alternatively, a Kubernetes cluster (e.g., AWS EKS, Azure AKS, Google GKE).
*   **PostgreSQL Database:**
    *   A managed database service (e.g., AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL) for high availability and easy management.
    *   Alternatively, a self-managed PostgreSQL instance running in Docker on your server or another server.
*   **DNS Configuration:** A domain name pointing to your server's IP address (if external access is required).
*   **SSL/TLS Certificate:** For HTTPS, preferably managed by a reverse proxy (Nginx, Caddy) or a cloud load balancer.
*   **Network Security:** Firewall rules (Security Groups, Network Security Groups) configured to allow necessary inbound/outbound traffic (e.g., 80/443 for HTTP/S, 8080 for app, 5432 for DB - internal only).
*   **Environment Variables/Secrets Management:** A secure way to manage sensitive data like database credentials, JWT secret, etc. (e.g., `docker-compose.yml` environment variables, Kubernetes Secrets, cloud-specific secret managers).

## 3. Manual Deployment (Example to a Single Linux VM with Docker Compose)

This section details manual steps for deploying the application and its ecosystem to a single server using Docker Compose. This is a good way to understand the underlying process.

1.  **Provision a Linux VM:**
    *   Choose a cloud provider (AWS, Azure, GCP, DigitalOcean, etc.).
    *   Create a VM (e.g., Ubuntu 22.04 LTS).
    *   Ensure it has sufficient CPU, RAM, and disk space (e.g., 2vCPU, 4GB RAM, 50GB SSD).

2.  **Install Docker and Docker Compose on the VM:**
    ```bash
    # Update package index
    sudo apt update

    # Install Docker
    sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io

    # Add current user to the docker group (log out and back in for changes to take effect)
    sudo usermod -aG docker $USER

    # Install Docker Compose
    sudo apt install -y docker-compose
    ```
    *   Log out and log back in (or restart SSH session) to apply docker group changes.

3.  **Configure Environment Variables (Important for Security):**
    Instead of hardcoding sensitive values in `docker-compose.yml`, use a `.env` file or environment variables directly.
    Create a `.env` file in the deployment directory on your server:
    ```bash
    # .env
    DB_NAME=product_db_prod
    DB_USER=produser
    DB_PASSWORD=YOUR_STRONG_DB_PASSWORD
    JWT_SECRET=YOUR_VERY_LONG_AND_SECURE_JWT_SECRET
    GRAFANA_USER=admin
    GRAFANA_PASSWORD=YOUR_GRAFANA_PASSWORD
    ```
    *Replace placeholders with strong, unique passwords.*

4.  **Clone the Repository (or copy deployment files):**
    ```bash
    git clone https://github.com/your-username/product-management-system.git
    cd product-management-system
    ```
    *   Alternatively, you can just copy the `docker-compose.yml`, `Dockerfile`, `monitoring/` directory, and the `.env` file to your server.

5.  **Build and Push Docker Image (if not using CI/CD):**
    If you're deploying manually and haven't used the CI/CD pipeline, you'll need to build the image and push it to Docker Hub first.
    *   On your local machine:
        ```bash
        ./mvnw clean package -DskipTests
        docker build -t your-dockerhub-username/product-management-system:latest .
        docker login # Enter your Docker Hub credentials
        docker push your-dockerhub-username/product-management-system:latest
        ```

6.  **Deploy using Docker Compose:**
    *   On your server, in the `product-management-system` directory:
        ```bash
        # Pull the latest images (including your application image from Docker Hub)
        docker-compose pull

        # Start all services
        docker-compose up -d --build
        ```
        *   `--build` ensures that any changes to your local Dockerfile are rebuilt. If you're pulling a pre-built image from Docker Hub, you can omit `--build`.
        *   `-d` runs services in detached mode.

7.  **Verify Deployment:**
    *   Check container status: `docker-compose ps`
    *   View application logs: `docker-compose logs app`
    *   Access endpoints:
        *   **Application:** `http://YOUR_SERVER_IP:8080`
        *   **Swagger UI:** `http://YOUR_SERVER_IP:8080/swagger-ui.html`
        *   **Prometheus:** `http://YOUR_SERVER_IP:9090`
        *   **Grafana:** `http://YOUR_SERVER_IP:3000` (Login with `GRAFANA_USER`/`GRAFANA_PASSWORD` from `.env`)
        *   **Adminer:** `http://YOUR_SERVER_IP:8081`

8.  **Configure Reverse Proxy (Recommended for Production):**
    For proper production setup, use Nginx or Caddy as a reverse proxy to handle HTTPS, domain routing, and potentially load balancing.

    *   Example Nginx configuration (`/etc/nginx/sites-available/product-management.conf`):
        ```nginx
        server {
            listen 80;
            server_name your-domain.com www.your-domain.com;
            return 301 https://$host$request_uri;
        }

        server {
            listen 443 ssl;
            server_name your-domain.com www.your-domain.com;

            ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
            ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

            location / {
                proxy_pass http://localhost:8080; # Or http://app:8080 if Nginx is also in Docker Compose network
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
            }

            location /swagger-ui.html {
                proxy_pass http://localhost:8080;
            }
            location /v3/api-docs {
                proxy_pass http://localhost:8080;
            }
            location /actuator {
                proxy_pass http://localhost:8080;
            }
        }
        ```
    *   Enable the config: `sudo ln -s /etc/nginx/sites-available/product-management.conf /etc/nginx/sites-enabled/`
    *   Test Nginx config: `sudo nginx -t`
    *   Reload Nginx: `sudo systemctl reload nginx`
    *   Obtain SSL certificate (e.g., using Certbot with Let's Encrypt).

## 4. Automated Deployment with CI/CD (GitHub Actions)

The `deploy` job in `.github/workflows/ci-cd.yml` demonstrates a conceptual automated deployment.

In a real CI/CD setup, the `deploy` job would typically perform the following steps:

1.  **SSH to Target Server:** Use an SSH action (e.g., `appleboy/ssh-action@master`) to connect to your production server.
2.  **Pull Latest Image:** Execute `docker pull your-dockerhub-username/product-management-system:latest` on the server.
3.  **Update/Restart Service:**
    *   **Docker Compose:** Navigate to the deployment directory on the server and run `docker-compose up -d --force-recreate app` to pull the new image and restart only the application container.
    *   **Kubernetes:** If deploying to Kubernetes, the step would involve applying updated Kubernetes manifests (e.g., `kubectl apply -f deployment.yaml`) which reference the new Docker image, triggering a rolling update.
4.  **Health Checks:** After deployment, perform automated health checks (e.g., cURL the `/actuator/health` endpoint, or a dedicated API endpoint).
5.  **Rollback Strategy:** Implement a rollback mechanism (e.g., `docker-compose down` and `up` with a previous image tag, or Kubernetes rolling back to a previous revision) in case of deployment failures.

**Example `deploy` step in `ci-cd.yml` (conceptual for a VM deployment):**

```yaml
  deploy:
    needs: docker-build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://your-domain.com
    steps:
      - name: Deploy to Production Server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USERNAME }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /path/to/product-management-system-on-server
            # Ensure .env variables are loaded or passed
            echo "Pulling latest Docker image..."
            docker pull ${{ secrets.DOCKER_USERNAME }}/product-management-system:latest
            echo "Restarting application service..."
            docker-compose -f docker-compose.yml up -d --no-deps --force-recreate app # Restart only the app service
            echo "Running database migrations (if any new ones are detected by Flyway)..."
            # Flyway will run on app startup
            echo "Deployment complete."
```
*   **SSH Secrets:** You would need to add `SSH_HOST`, `SSH_USERNAME`, and `SSH_PRIVATE_KEY` to your GitHub repository secrets for this to work.

## 5. Post-Deployment Checks

After any deployment, always perform these checks:

*   **Application Logs:** Monitor `docker-compose logs app` (or equivalent in Kubernetes) for any errors or unexpected behavior.
*   **Health Endpoints:** Check `http://YOUR_SERVER_IP:8080/actuator/health`.
*   **Functionality Tests:** Perform smoke tests on key API endpoints to ensure core functionalities are working.
*   **Monitoring Dashboards:** Verify that Prometheus and Grafana are collecting metrics and displaying a healthy status.

This guide provides a robust framework for deploying the Product Management System. Adapt the steps and tools based on your specific infrastructure and organizational requirements.
```