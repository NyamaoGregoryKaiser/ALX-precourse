# ALX E-commerce System - Deployment Guide

This document provides a guide for deploying the ALX E-commerce System backend to various environments. The application is containerized using Docker, simplifying the deployment process.

## 1. Production Deployment Considerations

Before deploying to production, ensure the following best practices are addressed:

*   **Secrets Management:** Never hardcode sensitive information (JWT secret, database credentials, API keys). Use environment variables, Docker secrets, Kubernetes secrets, or a dedicated secrets management service (e.g., AWS Secrets Manager, HashiCorp Vault).
*   **HTTPS:** Always enforce HTTPS for all API traffic to ensure data encryption in transit. This typically involves configuring a load balancer or reverse proxy (like Nginx) for SSL/TLS termination.
*   **Database Management:**
    *   Use a managed database service (e.g., AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL) for production.
    *   Ensure database backups, high availability, and disaster recovery strategies are in place.
    *   Restrict database access to only the application server(s) via firewall rules.
*   **Logging & Monitoring:** Set up centralized logging (e.g., ELK Stack, Grafana Loki) and application performance monitoring (APM) (e.g., Prometheus/Grafana, Datadog, New Relic) to proactively identify and resolve issues.
*   **Scalability:** Design for horizontal scaling by running multiple instances of the application behind a load balancer. Ensure sessions are stateless (which our JWT-based auth already supports).
*   **Security Groups/Firewalls:** Configure network security to allow only necessary inbound/outbound traffic (e.g., port 80/443 for web traffic, port 8080 from load balancer).
*   **Rate Limiting:** Implement API rate limiting at the load balancer or application layer to protect against abuse and DDoS attacks.
*   **Health Checks:** Configure health checks (`/actuator/health` if Spring Boot Actuator is added) for load balancers and container orchestrators to ensure traffic is only routed to healthy instances.
*   **Resource Allocation:** Allocate sufficient CPU, memory, and storage resources based on expected load.

## 2. Deployment with Docker Compose (Single Host)

This method is suitable for small-scale deployments, staging environments, or simplified production setups on a single server.

1.  **Prepare the Production Server:**
    *   Provision a Linux server (e.g., AWS EC2, DigitalOcean Droplet, Linode).
    *   Install **Docker Engine** and **Docker Compose** on the server.
    *   Ensure firewall rules allow inbound traffic on port `80` (for HTTP) and `443` (for HTTPS) from the internet, and optionally `8080` for direct access if no reverse proxy.

2.  **Transfer Files:**
    *   Copy `docker-compose.yml` to your server (e.g., `/opt/ecommerce-app/docker-compose.yml`).
    *   **Important:** Create a `.env` file in the same directory as `docker-compose.yml` for production secrets.
        ```
        # .env (Example - DO NOT COMMIT THIS FILE TO GIT)
        POSTGRES_DB=ecommerce_prod_db
        POSTGRES_USER=your_prod_user
        POSTGRES_PASSWORD=your_super_strong_db_password
        SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/ecommerce_prod_db
        SPRING_DATASOURCE_USERNAME=your_prod_user
        SPRING_DATASOURCE_PASSWORD=your_super_strong_db_password
        APP_JWT_SECRET=A_VERY_LONG_AND_COMPLEX_RANDOM_STRING_FOR_PRODUCTION_JWT_SIGNING_THAT_IS_NOT_IN_GIT_HISTORY
        # Other production specific environment variables
        SPRING_PROFILES_ACTIVE=prod
        ```

3.  **Deploy the Application:**
    *   SSH into your server.
    *   Navigate to the directory where you saved `docker-compose.yml` and `.env`.
    *   Pull the latest Docker image (if you've pushed it to a registry like Docker Hub):
        ```bash
        docker pull your-dockerhub-username/ecommerce-backend:latest
        ```
        (Replace `your-dockerhub-username` with your actual Docker Hub username)
    *   Start the services:
        ```bash
        docker-compose -f docker-compose.yml --env-file ./.env up -d
        ```
        This will:
        *   Start the PostgreSQL container.
        *   Start the Spring Boot application container.
        *   Automatically run Flyway migrations and seed data.

4.  **Verification:**
    *   Check container status: `docker-compose ps`
    *   View logs: `docker-compose logs -f app`
    *   Access the API at `http://YOUR_SERVER_IP:8080/swagger-ui.html` (if directly exposed).

5.  **Setting up a Reverse Proxy (Recommended for Production):**
    *   Install Nginx on your server.
    *   Configure Nginx to:
        *   Listen on ports 80 and 443.
        *   Proxy requests to `http://localhost:8080` (your `app` service).
        *   Handle SSL/TLS termination (using Let's Encrypt or your own certificates).
        *   Add HTTP security headers.
        *   Implement basic rate limiting.
    *   Example Nginx configuration snippet for `your_domain.com`:
        ```nginx
        server {
            listen 80;
            listen [::]:80;
            server_name your_domain.com;
            return 301 https://$host$request_uri; # Redirect HTTP to HTTPS
        }

        server {
            listen 443 ssl http2;
            listen [::]:443 ssl http2;
            server_name your_domain.com;

            ssl_certificate /etc/nginx/ssl/your_domain.com/fullchain.pem; # Path to your SSL cert
            ssl_certificate_key /etc/nginx/ssl/your_domain.com/privkey.pem; # Path to your SSL key
            ssl_session_cache shared:SSL:10m;
            ssl_session_timeout 10m;
            ssl_protocols TLSv1.2 TLSv1.3;
            ssl_ciphers "ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20";
            ssl_prefer_server_ciphers on;

            location / {
                proxy_pass http://localhost:8080; # Forward to your Spring Boot app
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
                proxy_redirect off;
            }
        }
        ```
    *   After configuring Nginx, reload its configuration: `sudo nginx -t && sudo systemctl reload nginx`.

## 3. Deployment to Kubernetes (Advanced/Cloud)

For larger-scale, highly available, and resilient deployments, Kubernetes is the preferred choice.

1.  **Set up a Kubernetes Cluster:**
    *   Use a managed Kubernetes service (EKS, AKS, GKE) or set up your own.

2.  **Managed Database Service:**
    *   **Strongly Recommended:** Use a cloud-managed PostgreSQL service (e.g., AWS RDS PostgreSQL, Azure Database for PostgreSQL, Google Cloud SQL for PostgreSQL) instead of running PostgreSQL directly in Kubernetes. This offloads database management, backups, and scaling.

3.  **Container Registry:**
    *   Ensure your Docker image is pushed to a reliable container registry (e.g., Docker Hub, AWS ECR, Google Container Registry). The CI/CD pipeline is configured to push to Docker Hub.

4.  **Kubernetes Manifests:**
    *   Create `Deployment` and `Service` manifests for your backend application.
    *   **`deployment.yaml` (Example):**
        ```yaml
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: ecommerce-backend-deployment
          labels:
            app: ecommerce-backend
        spec:
          replicas: 3 # Run multiple instances for high availability
          selector:
            matchLabels:
              app: ecommerce-backend
          template:
            metadata:
              labels:
                app: ecommerce-backend
            spec:
              containers:
              - name: ecommerce-backend
                image: your-dockerhub-username/ecommerce-backend:latest # Your image
                ports:
                - containerPort: 8080
                env:
                - name: SPRING_DATASOURCE_URL
                  value: "jdbc:postgresql://your-managed-db-host:5432/ecommerce_prod_db" # Use your managed DB endpoint
                - name: SPRING_DATASOURCE_USERNAME
                  valueFrom:
                    secretKeyRef:
                      name: db-secrets # Kubernetes secret for DB user
                      key: db_username
                - name: SPRING_DATASOURCE_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: db-secrets # Kubernetes secret for DB password
                      key: db_password
                - name: APP_JWT_SECRET
                  valueFrom:
                    secretKeyRef:
                      name: app-secrets # Kubernetes secret for JWT secret
                      key: jwt_secret
                resources: # Define resource limits and requests
                  requests:
                    memory: "512Mi"
                    cpu: "250m"
                  limits:
                    memory: "1Gi"
                    cpu: "500m"
                readinessProbe: # For Kubernetes to know when the app is ready to receive traffic
                  httpGet:
                    path: /actuator/health/readiness # Requires Spring Boot Actuator
                    port: 8080
                  initialDelaySeconds: 20
                  periodSeconds: 10
                livenessProbe: # For Kubernetes to know when the app is healthy
                  httpGet:
                    path: /actuator/health/liveness # Requires Spring Boot Actuator
                    port: 8080
                  initialDelaySeconds: 60
                  periodSeconds: 30
        ```
    *   **`service.yaml` (Example):**
        ```yaml
        apiVersion: v1
        kind: Service
        metadata:
          name: ecommerce-backend-service
          labels:
            app: ecommerce-backend
        spec:
          selector:
            app: ecommerce-backend
          ports:
            - protocol: TCP
              port: 80
              targetPort: 8080
          type: LoadBalancer # Creates an external load balancer (cloud provider specific)
        ```
    *   **`secrets.yaml` (Example - for `db-secrets` and `app-secrets`):**
        ```yaml
        apiVersion: v1
        kind: Secret
        metadata:
          name: db-secrets
        type: Opaque
        data:
          db_username: YWRtaW4= # base64 encoded 'admin'
          db_password: cGFzc3dvcmQ= # base64 encoded 'password' - USE REAL STRONG PASSWORDS!
        ---
        apiVersion: v1
        kind: Secret
        metadata:
          name: app-secrets
        type: Opaque
        data:
          jwt_secret: WW91clN1cGVyU2VjcmV0S2V5Rm9ySl... # base64 encoded AppConstants.JWT_SECRET - USE REAL STRONG SECRETS!
        ```
        **NOTE:** For production, use `kubectl create secret generic <name> --from-literal=<key>=<value>` or a secrets management solution like Vault, AWS Secrets Manager, or Kubernetes External Secrets. Do NOT commit base64 encoded secrets to Git.

5.  **Deployment Steps:**
    *   Apply your secrets (create once):
        ```bash
        kubectl apply -f secrets.yaml
        ```
    *   Apply your deployment and service:
        ```bash
        kubectl apply -f deployment.yaml
        kubectl apply -f service.yaml
        ```
    *   Monitor rollout: `kubectl rollout status deployment/ecommerce-backend-deployment`
    *   Get external IP of service: `kubectl get service ecommerce-backend-service`

## 4. CI/CD Integration

The provided `.github/workflows/ci-cd.yml` demonstrates a basic GitHub Actions pipeline:

*   **Continuous Integration (CI):** On every `push` or `pull_request` to `main` or `develop`:
    *   Builds the application.
    *   Runs all tests.
    *   Creates a Docker image (for `main` branch).
*   **Continuous Deployment (CD):** On `push` to the `main` branch:
    *   Triggers a `deploy` job. This job requires custom scripting based on your chosen deployment platform (e.g., SSH, `kubectl`, cloud CLI tools).
    *   **GitHub Secrets:** For production deployments, ensure sensitive credentials (SSH keys, cloud API tokens, Docker Hub credentials) are stored as GitHub Secrets and accessed securely within the workflow.

**Example `PROD_SSH_KEY` GitHub Secret for SSH deployment:**
Store your private SSH key in GitHub Secrets named `PROD_SSH_KEY` to be used by the `ssh-action`.

## 5. Rollbacks

*   **Docker Compose:** Stop containers and restart with a previous image version:
    ```bash
    docker-compose stop app
    docker-compose rm -f app
    docker pull your-dockerhub-username/ecommerce-backend:v1.0.0 # Pull previous version
    docker-compose up -d # Will use the pulled image
    ```
*   **Kubernetes:** Use `kubectl rollout undo` to revert to a previous deployment revision:
    ```bash
    kubectl rollout undo deployment/ecommerce-backend-deployment
    ```

This guide covers common deployment patterns. Adapt it to your specific infrastructure and organizational requirements. Always prioritize security, reliability, and observability in production environments.
```