```markdown
# Deployment Guide - Task Management System

This document provides instructions for deploying the C++ Task Management System to various environments, with a focus on Docker and CI/CD best practices.

## 1. Local Deployment (Development)

For local development and testing, you can run the application directly from the build folder or using Docker Compose.

### (a) Run Directly

1.  **Build the application**: Follow the instructions in `README.md` under "Setup and Installation" -> "Build from Source".
2.  **Configure `.env`**: Ensure your `.env` file is set up with local database paths and other settings.
3.  **Run**:
    ```bash
    cd build
    ./TaskManagementSystem
    ```
    The server will start on `http://localhost:18080` (or the port specified in `.env`).

### (b) Docker Compose

This is the recommended approach for local development as it provides a consistent environment.

1.  **Ensure Docker is running**:
    ```bash
    systemctl start docker # On Linux
    # Or start Docker Desktop on macOS/Windows
    ```
2.  **Build and run**:
    ```bash
    docker-compose up --build
    ```
    This command will:
    *   Build the Docker image (`Dockerfile`).
    *   Create and start a container named `task-management-system`.
    *   Map port `18080` from the container to `18080` on your host.
    *   Mount the `db` directory for persistent database storage and logs for log persistence.
    *   The application inside the container will use the `.env` file from the host.

3.  **Access the application**: `http://localhost:18080`
4.  **Stop and clean up**:
    ```bash
    docker-compose down
    ```
    To also remove volumes (including database file):
    ```bash
    docker-compose down -v
    ```

## 2. Production Deployment (General Principles)

For production, several considerations are crucial for security, reliability, and scalability.

### (a) Server Environment

*   **Operating System**: Linux (e.g., Ubuntu, CentOS) is recommended for server deployments.
*   **Resource Allocation**: Allocate sufficient CPU, memory, and disk space based on expected load.
*   **Security**: Ensure the server is hardened, with necessary firewall rules (only expose required ports), SSH key-based access, and regular security updates.

### (b) Database Strategy

*   **SQLite for Production**: While SQLite is used for simplicity, it's generally **not recommended for high-concurrency production environments** due to its file-based nature and potential for write contention.
*   **Recommended Production Database**: For robust production deployments, consider a client-server relational database like:
    *   **PostgreSQL**: Open-source, highly reliable, feature-rich.
    *   **MySQL**: Popular, good performance, large community.
*   **Migration**: If switching databases, the `Database` class abstraction should help, but schema and SQL queries would need adaptation.

### (c) Container Orchestration

For scalable and resilient deployments, use a container orchestration platform:

*   **Kubernetes (K8s)**: Industry standard for managing containerized workloads. It provides features like:
    *   **Automated Scaling**: Scale instances of the C++ backend horizontally.
    *   **Self-Healing**: Automatically restart failed containers.
    *   **Load Balancing**: Distribute traffic across healthy instances.
    *   **Service Discovery**: Easily connect application components.
    *   **Secrets Management**: Securely store JWT_SECRET and database credentials.
*   **Docker Swarm**: A simpler alternative to Kubernetes for smaller deployments.

### (d) Reverse Proxy and HTTPS

The C++ Crow application does not directly handle HTTPS. For production, a reverse proxy is essential:

*   **Nginx / Caddy**: Popular choices for reverse proxies.
*   **Responsibilities**:
    *   **HTTPS Termination**: Handle SSL/TLS certificates and encrypt/decrypt traffic.
    *   **Load Balancing**: Distribute requests to multiple backend C++ instances.
    *   **Static File Serving**: Serve static assets (if any, not applicable to this purely backend app).
    *   **Rate Limiting / WAF**: Additional layers of security and traffic management.

### (e) Monitoring and Logging

*   **Centralized Logging**: Ship logs from containers (using `spdlog`'s file sink) to a centralized logging system (e.g., ELK Stack - Elasticsearch, Logstash, Kibana; Grafana Loki; Splunk).
*   **Application Monitoring**: Use Prometheus and Grafana for collecting metrics (CPU, memory, network I/O, request latency, error rates) and visualizing dashboards.
*   **Health Checks**: Configure `/health` endpoint for load balancers and orchestrators to check application health.

### (f) Environment Variables Management

*   **DO NOT commit production secrets to version control.**
*   **Kubernetes Secrets**: Use Kubernetes Secrets for sensitive information like `JWT_SECRET`, database credentials, etc.
*   **Vault (HashiCorp)**: For more advanced secret management.
*   **CI/CD Variables**: Store secrets as encrypted variables in your CI/CD pipeline.

## 3. CI/CD Pipeline (GitHub Actions Example)

The `.github/workflows/main.yml` file defines a basic GitHub Actions workflow.

### (a) Workflow Steps (Conceptual)

1.  **Trigger**: On `push` to `main` branch or `pull_request`.
2.  **Build**:
    *   Checkout code.
    *   Install CMake, C++ compiler.
    *   Build the C++ application (e.g., `cmake .. && make`).
3.  **Test**:
    *   Run unit tests (`./build/unit_tests`).
    *   Run integration tests (`./build/integration_tests`).
    *   Report test coverage (e.g., using `gcovr` or `lcov`).
4.  **Containerize**:
    *   Login to Docker Hub (or other container registry).
    *   Build Docker image (`docker build -t your-registry/repo:latest .`).
    *   Push Docker image.
5.  **Deploy (Staging/Production)**:
    *   **Staging**: Automatically deploy to a staging environment upon successful build/test/push to `main`. This could involve `kubectl apply` for Kubernetes, `ssh` and `docker pull/run` for a simple Docker host.
    *   **Production**: Require a manual approval step for deployment to production.

### (b) `.github/workflows/main.yml`

This file illustrates a basic CI/CD pipeline using GitHub Actions.

```yaml
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
      with:
        submodules: true # To fetch Crow, nlohmann/json, spdlog if needed via FetchContent

    - name: Install dependencies
      run: |
        sudo apt-get update
        sudo apt-get install -y cmake build-essential libsqlite3-dev

    - name: Create build directory
      run: mkdir build

    - name: Configure CMake
      working-directory: ./build
      run: cmake .. -DCMAKE_BUILD_TYPE=Release

    - name: Build application
      working-directory: ./build
      run: make -j$(nproc)

    - name: Run unit tests
      working-directory: ./build
      run: ./unit_tests

    - name: Run integration tests
      working-directory: ./build
      run: ./integration_tests

    - name: Upload test results
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: test-results
        path: ./build/test-results.xml # Assuming tests output to JUnit XML

  docker-build-and-push:
    needs: build-and-test
    if: success() && github.ref == 'refs/heads/main' # Only build/push on successful main branch builds
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Docker login
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}

    - name: Build Docker image
      run: docker build -t ${{ secrets.DOCKER_USERNAME }}/task-management-system:latest .

    - name: Push Docker image
      run: docker push ${{ secrets.DOCKER_USERNAME }}/task-management-system:latest

  deploy-staging:
    needs: docker-build-and-push
    if: success() && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment:
      name: Staging
      url: http://staging.example.com # Replace with your staging URL

    steps:
    - name: Deploy to staging (Conceptual)
      run: |
        echo "Deploying latest image to staging environment..."
        # Example: kubectl apply -f kubernetes/staging-deployment.yaml
        # Example: ssh user@staging.server "docker pull ${{ secrets.DOCKER_USERNAME }}/task-management-system:latest && docker stop task_manager && docker rm task_manager && docker run -d --name task_manager -p 18080:18080 ${{ secrets.DOCKER_USERNAME }}/task-management-system:latest"
        echo "Deployment to staging complete."

  deploy-production:
    needs: deploy-staging
    if: success() && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment:
      name: Production
      url: http://api.example.com # Replace with your production URL

    steps:
    - name: Manual approval for production deployment
      uses: trstringer/manual-approval@v1
      with:
        secret: ${{ github.TOKEN }}
        authorized_actors: your-github-username # Or a team slug: your-org/your-team
        timeout_minutes: 60

    - name: Deploy to production (Conceptual)
      run: |
        echo "Deploying latest image to production environment..."
        # Example: kubectl apply -f kubernetes/production-deployment.yaml
        # Example: ssh user@production.server "docker pull ${{ secrets.DOCKER_USERNAME }}/task-management-system:latest && docker restart task_manager_prod"
        echo "Deployment to production complete."
```
---
```