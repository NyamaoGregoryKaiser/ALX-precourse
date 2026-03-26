# ALX CMS Deployment Guide

This guide outlines the steps to deploy the ALX CMS application to a production environment using Docker and Docker Compose.

## 1. Prerequisites

Before you begin, ensure you have the following:

*   **A Linux Server:** (e.g., Ubuntu, CentOS) with SSH access.
*   **Docker Engine & Docker Compose:** Installed on your server.
    *   [Install Docker Engine](https://docs.docker.com/engine/install/)
    *   [Install Docker Compose](https://docs.docker.com/compose/install/)
*   **Git:** Installed on your server.
*   **Domain Name:** A registered domain name pointing to your server's IP address (e.g., `your-cms-domain.com`).
*   **SSL/TLS Certificates:** (Optional but highly recommended for production) Obtain certificates for your domain, e.g., using Let's Encrypt with Certbot.
*   **CI/CD Configuration:** (Optional, but recommended) Ensure your GitLab CI/GitHub Actions is configured to push Docker images to a registry.

## 2. Server Setup

### 2.1 SSH Access

Ensure you can SSH into your server. For CI/CD deployments, you'll need to configure SSH keys.

```bash
ssh your_user@your_server_ip
```

### 2.2 Install Docker and Docker Compose

Follow the official Docker documentation to install Docker Engine and Docker Compose on your server.

### 2.3 Configure Firewall

Open necessary ports on your server's firewall (e.g., `ufw` on Ubuntu):

```bash
sudo ufw allow ssh
sudo ufw allow http  # Port 80 for HTTP
sudo ufw allow https # Port 443 for HTTPS (if using SSL)
sudo ufw enable
```

## 3. Application Deployment

### 3.1 Clone the Repository

On your server, choose a directory (e.g., `/opt/cms`) and clone your project repository:

```bash
sudo mkdir -p /opt/cms
sudo chown -R your_user:your_user /opt/cms # Grant ownership to your deployment user
cd /opt/cms
git clone https://github.com/yourusername/cms-project.git . # Clone into current directory
```

### 3.2 Environment Configuration

Create a `.env` file for the backend in the `backend/` directory. Copy from `.env.example`:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` to configure your production settings:

*   `DATABASE_URL`: If your database is external, set this. If using the `db` service in `docker-compose.yml`, the default `postgresql://user:password@db:5432/cms_db` is correct as `db` is the service name.
*   `JWT_SECRET`: **CRUCIAL!** Generate a very strong, long, random secret for JWT signing. **Do not use the default from `.env.example` in production.**
*   `APP_PORT`, `APP_THREADS`, `LOG_LEVEL`, etc.

### 3.3 Nginx Configuration for Frontend (and HTTPS)

If you're using Nginx as a reverse proxy for your frontend and for HTTPS, you'll need to update `frontend/nginx.conf` or create a separate Nginx configuration on your host.

**Option 1: Nginx in Docker (as per `docker-compose.yml`)**
*   Modify `frontend/nginx.conf` to include your domain name and SSL/TLS configuration (if using self-signed or Let's Encrypt within the container). This can be complex.

**Option 2: Nginx on Host (Recommended for Production)**
1.  **Remove the `frontend` service from `docker-compose.yml`** and adjust `ports` for the `backend` if Nginx will proxy to it directly (e.g., `9080:9080` becomes an internal port mapping).
2.  **Install Nginx on your host machine:**
    ```bash
    sudo apt-get install nginx
    ```
3.  **Configure Nginx on the host:**
    Create a new Nginx configuration file (e.g., `/etc/nginx/sites-available/your-cms-domain.conf`):

    ```nginx
    server {
        listen 80;
        listen [::]:80;
        server_name your-cms-domain.com www.your-cms-domain.com;

        # Redirect HTTP to HTTPS
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl;
        listen [::]:443 ssl;
        server_name your-cms-domain.com www.your-cms-domain.com;

        # SSL Configuration
        ssl_certificate /etc/letsencrypt/live/your-cms-domain.com/fullchain.pem; # Path to your SSL cert
        ssl_key /etc/letsencrypt/live/your-cms-domain.com/privkey.pem;         # Path to your SSL key
        include /etc/letsencrypt/options-ssl-nginx.conf;
        ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

        root /path/to/your/frontend/public; # Adjust this to where your frontend static files will be located

        index index.html index.htm;

        location / {
            try_files $uri $uri/ =404; # Or try_files $uri $uri/ /index.html; for SPA
        }

        # Proxy API requests to the backend Docker service
        location /api/ {
            proxy_pass http://localhost:9080/; # Backend is running on host's port 9080
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_buffering off; # Important for streaming APIs
        }
    }
    ```
4.  **Create a symlink** to enable the configuration and **test Nginx config**:
    ```bash
    sudo ln -s /etc/nginx/sites-available/your-cms-domain.conf /etc/nginx/sites-enabled/
    sudo nginx -t
    ```
5.  **Restart Nginx:**
    ```bash
    sudo systemctl restart nginx
    ```

### 3.4 Deploy with Docker Compose

1.  **Navigate to your project root** (`/opt/cms` or wherever you cloned it).
2.  **Login to your Docker Registry** (if pulling private images configured in CI/CD):
    ```bash
    docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    ```
3.  **Pull latest images and start services:**
    ```bash
    docker-compose pull # Pulls the latest images from your registry
    docker-compose up -d --remove-orphans
    ```
    *   `-d`: Runs containers in detached mode.
    *   `--remove-orphans`: Removes containers for services no longer defined in `docker-compose.yml`.

    The `db` service will initialize and apply schema/seed data if it's the first run or volume is empty.
    The `backend` service will start, and `frontend` (if in docker-compose) will serve.

4.  **Verify Deployment:**
    ```bash
    docker-compose ps
    ```
    Ensure all services are `Up`. Check logs if any service is restarting:
    ```bash
    docker-compose logs backend
    docker-compose logs db
    ```

### 3.5 Initial Database Setup (Manual, if not using `docker-entrypoint-initdb.d`)

If you're not using the `docker-entrypoint-initdb.d` volume for migrations, or for subsequent migrations:
1.  Access the PostgreSQL container:
    ```bash
    docker-compose exec db psql -U user -d cms_db
    ```
2.  Run your migration scripts manually:
    ```sql
    \i /path/to/database/migrations/V1__create_tables.sql
    \i /path/to/database/seed/seed_data.sql
    ```
    Exit psql: `\q`

## 4. CI/CD Deployment (Automated)

The `.gitlab-ci.yml` (or `.github/workflows/main.yml`) example outlines an automated deployment process.

1.  **Configure GitLab/GitHub Environment Variables:**
    *   `CI_REGISTRY_USER`, `CI_REGISTRY_PASSWORD`: For pushing/pulling Docker images.
    *   `SSH_USER`, `DEPLOY_HOST`: Your server's SSH username and IP/hostname.
    *   `SSH_PRIVATE_KEY`: A deploy key with access to your server, stored as a CI/CD variable.
2.  **Add SSH Public Key to Server:** Add the public part of your `SSH_PRIVATE_KEY` to `~/.ssh/authorized_keys` on your deployment server user.
3.  **Ensure `docker-compose.yml` is on the server.** The CI/CD script will `cd` into the project directory and run `docker-compose pull && docker-compose up -d`.
4.  **Push to `main` branch:** A push to the `main` branch (or configured branch) should trigger the CI/CD pipeline, building images, running tests, and then deploying to production.

## 5. Maintenance and Monitoring

*   **Logs:** Set up a centralized logging solution (ELK stack, Splunk, Loki/Grafana) to collect logs from Docker containers.
*   **Monitoring:** Use Prometheus/Grafana to monitor container health, resource usage (CPU, RAM, Disk, Network), and application-specific metrics.
*   **Backups:** Implement regular backups of your PostgreSQL database.
*   **Updates:** Regularly update your Docker images and underlying server OS to patch security vulnerabilities.
*   **Disaster Recovery:** Have a plan for restoring your application and data in case of a major outage.

This guide provides a foundation for deploying your CMS. Specific details may vary based on your chosen cloud provider, exact server setup, and advanced requirements.