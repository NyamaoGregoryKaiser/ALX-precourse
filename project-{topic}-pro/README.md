*   **Install Nginx**: `sudo apt update && sudo apt install nginx`
*   **Obtain SSL Certificates**: Use Certbot (recommended for Let's Encrypt) to get free SSL certificates: `sudo apt install certbot python3-certbot-nginx` then `sudo certbot --nginx -d your_domain.com -d www.your_domain.com`.
*   **Enable Nginx config**: `sudo ln -s /etc/nginx/sites-available/performance-monitor.conf /etc/nginx/sites-enabled/`
*   **Test Nginx config**: `sudo nginx -t`
*   **Reload Nginx**: `sudo systemctl reload nginx`

## 3. CI/CD Integration

The `.github/workflows/ci_cd.yml` file provides a GitHub Actions pipeline configuration:

*   **Triggers**: Runs on pushes to `main` and `develop` branches, and on pull requests to these branches.
*   **Jobs**:
    *   `build_and_test`:
        *   Checks out code.
        *   Sets up Python environment.
        *   Installs dependencies.
        *   Runs `flake8` for linting.
        *   Sets up Docker Compose for PostgreSQL and Redis test databases.
        *   Runs Alembic migrations on the test database.
        *   Executes unit and integration tests using `pytest` with coverage.
        *   Builds the application Docker image.
        *   Starts the application container for API tests.
        *   Executes API tests.
        *   (Conceptual) Runs performance tests.
        *   Stops all Docker Compose services in the `finally` block.
    *   (Optional) `deploy`:
        *   This job is commented out but provides a template for continuous deployment.
        *   It typically builds and pushes the Docker image to a registry (e.g., Docker Hub, AWS ECR).
        *   Then, it connects to the production server (e.g., via SSH) and updates the running containers to use the new image.
        *   Requires `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY` as GitHub Secrets.

**To enable CI/CD**:
1.  Push your code to a GitHub repository.
2.  (Optional for `deploy` job) Configure GitHub Secrets in your repository settings.

## 4. Monitoring and Logging

*   **Application Logs**: The FastAPI application logs to standard output (stdout/stderr). Docker Compose captures these logs, which can be viewed with `docker-compose logs -f app`. For production, integrate with a centralized logging solution (e.g., ELK Stack, Grafana Loki, cloud-native services like CloudWatch Logs, Stackdriver Logging).
*   **Container Monitoring**: Use Docker's built-in commands (`docker stats`) or integrate with container monitoring tools (e.g., Prometheus/Grafana, Datadog, New Relic) to monitor resource usage (CPU, memory, network I/O) of individual containers.
*   **Performance Metrics**: The system itself collects and provides API endpoints for its own performance metrics. You can query `/api/v1/metrics/summary` or `/api/v1/metrics/trends/*` to monitor the system's health and performance. The dashboard at `/dashboard` provides a visual overview.
*   **Alerting**: Set up alerts based on critical metrics (e.g., high error rates, long response times, high CPU/memory usage) using your chosen monitoring solution.

## 5. Maintenance

*   **Database Backups**: Regularly back up your PostgreSQL data.
*   **Log Rotation**: Ensure your logging solution has proper log rotation configured to prevent disk space exhaustion.
*   **Dependency Updates**: Keep Python dependencies and Docker images up to date to patch security vulnerabilities and get new features.
*   **Alembic Migrations**: Always manage database schema changes with Alembic. Apply migrations carefully in production.