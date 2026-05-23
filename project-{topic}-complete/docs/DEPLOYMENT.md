```markdown
# CMS Drogon Project - Deployment Guide

This guide outlines how to deploy the Comprehensive Enterprise-Grade C++ CMS to various environments. The primary focus is on Docker-based deployments.

## 1. Local Development (Docker Compose)

The easiest way to run the CMS for local development is using `docker-compose`.

1.  **Prerequisites**:
    *   Docker and Docker Compose installed.
    *   Git installed.

2.  **Steps**:
    *   Clone the repository:
        ```bash
        git clone https://github.com/yourusername/cms-cpp-drogon.git
        cd cms-cpp-drogon
        ```
    *   Copy the example environment file:
        ```bash
        cp .env.example .env
        # Edit .env if you need to customize DB credentials or ports
        ```
    *   Run the setup script:
        ```bash
        chmod +x scripts/setup.sh
        ./scripts/setup.sh
        ```
        This command will:
        *   Build the `cms-app` Docker image.
        *   Start `db` (PostgreSQL) and `cms-app` containers.
        *   Initialize the database schema and seed data.
        *   Wait for the database to be healthy.

3.  **Access**:
    *   **CMS App**: `http://localhost:8080` (or the port specified in `.env` for `APP_PORT`).
    *   **Admin Login**: `http://localhost:8080/admin/login`
    *   **Default Admin**: `admin@example.com` / `password123`

4.  **Stopping**:
    ```bash
    docker-compose down
    ```
    To also remove volumes (losing database data):
    ```bash
    docker-compose down -v
    ```

## 2. Staging / Production Deployment (Docker Compose on a Single Server)

For small-to-medium scale deployments on a single server, Docker Compose can be used with some enhancements.

1.  **Prerequisites**:
    *   A Linux server (e.g., Ubuntu, CentOS) with Docker and Docker Compose installed.
    *   SSH access to the server.
    *   (Optional but highly recommended) A domain name pointing to your server's IP.
    *   (Highly recommended) Nginx or Caddy as a reverse proxy for SSL termination and static file serving.

2.  **Steps on Server**:

    *   **Install Docker & Docker Compose**: Follow official Docker documentation.
    *   **Clone Repository**:
        ```bash
        git clone https://github.com/yourusername/cms-cpp-drogon.git
        cd cms-cpp-drogon
        ```
    *   **Configure `.env`**: Create and configure the `.env` file with strong, production-ready passwords for `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
        ```bash
        cp .env.example .env
        # IMPORTANT: Change DB_PASSWORD to a strong password!
        # Set DB_HOST to 'db' (the service name in docker-compose)
        # Set APP_PORT to your desired host port, e.g., 80
        ```
    *   **Build & Run**:
        ```bash
        docker-compose pull # Pull latest postgres image
        docker-compose up --build -d
        ```
        The `--build` ensures the latest application image is built from the `Dockerfile`.

    *   **Set up Reverse Proxy (Nginx Example)**:
        *   Install Nginx: `sudo apt update && sudo apt install nginx`
        *   Create an Nginx configuration file for your domain (`/etc/nginx/sites-available/yourdomain.com`):
            ```nginx
            server {
                listen 80;
                server_name yourdomain.com www.yourdomain.com;

                location / {
                    proxy_pass http://localhost:8080; # Or whatever APP_PORT is set to
                    proxy_set_header Host $host;
                    proxy_set_header X-Real-IP $remote_addr;
                    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                    proxy_set_header X-Forwarded-Proto $scheme;
                }
            }
            ```
        *   Enable the site and restart Nginx:
            ```bash
            sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
            sudo systemctl restart nginx
            ```
        *   **Secure with SSL (Certbot)**:
            ```bash
            sudo snap install core; sudo snap refresh core
            sudo snap install --classic certbot
            sudo ln -s /snap/bin/certbot /usr/bin/certbot
            sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
            ```
            Follow the prompts. Certbot will automatically configure Nginx for HTTPS.

    *   **Health Checks and Monitoring**:
        *   Use `docker-compose ps` and `docker-compose logs -f` to monitor your containers.
        *   For more advanced monitoring, integrate with tools like Prometheus/Grafana.

3.  **Updating the Application**:
    *   Pull the latest code: `git pull origin main`
    *   Rebuild and restart: `docker-compose up --build -d`
    *   For zero-downtime updates, consider using more advanced deployment strategies or a blue/green deployment with Nginx.

## 3. Production Deployment (Kubernetes)

For large-scale, highly available, and resilient production deployments, Kubernetes is the recommended orchestration platform. This guide provides a conceptual overview, as a full K8s YAML setup is extensive.

1.  **Prerequisites**:
    *   A Kubernetes cluster (e.g., EKS, GKE, AKS, or self-managed Kubeadm cluster).
    *   `kubectl` configured to connect to your cluster.
    *   A Docker Registry (e.g., Docker Hub, AWS ECR, GCR) where your application's Docker image is pushed.
    *   A managed PostgreSQL service (e.g., AWS RDS, Google Cloud SQL) or a highly available PostgreSQL setup within Kubernetes.

2.  **Key Kubernetes Resources**:

    *   **`Deployment`**: Manages stateless instances of your `cms-app`.
        *   Specifies the Docker image (`your_docker_registry/cms-cpp-drogon:latest`).
        *   Defines replica count (e.g., 3-5 instances).
        *   Configures resource requests/limits (CPU, Memory).
        *   Configures probes (liveness, readiness) for health checks.
    *   **`Service`**: Exposes your `cms-app` deployment to the cluster and externally.
        *   A `ClusterIP` service for internal communication between pods.
        *   A `LoadBalancer` or `NodePort` service to expose the app externally, often fronted by an `Ingress`.
    *   **`ConfigMap`**: Stores non-sensitive configuration data (e.g., `config.json` contents, `APP_PORT`).
    *   **`Secret`**: Stores sensitive data (e.g., `DB_PASSWORD`, `JWT_SECRET`). Inject as environment variables into pods.
    *   **`Ingress`**: Manages external access to services in the cluster, providing HTTP/HTTPS routing, SSL termination, and possibly load balancing. Requires an Ingress Controller (e.g., Nginx Ingress, Traefik).
    *   **`PersistentVolume` / `PersistentVolumeClaim`**: For database data (if running PostgreSQL in K8s) and potentially application logs. However, for logs, it's often better to send them to a centralized logging system.

3.  **Deployment Workflow (Conceptual)**:

    *   **Build & Push Image**: Your CI/CD pipeline (Jenkins, GitLab CI, GitHub Actions) builds the `cms-app` Docker image and pushes it to your container registry.
    *   **Database**: Ensure your PostgreSQL database is provisioned and accessible from the Kubernetes cluster. Store its connection details in a Kubernetes `Secret`.
    *   **Apply Kubernetes Manifests**: Apply your YAML definitions to the cluster using `kubectl apply -f your-k8s-manifests/`.
        *   `kubectl apply -f configmap.yaml`
        *   `kubectl apply -f secret.yaml`
        *   `kubectl apply -f deployment.yaml`
        *   `kubectl apply -f service.yaml`
        *   `kubectl apply -f ingress.yaml`
    *   **Monitor**: Use `kubectl get pods`, `kubectl logs`, and K8s dashboard/monitoring tools to observe your deployment.

## 4. Database Migrations in Production

For production environments, direct manual execution of `schema.sql` and `seed.sql` on `docker-compose up` is generally suitable for initial setup. However, for subsequent schema changes, a more controlled migration strategy is needed.

*   **Flyway / Alembic (or custom C++ tool)**: For C++ projects, you could create a small standalone C++ migration tool that connects to the database and applies `db/migrations/*.sql` files in order.
*   **Manual Application**: For simpler projects, apply migration SQL files manually (or via script) during deployment windows.
    *   Ensure database backups are taken before applying migrations.
    *   Run migrations *before* deploying the new application version that expects the updated schema.

## 5. Security Best Practices

*   **HTTPS Everywhere**: Use a reverse proxy (Nginx, Caddy) or Ingress Controller for SSL termination.
*   **Strong Passwords**: For all database users, admin accounts, and system credentials.
*   **Principle of Least Privilege**: Database users should only have necessary permissions. Application container should not run as root.
*   **Regular Updates**: Keep OS, Docker, Drogon, and other dependencies updated.
*   **Network Segmentation**: Isolate database and application networks.
*   **Firewall Rules**: Restrict access to only necessary ports.

This guide provides a foundation for deploying the CMS. Adapt it to your specific cloud provider, tools, and security requirements.
```