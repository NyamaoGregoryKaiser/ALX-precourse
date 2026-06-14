This command will:
    *   Build the `realtime_chat_server` image (if not already built or if changes are detected).
    *   Create and start the `chat_server` container.
    *   Create `chat_data` and `chat_logs` Docker volumes.
    *   Execute `db/migrate.sh` inside the container on startup to initialize the database.

### Production Considerations for Docker Compose

*   **HTTPS/WSS:** For production, you **MUST** configure a reverse proxy (e.g., Nginx, Caddy) in front of your C++ server to handle TLS/SSL encryption for both HTTP (HTTPS) and WebSocket (WSS) traffic. The C++ server runs on plain HTTP/WS.
*   **Resource Limits:** Add resource limits (`deploy.resources.limits`) to your `docker-compose.yml` for production to prevent resource exhaustion.
*   **Logging:** Integrate Docker logs with a centralized logging solution (e.g., ELK stack, Grafana Loki).
*   **Health Checks:** Add `healthcheck` stanza to your `docker-compose.yml` to ensure the container is truly ready.
*   **Database:** While SQLite is used for simplicity, for high-concurrency production deployments, consider a robust RDBMS like PostgreSQL or MySQL, which would run as a separate Docker service.

## 4. CI/CD with GitHub Actions

The CI/CD pipeline is defined in `.github/workflows/main.yml`.

### Workflow Overview
The pipeline consists of the following jobs:

1.  **`build_and_test`:**
    *   **Triggered by:** `push` and `pull_request` events on `main` and `develop` branches.
    *   **Actions:**
        *   Checks out the code.
        *   Installs C++ build dependencies (Boost, SQLite, OpenSSL, Google Test).
        *   Configures and builds the C++ server using CMake.
        *   Runs all unit and integration tests.
        *   Cleans up test artifacts.
    *   **Outcome:** Ensures code quality and correctness before proceeding to image build or deployment.

2.  **`docker_build`:**
    *   **Triggered by:** `push` events on `main` and `develop` branches, and *only if* `build_and_test` job succeeds.
    *   **Actions:**
        *   Checks out the code.
        *   Sets up Docker Buildx for multi-platform builds.
        *   Logs into Docker Hub (or GitHub Container Registry) using provided secrets.
        *   Builds the Docker image and pushes it to the configured container registry with `latest` and `commit-SHA` tags.
        *   **Conditional Deployment:**
            *   If `develop` branch: Triggers a simulated deployment to a "staging" environment.
            *   If `main` branch: Triggers a simulated deployment to a "production" environment.
    *   **Outcome:** A versioned Docker image is available in the registry, and (simulated) deployments occur automatically.

### Setting up GitHub Secrets

To allow GitHub Actions to push Docker images and deploy via SSH, you need to configure GitHub Secrets in your repository:

1.  Go to your GitHub repository -> `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`.
2.  Add the following secrets:
    *   `DOCKER_USERNAME`: Your Docker Hub username.
    *   `DOCKER_TOKEN`: A Docker Hub Personal Access Token with `Read, Write, Delete` permissions for your repositories.
    *   `SSH_PRIVATE_KEY`: The SSH private key corresponding to a public key authorized on your deployment servers. **Ensure this key is dedicated for CI/CD and has limited permissions.**
    *   `SSH_HOST`: The IP address or hostname of your deployment server (e.g., `staging.example.com` or `prod.example.com`).
    *   `SSH_USER`: The username for SSH access on your deployment server (e.g., `deployuser`).

### Deployment to Staging/Production Servers (Example)

The `.github/workflows/main.yml` includes placeholder commands for deployment. In a real-world scenario, these commands would perform actions like:

1.  **SSH into the server:** Using the `appleboy/ssh-action` or similar.
2.  **Pull the latest Docker image:** `docker pull your_docker_username/realtime-chat-server:latest`
3.  **Update and restart the service:**
    *   Navigate to the directory containing your `docker-compose.yml` on the server.
    *   `docker-compose pull chat_server` (to get the latest image)
    *   `docker-compose up -d --no-deps chat_server --force-recreate` (to restart the service with the new image).
    *   Or, if using a more complex orchestration, update the service definition.

**Example deployment section (conceptual, replace with actual commands):**