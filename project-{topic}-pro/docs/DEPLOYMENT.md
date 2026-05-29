```markdown
# Deployment Guide for E-commerce System

This guide outlines the steps to deploy the E-commerce Solution System to a production environment. We assume a cloud environment (e.g., AWS, GCP, Azure) where you have access to a Linux server (VM or container instance) and a domain name.

## 1. Prerequisites

*   **Cloud Provider Account**: AWS, GCP, Azure, DigitalOcean, etc.
*   **Domain Name**: Purchased and configured with DNS records.
*   **Server (VM/EC2/Droplet)**:
    *   Linux OS (Ubuntu, CentOS recommended)
    *   Docker and Docker Compose installed.
    *   Minimum 2GB RAM (4GB recommended), 2 vCPU for a small-scale deployment.
*   **SSH Access** to your server.
*   **Git** installed on your local machine and server.
*   **SSL Certificates**: Obtain free certificates from Let's Encrypt (using Certbot) or purchase from a CA.

## 2. Server Setup

**2.1. Connect to your server:**

```bash
ssh user@your_server_ip
```

**2.2. Update system and install necessary packages:**

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git
```

**2.3. Install Docker:**

Follow the official Docker installation guide for your Linux distribution.
Example for Ubuntu:
```bash
sudo apt-get install ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

**2.4. Add your user to the `docker` group (to run Docker without `sudo`):**

```bash
sudo usermod -aG docker $USER
newgrp docker # Apply group changes immediately
```
*You may need to log out and log back in for the changes to take effect.*

## 3. Project Deployment

**3.1. Clone the repository to your server:**

```bash
git clone https://github.com/your-username/ecommerce-system.git
cd ecommerce-system
```

**3.2. Configure Environment Variables:**

Create `.env` files in `api/` and `frontend/` directories by copying their `.env.example` counterparts. **Crucially, replace placeholder values with secure, production-ready values.**

`api/.env`:
*   `NODE_ENV=production`
*   `PORT=5000` (internal port, Nginx handles external)
*   `DB_HOST=postgres_db` (Docker service name)
*   `DB_USER`, `DB_PASSWORD`, `DB_NAME`: **Generate strong, unique credentials.**
*   `JWT_SECRET`: **Generate a very long, complex, random string.**
*   `REDIS_HOST=redis_cache` (Docker service name)
*   `LOG_LEVEL=info` (or `warn`, `error` for less verbose logging)

`frontend/.env`:
*   `REACT_APP_API_URL=/api/v1` (Relative path, Nginx will handle proxying)

**3.3. Build Frontend for Production:**

Navigate to the `frontend/` directory and build the production-ready static assets.
```bash
cd frontend
npm install
npm run build
cd .. # Go back to project root
```
This will create a `frontend/build` directory with optimized static files.

**3.4. Configure Nginx for Production:**

**a. Update `docker/nginx/nginx.conf`:**
*   Change `server_name localhost;` to `server_name your_domain.com www.your_domain.com;`.
*   Uncomment and modify the `location /` block to serve static files from `frontend/build`.
    ```nginx
    # Existing upstream blocks...

    server {
        listen 80;
        server_name your_domain.com www.your_domain.com;

        # Redirect HTTP to HTTPS (RECOMMENDED for production)
        # return 301 https://$host$request_uri;

        # For serving static frontend files directly
        location / {
            root /var/www/frontend; # This path should match your docker-compose volume mount
            try_files $uri $uri/ /index.html;
        }

        location /api/v1/ {
            proxy_pass http://api_upstream/api/v1/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 90;
        }

        # ... other configurations
    }
    ```
*   **Update `docker-compose.yml` for Nginx:**
    *   Mount the built frontend assets:
        ```yaml
        nginx:
          # ...
          volumes:
            - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
            - ./frontend/build:/var/www/frontend # <-- Add this line
        ```

**3.5. Update API Dockerfile for Production (Optional but good practice):**

In `docker/api/Dockerfile`, change the `CMD` instruction to run migrations and then start the server in production mode. This ensures dependencies are minimized and the server runs efficiently.

```dockerfile
# ... (Stage 1 and 2 headers)
# Last part of Stage 2 (FROM node:18-alpine)
# ...
# CMD ["sh", "-c", "npm install && npm run migrate && npm run seed && npm run dev"] # Development command
CMD ["sh", "-c", "npm install --production && npm run migrate && npm start"] # Production command
```

**3.6. Run the Application in Production Mode:**

From the project root:

```bash
docker-compose up --build -d
```
*   `--build`: Rebuilds images to ensure latest code and production optimizations.
*   `-d`: Runs containers in detached mode (background).

**3.7. Verify Deployment:**

*   Check container status: `docker ps`
*   View logs for any service: `docker-compose logs api`
*   Access your domain in a browser: `http://your_domain.com`

## 4. HTTPS Setup (Highly Recommended)

For production, you **must** secure your application with HTTPS.

**4.1. Install Certbot (for Let's Encrypt certificates):**

```bash
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

**4.2. Stop Nginx container to free port 80/443 (if already running):**

```bash
docker-compose stop nginx
```

**4.3. Obtain SSL certificates:**

Use Certbot with the `webroot` authenticator. You'll need to specify a directory Nginx can serve for challenge.
A simpler approach with Nginx already running (requires Nginx plugin for Certbot):

```bash
sudo certbot --nginx -d your_domain.com -d www.your_domain.com
```
Follow the prompts. This will automatically update your Nginx configuration.

**Alternatively (manual with webroot):**

If Certbot's Nginx plugin doesn't work, you can use the `webroot` method. This requires Nginx to serve a `.well-known` directory.

1.  Create a shared volume for Let's Encrypt challenge. Add this to `docker-compose.yml`:
    ```yaml
    nginx:
      volumes:
        - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
        - ./frontend/build:/var/www/frontend
        - certbot_certs:/etc/letsencrypt # For Certbot
        - certbot_www:/var/www/certbot # For Certbot webroot challenge
    # ...
    volumes:
      pgdata:
      redisdata:
      certbot_certs:
      certbot_www:
    ```
2.  Add a temporary `location /.well-known/acme-challenge/` block to your `nginx.conf` (HTTP server) to serve files from `/var/www/certbot`.
3.  Restart Nginx container: `docker-compose restart nginx`
4.  Run Certbot (from host machine):
    ```bash
    sudo certbot certonly --webroot -w /path/to/your/project/certbot_www -d your_domain.com -d www.your_domain.com
    ```
    Replace `/path/to/your/project/certbot_www` with the host path mapped to `/var/www/certbot` in Docker.
5.  Once certificates are obtained (usually in `/etc/letsencrypt/live/your_domain.com/`), update `nginx.conf` to configure an HTTPS server block, referencing these paths:

    ```nginx
    server {
        listen 443 ssl;
        server_name your_domain.com www.your_domain.com;

        ssl_certificate /etc/letsencrypt/live/your_domain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/your_domain.com/privkey.pem;

        # Recommended SSL parameters for better security
        include /etc/nginx/snippets/ssl-params.conf; # You'll need to create this file
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384";
        ssl_prefer_server_ciphers on;

        # Force HTTP to HTTPS redirection
        if ($scheme = http) {
            return 301 https://$server_name$request_uri;
        }

        # Frontend static files
        location / {
            root /var/www/frontend;
            try_files $uri $uri/ /index.html;
        }

        # API proxy
        location /api/v1/ {
            proxy_pass http://api_upstream/api/v1/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 90;
        }
    }
    ```
6.  Create `/etc/nginx/snippets/ssl-params.conf` (on your host machine, then ensure it's mapped into the container):
    ```nginx
    ssl_dhparam /etc/nginx/dhparam.pem; # Generate this: sudo openssl dhparam -out /etc/nginx/dhparam.pem 2048
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    ```
7.  Restart `docker-compose`: `docker-compose up --build -d`

**4.4. Automate Certificate Renewal:**

Let's Encrypt certificates expire after 90 days. Set up a cron job on your host machine to renew them automatically.
```bash
sudo crontab -e
```
Add the following line:
```
0 0 * * * sudo certbot renew --nginx --quiet && docker-compose restart nginx
```
This attempts renewal daily at midnight, restarts Nginx if successful.

## 5. Continuous Integration / Continuous Deployment (CI/CD)

See `/.github/workflows/main.yml` for a conceptual GitHub Actions pipeline. For actual deployment, you would extend this to:
1.  Push images to a container registry (Docker Hub, AWS ECR, GCP GCR).
2.  SSH into the server.
3.  Pull the latest images.
4.  Run migrations.
5.  Restart containers.

## 6. Monitoring and Maintenance

*   **Logs**: Regularly check logs for all services: `docker-compose logs -f`.
*   **Health Checks**: Implement more sophisticated health checks for services.
*   **Backups**: Set up automated backups for your PostgreSQL database.
*   **Updates**: Keep Docker, Node.js, and other dependencies updated.
*   **Security Patches**: Apply security patches to your OS and software.

This guide provides a robust starting point for deploying your e-commerce system. Remember to adapt it to your specific cloud provider and requirements.
```