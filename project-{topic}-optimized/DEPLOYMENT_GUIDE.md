```markdown
# Real-time Chat Application - Deployment Guide

This guide provides instructions for deploying the ALX Chat Application to a production environment. We will cover building, containerizing, and setting up a basic CI/CD pipeline.

## 1. Prerequisites

*   **Server**: A Linux-based server (e.g., Ubuntu, CentOS) with sufficient resources (CPU, RAM).
*   **Docker & Docker Compose**: Installed on the server.
*   **Git**: Installed on the server (for cloning or CI/CD).
*   **JDK 17**: If not using Docker.
*   **Maven**: If building directly on the server.
*   **Domain Name**: (Optional but recommended for HTTPS) A registered domain name pointing to your server's IP address.
*   **SSL/TLS Certificate**: (Highly Recommended) For HTTPS (e.g., Let's Encrypt).
*   **Reverse Proxy**: (Highly Recommended) Nginx or Apache for SSL termination, load balancing, and static file serving.

## 2. Production Environment Variables

Update the `.env` file for production. **DO NOT hardcode sensitive values in `docker-compose.yml` or `Dockerfile`.**

Create a `.env` file in your deployment directory:

```
# Database Configuration
DB_HOST=chat-db-instance # Could be 'db' if using docker-compose, or a managed DB host
DB_PORT=5432
DB_NAME=chatdb_prod
DB_USERNAME=chat_prod_user
DB_PASSWORD=YOUR_STRONG_DB_PASSWORD # Generate a strong password

# JWT Secret (MUST be strong and unique for production)
JWT_SECRET=YOUR_VERY_LONG_AND_COMPLEX_JWT_SECRET_KEY_AT_LEAST_32_BYTES_FOR_HS256

# Frontend allowed origins (adjust as necessary)
CORS_ALLOWED_ORIGINS=http://yourdomain.com,https://yourdomain.com

# Logging (optional, if overriding defaults)
LOGGING_LEVEL_COM_ALX_CHAT=INFO
```

## 3. Deployment Steps (Manual for Demo)

For a simple manual deployment to a single server:

### 3.1 Build the Application JAR

On your local machine or build server:

```bash
git clone https://github.com/your-username/chat-app.git
cd chat-app
mvn clean install -DskipTests
```
This will generate `target/chat-app-0.0.1-SNAPSHOT.jar`.

### 3.2 Transfer Files to Server

Transfer the `docker-compose.yml`, `Dockerfile`, the generated JAR (`target/chat-app-0.0.1-SNAPSHOT.jar`), and your `.env` file to your production server.

```bash
# Example using scp
scp -r docker-compose.yml Dockerfile target/chat-app-0.0.1-SNAPSHOT.jar .env user@your_server_ip:/path/to/chat-app/
```

### 3.3 Deploy with Docker Compose

On your production server, navigate to `/path/to/chat-app/` and run:

```bash
docker-compose up --build -d
```
*   `--build`: Builds Docker images.
*   `-d`: Runs containers in detached mode (in the background).

Wait for the containers to start and become healthy. You can check their status with `docker-compose ps` and logs with `docker-compose logs -f`.

### 3.4 Configure Reverse Proxy (Nginx Example)

It is highly recommended to use a reverse proxy like Nginx for:
*   **SSL/TLS Termination**: Secure your application with HTTPS.
*   **Load Balancing**: If you scale your `app` service to multiple instances.
*   **Static File Serving**: Nginx can serve your `index.html`, `chat.html`, CSS, and JS directly, offloading this from Spring Boot.
*   **Rate Limiting / WAF**: Additional security layers.

**Example Nginx Configuration (`/etc/nginx/sites-available/chat-app.conf`)**

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL configuration (replace with your actual certificate paths)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/yourdomain.com/chain.pem;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers "EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH";
    ssl_ecdh_curve secp384r1;
    ssl_stapling on;
    ssl_stapling_verify on;
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Proxy buffer size for WebSockets
    proxy_buffering off;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Serve static files directly from the app container (or map a volume)
    location / {
        proxy_pass http://localhost:8080; # Assuming app is on localhost:8080
    }

    # API endpoints
    location /api/v1/ {
        proxy_pass http://localhost:8080/api/v1/;
    }

    # WebSocket endpoint
    location /ws/chat/ {
        proxy_pass http://localhost:8080/ws/chat/;
    }

    # Actuator endpoints for monitoring
    location /actuator/ {
        proxy_pass http://localhost:8080/actuator/;
        # Restrict access to monitoring endpoints in production if needed
        # allow 192.168.1.0/24;
        # deny all;
    }
}
```

*   **Enable Nginx Config**:
    ```bash
    sudo ln -s /etc/nginx/sites-available/chat-app.conf /etc/nginx/sites-enabled/
    sudo nginx -t # Test config
    sudo systemctl restart nginx
    ```

## 4. CI/CD Pipeline Configuration (Conceptual with GitHub Actions)

A basic CI/CD pipeline for this project using GitHub Actions could look like this: