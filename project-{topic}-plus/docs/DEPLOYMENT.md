# E-commerce C++ API Deployment Guide

This document provides a comprehensive guide for deploying the E-commerce C++ API to a production environment. It covers local deployment with Docker Compose, and conceptual steps for cloud-native deployment.

## 1. Local Development / Staging Deployment (Docker Compose)

The easiest way to get the entire stack running is using Docker Compose. This is ideal for local development, testing, and staging environments.

### Steps:

1.  **Prerequisites**: Ensure Docker and Docker Compose are installed on your system.
2.  **Clone Repository**:
    ```bash
    git clone https://github.com/your-username/ecommerce-cpp.git
    cd ecommerce-cpp
    ```
3.  **Configure Environment**:
    *   Copy `config/.env.example` to `config/.env`.
    *   **Edit `config/.env`**: Fill in all necessary environment variables. **Ensure `JWT_SECRET` is strong and unique.**
    ```bash
    cp config/.env.example config/.env
    # nano config/.env # Edit the file
    ```
4.  **Build and Run Services**:
    ```bash
    docker-compose -f docker/docker-compose.yml up --build -d
    ```
    *   `--build`: This forces Docker to rebuild the `app` image. Use it after any code changes or when deploying a new version.
    *   `-d`: Runs containers in detached mode (background).
5.  **Verify Deployment**:
    *   Check container status: `docker-compose ps`
    *   View logs: `docker-compose logs -f app`
    *   Access the API: Open `http://localhost:8080` in your browser or use `curl`.
6.  **Stop and Clean Up**:
    ```bash
    docker-compose -f docker/docker-compose.yml down
    ```
    *   `docker-compose down -v` will also remove volumes (database data, Redis data), which is useful for a clean start.

## 2. Production Deployment (Cloud-Native Example: AWS ECS/Kubernetes)

For a production environment, container orchestration platforms like Amazon ECS, Google Kubernetes Engine (GKE), or self-managed Kubernetes are recommended. This section outlines a conceptual deployment to AWS ECS.

### 2.1. Prerequisites for Cloud Deployment

*   An AWS account with appropriate IAM permissions.
*   AWS CLI installed and configured.
*   Docker installed locally for building and pushing images.
*   **Security Best Practices**:
    *   Ensure all secrets (like `JWT_SECRET`, database credentials) are managed securely (e.g., AWS Secrets Manager, Kubernetes Secrets, HashiCorp Vault). **Never hardcode secrets.**
    *   Use strong, unique passwords for the database.
    *   Implement network security groups/firewalls to restrict access to database and Redis only from the application.
    *   Enable HTTPS with SSL/TLS certificates for all public-facing endpoints.

### 2.2. Steps:

1.  **Build and Tag Docker Image**:
    *   Build the C++ application Docker image. Replace `your-registry`, `your-repository`, and `your-tag` with actual values.
    *   The tag could be `latest`, `git-commit-sha`, or a semantic version (e.g., `v1.0.0`).
    ```bash
    docker build -t your-registry/your-repository:your-tag -f docker/Dockerfile .
    ```
2.  **Push Docker Image to Container Registry**:
    *   Login to your container registry (e.g., AWS ECR).
    ```bash
    aws ecr get-login-password --region your-aws-region | docker login --username AWS --password-stdin your-registry-url
    docker push your-registry/your-repository:your-tag
    ```
3.  **Provision Infrastructure (Manual or IaC)**:
    *   **Networking**: Set up a VPC, subnets, internet gateways, NAT gateways (if private subnets).
    *   **Database (PostgreSQL)**: Deploy a managed database service (e.g., AWS RDS PostgreSQL). Configure security groups to allow traffic only from the application's private subnets.
    *   **Cache (Redis)**: Deploy a managed Redis service (e.g., AWS ElastiCache for Redis). Configure security groups similarly.
    *   **Container Orchestration**:
        *   **AWS ECS**: Create an ECS Cluster, Task Definition (referencing your Docker image, CPU/Memory, network mode), and ECS Service (defining desired count, load balancer, etc.).
        *   **Kubernetes**: Define `Deployment`, `Service`, `Ingress` resources.
    *   **Load Balancer**: Place an Application Load Balancer (ALB) in front of your ECS Service/Kubernetes Pods. Configure listener rules and target groups.
    *   **CDN/WAF**: Optionally, integrate a CDN (e.g., AWS CloudFront) and a Web Application Firewall (WAF) for DDoS protection and advanced security.

4.  **Configure Environment Variables/Secrets**:
    *   For ECS, pass environment variables via the Task Definition or use AWS Secrets Manager.
    *   For Kubernetes, use `ConfigMaps` for non-sensitive data and `Secrets` for sensitive data.
    *   **Ensure `JWT_SECRET` and DB credentials are securely stored and injected.**

5.  **Deploy Application Service**:
    *   **AWS ECS**: Update the ECS Service to use the new Task Definition (with the updated image tag).
    *   **Kubernetes**: Apply your updated Deployment manifests (`kubectl apply -f deployment.yaml`).

6.  **Setup CI/CD Pipeline (GitHub Actions)**:
    *   As outlined in `.github/workflows/build_test_deploy.yml`, automate the build, test, and deployment process.
    *   The pipeline should:
        *   Checkout code.
        *   Run unit, integration, and API tests.
        *   Build the Docker image.
        *   Push the image to ECR/Docker Hub.
        *   Deploy the updated service to ECS/Kubernetes.
    *   This ensures that only thoroughly tested code reaches production and automates the deployment steps.

### 2.3. Monitoring and Logging

*   **Centralized Logging**: Integrate `spdlog` output with a centralized logging solution (e.g., AWS CloudWatch Logs, ELK Stack, Splunk). This allows aggregation, searching, and analysis of logs from all instances.
*   **Metrics & Dashboards**: Use monitoring tools to collect metrics (CPU, memory, network I/O, application-specific metrics like request count, error rates, latency).
    *   **AWS**: CloudWatch Metrics, X-Ray for tracing.
    *   **Kubernetes**: Prometheus and Grafana.
*   **Alerting**: Set up alerts for critical issues (e.g., high error rates, service downtime, resource exhaustion).

### 2.4. Maintenance & Operations

*   **Regular Updates**: Keep OS, libraries, and dependencies updated to patch security vulnerabilities and get performance improvements.
*   **Backup & Recovery**: Implement regular database backups and have a disaster recovery plan.
*   **Scalability Testing**: Regularly perform load/stress tests to ensure the application can handle anticipated traffic.
*   **Security Audits**: Conduct periodic security audits and penetration testing.

## 3. Frontend Deployment

This document focuses on the C++ backend. The frontend (e.g., a React, Vue, or Angular SPA) would be deployed separately (e.g., to AWS S3 + CloudFront, Netlify, Vercel). It would be configured to point to the deployed C++ API's public URL.