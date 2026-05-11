# Database Optimization System (DBO) - Deployment Guide

This document outlines the steps to deploy the Database Optimization System (DBO) to a production environment. The primary deployment method recommended is using Docker and Docker Compose for smaller deployments, or Kubernetes for larger, more scalable setups.

## 1. Prerequisites

*   **Server Environment**: A Linux-based server (e.g., Ubuntu, Debian, CentOS) or a Kubernetes cluster.
*   **Docker and Docker Compose**: Must be installed on the target server for Docker Compose deployments.
*   **Kubectl (if using Kubernetes)**: Configured to connect to your Kubernetes cluster.
*   **Git**: To clone the repository.
*   **SSH Access**: To connect to your deployment server.
*   **Production Database**: A PostgreSQL database instance (can be deployed via Docker Compose, or an external managed service like AWS RDS, Azure Database for PostgreSQL, etc.).

## 2. Production Configuration

Before deployment, ensure your `.env` file contains production-ready values.

1.  **Generate a Strong JWT Secret**:
    `JWT_SECRET` must be a long, random, and cryptographically secure string (e.g., 64 characters or more). Never expose this.
    ```bash
    openssl rand -base64 64 # Generate a strong secret
    ```

2.  **Database Credentials**:
    Use strong, unique passwords for `DB_USER` and `DB_PASSWORD`. Ensure these users have minimal necessary permissions (e.g., not `postgres` superuser).
    `DB_HOST` should point to your production PostgreSQL instance (e.g., an internal IP, hostname, or managed service endpoint).

3.  **Logging**:
    Set `LOG_LEVEL` to `info` or `warn` for production to avoid excessive logging. Configure `LOG_FILE` to an appropriate path for persistence.

4.  **Security**:
    Ensure your server's firewall (e.g., `ufw`, security groups) only allows incoming traffic on port `8080` (or your chosen server port) from trusted sources, or through a reverse proxy/load balancer.

## 3. Deployment Methods

### 3.1. Docker Compose (Single Server Deployment)

This method is suitable for small to medium-sized deployments on a single virtual machine or dedicated server.

1.  **SSH into your server:**
    ```bash
    ssh user@your_server_ip
    ```

2.  **Install Docker and Docker Compose** (if not already installed).
    Refer to the official Docker documentation for installation instructions.

3.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/database-optimizer.git
    cd database-optimizer
    ```

4.  **Place `.env` file**:
    Create a production `.env` file in the root directory of the cloned repository with your production configurations. **Do not commit this file to your repository.**
    ```bash
    nano .env # Paste your production environment variables here
    ```

5.  **Build and Deploy:**
    ```bash
    docker-compose pull # Pull base images
    docker-compose up --build -d # Build the app image and start services in detached mode
    ```
    The `--build` flag ensures that the latest version of your application image is built. `-d` runs containers in the background.

6.  **Verify Deployment:**
    ```bash
    docker-compose ps
    docker-compose logs -f app # Check application logs for any errors
    ```
    Ensure both `db` and `app` services are `Up` and healthy.
    Access your application at `http://your_server_ip:8080`.

7.  **Updating the Application:**
    To deploy a new version:
    ```bash
    git pull origin main # Get latest code
    docker-compose stop app # Stop the running app container
    docker-compose rm -f app # Remove the old app container
    docker-compose build app # Build the new image
    docker-compose up -d app # Start the new app container
    # Or simply: docker-compose up --build -d app
    ```
    The database service `db` will typically not need to be rebuilt unless its Dockerfile or configuration changes.

### 3.2. Kubernetes (Container Orchestration)

For highly available, scalable, and complex deployments, Kubernetes is the recommended choice.

1.  **Container Registry**:
    First, ensure your Docker image is pushed to a public or private container registry (e.g., Docker Hub, Google Container Registry, AWS ECR, GitHub Container Registry).
    This is typically handled by your CI/CD pipeline (e.g., the `deploy` job in `ci-cd.yml`).
    Example: `yourusername/database-optimizer:latest`

2.  **Kubernetes Manifests**:
    You'll need Kubernetes YAML manifests for your deployment. These typically include:
    *   `Deployment` for the DBO application.
    *   `Service` for exposing the DBO application (e.g., `ClusterIP`, `NodePort`, or `LoadBalancer`).
    *   `PersistentVolumeClaim` and `PersistentVolume` (if needed for logs, though often logs go to stdout/stderr and are collected by K8s logging agents).
    *   `Secret` for database credentials and JWT secret (highly recommended to use Kubernetes Secrets).
    *   `ConfigMap` for non-sensitive configurations.
    *   `Deployment` for a PostgreSQL instance (if self-hosting within K8s), or connection details for an external managed PostgreSQL.

    **Example `k8s-deployment.yaml` (Conceptual):**
    ```yaml
    apiVersion: v1
    kind: Secret
    metadata:
      name: dbo-secrets
    type: Opaque
    stringData:
      DB_CONNECTION_STRING: "postgresql://dbo_user:dbo_password_secure@dbo-db:5432/database_optimizer_db"
      JWT_SECRET: "your_super_secret_jwt_key_for_production"
    ---
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: dbo-app-deployment
      labels:
        app: dbo-app
    spec:
      replicas: 3 # Example: 3 instances for high availability
      selector:
        matchLabels:
          app: dbo-app
      template:
        metadata:
          labels:
            app: dbo-app
        spec:
          containers:
          - name: database-optimizer
            image: yourusername/database-optimizer:latest # Your image from the registry
            ports:
            - containerPort: 8080
            env:
            - name: SERVER_PORT
              value: "8080"
            - name: DB_CONNECTION_STRING
              valueFrom:
                secretKeyRef:
                  name: dbo-secrets
                  key: DB_CONNECTION_STRING
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: dbo-secrets
                  key: JWT_SECRET
            # Other environment variables from .env can go here, or in a ConfigMap
            # Liveness and Readiness probes are crucial for K8s
            livenessProbe:
              httpGet:
                path: /
                port: 8080
              initialDelaySeconds: 30
              periodSeconds: 10
            readinessProbe:
              httpGet:
                path: /
                port: 8080
              initialDelaySeconds: 15
              periodSeconds: 5
            resources:
              requests:
                memory: "256Mi"
                cpu: "250m"
              limits:
                memory: "512Mi"
                cpu: "500m"
          # Optional: Init Container for migrations
          # This could be a separate container that runs migrations before the main app starts
          # initContainers:
          # - name: run-migrations
          #   image: yourusername/database-optimizer:latest
          #   command: ["/usr/local/bin/DatabaseOptimizer", "--run-migrations-only"] # A custom command to just run migrations
          #   envFrom:
          #     - secretRef:
          #         name: dbo-secrets
    ---
    apiVersion: v1
    kind: Service
    metadata:
      name: dbo-app-service
    spec:
      selector:
        app: dbo-app
      ports:
        - protocol: TCP
          port: 80
          targetPort: 8080
      type: LoadBalancer # Or ClusterIP if behind an Ingress
    ```

3.  **Apply Manifests**:
    ```bash
    kubectl apply -f k8s-deployment.yaml -n your-namespace
    ```

4.  **Database within Kubernetes**:
    For a production PostgreSQL instance, it's generally recommended to use a managed database service (e.g., AWS RDS, Azure PostgreSQL, GCP Cloud SQL) rather than deploying PostgreSQL directly within Kubernetes for stateful workloads, unless you have strong operational expertise in running statefulsets. If you do deploy within Kubernetes, use a `StatefulSet` with persistent volumes.

## 4. Post-Deployment Checks

*   **Access Logs**: Verify that application logs are being collected and are accessible (e.g., in `docker-compose logs` or your Kubernetes logging solution).
*   **Health Checks**: Monitor the `/health` endpoint (if implemented) or other internal metrics.
*   **Security Scans**: Regularly scan your deployed containers for vulnerabilities.
*   **Backup Strategy**: Ensure your PostgreSQL database has a robust backup and recovery strategy.

## 5. Rollback Strategy

In case of issues with a new deployment, you should be able to quickly revert to a previous stable version.

*   **Docker Compose**:
    Tag your Docker images with versions (e.g., `yourusername/database-optimizer:v1.0.0`). To rollback, simply update your `docker-compose.yml` to point to the previous image tag and run `docker-compose up -d`.
*   **Kubernetes**:
    Kubernetes deployments automatically manage revisions. You can rollback using:
    ```bash
    kubectl rollout undo deployment/dbo-app-deployment -n your-namespace
    ```

This guide provides a foundational approach to deploying the DBO system. Adapt it to your specific infrastructure requirements and security policies.
```