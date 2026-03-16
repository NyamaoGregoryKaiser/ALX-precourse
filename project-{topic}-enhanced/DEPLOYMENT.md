```markdown
# Deployment Guide for Task Manager Backend

This guide outlines the steps to deploy the Task Manager Backend, from local Docker Compose deployment to a conceptual cloud server setup.

## Table of Contents

1.  [Local Deployment with Docker Compose](#1-local-deployment-with-docker-compose)
2.  [Production Deployment Considerations](#2-production-deployment-considerations)
    *   [Prerequisites on Production Server](#21-prerequisites-on-production-server)
    *   [Deployment Steps on Server](#22-deployment-steps-on-server)
    *   [Environment Variables](#23-environment-variables)
    *   [Security Best Practices](#24-security-best-practices)
    *   [Scaling](#25-scaling)
3.  [CI/CD with GitHub Actions](#3-cicd-with-github-actions)

---

## 1. Local Deployment with Docker Compose

This is the quickest way to get the application running with a PostgreSQL database on your local machine.

1.  **Prerequisites:**
    *   Docker Desktop (or Docker Engine and Docker Compose) installed.
    *   Java 17 and Maven for building the JAR locally.

2.  **Build the Project JAR:**
    Navigate to the project root and build the Spring Boot application:
    ```bash
    mvn clean install -DskipTests
    ```
    This will create `target/task-manager-backend-0.0.1-SNAPSHOT.jar`.

3.  **Start Services with Docker Compose:**
    In the project root directory, run:
    ```bash
    docker-compose up -d
    ```
    This command performs the following:
    *   **`db` service:** Pulls `postgres:15-alpine`, creates a volume for persistent data, and starts the PostgreSQL database.
    *   **`app` service:** Builds the Docker image for the Spring Boot application (using the `Dockerfile`), copies the JAR file into it, and starts the application.
    *   Connects both services to a `task-manager-network`.
    *   Exposes backend port `8080` and database port `5432` to your host machine.

4.  **Verify Deployment:**
    Check the status of your running containers:
    ```bash
    docker-compose ps
    ```
    You should see `app` and `db` services running.

    Access the application:
    *   **Backend API:** `http://localhost:8080`
    *   **Swagger UI:** `http://localhost:8080/swagger-ui.html`

5.  **Stop Services:**
    ```bash
    docker-compose down
    ```
    This stops and removes the containers and network created by `docker-compose up`. The `db_data` volume will persist unless you add `-v` to the `down` command.

---

## 2. Production Deployment Considerations

Deploying to a production environment typically involves a dedicated server (VM, cloud instance) or a managed container service (ECS, Kubernetes). Here, we outline steps for a generic server deployment using Docker.

### 2.1. Prerequisites on Production Server

*   **Operating System:** Linux (e.g., Ubuntu, CentOS)
*   **Docker Engine & Docker Compose:** Installed and configured.
*   **Firewall:** Configured to allow incoming traffic on port `8080` (or the port your reverse proxy uses) and outgoing traffic for updates, etc.
*   **SSH Access:** Secure Shell access to the server.

### 2.2. Deployment Steps on Server

1.  **Connect to your server via SSH:**
    ```bash
    ssh username@your-server-ip
    ```

2.  **Create a deployment directory:**
    ```bash
    sudo mkdir -p /opt/task-manager-backend
    sudo chown -R username:username /opt/task-manager-backend # Assign appropriate ownership
    cd /opt/task-manager-backend
    ```

3.  **Transfer `docker-compose.yml` to the server:**
    You can `git clone` the repository if it's public/private with SSH keys, or manually copy the `docker-compose.yml` file.
    ```bash
    # Option 1: Git clone (recommended for CI/CD)
    git clone https://github.com/your-username/task-manager-backend.git . # clone into current directory
    # Then remove unnecessary files, keep docker-compose.yml and potentially the Dockerfile if you build on server

    # Option 2: Manual copy (run from local machine)
    # scp docker-compose.yml username@your-server-ip:/opt/task-manager-backend/
    ```

4.  **Ensure Docker image is available:**
    *   **If using Docker Hub (recommended for CI/CD):** Ensure your CI/CD pipeline (e.g., GitHub Actions) pushes the `task-manager-backend` image to Docker Hub. Then, on the server:
        ```bash
        docker login -u your_docker_username -p your_docker_password
        docker pull your_docker_username/task-manager-backend:latest
        ```
    *   **If building on the server (less ideal for CI/CD):** Copy the `Dockerfile` and the JAR file (from `target/`) to the server, then run `docker build -t task-manager-backend .` in the `/opt/task-manager-backend` directory.

5.  **Start the application:**
    ```bash
    docker-compose up -d
    ```
    This will pull the specified Docker images (PostgreSQL, and your backend image if not built locally), create containers, and start them in detached mode.

6.  **Verify and Monitor:**
    *   Check container status: `docker-compose ps`
    *   View logs: `docker-compose logs -f app` (replace `app` with `db` for database logs)

### 2.3. Environment Variables

**CRITICAL for Production:** Do **NOT** hardcode sensitive information (like database passwords, JWT secrets) directly in `docker-compose.yml` or `application.yml` for production.

*   **Using a `.env` file with Docker Compose:**
    Create a `.env` file in the same directory as `docker-compose.yml` on your server:
    ```
    DB_USERNAME=your_prod_db_user
    DB_PASSWORD=your_prod_db_password_strong
    JWT_SECRET=a_very_long_and_random_jwt_secret_for_production
    # Add other sensitive variables
    ```
    Docker Compose will automatically pick up these variables and inject them into the services.

*   **Using cloud provider secrets management:** For cloud deployments (e.g., AWS ECS, Kubernetes), use native secrets management services (AWS Secrets Manager, Kubernetes Secrets) to securely store and inject environment variables.

### 2.4. Security Best Practices

*   **Strong Passwords & Secrets:** Generate strong, unique passwords for the database and JWT secret. Rotate them regularly.
*   **Firewall:** Restrict access to only necessary ports. Only expose port `8080` (or `443` if using HTTPS) to the internet. Keep database ports internal to the Docker network.
*   **HTTPS:** Always use HTTPS in production. Deploy a reverse proxy like Nginx or Caddy in front of your Spring Boot application to handle SSL termination.
*   **Least Privilege:** Configure database users with only the necessary permissions.
*   **Regular Updates:** Keep your OS, Docker, and application dependencies updated to patch security vulnerabilities.
*   **Image Scanning:** Use tools to scan your Docker images for known vulnerabilities.
*   **Dedicated Database:** For production, use a dedicated, managed database service (e.g., AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL) instead of running PostgreSQL in a container on the same server as your application.

### 2.5. Scaling

*   **Horizontal Scaling (Backend):** To handle increased traffic, run multiple instances of the `app` container behind a load balancer. Since the application is stateless (JWT-based), this is straightforward.
*   **Vertical Scaling (Backend/Database):** Increase CPU, RAM, or storage for the server running your containers or for your managed database service.
*   **Database Read Replicas:** For read-heavy applications, set up read replicas for your PostgreSQL database.
*   **Distributed Caching:** For multi-instance deployments, consider an external distributed cache like Redis instead of in-memory Ehcache.

---

## 3. CI/CD with GitHub Actions

The repository includes a GitHub Actions workflow (`.github/workflows/ci-cd-pipeline.yml`) to automate the build, test, and deployment process.

### 3.1. Workflow Description

*   **`build-and-test` job:**
    *   Checks out code.
    *   Sets up Java 17.
    *   Builds the Maven project.
    *   Runs unit and integration tests.
    *   Generates a JaCoCo code coverage report and uploads it to Codecov.
    *   Uploads the built JAR as an artifact.
*   **`docker-build-and-push` job:**
    *   **Depends on `build-and-test`** (only runs if tests pass).
    *   Authenticates with Docker Hub using secrets.
    *   Builds the Docker image for the application.
    *   Pushes the image to Docker Hub with the `latest` tag.
    *   **Conditional execution:** Only runs on pushes to the `main` branch.
*   **`deploy` job:**
    *   **Depends on `docker-build-and-push`**.
    *   Connects to a remote server via SSH using secrets.
    *   Pulls the latest Docker image from Docker Hub.
    *   Stops and removes existing containers using `docker-compose down`.
    *   Starts new containers using `docker-compose up -d`.
    *   **Conditional execution:** Only runs on pushes to the `main` branch.

### 3.2. Setup GitHub Secrets

For the CI/CD pipeline to function, you need to configure the following secrets in your GitHub repository (**Settings > Secrets and variables > Actions**):

*   `DOCKER_USERNAME`: Your Docker Hub username.
*   `DOCKER_PASSWORD`: Your Docker Hub access token (generate one in Docker Hub settings).
*   `CODECOV_TOKEN`: Your Codecov repository upload token.
*   `SSH_HOST`: The IP address or hostname of your deployment server.
*   `SSH_USERNAME`: The SSH username for your deployment server.
*   `SSH_KEY`: The private SSH key for accessing your deployment server (ensure it's base64 encoded or properly formatted, usually `-----BEGIN OPENSSH PRIVATE KEY-----...-----END OPENSSH PRIVATE KEY-----`).

**Important:** Never commit sensitive information directly to your repository. Use GitHub Secrets.

---
```