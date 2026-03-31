# Deployment Guide

This document provides instructions for deploying the Mobile Backend system, focusing on containerized deployments using Docker.

## 1. Local Deployment with Docker Compose (Development/Testing)

For local development and testing, `docker-compose.yml` is the simplest way to get all services (backend, PostgreSQL, Redis) running.

1.  **Ensure Docker and Docker Compose are installed** on your machine.
2.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/mobile-backend.git
    cd mobile-backend
    ```
3.  **Review Configuration**:
    *   Check `config/app_config.json` for environment-specific settings (database name, user, password, JWT secret, Redis host/port).
    *   Ensure the `db_host` and `redis_host` in `app_config.json` match the service names in `docker-compose.yml` (`db` and `redis` respectively).
4.  **Build and Run**:
    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: Forces rebuilding of the backend image, useful if you've made code changes.
    *   `-d`: Runs containers in detached mode (in the background).
5.  **Verify Services**:
    *   Check container status: `docker-compose ps`
    *   View backend logs: `docker-compose logs -f backend`
    *   Access the API: The backend should be available at `http://localhost:8080`.
6.  **Stop Services**:
    ```bash
    docker-compose down
    ```
    This stops and removes the containers and networks. Use `docker-compose down -v` to also remove Docker volumes (PostgreSQL data, Redis data), which is useful for a clean slate.

## 2. Production Deployment Considerations

For production environments, while Docker Compose can work for simple single-server deployments, it's generally recommended to use a more robust container orchestration platform.

### 2.1. Recommended Production Architecture (Container Orchestration)

*   **Container Orchestrator**: Kubernetes (EKS, GKE, AKS), Amazon ECS, Docker Swarm.
*   **Load Balancer**: External load balancer (e.g., AWS ALB, Nginx, HAProxy) to distribute traffic across multiple backend instances.
*   **Database**: Managed PostgreSQL service (e.g., AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL) for high availability, backups, and scalability. Avoid running databases directly in containers on the same host for critical production data unless you have strong persistence and HA strategies.
*   **Cache**: Managed Redis service (e.g., AWS ElastiCache, Azure Cache for Redis).
*   **Secrets Management**: Use a dedicated secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault, Kubernetes Secrets with proper encryption) for sensitive information like database passwords and JWT secrets.
*   **Monitoring & Logging**: Centralized logging (ELK stack, Splunk, CloudWatch, Logz.io) and monitoring (Prometheus/Grafana, Datadog) for all services.
*   **CI/CD Pipeline**: Automate building, testing, pushing images to a registry, and deploying to the orchestration platform.

### 2.2. Steps for Kubernetes Deployment (Conceptual)

1.  **Container Registry**: Push your backend Docker image to a container registry (e.g., Docker Hub, Google Container Registry, Amazon ECR).
    ```bash
    docker build -t your-registry/mobile-backend:latest .
    docker push your-registry/mobile-backend:latest
    ```
2.  **Kubernetes Manifests**: Create Kubernetes YAML files:
    *   `deployment.yaml`: Defines the backend application (Docker image, replica count, resource limits, readiness/liveness probes).
    *   `service.yaml`: Defines how to access the backend application within the cluster.
    *   `ingress.yaml` (Optional): Configures external access via an Ingress controller for HTTP/HTTPS routing.
    *   `secret.yaml`: Securely store sensitive configuration (DB credentials, JWT secret).
    *   `configmap.yaml`: Store non-sensitive configuration (server port, thread count).
    *   **Example `deployment.yaml` snippet:**
        ```yaml
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: backend-deployment
          labels:
            app: mobile-backend
        spec:
          replicas: 3 # Scale to 3 instances
          selector:
            matchLabels:
              app: mobile-backend
          template:
            metadata:
              labels:
                app: mobile-backend
            spec:
              containers:
              - name: backend
                image: your-registry/mobile-backend:latest
                ports:
                - containerPort: 8080
                envFrom:
                - configMapRef:
                    name: backend-config # For non-sensitive configs
                - secretRef:
                    name: backend-secrets # For sensitive configs
                volumeMounts:
                - name: app-config-volume
                  mountPath: /app/app_config.json # Mount config as file
                  subPath: app_config.json
                - name: logs-volume
                  mountPath: /app/logs
                readinessProbe: # Check if app is ready to serve traffic
                  httpGet:
                    path: /health # Implement a health check endpoint in Drogon
                    port: 8080
                  initialDelaySeconds: 10
                  periodSeconds: 5
                livenessProbe: # Check if app is alive
                  httpGet:
                    path: /health
                    port: 8080
                  initialDelaySeconds: 30
                  periodSeconds: 10
                resources:
                  requests:
                    memory: "128Mi"
                    cpu: "100m"
                  limits:
                    memory: "512Mi"
                    cpu: "500m"
              volumes:
              - name: app-config-volume
                configMap:
                  name: backend-config-file # Use a ConfigMap to hold app_config.json
              - name: logs-volume
                emptyDir: {} # For ephemeral logs, or use a persistent volume/log aggregation
        ```
3.  **Apply Manifests**:
    ```bash
    kubectl apply -f .
    ```
4.  **Database and Cache Connectivity**:
    *   Configure your managed PostgreSQL and Redis services.
    *   Update your Kubernetes secrets/config maps with the correct connection strings/credentials. Ensure the backend application's `app_config.json` (or environment variables in Kubernetes) points to these external services.

### 2.3. Health Checks

*   For `liveness` and `readiness` probes in Kubernetes, implement a simple `/health` endpoint in Drogon that returns a `200 OK` if the application is running and can connect to its critical dependencies (e.g., database, Redis).

    **Example `HealthController.h`**:
    ```cpp
    // src/controllers/HealthController.h
    #pragma once
    #include <drogon/HttpController.h>
    class HealthController : public drogon::HttpController<HealthController> {
    public:
        METHOD_LIST_BEGIN
        METHOD_ADD(HealthController::checkHealth, "/health", {drogon::HttpMethod::Get});
        METHOD_LIST_END
        void checkHealth(const drogon::HttpRequestPtr &req, std::function<void (const drogon::HttpResponsePtr &)> &&callback);
    };
    ```
    **Example `HealthController.cc`**:
    ```cpp
    // src/controllers/HealthController.cc
    #include "HealthController.h"
    #include "utils/AppConfig.h" // For DB connection name
    #include "utils/RedisManager.h" // For Redis health check
    #include <drogon/HttpAppFramework.h>
    #include <drogon/orm/DbClient.h>
    #include <spdlog/spdlog.h>
    void HealthController::checkHealth(const drogon::HttpRequestPtr &req, std::function<void (const drogon::HttpResponsePtr &)> &&callback) {
        Json::Value status;
        status["status"] = "UP";

        // Check DB connection
        auto dbClient = drogon::app().getDbClient(AppConfig::getInstance().getString("db_connection_name"));
        if (dbClient) {
            try {
                // Perform a simple query (e.g., SELECT 1) to check connection health
                dbClient->execSqlSync("SELECT 1");
                status["database"] = "UP";
            } catch (const std::exception& e) {
                spdlog::error("Health check failed: Database connection error: {}", e.what());
                status["database"] = "DOWN";
                status["status"] = "DOWN";
            }
        } else {
            status["database"] = "UNAVAILABLE";
            status["status"] = "DOWN";
        }

        // Check Redis connection
        if (RedisManager::getInstance().get("health_check_key")) { // Simple get attempt
             status["redis"] = "UP";
        } else {
             spdlog::error("Health check failed: Redis connection or ping error.");
             status["redis"] = "DOWN";
             status["status"] = "DOWN";
        }

        auto resp = drogon::HttpResponse::newHttpJsonResponse(status);
        if (status["status"].asString() == "DOWN") {
            resp->setStatusCode(drogon::k500InternalServerError);
        } else {
            resp->setStatusCode(drogon::k200OK);
        }
        callback(resp);
    }
    ```

### 2.4. Environment Variables

In production, it's common practice to override configuration values using environment variables rather than static config files. Drogon can be configured to read values from environment variables. Your Dockerfile and Kubernetes manifests should facilitate this.

*   Update `app_config.json` to potentially use environment variable placeholders if a tool processes it.
*   Or, directly pass environment variables to the Docker container, which Drogon can then be configured to pick up (e.g., `drogon::app().loadConfigFile(nullptr);` and then set parameters using `drogon::app().setPort(getenv("PORT"));`).

This guide covers the essential steps for deploying your C++ backend. Always tailor your deployment strategy to your specific cloud provider and organizational requirements.