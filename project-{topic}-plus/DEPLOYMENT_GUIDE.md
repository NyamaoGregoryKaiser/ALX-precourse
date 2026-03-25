```markdown
# ALX Data Visualization Tool - Deployment Guide

This guide outlines the steps to deploy the ALX Data Visualization Tool to various environments. The primary method for deployment is using Docker containers, orchestrated locally with Docker Compose or on a cloud platform like Kubernetes.

---

## Table of Contents

1.  [Local Development Deployment](#1-local-development-deployment)
2.  [Production Deployment Strategy](#2-production-deployment-strategy)
    *   [Prerequisites](#prerequisites)
    *   [Building the Docker Image](#building-the-docker-image)
    *   [Pushing to a Docker Registry](#pushing-to-a-docker-registry)
    *   [Kubernetes Deployment (Conceptual)](#kubernetes-deployment-conceptual)
    *   [Environment Variables Management](#environment-variables-management)
3.  [Monitoring and Logging](#3-monitoring-and-logging)
4.  [Scaling Considerations](#4-scaling-considerations)
5.  [Rollback Strategy](#5-rollback-strategy)

---

## 1. Local Development Deployment

For quick local setup and development, Docker Compose is the recommended approach.

1.  **Prerequisites:**
    *   Docker and Docker Compose installed and running on your machine.
    *   Git installed.

2.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-repo/alx-dataviz-tool.git
    cd alx-dataviz-tool
    ```

3.  **Start the application and database:**
    The `docker-compose.yml` file defines two services: `db` (PostgreSQL) and `app` (Spring Boot backend).
    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: This will build the Docker image for the `app` service based on the `Dockerfile` in the root directory. If you've already built the image and made no code changes, you can omit this.
    *   `-d`: Runs the containers in detached mode (in the background).

4.  **Verify deployment:**
    Check the status of the containers:
    ```bash
    docker-compose ps
    ```
    You should see both `dataviz_db` and `dataviz_app` with `Up` status.

    Access the backend:
    *   Application API: `http://localhost:8080`
    *   Swagger UI: `http://localhost:8080/swagger-ui.html`

    View logs:
    ```bash
    docker-compose logs -f app
    ```

5.  **Stop and remove containers:**
    ```bash
    docker-compose down
    ```
    This will stop and remove the containers, networks, and volumes created by `docker-compose up`. To keep the database data, remove the `-v` flag when stopping, or specifically remove volumes.

---

## 2. Production Deployment Strategy

For a production environment, deploying to a robust container orchestration platform like Kubernetes is recommended.

### Prerequisites

*   **Kubernetes Cluster:** Access to a managed Kubernetes service (EKS, GKE, AKS) or a self-managed cluster.
*   **Docker Registry:** A private or public Docker registry (e.g., Docker Hub, AWS ECR, Google Container Registry) to store your application images.
*   **`kubectl`:** Configured to interact with your Kubernetes cluster.
*   **Helm (Optional):** For managing Kubernetes deployments with charts.
*   **Database:** A managed PostgreSQL service (e.g., AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL) for production database. **Do not use the `docker-compose.yml` database for production.**

### Building the Docker Image

Build the production-ready Docker image for the Spring Boot application.

```bash
docker build -t alx-dataviz-tool:latest .
# Or with a specific version tag
docker build -t alx-dataviz-tool:v1.0.0 .
```

### Pushing to a Docker Registry

Tag and push your image to your chosen Docker registry. Replace `your_registry_url` and `your_repo_name` with your actual registry details.

1.  **Log in to your Docker registry:**
    ```bash
    docker login your_registry_url
    ```
    (e.g., `docker login docker.io` for Docker Hub, `aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.<region>.amazonaws.com`)

2.  **Tag the image:**
    ```bash
    docker tag alx-dataviz-tool:latest your_registry_url/your_repo_name/alx-dataviz-tool:latest
    docker tag alx-dataviz-tool:v1.0.0 your_registry_url/your_repo_name/alx-dataviz-tool:v1.0.0
    ```

3.  **Push the image:**
    ```bash
    docker push your_registry_url/your_repo_name/alx-dataviz-tool:latest
    docker push your_registry_url/your_repo_name/alx-dataviz-tool:v1.0.0
    ```

### Kubernetes Deployment (Conceptual)

This section provides a conceptual outline for deploying to Kubernetes. Actual YAML files (`deployment.yml`, `service.yml`, `ingress.yml`, `secret.yml`) would be required.

#### 2.2.1. Kubernetes Manifests

**Example `k8s/deployment.yml`:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dataviz-app
  labels:
    app: dataviz
spec:
  replicas: 3 # Adjust based on your scaling needs
  selector:
    matchLabels:
      app: dataviz
  template:
    metadata:
      labels:
        app: dataviz
    spec:
      containers:
        - name: dataviz-app
          image: your_registry_url/your_repo_name/alx-dataviz-tool:latest # Use your pushed image
          ports:
            - containerPort: 8080
          env:
            - name: SPRING_DATASOURCE_URL
              valueFrom:
                secretKeyRef:
                  name: dataviz-db-secrets
                  key: database_url
            - name: SPRING_DATASOURCE_USERNAME
              valueFrom:
                secretKeyRef:
                  name: dataviz-db-secrets
                  key: database_user
            - name: SPRING_DATASOURCE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: dataviz-db-secrets
                  key: database_password
            - name: APPLICATION_SECURITY_JWT_SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: dataviz-app-secrets
                  key: jwt_secret_key
            - name: APPLICATION_SECURITY_JWT_EXPIRATION
              value: "86400000" # 24 hours
            # Add other environment variables as needed (e.g., Spring profiles)
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1024Mi"
              cpu: "500m"
          livenessProbe: # Checks if the application is running
            httpGet:
              path: /actuator/health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe: # Checks if the application is ready to serve traffic
            httpGet:
              path: /actuator/health
              port: 8080
            initialDelaySeconds: 20
            periodSeconds: 5
            failureThreshold: 5
```

**Example `k8s/service.yml`:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: dataviz-app-service
  labels:
    app: dataviz
spec:
  selector:
    app: dataviz
  ports:
    - protocol: TCP
      port: 80 # External port
      targetPort: 8080 # Container port
  type: ClusterIP # Or LoadBalancer for external access directly
```

**Example `k8s/ingress.yml` (for external HTTP(S) access with a domain):**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dataviz-ingress
  annotations:
    kubernetes.io/ingress.class: nginx # Or your specific ingress controller
    cert-manager.io/cluster-issuer: letsencrypt-prod # For HTTPS, if using cert-manager
spec:
  tls: # Optional: for HTTPS
  - hosts:
    - dataviz.yourdomain.com
    secretName: dataviz-tls
  rules:
  - host: dataviz.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dataviz-app-service
            port:
              number: 80
```

#### 2.2.2. Deploying to Kubernetes

1.  **Create Kubernetes Secrets:**
    Before deploying the application, create secrets for sensitive environment variables (database credentials, JWT secret key).
    ```bash
    kubectl create secret generic dataviz-db-secrets \
      --from-literal=database_url="jdbc:postgresql://your-managed-db-host:5432/datavizdb" \
      --from-literal=database_user="datavizuser_prod" \
      --from-literal=database_password="your_prod_db_password"

    kubectl create secret generic dataviz-app-secrets \
      --from-literal=jwt_secret_key="your_strong_jwt_secret_key_for_production"
    ```

2.  **Apply Kubernetes Manifests:**
    ```bash
    kubectl apply -f k8s/deployment.yml
    kubectl apply -f k8s/service.yml
    kubectl apply -f k8s/ingress.yml # If using Ingress
    ```

3.  **Monitor Deployment:**
    ```bash
    kubectl get deployments
    kubectl get pods -l app=dataviz
    kubectl get services
    kubectl get ingress # If using Ingress
    kubectl logs -f <pod-name>
    ```

### Environment Variables Management

*   **Local Development:** `docker-compose.yml` directly defines environment variables. `application.yml` provides defaults.
*   **Production:** Kubernetes Secrets should be used for sensitive information (database credentials, API keys, JWT secrets). Non-sensitive configurations can be passed via ConfigMaps or directly in `deployment.yml`.

---

## 3. Monitoring and Logging

*   **Logging:** The application uses Logback for logging. In Docker, logs are sent to `stdout`/`stderr`, which Docker captures. In Kubernetes, a logging solution (e.g., ELK stack, Grafana Loki, cloud provider's logging service) can collect these logs.
*   **Monitoring:**
    *   **Spring Boot Actuator:** Provides `/actuator/health`, `/actuator/metrics`, `/actuator/env`, etc., for basic health checks and metrics.
    *   **Prometheus:** Configure Prometheus to scrape metrics from the `/actuator/prometheus` endpoint of your application instances.
    *   **Grafana:** Use Grafana to create dashboards for visualizing metrics collected by Prometheus (CPU, memory, request rates, error rates, custom business metrics).
    *   **Liveness/Readiness Probes:** Configured in Kubernetes `deployment.yml` to ensure application health and proper traffic routing.

---

## 4. Scaling Considerations

*   **Horizontal Pod Autoscaler (HPA):** In Kubernetes, configure HPA to automatically scale the number of `dataviz-app` replicas based on CPU utilization or custom metrics (e.g., requests per second).
*   **Database Scaling:** For high-traffic applications, consider:
    *   Managed database services (e.g., AWS RDS PostgreSQL) that handle backups, patching, and offer read replicas.
    *   Connection pooling (HikariCP is default in Spring Boot) is essential.
    *   Database query optimization and indexing.
*   **Caching:** For multi-instance deployments, consider moving from local Caffeine cache to a distributed cache like Redis or Memcached to ensure cache consistency across all instances.

---

## 5. Rollback Strategy

In case of issues with a new deployment:

1.  **Kubernetes Rollback:**
    If you're deploying with Kubernetes, you can easily roll back to a previous healthy version of your deployment:
    ```bash
    kubectl rollout undo deployment/dataviz-app
    ```
    This will revert to the previous successful deployment image and configuration.

2.  **Docker Compose Rollback:**
    If deploying with Docker Compose, you might manually rebuild with an older image tag or revert your `docker-compose.yml` to a previous version and re-run `docker-compose up -d`.

3.  **Database Rollback:**
    Flyway allows rolling back schema changes, but this is often complex and risky in production. It's generally preferred to design migrations to be additive and forward-compatible. If a database change is problematic, a full database restore from a backup might be necessary, which is why robust backup strategies for production databases are critical.
```