# Deployment Guide: Enterprise Task Management System

This guide outlines the steps to deploy the Task Management System to a production environment. The recommended approach involves containerization with Docker and orchestration with Kubernetes for scalability and reliability.

## 1. Prerequisites

*   **Docker & Docker Compose**: For local development and testing, and for building container images.
*   **Cloud Provider Account**: AWS, Google Cloud, Azure, DigitalOcean, etc.
*   **Kubernetes Cluster**: A managed Kubernetes service (EKS, GKE, AKS, DigitalOcean Kubernetes) is highly recommended.
*   **Helm**: Kubernetes package manager for deploying applications.
*   **kubectl**: Kubernetes command-line tool.
*   **GitLab CI/CD Runner**: Configured to build Docker images and interact with your Kubernetes cluster (if using GitLab CI).
*   **Domain Name**: Configured with DNS records pointing to your load balancer.
*   **SSL Certificates**: For HTTPS (e.g., Let's Encrypt, Cloudflare, AWS ACM).

## 2. Docker Images

Ensure your Docker images are built and pushed to a container registry (e.g., Docker Hub, GitLab Container Registry, AWS ECR).

**Build and Push Backend Image:**

```bash
cd task-management-system/server
docker build -t your-registry/task-management-backend:latest .
docker push your-registry/task-management-backend:latest
```

**Build and Push Frontend Image:**

```bash
cd task-management-system/client
docker build -f Dockerfile.client -t your-registry/task-management-frontend:latest .
docker push your-registry/task-management-frontend:latest
```
Replace `your-registry` with your actual container registry path.

## 3. Environment Configuration

### 3.1. `.env` file

The `.env` file should contain all sensitive information and environment-specific settings. For production, these should be managed as Kubernetes Secrets or environment variables in your deployment system, not directly committed to version control.

**Critical Production Variables:**
*   `NODE_ENV=production`
*   `DB_HOST`: Address of your managed PostgreSQL instance.
*   `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
*   `JWT_SECRET`: A very strong, long, random secret.
*   `REDIS_HOST`: Address of your managed Redis instance.
*   `REDIS_PORT`, `REDIS_PASSWORD`
*   `CORS_ORIGINS`: Production frontend URL(s) (e.g., `https://yourdomain.com`).

### 3.2. Database and Redis Provisioning

Provision managed instances of PostgreSQL and Redis from your cloud provider.
*   **PostgreSQL**: Configure backups, replication, and high availability.
*   **Redis**: Configure persistence (AOF/RDB) and replication for high availability.
*   **Network Security**: Ensure these services are only accessible from your backend application instances (e.g., via private VPC networks, security groups).

## 4. Kubernetes Deployment (Recommended)

Using Helm charts is the standard way to deploy complex applications to Kubernetes.

### 4.1. Helm Chart Structure (Conceptual)

Create a `helm-chart/` directory in your project root with the following structure:

```
helm-chart/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── deployment-backend.yaml
│   ├── service-backend.yaml
│   ├── ingress.yaml
│   ├── deployment-frontend.yaml
│   ├── service-frontend.yaml
│   └── secrets.yaml  # Kubernetes Secrets for sensitive env vars
└── _helpers.tpl
```

### 4.2. Kubernetes Secrets

Instead of passing sensitive variables directly in deployments, use Kubernetes Secrets.

**Example `secrets.yaml` (within `helm-chart/templates/`):**

```yaml
# secrets.yaml (conceptual)
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "task-management.fullname" . }}-backend-secrets
type: Opaque
data:
  DB_PASSWORD: {{ .Values.backend.env.DB_PASSWORD | b64enc }}
  JWT_SECRET: {{ .Values.backend.env.JWT_SECRET | b64enc }}
  REDIS_PASSWORD: {{ .Values.backend.env.REDIS_PASSWORD | b64enc }}
# Add other sensitive variables here
```
Then, reference these secrets in your `deployment-backend.yaml`.

### 4.3. Deployment Configuration

**Example `deployment-backend.yaml` (within `helm-chart/templates/`):**

```yaml
# deployment-backend.yaml (conceptual)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "task-management.fullname" . }}-backend
  labels:
    {{- include "task-management.labels" . | nindent 4 }}
    app.kubernetes.io/component: backend
spec:
  replicas: {{ .Values.backend.replicaCount }}
  selector:
    matchLabels:
      {{- include "task-management.selectorLabels" . | nindent 6 }}
      app.kubernetes.io/component: backend
  template:
    metadata:
      labels:
        {{- include "task-management.selectorLabels" . | nindent 8 }}
        app.kubernetes.io/component: backend
    spec:
      containers:
        - name: backend
          image: "{{ .Values.backend.image.repository }}:{{ .Values.backend.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.backend.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.backend.service.port }}
              protocol: TCP
          env:
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "{{ .Values.backend.service.port }}"
            - name: DB_HOST
              value: "{{ .Values.backend.env.DB_HOST }}"
            - name: DB_PORT
              value: "{{ .Values.backend.env.DB_PORT }}"
            - name: DB_USER
              value: "{{ .Values.backend.env.DB_USER }}"
            - name: DB_NAME
              value: "{{ .Values.backend.env.DB_NAME }}"
            - name: REDIS_HOST
              value: "{{ .Values.backend.env.REDIS_HOST }}"
            - name: REDIS_PORT
              value: "{{ .Values.backend.env.REDIS_PORT }}"
            - name: CORS_ORIGINS
              value: "{{ .Values.backend.env.CORS_ORIGINS }}"
            # Reference secrets
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: {{ include "task-management.fullname" . }}-backend-secrets
                  key: DB_PASSWORD
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: {{ include "task-management.fullname" . }}-backend-secrets
                  key: JWT_SECRET
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: {{ include "task-management.fullname" . }}-backend-secrets
                  key: REDIS_PASSWORD
          livenessProbe:
            httpGet:
              path: /v1/health # Implement a health check endpoint
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /v1/health
              port: http
            initialDelaySeconds: 15
            periodSeconds: 5
          resources:
            {{- toYaml .Values.backend.resources | nindent 12 }}
```

### 4.4. Ingress for External Access

An Ingress resource exposes your services to the outside world, managing external access to services in a cluster, typically HTTP.

**Example `ingress.yaml` (within `helm-chart/templates/`):**

```yaml
# ingress.yaml (conceptual)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "task-management.fullname" . }}
  labels:
    {{- include "task-management.labels" . | nindent 4 }}
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: "letsencrypt-prod" # If using cert-manager for SSL
    nginx.ingress.kubernetes.io/proxy-body-size: "10m" # Example annotation
spec:
  tls:
    - hosts:
        - {{ .Values.ingress.host }}
      secretName: {{ .Values.ingress.tlsSecretName }} # Managed by cert-manager or manual
  rules:
    - host: {{ .Values.ingress.host }}
      http:
        paths:
          - path: /v1(/|$)(.*) # Path for backend API
            pathType: Prefix
            backend:
              service:
                name: {{ include "task-management.fullname" . }}-backend
                port:
                  number: {{ .Values.backend.service.port }}
          - path: /
            pathType: Prefix
            backend:
              service:
                name: {{ include "task-management.fullname" . }}-frontend
                port:
                  number: {{ .Values.frontend.service.port }}
```

### 4.5. Helm Deployment Steps

1.  **Install Helm Chart:**
    ```bash
    helm upgrade --install task-management ./helm-chart \
      --namespace task-management \
      --create-namespace \
      -f values-production.yaml # Or provide values directly via --set
    ```
2.  **Run Database Migrations in Kubernetes:**
    This is a critical step and should be done carefully. You can use a Kubernetes Job:
    ```bash
    # Create a temporary pod to run migrations
    kubectl run migration-pod --image=your-registry/task-management-backend:latest \
      --restart=Never --command -- npm run migrate \
      --env="DB_HOST=your_db_host" --env="DB_USER=..." --envFrom=secret/your-backend-secrets

    # Wait for completion and check logs
    kubectl logs -f migration-pod

    # Delete the migration pod
    kubectl delete pod migration-pod
    ```
    Alternatively, you can integrate a pre-install/pre-upgrade Helm hook for migrations.

## 5. CI/CD Integration

The provided `.gitlab-ci.yml` demonstrates a basic CI/CD pipeline for:
*   Building Docker images for backend and frontend.
*   Pushing images to GitLab Container Registry.
*   Running backend tests.
*   (Manual) deployment to staging and production environments using Helm.

**Key considerations for CI/CD:**
*   **Automated Tests**: All unit, integration, and API tests should run automatically.
*   **Code Quality**: Integrate linters, static analysis tools.
*   **Security Scans**: Include dependency vulnerability scans (`npm audit`), container image scanning (e.g., Trivy), and SAST/DAST tools.
*   **Environment Parity**: Ensure your CI/CD and deployment environments closely match production.
*   **Secrets Management**: Integrate with a secure secrets management system (e.g., Vault, AWS Secrets Manager) instead of storing secrets in CI/CD variables directly if not absolutely necessary.

## 6. Post-Deployment Checks

*   **Access Application**: Verify the frontend is accessible via your domain.
*   **API Health**: Check backend API endpoints (e.g., `/v1/health` if implemented).
*   **Logs**: Monitor application logs for errors or unusual activity.
*   **Metrics**: Monitor performance metrics (CPU, Memory, Request Latency).
*   **Functionality**: Perform smoke tests to ensure core features work.

This guide provides a robust framework for deploying your enterprise-grade application securely and efficiently. Remember to adapt it to your specific cloud provider and organizational requirements.