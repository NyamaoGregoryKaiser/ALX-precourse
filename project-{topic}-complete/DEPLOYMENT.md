# ML Utilities System (MLU-Sys) - Deployment Guide

This guide provides instructions for deploying the ML Utilities System to various environments, focusing on production-ready practices.

## 1. Production Deployment Overview

For production, the recommended approach is to deploy the application as Docker containers orchestrated by a platform like Kubernetes or a managed container service (e.g., AWS ECS, Google Cloud Run). Key aspects of a production deployment include:

*   **Containerization**: Using Docker images for backend and frontend for consistency.
*   **Orchestration**: Kubernetes, AWS ECS, Google Cloud Run, etc., for managing container lifecycles, scaling, and networking.
*   **Database**: Managed PostgreSQL service (e.g., AWS RDS, Google Cloud SQL) for reliability, backups, and scalability.
*   **Cache**: Managed Redis service (e.g., AWS ElastiCache, Google Cloud Memorystore) for high availability.
*   **File Storage**: Cloud object storage (e.g., AWS S3, Google Cloud Storage) for datasets and models, instead of local filesystem.
*   **Reverse Proxy/Load Balancer**: Nginx (or cloud-native load balancers) for SSL termination, load distribution, and routing.
*   **Environment Variables**: Secure management of secrets (e.g., using Kubernetes Secrets, AWS Secrets Manager, Vault).
*   **Monitoring & Logging**: Centralized logging (e.g., ELK Stack, CloudWatch, Stackdriver) and monitoring (Prometheus, Grafana, CloudWatch).
*   **CI/CD Pipeline**: Automating builds, tests, image pushes, and deployments.

## 2. Preparing for Production

### 2.1. Environment Configuration

1.  **Create Production `.env` files:**
    *   `backend/.env.production`
    *   `frontend/.env.production`

2.  **Update `backend/.env.production`:**
    *   `NODE_ENV=production`
    *   `PORT=3000`
    *   `API_GLOBAL_PREFIX=api/v1`
    *   **Database**: Use credentials for your managed PostgreSQL instance.
        ```dotenv
        DATABASE_HOST=your-rds-endpoint.com
        DATABASE_PORT=5432
        DATABASE_USERNAME=produser
        DATABASE_PASSWORD=strongProdPassword!
        DATABASE_NAME=ml_utilities_prod_db
        ```
    *   **JWT Secret**: Generate a very strong, unique secret.
        ```dotenv
        JWT_SECRET=superMegaStrongAndRandomSecretKeyForProd!@#$
        JWT_EXPIRES_IN=1d
        ```
    *   **Redis**: Use credentials for your managed Redis instance.
        ```dotenv
        REDIS_HOST=your-elasticache-endpoint.com
        REDIS_PORT=6379
        ```
    *   **File Storage**: **CRITICAL**. In production, `UPLOAD_PATH` should point to a mounted cloud storage solution or be entirely replaced by direct S3/GCS integration. For this guide, we assume a local volume mount for simplicity in early stages, but strongly recommend cloud object storage.
        ```dotenv
        UPLOAD_PATH=/var/mlu-sys-data/uploads # Persistent volume mount point
        # OR: S3_BUCKET=your-mlu-sys-bucket, GCS_BUCKET=...
        ```
    *   **Admin User Seed**: Ensure these are set for initial setup.
        ```dotenv
        ADMIN_EMAIL=prod-admin@example.com
        ADMIN_PASSWORD=veryStrongAdminPassword123!
        ```

3.  **Update `frontend/.env.production`:**
    *   Point `VITE_API_BASE_URL` to your deployed backend's public URL.
        ```dotenv
        VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
        ```

### 2.2. Database & Cache Services

Provision managed services for PostgreSQL and Redis in your cloud provider of choice (AWS RDS/Aurora, Google Cloud SQL, Azure Database for PostgreSQL for DB; AWS ElastiCache, Google Cloud Memorystore, Azure Cache for Redis for Cache). Configure security groups/firewalls to allow connections only from your application servers.

### 2.3. File Storage

**Strongly recommended**: Replace local file storage with cloud object storage (AWS S3, Google Cloud Storage, Azure Blob Storage).

*   **Backend Changes**:
    *   Modify `FilesService` to use a cloud storage SDK (e.g., `@aws-sdk/client-s3`).
    *   Update `UPLOAD_PATH` related configurations in `backend/.env.production` to `S3_BUCKET`, `AWS_REGION`, etc.
    *   Ensure your application's IAM role/service account has permissions to access the bucket.

## 3. CI/CD Pipeline (GitHub Actions)

The `.github/workflows/ci.yml` file provides a basic CI workflow. For CD, you'd extend this.

### 3.1. `ci.yml` (Example for Production Deployment)

```yaml