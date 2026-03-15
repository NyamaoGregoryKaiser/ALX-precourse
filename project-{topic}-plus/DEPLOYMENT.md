# Deployment Guide

This document outlines the steps and considerations for deploying the Enterprise-Grade C++ DevOps Automation System to various environments. The primary deployment strategy leverages Docker containers.

## 1. Deployment Strategy Overview

The recommended deployment strategy involves:

1.  **Containerization:** The C++ application is containerized using Docker.
2.  **Container Registry:** The built Docker image is pushed to a container registry (e.g., Docker Hub, GitHub Container Registry, AWS ECR, GCP GCR).
3.  **Orchestration:** For production, a container orchestration platform like Kubernetes is recommended. For simpler deployments, Docker Compose on a single VM can suffice.
4.  **Database:** While SQLite is used for local development, a more robust relational database (e.g., PostgreSQL, MySQL) managed as a separate service or a managed database service (RDS, Cloud SQL) is recommended for production.

## 2. Prerequisites for Production Deployment

*   **Cloud Provider Account:** AWS, GCP, Azure, etc. (or a dedicated server/VM).
*   **Docker & Docker Compose:** Installed on target machines (if not using Kubernetes).
*   **Kubernetes Cluster:** Configured and running (if using Kubernetes).
*   **Container Registry Credentials:** For pushing/pulling images.
*   **Managed Database Service:** (Highly recommended) e.g., AWS RDS PostgreSQL, GCP Cloud SQL.
*   **DNS Management:** For mapping domain names to your service.
*   **SSL/TLS Certificates:** For HTTPS (handled by Load Balancer/Reverse Proxy).

## 3. Environment Variables & Secrets Management

Never hardcode sensitive information. Use environment variables.

*   **Local Development:** Use the `.env` file (copied from `.env.example`).
*   **Production:**
    *   **Docker:** Pass environment variables via `-e` flags or `--env-file`.
    *   **Docker Compose:** Reference `.env` file or define directly in `docker-compose.prod.yml`.
    *   **Kubernetes:** Use `Secret` objects for sensitive data and `ConfigMap` for non-sensitive configurations.
    *   **Cloud Services:** Use cloud-specific secrets managers (e.g., AWS Secrets Manager, Azure Key Vault, GCP Secret Manager).

**Critical environment variables include:**
*   `APP_PORT`: Port the application listens on.
*   `JWT_SECRET_KEY`: Secret key for signing/verifying JWT tokens.
*   `DATABASE_PATH`: Path to the SQLite database file (for local) or connection string for external DB.
*   `LOG_LEVEL`: Application logging level.
*   `CACHE_TTL_SECONDS`: Caching time-to-live.
*   `RATE_LIMIT_ENABLED`: Enable/disable rate limiting.
*   `RATE_LIMIT_MAX_REQUESTS`: Max requests per window.
*   `RATE_LIMIT_WINDOW_SECONDS`: Rate limit window.

## 4. Docker-Based Deployment (Single VM/Server)

This is suitable for smaller-scale deployments or as a stepping stone to orchestration.

### 4.1. Build and Push Docker Image

The CI/CD pipeline (`.github/workflows/ci-cd.yml`) automates this. Manually:

1.  **Ensure you are in the project root directory.**
2.  **Build the Docker image:**
    ```bash
    docker build -t your-registry/cpp-devops-system:latest .
    ```
    *Replace `your-registry` with your Docker Hub username or other registry prefix.*
3.  **Log in to your Docker registry:**
    ```bash
    docker login your-registry # e.g., docker login docker.io
    ```
4.  **Push the image:**
    ```bash
    docker push your-registry/cpp-devops-system:latest
    ```

### 4.2. Prepare Production Database

*   **Recommendation:** Use a managed database service (AWS RDS, GCP Cloud SQL, Azure Database for PostgreSQL/MySQL).
*   **Local SQLite (Discouraged for Prod):** If you must use SQLite, ensure the `db/app.db` file is persistent (e.g., mounted to a host volume outside the container). This is *not* production-grade for scalability or resilience.
*   **Schema and Seed:** Connect to your production database and apply `db/schema.sql` and `db/seed.sql` using your database client.

### 4.3. Run with Docker Compose on a VM

Create a `docker-compose.prod.yml` file:

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    image: your-registry/cpp-devops-system:latest
    container_name: cpp-devops-app-prod
    restart: always
    ports:
      - "80:8080" # Map host port 80 to container port 8080
    env_file:
      - .env.prod # Your production environment variables
    environment:
      # Override DATABASE_PATH for external DB
      # Example for PostgreSQL:
      # - DATABASE_URL=postgresql://user:password@db-host:5432/dbname
      - DATABASE_PATH=/app/data/app.db # If still using SQLite with persistent volume
    volumes:
      # If using SQLite, persist the database file
      # - app_data:/app/data
      # Mount log directory
      - app_logs:/app/logs
    depends_on:
      # If you have a separate DB container for prod, list it here
      # - postgres-db 
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"] # Add a health endpoint
      interval: 30s
      timeout: 10s
      retries: 3

  # Example for a separate PostgreSQL container (NOT recommended for production, use managed service)
  # postgres-db:
  #   image: postgres:13
  #   container_name: cpp-devops-postgres-prod
  #   restart: always
  #   environment:
  #     POSTGRES_DB: your_db_name
  #     POSTGRES_USER: your_db_user
  #     POSTGRES_PASSWORD: your_db_password
  #   volumes:
  #     - postgres_data:/var/lib/postgresql/data
  #   ports:
  #     - "5432:5432"

volumes:
  app_data: # For persistent SQLite data
  app_logs: # For persistent logs
  postgres_data: # For persistent PostgreSQL data
```

1.  **Create `.env.prod`:**
    ```bash
    cp .env.example .env.prod
    # Edit .env.prod with production-specific values, especially JWT_SECRET_KEY, DB connection, etc.
    ```
2.  **Deploy:**
    ```bash
    docker-compose -f docker-compose.prod.yml up --build -d
    ```
3.  **Monitoring:** Monitor logs using `docker-compose logs -f app` and ensure health checks pass.

### 4.4. Reverse Proxy and SSL

For production, put a reverse proxy (Nginx, Caddy) in front of your Docker container to handle SSL/TLS termination, load balancing (if multiple app containers), and domain routing.

```nginx
# Example Nginx configuration
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri; # Redirect HTTP to HTTPS
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/yourdomain.com.crt;
    ssl_certificate_key /etc/nginx/ssl/yourdomain.com.key;

    location / {
        proxy_pass http://localhost:8080; # Or the Docker container's IP/port
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 5. Kubernetes Deployment (Recommended for Production)

For high availability, scalability, and robust management, Kubernetes is the preferred choice.

### 5.1. Docker Image in Registry

Ensure your Docker image is pushed to a registry accessible by your Kubernetes cluster.

### 5.2. Kubernetes Manifests

You would create Kubernetes YAML files for:

*   **Deployment:** Defines how to run your application containers (number of replicas, image, resources).
*   **Service:** Exposes your application to the network internally within the cluster.
*   **Ingress:** Exposes your application externally via an Ingress controller, handling routing, SSL termination.
*   **Secret:** Stores sensitive environment variables like `JWT_SECRET_KEY` and database credentials.
*   **ConfigMap:** Stores non-sensitive configuration.
*   **PersistentVolumeClaim (PVC):** If you need persistent storage for logs or (not recommended) SQLite data.

**Example `k8s-deployment.yaml` (simplified):**

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cpp-devops-app
  labels:
    app: cpp-devops-app
spec:
  replicas: 3 # Run 3 instances of your app
  selector:
    matchLabels:
      app: cpp-devops-app
  template:
    metadata:
      labels:
        app: cpp-devops-app
    spec:
      containers:
      - name: cpp-devops-app
        image: your-registry/cpp-devops-system:latest # Your Docker image
        ports:
        - containerPort: 8080
        env:
        - name: APP_PORT
          value: "8080"
        - name: JWT_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets # Kubernetes Secret
              key: jwt_secret_key
        - name: DATABASE_URL # For external DB like PostgreSQL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database_url
        resources:
          limits:
            memory: "256Mi"
            cpu: "200m"
          requests:
            memory: "128Mi"
            cpu: "100m"
        livenessProbe: # Check if the application is still running
          httpGet:
            path: /health # A /health endpoint in your app
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 20
        readinessProbe: # Check if the application is ready to serve traffic
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
        volumeMounts:
        - name: app-logs
          mountPath: /app/logs
      volumes:
      - name: app-logs
        emptyDir: {} # For temporary logs within the pod, consider a sidecar for persistent logging
---
apiVersion: v1
kind: Service
metadata:
  name: cpp-devops-service
spec:
  selector:
    app: cpp-devops-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: ClusterIP # Or LoadBalancer for external access directly
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cpp-devops-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    # Add cert-manager annotations for automatic SSL
    # cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx # Use your ingress controller class
  rules:
  - host: yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: cpp-devops-service
            port:
              number: 80
  # tls: # Enable TLS
  # - hosts:
  #   - yourdomain.com
  #   secretName: yourdomain-com-tls # K8s secret for TLS cert
```

### 5.3. Apply Kubernetes Manifests

```bash
# Create secrets first
kubectl create secret generic app-secrets \
  --from-literal=jwt_secret_key='YOUR_VERY_STRONG_JWT_SECRET' \
  --from-literal=database_url='postgresql://user:password@managed-db-host:5432/dbname'

# Apply all manifests
kubectl apply -f k8s-deployment.yaml
# ... and other manifest files
```

### 5.4. Monitoring and Logging in Kubernetes

*   **Logging:** Use a centralized logging solution like ELK Stack (Elasticsearch, Logstash, Kibana) or Loki + Grafana. Kubernetes automatically collects container logs (stdout/stderr).
*   **Monitoring:** Integrate with Prometheus and Grafana for metrics collection from your Kubernetes cluster and applications. The C++ application would expose a `/metrics` endpoint in Prometheus format.

## 6. Post-Deployment Checks

*   **Health Checks:** Verify `GET /health` endpoint or Kubernetes probes are healthy.
*   **API Functionality:** Perform basic CRUD operations to ensure all endpoints work as expected.
*   **Logging:** Check application logs for errors or warnings.
*   **Performance:** Run performance tests against the deployed environment.
*   **Security Scans:** Conduct vulnerability scans.

This guide provides a foundational understanding. Real-world production deployments will involve more advanced configurations, networking, security groups, and cloud-specific optimizations.