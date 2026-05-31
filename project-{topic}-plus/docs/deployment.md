# Deployment Guide

This guide outlines the steps to deploy the Project Security System (PMS) to a production environment using Docker and a cloud provider.

## 1. Prerequisites

*   A cloud provider account (e.g., AWS, GCP, Azure, DigitalOcean).
*   Docker and Docker Compose installed locally (for testing the deployment pipeline).
*   kubectl (if deploying to Kubernetes).
*   Git installed.
*   Domain name and SSL/TLS certificates (e.g., from Let's Encrypt).
*   CI/CD setup (e.g., GitHub Actions, GitLab CI, Jenkins).

## 2. Environment Variables

Ensure all sensitive configuration (database credentials, JWT secrets, API keys) are managed as environment variables in your deployment environment, **not** hardcoded in the application or checked into version control.

Refer to `backend/.env.example` for a list of required environment variables.

**Example Production `DATABASE_URL`:**
```
DATABASE_URL="postgresql://your_db_user:your_db_password@your_db_host:5432/pms_prod_db?schema=public"
JWT_SECRET="YOUR_SUPER_STRONG_PRODUCTION_SECRET_KEY_HERE_MIN_32_CHARS"
```

## 3. Deployment Steps

### 3.1. Database Setup

1.  **Provision a Managed PostgreSQL Instance:**
    *   It's highly recommended to use a managed database service (e.g., AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL) for production. These services handle backups, scaling, and maintenance.
    *   Create a new PostgreSQL database instance.
    *   Note down the connection string, including host, port, user, password, and database name.

2.  **Apply Migrations:**
    *   During your CI/CD pipeline or manually, execute Prisma migrations against the production database.
    *   **Recommended approach:** Run `npx prisma migrate deploy` in a separate CI/CD step before deploying the application.
    *   Example command (ensure `DATABASE_URL` env var points to production DB):
        ```bash
        # In your CI/CD environment or a secure terminal
        cd backend
        npm install # Install Prisma CLI
        npx prisma migrate deploy
        ```
    *   **Seed Data (Optional, but recommended for initial roles):**
        ```bash
        cd backend
        npx prisma db seed
        ```
        *Caution: Only run `db seed` if your seed script is idempotent (like ours, using `upsert`). Otherwise, run it once.*

### 3.2. Docker Image Build and Push

1.  **Build the Docker Image:**
    *   The `backend/Dockerfile` defines the build process.
    *   This step is typically handled by your CI/CD pipeline.
    *   Example build command (from `project-security-system/` root):
        ```bash
        docker build -t your-dockerhub-username/pms-backend:latest -f backend/Dockerfile .
        ```

2.  **Push to Container Registry:**
    *   Push the built image to a container registry (e.g., Docker Hub, AWS ECR, Google Container Registry).
    *   Example push command:
        ```bash
        docker push your-dockerhub-username/pms-backend:latest
        ```

### 3.3. Deployment to Production Environment

Choose one of the following deployment strategies:

#### Option A: Docker Compose (for smaller scale/VPS)

This is suitable for deploying to a single Virtual Private Server (VPS).

1.  **SSH into your VPS.**
2.  **Install Docker and Docker Compose** if not already installed.
3.  **Create a deployment directory** for your project.
4.  **Create a `docker-compose.yml` file** (similar to the one in the root, but updated for production).
    *   Update `DATABASE_URL` to point to your *managed production PostgreSQL instance*.
    *   Set `JWT_SECRET` and other environment variables to their production values.
    *   Consider using `env_file` directive to load secrets from a local `.env` file on the VPS (ensure `.env` is secure and not in Git).
    *   Remove `ports` mapping for `db` service if using a managed database (it doesn't run locally).
    *   Adjust `CMD` in backend's Dockerfile or `docker-compose.yml` to *only* run `npx prisma migrate deploy` once or via a dedicated migration container, not every time. For repeated runs, `migrate deploy` is idempotent, but `db seed` needs care.
    ```yaml
    # Simplified production docker-compose.yml example
    version: '3.8'

    services:
      backend:
        image: your-dockerhub-username/pms-backend:latest
        restart: always
        environment:
          NODE_ENV: production
          PORT: 5000
          DATABASE_URL: postgresql://your_db_user:your_db_password@your_db_host:5432/pms_prod_db?schema=public
          # ... other environment variables ...
        ports:
          - "80:5000" # Map host port 80 to container port 5000
          # If using HTTPS and a reverse proxy like Nginx/Caddy, expose 5000 internally only
        # env_file:
        #   - ./.env.production # Load production env vars from local file
        # The CMD command in Dockerfile will handle `migrate deploy` and `db seed`
    ```
5.  **Start the services:**
    ```bash
    docker-compose -f docker-compose.prod.yml up -d
    ```

#### Option B: Kubernetes (for larger scale/high availability)

1.  **Set up a Kubernetes Cluster:**
    *   Use a managed Kubernetes service (e.g., AWS EKS, GKE, Azure AKS).

2.  **Create Kubernetes Manifests:**
    *   Define `Deployment` for the backend application.
    *   Define `Service` to expose the backend application internally/externally.
    *   Define `Ingress` for external HTTP/HTTPS access (if using external load balancer/API Gateway).
    *   Use `Secrets` for sensitive environment variables (e.g., `JWT_SECRET`, `DATABASE_URL`).
    *   Example `backend-deployment.yaml` (simplified):
        ```yaml
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: pms-backend
          labels:
            app: pms-backend
        spec:
          replicas: 3 # Run multiple instances for high availability
          selector:
            matchLabels:
              app: pms-backend
          template:
            metadata:
              labels:
                app: pms-backend
            spec:
              containers:
              - name: pms-backend
                image: your-dockerhub-username/pms-backend:latest
                ports:
                - containerPort: 5000
                env:
                - name: DATABASE_URL
                  valueFrom:
                    secretKeyRef:
                      name: pms-secrets
                      key: DATABASE_URL
                - name: JWT_SECRET
                  valueFrom:
                    secretKeyRef:
                      name: pms-secrets
                      key: JWT_SECRET
                # ... other env vars ...
                resources:
                  limits:
                    memory: "256Mi"
                    cpu: "250m"
                livenessProbe: # Health check for Kubernetes
                  httpGet:
                    path: /api/v1/health
                    port: 5000
                  initialDelaySeconds: 30
                  periodSeconds: 10
                readinessProbe: # Readiness check for Kubernetes
                  httpGet:
                    path: /api/v1/health
                    port: 5000
                  initialDelaySeconds: 10
                  periodSeconds: 5
        ---
        apiVersion: v1
        kind: Service
        metadata:
          name: pms-backend-service
        spec:
          selector:
            app: pms-backend
          ports:
            - protocol: TCP
              port: 80
              targetPort: 5000
          type: LoadBalancer # Creates an external load balancer on most clouds
        ```

3.  **Apply Manifests:**
    ```bash
    kubectl apply -f pms-k8s/
    ```

### 3.4. Frontend Deployment

1.  **Build the Frontend:**
    ```bash
    cd frontend
    npm run build
    ```
    This creates optimized static files in the `build/` directory.

2.  **Deploy Static Files:**
    *   **Option A: Object Storage + CDN:** Upload the `build/` directory content to an object storage service (e.g., AWS S3, Google Cloud Storage) and serve it via a CDN (e.g., CloudFront, Cloudflare). This is highly scalable and cost-effective.
    *   **Option B: Nginx/Caddy Reverse Proxy:** Serve the static files from a web server like Nginx or Caddy on your VPS or Kubernetes cluster. This server can also act as a reverse proxy for your backend API.

### 3.5. Reverse Proxy & SSL (HTTPS)

*   **Crucial for Production:** Always serve your application over HTTPS.
*   Use a reverse proxy (Nginx, Caddy, or your cloud provider's load balancer/API Gateway) to:
    *   Terminate SSL/TLS.
    *   Proxy requests to your backend and serve static frontend files.
    *   Handle domain routing.
    *   Implement additional security headers (e.g., HSTS).

**Example Nginx Configuration:**
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration (Replace with your actual paths)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;

    # HSTS (Strict-Transport-Security)
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Frontend static files
    root /var/www/yourdomain.com/frontend/build; # Path to your frontend build directory
    index index.html index.htm;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:5000; # Or your backend container name/IP
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Error pages
    error_page 404 /404.html; # Customize your error pages
    location = /404.html {
        internal;
    }
}
```

## 4. CI/CD Integration

The provided `.github/workflows/ci.yml` is a starting point for GitHub Actions.

**A full CI/CD pipeline for production might involve:**

1.  **Push to `main` or Tag Release:**
    *   **Continuous Integration:**
        *   Run linting, unit tests, integration tests.
        *   Build backend Docker image.
        *   Build frontend static assets.
    *   **Continuous Deployment (Optional, after successful CI):**
        *   Push backend Docker image to registry.
        *   Trigger deployment to staging environment (e.g., Kubernetes, ECS, EC2).
        *   Run automated end-to-end (E2E) tests on staging.
        *   Upon manual approval or successful E2E, trigger deployment to production.
        *   Update Kubernetes manifests, Docker Compose files, or cloud provider services.
        *   Invalidate CDN cache for frontend.

**Key Steps in CI/CD:**

*   **Install Dependencies:** `npm install` for backend and frontend.
*   **Linting:** `npm run lint`.
*   **Testing:** `npm test` (for backend) and `react-scripts test` (for frontend).
*   **Build:**
    *   Backend: `npm run build` (TypeScript compilation), `docker build`.
    *   Frontend: `npm run build` (React build).
*   **Database Migrations:** Run `npx prisma migrate deploy` in an isolated step against the target database.
*   **Security Scans:** Integrate static application security testing (SAST) and dynamic application security testing (DAST) tools.
*   **Image Scanning:** Scan Docker images for vulnerabilities.

## 5. Monitoring and Alerting

*   **Application Logs:** Use Winston (already integrated) to send logs to a centralized logging solution (e.g., ELK Stack, Splunk, Datadog).
*   **Metrics:** Collect application metrics (response times, error rates, request counts) using Prometheus, DataDog, etc.
*   **Health Checks:** Configure health check endpoints (`/api/v1/health`) for load balancers and container orchestrators.
*   **Alerting:** Set up alerts for critical errors, high latency, high CPU/memory usage, and failed deployments.

By following these guidelines, you can establish a robust and secure deployment pipeline for your enterprise-grade application.
```