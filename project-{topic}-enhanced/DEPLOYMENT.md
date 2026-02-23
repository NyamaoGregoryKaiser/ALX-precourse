```markdown
# SecureTask Deployment Guide

This document outlines the steps to deploy the SecureTask application to a production environment. The recommended approach leverages Docker and Docker Compose for containerization and Nginx as a reverse proxy for serving static files and routing API requests.

## 1. Production Environment Setup

### 1.1. Server Requirements
*   A Linux server (e.g., Ubuntu, CentOS) with at least 2GB RAM and 2 CPU cores (adjust based on expected load).
*   Docker and Docker Compose installed.
*   Git installed.
*   Domain name configured to point to your server's IP address.
*   SSH access to the server.

### 1.2. Firewall Configuration
Ensure that your server's firewall (e.g., `ufw` on Ubuntu) allows traffic on ports 80 (HTTP) and 443 (HTTPS).
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow OpenSSH # Ensure SSH access is allowed
sudo ufw enable
```

### 1.3. Environment Variables
On your production server, create a `.env` file at the root of your `securetask` project directory. This file will contain sensitive environment variables for Docker Compose. **DO NOT commit this file to your repository.**

**`securetask/.env` (on server)**
```dotenv
# Backend Configuration
NODE_ENV=production
PORT=5000
DATABASE_URL="postgresql://user:YOUR_DB_PASSWORD@db:5432/securetask_prod_db?schema=public" # Replace with strong password
JWT_SECRET="A_VERY_LONG_AND_COMPLEX_RANDOM_STRING_FOR_JWT_SECRET" # GENERATE A STRONG, UNIQUE SECRET
JWT_EXPIRATION="1h" # Access token expiration
ADMIN_EMAIL="your-admin-email@yourdomain.com"
ADMIN_PASSWORD="A_VERY_STRONG_ADMIN_PASSWORD" # GENERATE A STRONG, UNIQUE PASSWORD
FRONTEND_URL="https://yourdomain.com" # Your actual domain
CACHE_REDIS_URL="redis://redis:6379"

# Frontend Configuration
REACT_APP_API_BASE_URL="https://yourdomain.com/api/v1"

# Database Credentials (used by docker-compose for PostgreSQL service)
POSTGRES_DB=securetask_prod_db
POSTGRES_USER=user
POSTGRES_PASSWORD=YOUR_DB_PASSWORD # Must match DATABASE_URL password
```
**Recommendations for `JWT_SECRET` and `ADMIN_PASSWORD`:**
*   Use a strong password generator (e.g., `openssl rand -base64 32` for JWT_SECRET).
*   Change default passwords from development settings.

## 2. Deployment Steps

### 2.1. Clone the Application
Log in to your server via SSH and clone your application repository.
```bash
git clone https://github.com/your-username/securetask.git
cd securetask
```

### 2.2. Place Nginx Configuration
Ensure you have the `nginx.conf` file in the root of your `securetask` directory. Update `server_name` to your actual domain.
```nginx
# nginx.conf
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com; # IMPORTANT: Update your domain here

    # ... other configurations as in the example ...
}

# For HTTPS, you will add another server block later
```

### 2.3. Build and Start Services with Docker Compose
```bash
docker-compose -f docker-compose.yml build --no-cache
docker-compose -f docker-compose.yml up -d
```
*   `--no-cache`: Ensures that new images are built from scratch, picking up any changes in your Dockerfiles or application code.
*   `-d`: Runs the containers in detached mode (in the background).

### 2.4. Initial Database Migration and Seeding
The `backend` service in `docker-compose.yml` is configured to run `npx prisma migrate deploy` on startup, which applies all pending database migrations.
The `src/server.js` within the backend also includes logic to seed an admin user if `NODE_ENV` is `development` or `test` and no admin user exists. For production, it's generally recommended to provision initial admin accounts securely through a separate script or manual process rather than auto-seeding on every deploy, or to ensure seeding only happens once. Our current setup checks for an existing admin user, making it safe for production deployments.

### 2.5. Verify Deployment
*   **Check container status:** `docker-compose ps` - ensure all services are `Up` and `healthy`.
*   **View logs:** `docker-compose logs -f` - check for any startup errors.
*   **Access your application:** Open your browser and navigate to `http://yourdomain.com`. You should see the frontend.
*   **Test API:** Try accessing an API endpoint (e.g., `http://yourdomain.com/api/v1/auth/login` via Postman) to ensure backend is reachable.

## 3. Enable HTTPS with Certbot (Recommended for Production)

Using HTTPS is critical for security. Certbot can automate the process of obtaining and renewing SSL certificates from Let's Encrypt.

### 3.1. Modify `nginx.conf` for Certbot
Update your `nginx.conf` to include a temporary HTTP server block for Certbot's challenge and an empty HTTPS block.

```nginx
# nginx.conf (initial for Certbot)
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        root   /usr/share/nginx/html; # Serve frontend build
        index  index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    location /api/v1/ {
        proxy_pass http://backend:5000/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Certbot HTTP challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}
# Empty HTTPS block for Certbot to configure
# server {
#     listen 443 ssl;
#     server_name yourdomain.com www.yourdomain.com;
# }
```

### 3.2. Stop Nginx (if running) and Run Certbot
You might need to stop the Nginx container temporarily or adjust `docker-compose.yml` to use `certbot` within the compose setup. A common approach for initial cert generation is to stop Nginx and run Certbot directly on the host or use a dedicated `certbot` container that shares volumes.

**Using `certbot` directly on host (easiest for initial setup):**
```bash
sudo docker-compose stop nginx # Stop Nginx container
sudo apt update
sudo apt install certbot python3-certbot-nginx -y # Install Certbot if not already
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com --email your-email@example.com --agree-tos --no-eff-email --redirect
```
Follow Certbot's prompts. It will automatically configure Nginx to use HTTPS.

### 3.3. Update `nginx.conf` for HTTPS
After Certbot, `nginx.conf` will be updated with the SSL configurations. Ensure the `nginx` service in `docker-compose.yml` mounts the correct Certbot volumes.

```yaml
# docker-compose.yml (excerpt for nginx service with Certbot)
  nginx:
    # ... other configurations ...
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt # Mount Certbot config
      - /var/www/certbot:/var/www/certbot # Mount Certbot webroot
    # ... depends_on ...
```
Restart your services to apply the new Nginx configuration:
```bash
docker-compose -f docker-compose.yml restart nginx
```
Now, navigate to `https://yourdomain.com`. Your site should be secure.

## 4. Continuous Deployment (Optional, using GitHub Actions)

If you've configured GitHub Actions (as shown in `.github/workflows/ci-cd.yml`), subsequent pushes to `main` branch will trigger the deployment process:

1.  **Code Commit & Push:** Push changes to your `main` branch.
2.  **CI/CD Trigger:** GitHub Actions will start the CI/CD pipeline.
3.  **Tests & Build:**
    *   Linting and unit/integration tests run for backend and frontend.
    *   Docker images are built.
4.  **Deployment (SSH to Server):**
    *   The workflow will SSH into your production server.
    *   It pulls the latest code.
    *   It brings down existing containers (`docker-compose down`).
    *   It pulls new Docker images (or rebuilds them if not pushed to a registry).
    *   It starts new containers (`docker-compose up -d`).
    *   It cleans up old Docker images.

**Important:** Ensure your GitHub Actions secrets (`SSH_HOST`, `SSH_USERNAME`, `SSH_PRIVATE_KEY`, `DOCKER_USERNAME`, `DOCKER_PASSWORD`) are correctly configured in your GitHub repository settings.

## 5. Maintenance and Monitoring

*   **Logs:** Regularly monitor application logs (`docker-compose logs -f backend`) for errors and anomalies. Integrate with a log aggregation service (e.g., ELK stack, Datadog) for enterprise monitoring.
*   **Resource Usage:** Monitor CPU, memory, and disk usage of your server and Docker containers.
*   **Database Backups:** Implement a robust backup strategy for your PostgreSQL database.
*   **Security Updates:** Keep Node.js, Docker, Nginx, and all npm dependencies updated to their latest stable versions to mitigate security vulnerabilities.
*   **Certbot Renewal:** Certbot automatically handles certificate renewals (usually via a cron job setup by Certbot, or configured in `docker-compose.yml`).
*   **Scheduled Tasks:** For cleanup or background jobs, consider using Docker cron jobs or dedicated worker services.

By following these steps, you can confidently deploy and manage the SecureTask application in a production environment.
```