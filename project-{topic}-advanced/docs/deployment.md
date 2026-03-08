# Deployment Guide: Payment Processing System

This guide provides instructions for deploying the Payment Processing System to a production environment. The system is designed for containerized deployment, primarily using Docker and Docker Compose, which can be adapted for various cloud platforms.

## 1. Prerequisites

Before you begin, ensure you have:

*   **A Container Registry**: Such as Docker Hub, Amazon ECR, Google Container Registry, or Azure Container Registry. This is where your Docker images will be stored.
*   **Cloud Provider Account**: (e.g., AWS, GCP, Azure, DigitalOcean) where you will deploy your services.
*   **`docker` and `docker-compose`**: Installed locally for building and testing images.
*   **`git`**: For cloning the repository.
*   **CI/CD Configuration**: Ensure your `.github/workflows/main.yml` (or equivalent for other CI systems) is correctly configured for your environment.

## 2. Environment Configuration

### 2.1. Environment Variables (`.env`)

In a production environment, you **must** manage your environment variables securely. Do **NOT** commit your production `.env` file to version control. Use your cloud provider's secrets management service:

*   **AWS**: Secrets Manager, Parameter Store
*   **GCP**: Secret Manager
*   **Azure**: Key Vault
*   **Kubernetes**: Secrets

The following variables are critical:

```
NODE_ENV=production
PORT=3000

# PostgreSQL Database Credentials
DB_HOST=<your_db_host_ip_or_hostname>
DB_PORT=5432
DB_USER=<your_db_user>
DB_PASSWORD=<your_db_password>
DB_NAME=<your_db_name>

# JWT Secret
JWT_SECRET=<a_very_long_and_random_secret_string>
JWT_ACCESS_EXPIRATION_MINUTES=30
JWT_REFRESH_EXPIRATION_DAYS=7

# Redis Cache Credentials
REDIS_HOST=<your_redis_host_ip_or_hostname>
REDIS_PORT=6379

# Admin Seed Credentials (only used for initial setup, should be removed or changed afterwards)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=strong_admin_password
```

**Key Notes:**
*   `DB_HOST` and `REDIS_HOST` will be the internal network addresses if running containers on the same network (e.g., within Docker Compose, Kubernetes, ECS), or external IPs/hostnames if services are separate.
*   `JWT_SECRET` must be truly random and kept highly confidential.
*   `ADMIN_EMAIL` and `ADMIN_PASSWORD` are for seeding an initial admin user. In production, consider creating these manually or through a secure provisioning process.

## 3. Database Setup

Before deploying the application, your PostgreSQL database needs to be set up.

1.  **Provision a PostgreSQL Database Instance**: Use your cloud provider's managed database service (e.g., AWS RDS, GCP Cloud SQL, Azure Database for PostgreSQL). This handles backups, scaling, and high availability.
2.  **Configure Database Security**: Set up appropriate network access (security groups, firewall rules) to allow your application servers to connect to the database.
3.  **Run Migrations**: It's crucial to run database migrations *before* your new application version starts.
    *   **Option A (CI/CD)**: Integrate `npm run migrate` into your CI/CD pipeline as a pre-deployment step.
    *   **Option B (Manual/Ephemeral Container)**: Run migrations from a temporary container or an admin machine:
        ```bash
        # Example using Docker to run migrations
        docker run --rm \
          -e DB_HOST=<your_db_host> \
          -e DB_USER=<your_db_user> \
          -e DB_PASSWORD=<your_db_password> \
          -e DB_NAME=<your_db_name> \
          your-registry/payment-processor:latest npm run migrate
        ```
4.  **Seed Data (Optional but Recommended for Initial Setup)**: If you need initial data (e.g., the first admin user), run seeders:
    ```bash
    docker run --rm ... your-registry/payment-processor:latest npm run seed
    ```
    Ensure this is done only once or with idempotent seeders.

## 4. Redis Cache Setup

1.  **Provision a Redis Instance**: Use your cloud provider's managed Redis service (e.g., AWS ElastiCache, GCP Memorystore for Redis, Azure Cache for Redis).
2.  **Configure Redis Security**: Set up network access to allow your application servers to connect.

## 5. Building and Pushing Docker Image

Your CI/CD pipeline (e.g., GitHub Actions as configured in `.github/workflows/main.yml`) should automate this process.

1.  **Build the Docker Image**:
    ```bash
    docker build -t payment-processor:latest .
    ```
    Replace `payment-processor` with your desired image name. Use a version tag instead of `latest` for better version control (e.g., `payment-processor:v1.0.0` or `payment-processor:commit-sha`).

2.  **Tag the Image for Your Registry**:
    ```bash
    docker tag payment-processor:latest <your-registry-url>/payment-processor:latest
    ```
    Example: `docker tag payment-processor:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/payment-processor:latest`

3.  **Log in to Your Container Registry**:
    ```bash
    docker login <your-registry-url>
    ```
    You might need specific credentials or AWS CLI commands for ECR.

4.  **Push the Image**:
    ```bash
    docker push <your-registry-url>/payment-processor:latest
    ```

## 6. Deployment to Cloud Platforms (Examples)

### 6.1. AWS ECS / Fargate

1.  **Create an ECS Cluster**: If you don't have one, set up an ECS Cluster (Fargate is recommended for serverless containers).
2.  **Create a Task Definition**:
    *   Define a new Task Definition referencing your pushed Docker image (`<your-registry-url>/payment-processor:latest`).
    *   Map port `3000` (or your `PORT` env var) from the container to the host.
    *   Configure CPU and memory resources.
    *   Pass your environment variables (from Section 2.1) securely using AWS Secrets Manager or Parameter Store integration.
    *   Define health checks for the container.
3.  **Create an ECS Service**:
    *   Create a new service within your cluster using the Task Definition.
    *   Configure desired count (number of running instances).
    *   Set up a Load Balancer (e.g., Application Load Balancer) to distribute traffic.
    *   Configure Auto Scaling policies.
    *   Ensure networking settings (VPC, subnets, security groups) allow communication between your application, database, and Redis.

### 6.2. Google Cloud Run

Cloud Run is excellent for serverless container deployment.

1.  **Deploy your service**:
    ```bash
    gcloud run deploy payment-processor \
      --image <your-registry-url>/payment-processor:latest \
      --platform managed \
      --region <your-region> \
      --port 3000 \
      --set-env-vars=NODE_ENV=production,DB_HOST=...,DB_USER=... \
      # ... pass all production env vars securely ...
      --allow-unauthenticated # or use IAM for restricted access
    ```
    *   For sensitive environment variables, use `--set-secrets` with Google Secret Manager.
    *   Configure CPU, memory, and concurrency settings as needed.

### 6.3. Kubernetes (EKS, GKE, AKS)

1.  **Create `Deployment` and `Service` Manifests**:
    *   **Deployment**: Defines how to run your application containers (e.g., image, replica count, resource limits, health checks).
        ```yaml
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: payment-processor
        spec:
          replicas: 3
          selector:
            matchLabels:
              app: payment-processor
          template:
            metadata:
              labels:
                app: payment-processor
            spec:
              containers:
              - name: payment-processor
                image: <your-registry-url>/payment-processor:latest
                ports:
                - containerPort: 3000
                envFrom:
                - secretRef:
                    name: payment-processor-secrets # Reference Kubernetes Secret
                livenessProbe:
                  httpGet:
                    path: /v1/health
                    port: 3000
                  initialDelaySeconds: 15
                  periodSeconds: 20
                readinessProbe:
                  httpGet:
                    path: /v1/health
                    port: 3000
                  initialDelaySeconds: 5
                  periodSeconds: 10
        ```
    *   **Service**: Exposes your deployment within the cluster.
        ```yaml
        apiVersion: v1
        kind: Service
        metadata:
          name: payment-processor-service
        spec:
          selector:
            app: payment-processor
          ports:
          - protocol: TCP
            port: 80
            targetPort: 3000
          type: LoadBalancer # Exposes service externally
        ```
2.  **Create Kubernetes Secrets**: Store your environment variables securely in Kubernetes Secrets.
3.  **Apply Manifests**:
    ```bash
    kubectl apply -f your-deployment.yaml
    kubectl apply -f your-service.yaml
    kubectl apply -f your-secrets.yaml
    ```
4.  **Ingress Controller**: For more advanced routing, SSL termination, and host-based routing, configure an Ingress controller (e.g., Nginx Ingress, Traefik).

## 7. Post-Deployment Steps

*   **Monitoring and Alerting**: Set up tools like Prometheus, Grafana, CloudWatch, or Stackdriver to monitor:
    *   Application metrics (CPU, Memory, Request Latency, Error Rates)
    *   Database performance
    *   Redis performance
    *   System logs (centralized logging with ELK stack, Datadog, Splunk, etc.)
*   **Health Checks**: Ensure your `/v1/health` (or similar) endpoint is functional and integrated with your load balancer/orchestrator.
*   **Backups**: Configure automated backups for your PostgreSQL and Redis databases.
*   **Security Audits**: Regularly perform security audits and vulnerability scans.
*   **Disaster Recovery**: Plan and test disaster recovery procedures.

By following these steps, you can confidently deploy your Payment Processing System to a production environment.
```