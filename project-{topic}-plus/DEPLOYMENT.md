# ScrapeFlow: Deployment Guide

This document provides a guide for deploying the ScrapeFlow application to a production environment. It covers general considerations and specific steps for deploying containerized applications.

## Table of Contents

1.  [Deployment Strategy Overview](#1-deployment-strategy-overview)
2.  [Prerequisites for Production](#2-prerequisites-for-production)
3.  [Configuration for Production](#3-configuration-for-production)
4.  [Building Production Images](#4-building-production-images)
5.  [Deployment to a Cloud Platform (General)](#5-deployment-to-a-cloud-platform-general)
    *   [Example: AWS ECS/EKS](#example-aws-ecseks)
    *   [Example: Google Cloud Run/GKE](#example-google-cloud-rungke)
6.  [Database Management in Production](#6-database-management-in-production)
7.  [Redis in Production](#7-redis-in-production)
8.  [CI/CD for Deployment](#8-cicd-for-deployment)
9.  [Post-Deployment Checklist](#9-post-deployment-checklist)
10. [Troubleshooting](#10-troubleshooting)

## 1. Deployment Strategy Overview

ScrapeFlow is designed for containerized deployment, leveraging Docker for consistent environments. The recommended approach for production is to use a container orchestration platform (e.g., Kubernetes, Amazon ECS, Google Kubernetes Engine) or managed container services (e.g., Google Cloud Run, AWS Fargate).

This guide assumes you will deploy:
*   **Backend API**: As a containerized service.
*   **Frontend SPA**: As a containerized web server (Nginx) serving static files.
*   **PostgreSQL**: As a managed database service (e.g., AWS RDS, Google Cloud SQL) or a highly available containerized instance.
*   **Redis**: As a managed caching/message broker service (e.g., AWS ElastiCache, Google Cloud Memorystore) or a highly available containerized instance.
*   **BullMQ Workers**: Separate containerized processes that run the scraping logic, scaling independently from the API.

## 2. Prerequisites for Production

*   **Cloud Provider Account**: AWS, Google Cloud, Azure, DigitalOcean, etc.
*   **Docker Registry**: Docker Hub, Amazon ECR, Google Container Registry, etc., to store your built Docker images.
*   **Domain Name**: For accessing your application via a friendly URL.
*   **SSL Certificate**: For secure HTTPS communication.
*   **CI/CD Pipeline**: Configured to automate builds, tests, and deployments (e.g., GitHub Actions, GitLab CI, Jenkins).

## 3. Configuration for Production

**Crucial: Never hardcode sensitive information.** All sensitive configurations must be managed via environment variables.

1.  **Update `.env` values**:
    *   `NODE_ENV=production`
    *   `PORT`: Ensure this matches the port your backend container will listen on.
    *   `BACKEND_URL`, `FRONTEND_URL`: Set to your production domain(s).
    *   **Database Credentials**: Use strong, unique passwords for `DB_USER`, `DB_PASSWORD`. Point `DB_HOST` to your managed PostgreSQL instance endpoint.
    *   **Redis Credentials**: Point `REDIS_HOST` to your managed Redis instance endpoint. If Redis requires authentication, add `REDIS_PASSWORD`.
    *   **JWT Secret**: Generate a very strong, long, random secret for `JWT_SECRET`. Store it securely (e.g., AWS Secrets Manager, Google Secret Manager).
    *   **Rate Limiting**: Adjust `RATE_LIMIT_MAX_REQUESTS` and `RATE_LIMIT_WINDOW_MS` according to expected production traffic.
    *   `BULLMQ_WORKER_CONCURRENCY`: Adjust based on the capacity of your worker instances and external rate limits of target websites.

2.  **Dockerfiles**: Ensure your `backend.Dockerfile` and `frontend.Dockerfile` are optimized for production:
    *   **Multi-stage builds**: Already implemented, ensuring only necessary artifacts and production dependencies are included.
    *   **Small base images**: Using `alpine` images for smaller footprint.
    *   **No development dependencies**: `npm install --only=production`.
    *   **Non-root user**: For enhanced security (consider adding a dedicated user in `Dockerfile`).

## 4. Building Production Images

You'll need to build your Docker images and push them to a Docker Registry. This is typically automated by your CI/CD pipeline.

```bash
# Example for backend
docker build -t your_registry/scrapeflow-backend:latest -f docker/backend.Dockerfile .
docker push your_registry/scrapeflow-backend:latest

# Example for frontend
docker build -t your_registry/scrapeflow-frontend:latest -f docker/frontend.Dockerfile .
docker push your_registry/scrapeflow-frontend:latest
```
Replace `your_registry` with your actual registry (e.g., `docker.io/your_docker_username`).

## 5. Deployment to a Cloud Platform (General)

Choose a cloud provider and a container orchestration service.

### General Steps:

1.  **Provision Managed Services**:
    *   **PostgreSQL**: Set up a managed PostgreSQL instance (AWS RDS, Google Cloud SQL, Azure Database for PostgreSQL). Configure backups, high availability, and network access (private subnets, security groups).
    *   **Redis**: Set up a managed Redis instance (AWS ElastiCache, Google Cloud Memorystore, Azure Cache for Redis). Configure security and replication.
    *   **Load Balancer/API Gateway**: For routing external traffic to your backend and frontend services.

2.  **Deploy Backend API**:
    *   Create a container service (e.g., AWS ECS Service, Kubernetes Deployment).
    *   Point it to your backend Docker image in the registry.
    *   Inject all necessary environment variables from your `.env` file (or a secret management service).
    *   Configure autoscaling policies.
    *   Ensure network security groups/firewall rules allow traffic from the frontend/load balancer and to the database/Redis.
    *   **Crucial for first deploy**: Run database migrations. This can be done as a pre-deployment step, an init container in Kubernetes, or a one-off command.
        `docker run --rm --network your_network_name your_registry/scrapeflow-backend:latest npm run typeorm:migration:run`

3.  **Deploy BullMQ Workers**:
    *   Deploy another container service using the *same backend Docker image*.
    *   The `CMD` for this worker container should specifically execute the BullMQ worker process, not the API server. For example: `node dist/worker.js` (you'd need a `worker.ts` entry point in your backend).
    *   Scale the number of worker instances independently based on job load.
    *   Ensure they have network access to Redis and PostgreSQL.

4.  **Deploy Frontend**:
    *   Deploy a container service using your Nginx-based frontend Docker image.
    *   Configure it to serve static files.
    *   Place it behind a load balancer with SSL termination.

5.  **Configure DNS and SSL**:
    *   Point your domain's A/CNAME records to your load balancer.
    *   Attach your SSL certificate to the load balancer for HTTPS.

### Example: AWS ECS/EKS

*   **Database**: AWS RDS (PostgreSQL)
*   **Redis**: AWS ElastiCache (Redis)
*   **Container Orchestration**:
    *   **ECS (Elastic Container Service)**: Use ECS Fargate (serverless) or EC2 instances for your Backend, Frontend, and Worker services. Define Task Definitions and Services.
    *   **EKS (Elastic Kubernetes Service)**: Deploy your services as Kubernetes Deployments, Services, and Ingress resources.
*   **Load Balancing**: AWS Application Load Balancer (ALB)
*   **Secret Management**: AWS Secrets Manager for JWT secret, DB passwords.
*   **Logging**: AWS CloudWatch Logs for container logs.

### Example: Google Cloud Run/GKE

*   **Database**: Google Cloud SQL (PostgreSQL)
*   **Redis**: Google Cloud Memorystore (Redis)
*   **Container Orchestration**:
    *   **Cloud Run**: For Backend API (if mostly stateless and scales to zero) and Frontend (if it can be served as a single container). Requires separate worker deployments.
    *   **GKE (Google Kubernetes Engine)**: Full Kubernetes cluster for all services.
*   **Load Balancing**: Google Cloud Load Balancer
*   **Secret Management**: Google Secret Manager.
*   **Logging**: Google Cloud Logging.

## 6. Database Management in Production

*   **Managed Services**: Strongly recommended for production databases. They handle backups, replication, patching, and scaling.
*   **Migrations**: Always run migrations as part of your deployment process. Ensure migrations are idempotent. It's often safer to run migrations as a separate step or a Kubernetes `Job` *before* deploying new application versions to prevent schema mismatches.
*   **Backups**: Configure automated daily backups with point-in-time recovery.
*   **Monitoring**: Set up alerts for database performance, connection issues, and storage usage.

## 7. Redis in Production

*   **Managed Services**: Use AWS ElastiCache, Google Cloud Memorystore, or Azure Cache for Redis for high availability and minimal operational overhead.
*   **Security**: Ensure Redis is not publicly accessible. Use VPC/private network access.
*   **Persistence**: If Redis data is critical for BullMQ job state, configure RDB snapshots or AOF persistence, or ensure your workers can gracefully handle Redis restarts.
*   **Monitoring**: Monitor Redis memory usage, connections, and latency.

## 8. CI/CD for Deployment

The `github/workflows/main.yml` provides a basic CI pipeline for building and testing. For full CI/CD, extend it to:

1.  **Build Docker Images**: Tag images with a unique ID (e.g., Git SHA, build number).
2.  **Push Images to Registry**: Authenticate with your Docker registry and push the built images.
3.  **Deploy to Environment**:
    *   **Development/Staging**: Deploy to a non-production environment for integration testing.
    *   **Production**: Trigger a production deployment (often manually or after approval) once staging tests pass. This could involve updating an ECS Service, a Kubernetes Deployment, or a Cloud Run service.
4.  **Post-Deployment Tests**: Run smoke tests or integration tests against the deployed application.

## 9. Post-Deployment Checklist

*   **Verify Application Health**: Access the frontend, perform common actions, check API endpoints.
*   **Check Logs**: Monitor application logs (backend, frontend, workers) for errors or warnings.
*   **Monitor Resources**: Check CPU, memory, network usage of all services.
*   **Database Connectivity**: Ensure the application can connect to the database.
*   **Redis Connectivity**: Ensure the application and workers can connect to Redis.
*   **Scheduled Jobs**: Verify that BullMQ workers are picking up and processing jobs as expected.
*   **Alerts**: Confirm monitoring and alerting systems are active and configured correctly.
*   **Backup**: Ensure database backups are running as scheduled.

## 10. Troubleshooting

*   **Container Logs**: Use `docker logs <container_name>` or your cloud provider's logging service (CloudWatch, Cloud Logging) to inspect logs.
*   **Network Issues**: Check security groups, firewall rules, and VPC configurations to ensure services can communicate.
*   **Environment Variables**: Double-check that all required environment variables are correctly set for each service in the production environment.
*   **Database Connection**: Verify database credentials, host, port, and user permissions.
*   **Redis Connection**: Verify Redis credentials, host, and port.
*   **Worker Idempotency**: If jobs are retried, ensure your scraping logic handles re-running tasks gracefully to avoid data duplication.
```