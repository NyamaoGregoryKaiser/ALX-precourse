```markdown
# DB-Optimizer: Deployment Guide

This guide outlines the steps to deploy the DB-Optimizer system to a production environment using Docker and Docker Compose. For more complex production setups (e.g., Kubernetes), this serves as a foundation.

## 1. Production Environment Setup

### 1.1. Server Requirements
*   **Operating System:** Linux (e.g., Ubuntu, Debian, CentOS).
*   **Resources:**
    *   **CPU:** At least 2 cores (more for higher traffic/monitoring load).
    *   **RAM:** Minimum 4GB (8GB recommended for concurrent monitoring and API traffic).
    *   **Disk:** Sufficient space for Docker images, containers, and PostgreSQL data (consider persistent storage).
*   **Software:**
    *   Docker Engine (latest stable version)
    *   Docker Compose (latest stable version)
    *   Git

### 1.2. Firewall Configuration
Ensure the following ports are open on your server's firewall:
*   `8080` (or your configured `DB_OPTIMIZER_SERVER_PORT`): For the DB-Optimizer API.
*   `5432` (or your configured `DB_OPTIMIZER_DB_PORT`): For the DB-Optimizer's internal PostgreSQL database (if accessed externally, though often restricted to `localhost` or Docker network).
*   **For Monitored Databases:** Ensure the DB-Optimizer server can reach the host:port of your external databases.

## 2. Deployment Steps

### 2.1. Clone the Repository
On your deployment server, clone the DB-Optimizer repository:
```bash
git clone https://github.com/yourusername/db-optimizer.git
cd db_optimizer
```

### 2.2. Configure Environment Variables
Create a `.env` file in the project root directory. This file will override default settings in `config.json.example` and will be used by Docker Compose.

**Strongly Recommended:**
*   **Generate Strong Secrets:**
    *   `DB_OPTIMIZER_JWT_SECRET`: Generate a long, random string (e.g., using `openssl rand -base64 32`). **NEVER commit this secret to source control.**
    *   `DB_OPTIMIZER_DB_PASSWORD`: Use a strong, unique password for the DB-Optimizer's internal database.

*   **Review `docker-compose.yml` and `config.json.example`:**
    *   Adjust ports if `8080` or `5432` are already in use.
    *   Customize `DB_OPTIMIZER_MONITOR_INTERVAL_SECONDS` based on your monitoring frequency needs.

Example `.env` (adjust values for your production environment):
```
# Application Server Configuration
DB_OPTIMIZER_SERVER_PORT=8080

# DB-Optimizer's Internal Database Configuration
DB_OPTIMIZER_DB_HOST=db_optimizer_postgres # Internal Docker Compose service name
DB_OPTIMIZER_DB_PORT=5432
DB_OPTIMIZER_DB_NAME=db_optimizer_db
DB_OPTIMIZER_DB_USER=db_optimizer_user
DB_OPTIMIZER_DB_PASSWORD=YOUR_STRONG_DB_PASSWORD

# JWT Authentication
DB_OPTIMIZER_JWT_SECRET=YOUR_VERY_LONG_AND_RANDOM_JWT_SECRET

# Logging
DB_OPTIMIZER_LOG_LEVEL=info # Set to 'warn' or 'error' for less verbosity in production

# Monitoring Interval (in seconds)
DB_OPTIMIZER_MONITOR_INTERVAL_SECONDS=300 # Monitor every 5 minutes
```

### 2.3. Persistent Data Storage
For the DB-Optimizer's internal PostgreSQL database, it's crucial to use Docker volumes for persistent storage. The `docker-compose.yml` already defines a named volume `db_optimizer_data`.

```yaml
volumes:
  db_optimizer_data:
  target_db_data: # For the example target DB
```
This ensures your database data persists even if the `db_optimizer_postgres` container is removed or recreated.

### 2.4. Build and Deploy
From the project root directory, build and start the services using Docker Compose:
```bash
docker-compose up --build -d
```
*   `--build`: Forces Docker to rebuild the images. Useful for ensuring the latest code changes are included. In production, you might pull pre-built images from a registry.
*   `-d`: Runs the containers in detached mode (in the background).

### 2.5. Verify Deployment
*   **Check container status:**
    ```bash
    docker-compose ps
    ```
    Ensure all containers (e.g., `db_optimizer_postgres`, `db_optimizer_app`) are `Up` and `healthy`.

*   **View application logs:**
    ```bash
    docker-compose logs db_optimizer_app
    ```
    Look for messages indicating successful startup, migrations, seeding, and that the "Application running."

*   **Test API endpoint:**
    ```bash
    curl http://localhost:8080/health
    # Expected: {"status":"UP"}
    ```
    Replace `localhost` with your server's public IP or domain name if accessing remotely.

### 2.6. PostgreSQL `pg_stat_statements` for Monitored DBs
For the DB-Optimizer to effectively monitor your external PostgreSQL databases, `pg_stat_statements` *must* be enabled on those target databases.

**Steps for External PostgreSQL Databases:**
1.  **Edit `postgresql.conf`:**
    *   Find the `shared_preload_libraries` setting.
    *   Add `pg_stat_statements` to it. It should look like:
        ```
        shared_preload_libraries = 'pg_stat_statements'
        ```
    *   (Optional but recommended for detailed stats) Adjust `pg_stat_statements.max` and `pg_stat_statements.track`.
        ```
        pg_stat_statements.max = 10000 # Max number of statements to track
        pg_stat_statements.track = all # Track all statements (top-level + nested)
        ```
2.  **Restart PostgreSQL Server:** Changes to `shared_preload_libraries` require a server restart.
3.  **Create Extension:**
    Connect to each database you want to monitor (e.g., `ecommerce_db`) as a superuser and run:
    ```sql
    CREATE EXTENSION pg_stat_statements;
    ```
    The `db_optimizer_app` can then connect using a user with `SELECT` permissions on `pg_stat_statements` view and potentially `pg_settings` for configuration info.

## 3. Operations and Maintenance

### 3.1. Updating the Application
1.  Pull latest changes: `git pull origin main`
2.  Stop and remove old containers: `docker-compose down`
3.  Rebuild and restart: `docker-compose up --build -d`

### 3.2. Backups
Regularly back up the `db_optimizer_data` volume and your external monitored databases.
*   **For Docker volumes:** Use `docker cp` to copy data out, or integrate with a volume backup solution.
*   **For PostgreSQL:** Use `pg_dump` or `pg_basebackup`.

### 3.3. Monitoring and Logging
*   **Application Logs:** `docker-compose logs db_optimizer_app`
*   **Container Metrics:** Use Docker's built-in `docker stats` or integrate with a monitoring system like Prometheus/Grafana.
*   **Alerting:** Set up alerts for critical errors in application logs or for API endpoint health checks.

### 3.4. Scaling
*   **Database:** Scale the `db_optimizer_postgres` independently (vertical scaling, or consider a managed PostgreSQL service).
*   **Application:** For high availability and load, you can run multiple instances of `db_optimizer_app` behind a load balancer. Ensure your `DBConnectionPool` and `DBMonitorService` are designed for distributed execution if running multiple instances of the optimizer (e.g., using a distributed lock for `DBMonitorService` to avoid redundant monitoring tasks). For this project, a single instance is assumed.

### 3.5. Security Best Practices
*   **Secrets Management:** Never hardcode sensitive credentials. Use environment variables (as in `.env`), and for robust production, integrate with a secrets management service (e.g., HashiCorp Vault, AWS Secrets Manager, Azure Key Vault).
*   **Network Security:** Restrict network access to the DB-Optimizer API and its internal database.
*   **Regular Updates:** Keep Docker, Docker Compose, and base images updated. Regularly rebuild your application image to include security patches.
*   **Least Privilege:** Configure database users for monitored systems with only the necessary `SELECT` permissions.

By following this guide, you can successfully deploy the DB-Optimizer system in a production-ready manner, enabling you to gain valuable insights into your database performance.
```