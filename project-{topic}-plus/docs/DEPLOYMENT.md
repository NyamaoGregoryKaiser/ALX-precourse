```markdown
# Real-time Chat Application Deployment Guide

This document provides a general guide for deploying the Real-time Chat Application to a production environment. The recommended approach leverages Docker for consistency and ease of management.

## 1. Prerequisites for Deployment Environment

Before you begin, ensure your target deployment server (e.g., a cloud VM like AWS EC2, DigitalOcean Droplet, GCP Compute Engine) has:

*   **Docker Engine:** Installed and running.
*   **Docker Compose:** Installed.
*   **Git:** For cloning the repository.
*   **Firewall Rules:** Configured to allow inbound traffic on ports 80/443 (for HTTP/HTTPS) and potentially 5000 (if exposing backend directly, though not recommended).
*   **Domain Name:** A registered domain name (e.g., `chat.yourdomain.com`) and DNS configured to point to your server's IP address.
*   **SSL/TLS Certificate:** (Highly Recommended) For secure HTTPS communication. Let's Encrypt is a free option.

## 2. Environment Configuration

### Secure your `.env` files

Never commit your actual `.env` files to version control. Use `.env.example` as a template.
For production, you'll need to create a production `.env` file on your server for the backend with actual secure values.

**`backend/.env` (on your server):**

```env
NODE_ENV=production
DATABASE_URL="postgresql://<db_user>:<db_password>@<db_host>:<db_port>/<db_name>?schema=public"
JWT_SECRET="YOUR_VERY_LONG_AND_COMPLEX_JWT_SECRET_KEY_HERE" # Generate a strong, unique key
REDIS_URL="redis://<redis_host>:6379"
PORT=5000 # Internal port for the backend container
```

**`frontend/.env` (during build, values are baked into the JS bundle):**

```env
REACT_APP_API_BASE_URL="https://api.chat.yourdomain.com/api" # Public URL of your backend
REACT_APP_SOCKET_URL="https://api.chat.yourdomain.com"      # Public WebSocket URL
```
*   **Important:** Frontend `.env` variables prefixed with `REACT_APP_` are usually bundled into the static assets during the build process. Ensure these point to your *publicly accessible* backend URL.

## 3. Deployment Steps

### Step 1: Clone the Repository

On your production server:

```bash
git clone https://github.com/your-username/realtime-chat-app.git
cd realtime-chat-app
```

### Step 2: Create Production `.env` Files

Navigate to `backend/` and `frontend/` directories and create the `.env` files with your production-specific values. For the frontend, you'll use these during the Docker build.

### Step 3: Build Production Docker Images

Modify `docker-compose.yml` for production:

*   **Remove volume mounts** for source code (`./backend:/app`, `./frontend:/app`) in `backend` and `frontend` services. This ensures that the images are self-contained and don't rely on local source code.
*   **Change `command`** for `backend` service from `npm run dev` to `node dist/server.js` (assuming `npm run build` generates `dist/server.js`). The `npm run dev` command is for development with `ts-node-dev`.
*   The `frontend` service `command` should ideally be `serve -s build -l 3000` or similar for serving static files, or `npm run start` if your `package.json` script handles a production build and serve. For simplicity, we'll keep `npm start` which typically serves the build.

**Example Production `docker-compose.yml` snippet modification:**

```yaml
# ...
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
  restart: always
  ports:
    - "5000:5000" # Internal port, will be exposed via reverse proxy
  environment:
    # ... (refer to backend/.env example, or use Docker secrets)
  # volumes:
  #   - ./backend:/app # REMOVE OR COMMENT OUT FOR PRODUCTION
  #   - /app/node_modules # RETAIN IF NEEDED, BUT USUALLY NOT FOR PRODUCTION IMAGE
  command: sh -c "npx prisma migrate deploy && node dist/server.js" # Production command

frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
  restart: always
  ports:
    - "3000:3000" # Internal port, will be exposed via reverse proxy
  environment:
    # ... (refer to frontend/.env example for build args)
  # volumes:
  #   - ./frontend:/app # REMOVE OR COMMENT OUT FOR PRODUCTION
  #   - /app/node_modules # RETAIN IF NEEDED, BUT USUALLY NOT FOR PRODUCTION IMAGE
  command: npm start # This typically serves the production build
# ...
```

Now, build and run your services:

```bash
docker compose -f docker-compose.prod.yml up --build -d # Assuming you create a docker-compose.prod.yml
```
Or, if you modify the main `docker-compose.yml`:

```bash
docker compose up --build -d
```

### Step 4: Run Database Migrations and Seed Data

If you didn't include `npx prisma migrate deploy` in your `backend` container's `command` (or if it failed), you might need to run it manually.

```bash
# Connect to your backend container
docker exec -it <backend_container_id_or_name> bash

# Inside the container:
npx prisma migrate deploy
npx prisma db seed # Only run seed if you need initial data, typically only once.
exit
```

### Step 5: Set up a Reverse Proxy (Nginx/Caddy - **Crucial for Production**)

You *must* use a reverse proxy in front of your Docker containers for:
*   **SSL/TLS Termination:** Provide HTTPS for secure communication.
*   **Load Balancing:** Distribute traffic if you have multiple backend instances.
*   **Static File Serving:** Serve frontend static files more efficiently.
*   **Domain Routing:** Route `chat.yourdomain.com` to your frontend and `api.chat.yourdomain.com` to your backend.
*   **WebSocket Proxying:** Nginx needs special configuration to proxy WebSocket connections.

#### Example Nginx Configuration (`/etc/nginx/sites-available/chat_app.conf`)

```nginx
server {
    listen 80;
    server_name chat.yourdomain.com api.chat.yourdomain.com;
    return 301 https://$host$request_uri; # Redirect HTTP to HTTPS
}

server {
    listen 443 ssl http2;
    server_name chat.yourdomain.com; # Frontend
    ssl_certificate /etc/letsencrypt/live/chat.yourdomain.com/fullchain.pem; # Path to your cert
    ssl_certificate_key /etc/letsencrypt/live/chat.yourdomain.com/privkey.pem; # Path to your key
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root /var/www/html/frontend; # This assumes you copy frontend build to host or use another method
    index index.html;

    location / {
        try_files $uri $uri/ /index.html; # For React routing
    }
}

server {
    listen 443 ssl http2;
    server_name api.chat.yourdomain.com; # Backend API and WebSockets
    ssl_certificate /etc/letsencrypt/live/chat.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chat.yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location /api/ {
        proxy_pass http://localhost:5000; # Forward to backend container's exposed port
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / { # For Socket.IO (no /api prefix)
        proxy_pass http://localhost:5000; # Forward to backend container's exposed port
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
*   **Note:** The Nginx config assumes `localhost:5000` is accessible from the Nginx container/host. If Nginx is in its own container, you'd reference `http://backend:5000` (the Docker service name) instead of `localhost:5000`.
*   Ensure the `frontend` build output is available to Nginx. You could build the frontend locally and copy the `build` folder to `/var/www/html/frontend` on the server, or use a multi-stage Dockerfile that builds frontend into a static server like Nginx.

After configuring Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/chat_app.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: Monitor and Maintain

*   **Logging:** Configure `winston` in the backend to write logs to a file or a logging service (e.g., ELK stack, Grafana Loki).
*   **Monitoring:** Use tools like Prometheus/Grafana to monitor server health, container metrics, and application performance.
*   **Updates:** Regularly update dependencies and apply security patches.
*   **Backups:** Implement a robust database backup strategy for PostgreSQL.

## 4. CI/CD for Production

The provided `main.yml` in `.github/workflows/` is a basic CI setup. For production deployment, you would extend it to:

1.  **Build Docker Images:** Create optimized production-ready Docker images.
2.  **Tag Images:** Tag images with version numbers or Git SHAs.
3.  **Push to Registry:** Push images to a Docker Registry (e.g., Docker Hub, AWS ECR, GCR).
4.  **Deployment Trigger:** Trigger a deployment on your cloud provider (e.g., update an ECS service, deploy to Kubernetes, or run a `docker compose pull && docker compose up -d` command on your VM).

**Example of an extended CI/CD step (Conceptual):**

```yaml
# ... (after build-and-test-backend and build-and-test-frontend jobs)

deploy:
  name: Deploy to Production
  runs-on: ubuntu-latest
  needs: [build-and-test-backend, build-and-test-frontend] # Ensure tests pass and images are built
  environment: Production # Associate with a GitHub Environment
  steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Log in to Docker Hub (or other registry)
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}

    - name: Build and push backend image
      run: |
        cd backend
        docker build -t yourusername/realtime-chat-backend:${{ github.sha }} .
        docker push yourusername/realtime-chat-backend:${{ github.sha }}
        docker tag yourusername/realtime-chat-backend:${{ github.sha }} yourusername/realtime-chat-backend:latest
        docker push yourusername/realtime-chat-backend:latest

    - name: Build and push frontend image
      run: |
        cd frontend
        docker build -t yourusername/realtime-chat-frontend:${{ github.sha }} .
        docker push yourusername/realtime-chat-frontend:${{ github.sha }}
        docker tag yourusername/realtime-chat-frontend:${{ github.sha }} yourusername/realtime-chat-frontend:latest
        docker push yourusername/realtime-chat-frontend:latest

    - name: Deploy to Server via SSH
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.PROD_HOST }}
        username: ${{ secrets.PROD_USER }}
        key: ${{ secrets.PROD_SSH_KEY }}
        script: |
          cd /path/to/your/app
          docker compose pull # Pull latest images from registry
          docker compose -f docker-compose.prod.yml up -d # Use prod compose file
          # Add commands to restart Nginx if configurations changed
```

This guide provides a robust starting point for deploying your Real-time Chat Application. Always adapt configurations to your specific hosting environment and security requirements.
```