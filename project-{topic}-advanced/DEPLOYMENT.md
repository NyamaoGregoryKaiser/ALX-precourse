# AppInsight: Deployment Guide

This guide provides instructions for deploying the AppInsight Performance Monitoring System. The recommended deployment strategy leverages Docker and Docker Compose for local environments, and conceptually scales to container orchestration platforms like Kubernetes for production.

## Table of Contents

1.  [Local Deployment (Docker Compose)](#1-local-deployment-docker-compose)
2.  [Production Deployment Strategy (Conceptual)](#2-production-deployment-strategy-conceptual)
    *   [Prerequisites for Production](#prerequisites-for-production)
    *   [Building and Pushing Docker Image](#building-and-pushing-docker-image)
    *   [Kubernetes Deployment Example (Conceptual)](#kubernetes-deployment-example-conceptual)
3.  [Configuration Management](#3-configuration-management)
4.  [Monitoring and Logging](#4-monitoring-and-logging)
5.  [Scalability](#5-scalability)
6.  [Security Considerations](#6-security-considerations)
7.  [Troubleshooting](#7-troubleshooting)

## 1. Local Deployment (Docker Compose)

This is ideal for development, testing, and demonstrating the application quickly.

### Steps:

1.  **Ensure Docker is Installed**: Make sure Docker and Docker Compose are installed and running on your machine.
2.  **Clone the Repository**:
    ```bash
    git clone https://github.com/yourusername/appinsight.git
    cd appinsight
    ```
3.  **Build and Run**: The `docker-compose.yml` file is configured to build the Spring Boot application image and run both the backend and a PostgreSQL database.
    ```bash
    docker compose up --build -d
    ```
    *   `--build`: Forces a rebuild of the application's Docker image. Omit this if you haven't changed the code and the image already exists.
    *   `-d`: Runs the containers in detached mode (in the background).
4.  **Verify Services**:
    ```bash
    docker compose ps
    ```
    You should see `appinsight_db` and `appinsight_backend` containers running and healthy.
5.  **Access Application**:
    *   **Backend API**: `http://localhost:8080/api`
    *   **Frontend UI**: `http://localhost:8080`
    *   **Swagger UI**: `http://localhost:8080/swagger-ui.html`
6.  **Stop and Clean Up**:
    ```bash
    docker compose down
    # To remove volumes (database data), add -v
    # docker compose down -v
    ```

## 2. Production Deployment Strategy (Conceptual)

For production, it is highly recommended to use a robust container orchestration platform like Kubernetes, or cloud-specific services (AWS ECS/EKS, Azure App Service/AKS, Google Cloud Run/GKE).

### Prerequisites for Production

*   **Cloud Provider Account**: AWS, Azure, GCP, etc.
*   **Container Registry**: Docker Hub, AWS ECR, Azure Container Registry, GCP Container Registry to store your Docker images.
*   **Kubernetes Cluster** (if using Kubernetes): Already provisioned and configured.
*   **Persistent Storage**: For the PostgreSQL database, a managed database service (AWS RDS, Azure Database for PostgreSQL, GCP Cloud SQL) is preferred over running PostgreSQL in a container with persistent volumes in Kubernetes, due to complexity of stateful applications in K8s.
*   **CI/CD Pipeline**: As described in `README.md` and `.github/workflows/main.yml`, to automate builds, tests, and deployments.
*   **Domain Name & TLS/SSL Certificate**: For secure HTTPS communication.

### Building and Pushing Docker Image

Your CI/CD pipeline should automate this. Manually:

1.  **Build the Docker image**:
    ```bash
    docker build -t appinsight-backend:<version> .
    # Example: docker build -t your-dockerhub-username/appinsight-backend:1.0.0 .
    ```
2.  **Tag the image**: (Optional, if not already tagged with build command)
    ```bash
    docker tag appinsight-backend:<version> <your-registry>/appinsight-backend:<version>
    # Example: docker tag appinsight-backend:1.0.0 your-dockerhub-username/appinsight-backend:1.0.0
    ```
3.  **Log in to your container registry**:
    ```bash
    docker login <your-registry>
    # Example: docker login docker.io
    ```
4.  **Push the image**:
    ```bash
    docker push <your-registry>/appinsight-backend:<version>
    # Example: docker push your-dockerhub-username/appinsight-backend:1.0.0
    ```

### Kubernetes Deployment Example (Conceptual)

This provides a high-level idea. Actual YAMLs would be more detailed.

1.  **Managed Database Service**: Provision a PostgreSQL instance (e.g., AWS RDS PostgreSQL) in your cloud provider.
2.  **Kubernetes Secret for Database Credentials**:
    ```yaml
    apiVersion: v1
    kind: Secret
    metadata:
      name: appinsight-db-secrets
    type: Opaque
    stringData:
      DB_HOST: "your-rds-endpoint.aws.com"
      DB_PORT: "5432"
      DB_NAME: "appinsight_db"
      DB_USER: "appinsight_user"
      DB_PASSWORD: "your_strong_db_password"
      JWT_SECRET: "your_very_long_jwt_secret_from_env"
    ```
3.  **Kubernetes Deployment for AppInsight Backend**:
    ```yaml
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: appinsight-backend
      labels:
        app: appinsight
    spec:
      replicas: 3 # Scale as needed
      selector:
        matchLabels:
          app: appinsight
      template:
        metadata:
          labels:
            app: appinsight
        spec:
          containers:
          - name: appinsight-backend
            image: <your-registry>/appinsight-backend:<version> # e.g., your-dockerhub-username/appinsight-backend:1.0.0
            ports:
            - containerPort: 8080
            envFrom: # Load DB credentials and JWT secret from the secret
            - secretRef:
                name: appinsight-db-secrets
            env: # Other environment variables if needed
            - name: SPRING_PROFILES_ACTIVE
              value: prod
            livenessProbe: # Check if the application is running
              httpGet:
                path: /actuator/health
                port: 8080
              initialDelaySeconds: 30
              periodSeconds: 10
            readinessProbe: # Check if the application is ready to serve traffic
              httpGet:
                path: /actuator/health
                port: 8080
              initialDelaySeconds: 60
              periodSeconds: 15
            resources: # Define resource limits and requests
              requests:
                memory: "512Mi"
                cpu: "500m"
              limits:
                memory: "1Gi"
                cpu: "1000m"
          imagePullSecrets: # If using a private registry
          - name: regcred
    ```
4.  **Kubernetes Service**:
    ```yaml
    apiVersion: v1
    kind: Service
    metadata:
      name: appinsight-backend-service
    spec:
      selector:
        app: appinsight
      ports:
        - protocol: TCP
          port: 80
          targetPort: 8080
      type: ClusterIP # Or LoadBalancer for external access
    ```
5.  **Ingress (for external access with TLS)**:
    ```yaml
    apiVersion: networking.k8s.io/v1
    kind: Ingress
    metadata:
      name: appinsight-ingress
      annotations:
        kubernetes.io/ingress.class: nginx
        cert-manager.io/cluster-issuer: letsencrypt-prod # Or your chosen issuer
    spec:
      tls:
      - hosts:
        - appinsight.yourdomain.com
        secretName: appinsight-tls
      rules:
      - host: appinsight.yourdomain.com
        http:
          paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: appinsight-backend-service
                port:
                  number: 80
    ```

## 3. Configuration Management

*   **Environment Variables**: `application.yml` uses placeholders (`${VAR_NAME}`) for sensitive information and environment-specific settings (DB credentials, JWT secret). These should be provided via environment variables in your deployment environment (e.g., Docker `ENV` in `Dockerfile`, `environment` in `docker-compose.yml`, Kubernetes `Secrets` and `ConfigMaps`).
*   **Spring Profiles**: Use `SPRING_PROFILES_ACTIVE=prod` to activate production-specific configurations if you have them (e.g., in `application-prod.yml`).

## 4. Monitoring and Logging

*   **Logs**: Configured with Logback to output to console (for container logs) and rolling files. In production, consolidate container logs using a centralized logging solution (e.g., ELK stack, Splunk, cloud-native logging services like CloudWatch, Azure Monitor, Stackdriver).
*   **Metrics**: Spring Boot Actuator exposes Prometheus-compatible metrics (`/actuator/prometheus`).
    *   Integrate with **Prometheus** for scraping these metrics.
    *   Visualize metrics and create dashboards using **Grafana**.
    *   Set up alerts based on key performance indicators (KPIs) like error rates, latency, CPU/memory usage.
*   **Health Checks**: Actuator's `/actuator/health` endpoint is used for Kubernetes liveness and readiness probes to ensure containers are healthy and ready to receive traffic.

## 5. Scalability

*   **Horizontal Scaling**: The stateless nature of the backend (JWT auth) allows for easy horizontal scaling by deploying multiple instances behind a load balancer (e.g., Kubernetes `replicas`).
*   **Database Scaling**: As mentioned, for production, a managed PostgreSQL service can be scaled independently (read replicas, larger instance sizes).
*   **Caching**: In-memory Caffeine cache improves performance for individual instances. For distributed caching across multiple instances, consider integrating with Redis or a similar distributed cache solution.

## 6. Security Considerations

*   **HTTPS/TLS**: Crucial for encrypting all communication in production. Configure your load balancer or ingress controller to terminate TLS certificates.
*   **Strong Secrets**: Use long, random, and securely stored values for `JWT_SECRET`, database passwords, etc. Avoid hardcoding sensitive information.
*   **Network Policies**: In Kubernetes, implement network policies to restrict communication between pods to only what is necessary.
*   **Firewall Rules**: Configure cloud provider firewalls to limit database access to only the application instances.
*   **API Key Management**: Ensure API keys are treated as sensitive credentials and rotated regularly.
*   **Least Privilege**: Run containers with the least necessary privileges.

## 7. Troubleshooting

*   **Check Container Logs**:
    ```bash
    docker compose logs appinsight_backend
    kubectl logs -f <appinsight-backend-pod-name>
    ```
*   **Check Service Status**:
    ```bash
    docker compose ps
    kubectl get pods -l app=appinsight
    kubectl get services
    kubectl get ingress
    ```
*   **Connectivity**:
    *   Ensure database container/service is reachable from the application container.
    *   Check firewall rules and security groups.
*   **Configuration**: Double-check environment variables in the deployed environment match `application.yml` expectations.
*   **Actuator Endpoints**: Use `/actuator/health`, `/actuator/info`, `/actuator/beans` to inspect the application's internal state.