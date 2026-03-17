```markdown
# 🚀 Deployment Guide

This document provides instructions on how to deploy the Web Scraping Tools System to a production environment. The recommended approach involves using Docker and a cloud provider.

## 1. Prerequisites

Before deploying, ensure you have:

*   **Cloud Provider Account**: (e.g., AWS, Google Cloud, Azure, Heroku, DigitalOcean).
*   **Domain Name**: (Optional but recommended for production).
*   **Git Repository**: Your code pushed to a version control system (e.g., GitHub, GitLab).
*   **Docker & Docker Compose**: Installed locally for testing build process.
*   **CI/CD Pipeline Configuration**: (Optional, but highly recommended for automation).
*   **Environment Variables**: Prepared for your production environment (e.g., database credentials, JWT secret, etc.). **Do NOT commit your `.env` file to version control.**

## 2. Prepare for Production

### 2.1. Environment Variables

Create a separate set of environment variables for your production environment. These should be managed by your deployment platform (e.g., AWS Parameter Store, Kubernetes Secrets, Docker Secrets, Heroku Config Vars).

**Crucially**:
*   **`NODE_ENV=production`**: This enables production-specific optimizations and logging.
*   **`JWT_SECRET`**: Generate a *strong*, unique, and random secret for production.
*   **`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`**: Use credentials for your production PostgreSQL instance.
*   **`DB_SSL=true`**: Most cloud-hosted databases require SSL. Configure this correctly for your provider.
*   **Other sensitive keys**: Ensure they are securely managed.

### 2.2. Build the Docker Image

Build the Docker image locally to verify it works:

```bash
docker build -t web-scraping-system:latest .
```

This will run the multi-stage build defined in `Dockerfile`, creating a lean production image.

### 2.3. Database Provisioning

Provision a managed PostgreSQL database service from your chosen cloud provider (e.g., AWS RDS, Google Cloud SQL, Azure Database for PostgreSQL).
*   Ensure it's in the same region/network as your application for low latency.
*   Configure network access (security groups/firewall rules) to allow connections from your application.
*   Note down the connection details (host, port, user, password, database name) for your production `.env` variables.

## 3. Deployment Steps (General Approach)

The specific steps will vary based on your cloud provider, but here's a general workflow:

### 3.1. Container Orchestration (e.g., Docker Swarm, Kubernetes, AWS ECS, GCP Cloud Run)

1.  **Push Docker Image**: Tag your Docker image and push it to a container registry (e.g., Docker Hub, AWS ECR, Google Container Registry).
    ```bash
    docker tag web-scraping-system:latest your-registry/web-scraping-system:v1.0.0
    docker push your-registry/web-scraping-system:v1.0.0
    ```
2.  **Deploy Application Service**:
    *   Create a new service/deployment using your container orchestration platform.
    *   Point to the Docker image in your registry.
    *   **Configure Environment Variables**: Inject your production environment variables (e.g., `JWT_SECRET`, `DB_HOST`, etc.) into the container runtime. This is critical for security and configuration.
    *   **Port Mapping**: Map the container's exposed port (e.g., `3000`) to a public port.
    *   **Scaling**: Configure desired instance count for high availability and load balancing.
    *   **Health Checks**: Set up health checks (e.g., `GET /health` endpoint) to ensure the service is running correctly.
3.  **Network Configuration**:
    *   Set up a load balancer in front of your application instances.
    *   Configure DNS records to point your domain (e.g., `api.yourdomain.com`) to the load balancer.
    *   Enable HTTPS/SSL termination at the load balancer.

### 3.2. Initial Database Setup on Production DB

After provisioning your production PostgreSQL instance:

1.  **Connect to DB**: Use a database client (e.g., `psql`, DBeaver, DataGrip) or your cloud provider's console to connect to your production database.
2.  **Run Migrations**: Execute the database migrations to create the necessary tables. You can do this by temporarily `docker exec` into a running backend container (if in a shell), or typically via a CI/CD step:
    ```bash
    # Example command to run from your deployment environment
    # Ensure you replace 'backend-container-name' with your actual container name/ID
    docker exec <backend-container-name> npm run migration:run
    ```
3.  **Seed Data (Optional)**: If you have essential lookup data or an initial admin user that must exist in production, run the seeding script:
    ```bash
    # Example command
    docker exec <backend-container-name> npm run seed:run
    ```
    **Caution**: Be careful with seeding scripts in production to avoid overwriting live data. Only seed data that is idempotent or only for initial setup.

## 4. CI/CD Pipeline (Example with GitHub Actions)

A CI/CD pipeline automates the process of building, testing, and deploying your application. Here's a conceptual `main.yml` for GitHub Actions:

```yaml
# .github/workflows/main.yml
name: CI/CD Pipeline

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm install

      - name: Lint code
        run: npm run lint

      - name: Build TypeScript
        run: npm run build

      - name: Start PostgreSQL (for integration/API tests)
        run: docker-compose -f docker-compose.test.yml up -d db # You might need a separate docker-compose for tests

      - name: Wait for DB to be ready
        run: sleep 15 # Adjust as needed for your DB to start

      - name: Run migrations
        run: docker exec <test-db-container-name> npm run migration:run # Adjust for your test DB

      - name: Run tests
        env:
          NODE_ENV: test
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USER: postgres
          DB_PASSWORD: password
          DB_NAME: test_db # Use a dedicated test database
          JWT_SECRET: test_secret
          # ... other test environment variables
        run: npm test

      - name: Stop PostgreSQL
        if: always() # Ensure this runs even if tests fail
        run: docker-compose -f docker-compose.test.yml down

  deploy:
    runs-on: ubuntu-latest
    needs: build-and-test # Only deploy if build and tests pass
    if: github.ref == 'refs/heads/main' # Only deploy from main branch

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Build and push Docker image to Registry
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      - run: |
          docker build -t your-registry/web-scraping-system:${{ github.sha }} .
          docker push your-registry/web-scraping-system:${{ github.sha }}

      - name: Deploy to Cloud Provider
        # This step is highly specific to your cloud provider (e.g., AWS ECS, GCP Cloud Run)
        # Example for AWS ECS:
        # uses: aws-actions/amazon-ecs-deploy@v1
        # with:
        #   task-definition: your-task-definition.json
        #   service: your-ecs-service
        #   cluster: your-ecs-cluster
        #   image: your-registry/web-scraping-system:${{ github.sha }}
        #
        # Example for Google Cloud Run:
        # uses: google-github-actions/deploy-cloudrun@v1
        # with:
        #   service: web-scraping-service
        #   image: your-registry/web-scraping-system:${{ github.sha }}
        #   env_vars: |
        #     DB_HOST=${{ secrets.PROD_DB_HOST }}
        #     DB_USER=${{ secrets.PROD_DB_USER }}
        #     JWT_SECRET=${{ secrets.PROD_JWT_SECRET }}
        #     # ... and all other production env vars
        run: |
          echo "Simulating deployment to production..."
          echo "Image: your-registry/web-scraping-system:${{ github.sha }}"
          # Replace with actual deployment commands for your cloud provider
```

## 5. Post-Deployment Checks

*   **Verify Logs**: Check application logs (`docker-compose logs backend` locally, or your cloud provider's logging service) for any errors.
*   **Health Check**: Access the `/health` endpoint (e.g., `https://api.yourdomain.com/health`) to ensure the service is running.
*   **API Tests**: Run a few basic API calls (e.g., login, create project) to confirm functionality.
*   **Monitoring**: Ensure your monitoring tools are collecting metrics and logs.

## 6. Scaling Considerations

*   **Backend Service**: Since the backend is stateless (JWT for sessions), you can easily scale it horizontally by running multiple instances behind a load balancer.
*   **Database**: For high traffic, consider read replicas for your PostgreSQL database.
*   **Scraping Workers**: For very heavy scraping loads, consider refactoring the `ScraperService` to run as separate worker processes, decoupled from the main API via a message queue (e.g., Redis Queue, RabbitMQ, AWS SQS/Lambda). This allows independent scaling of scraping tasks.
*   **Puppeteer Resources**: Running many Puppeteer instances can be resource-intensive. Optimize Puppeteer settings (e.g., headless mode, request blocking) and scale resources (CPU/RAM) for your scraping workers.

By following these guidelines, you can achieve a robust and scalable deployment of your web scraping tools system.
```