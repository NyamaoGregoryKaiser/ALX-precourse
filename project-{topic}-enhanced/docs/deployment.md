```markdown
# Real-time Chat Application - Deployment Guide

This document provides a guide for deploying the Real-time Chat Application to a production environment. The application is containerized using Docker, making it portable across various cloud providers.

## 1. Prerequisites

*   A cloud provider account (e.g., AWS, GCP, Azure, DigitalOcean, Heroku)
*   `git` installed
*   `docker` and `docker-compose` installed (for local testing and image building)
*   Familiarity with container orchestration (e.g., Docker Swarm, Kubernetes) is beneficial for scaling.

## 2. Environment Configuration

Before deployment, ensure your `.env` files for both `backend` and `frontend` are correctly configured for the production environment.

### `backend/.env`

```
PORT=5000
DATABASE_URL="postgresql://<user>:<password>@<db-host>:<db-port>/<db-name>?schema=public"
JWT_SECRET="YOUR_STRONG_PRODUCTION_JWT_SECRET" # MUST BE A STRONG, UNIQUE SECRET
JWT_EXPIRES_IN="7d" # Or whatever makes sense for your session length
REDIS_URL="redis://<redis-host>:<redis-port>"
NODE_ENV="production"
CORS_ORIGIN="https://your-frontend-domain.com" # Your actual frontend domain
```
*   **`DATABASE_URL`**: Replace with your production PostgreSQL database connection string. Use a managed database service (e.g., AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL) for reliability and scalability.
*   **`REDIS_URL`**: Replace with your production Redis instance connection string. Use a managed Redis service (e.g., AWS ElastiCache, Azure Cache for Redis, Google Cloud Memorystore) for high availability.
*   **`JWT_SECRET`**: **CRITICAL:** Generate a very long, random, and unique string for your production secret. Do NOT use the default from `.env.example`. Store it securely (e.g., AWS Secrets Manager, Vault).
*   **`CORS_ORIGIN`**: Set this to your frontend's actual domain(s) in production to prevent CORS errors.

### `frontend/.env`

```
REACT_APP_API_BASE_URL=https://your-backend-domain.com/api
REACT_APP_WS_URL=https://your-backend-domain.com
```
*   **`REACT_APP_API_BASE_URL`**: Point this to your deployed backend API URL.
*   **`REACT_APP_WS_URL`**: Point this to your deployed backend WebSocket URL. Ensure it uses `https` for production (WebSocket Secure, `wss://`).

## 3. Build Docker Images

From the project root directory:

```bash
docker-compose build
```
This will build the `backend` and `frontend` Docker images based on their respective `Dockerfile`s.

You can then push these images to a container registry (e.g., Docker Hub, AWS ECR, GCP Container Registry):

```bash
# Example for Docker Hub
docker tag chat-app-backend:latest your-dockerhub-username/chat-app-backend:latest
docker push your-dockerhub-username/chat-app-backend:latest

docker tag chat-app-frontend:latest your-dockerhub-username/chat-app-frontend:latest
docker push your-dockerhub-username/chat-app-frontend:latest
```
Replace `your-dockerhub-username` with your actual Docker Hub username.

## 4. Deployment Strategy

For a production-grade application, using a container orchestration platform like Kubernetes is highly recommended. For simpler deployments, a Platform-as-a-Service (PaaS) like Heroku or AWS App Runner might suffice.

### Option A: Kubernetes (EKS, GKE, AKS)

1.  **Container Registry:** Ensure your Docker images are pushed to a registry accessible by your Kubernetes cluster.
2.  **Kubernetes Manifests:** Create `Deployment`, `Service`, `Ingress`, and `Secret` manifests for your backend, frontend, PostgreSQL (if self-managed, though a managed service is better), and Redis (if self-managed, managed is better).
    *   **Backend Deployment:** Configure multiple replicas for horizontal scaling.
    *   **Frontend Deployment:** Serve static assets or use Nginx as in the `Dockerfile`.
    *   **Database & Cache:** Use managed services (AWS RDS, GCP Cloud SQL, Azure Database for PostgreSQL; AWS ElastiCache, GCP Memorystore, Azure Cache for Redis). Connect your backend to these external services.
    *   **Ingress:** Configure an Ingress controller (e.g., Nginx Ingress, AWS ALB Ingress Controller) for HTTP/HTTPS routing and SSL termination. It should route `/api` and `/socket.io` to the backend service and all other paths to the frontend service.
    *   **Secrets:** Store `JWT_SECRET`, database credentials, and Redis credentials as Kubernetes Secrets.
3.  **Deployment:** Apply your manifests to the cluster using `kubectl apply -f your-manifests/`.
4.  **Scaling:** Configure Horizontal Pod Autoscalers (HPAs) for your backend and frontend deployments based on CPU or custom metrics.

### Option B: Platform-as-a-Service (PaaS) - e.g., Heroku, AWS App Runner

PaaS providers simplify deployment by abstracting infrastructure.

1.  **Backend:**
    *   Deploy your `backend` Docker image or connect your Git repository.
    *   Configure environment variables as required (e.g., `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`).
    *   Attach a managed PostgreSQL and Redis add-on/service.
    *   Ensure the `PORT` environment variable is correctly picked up (Heroku sets `PORT` dynamically).
    *   **Migrations:** You will need a way to run Prisma migrations. This can be done as a pre-deploy hook, a separate worker process, or manually using `docker-compose exec` against your local backend with the production `DATABASE_URL`.
2.  **Frontend:**
    *   Deploy your `frontend` Docker image or build directly from your Git repository (e.g., on Netlify, Vercel, or a static site host like AWS S3 + CloudFront).
    *   Ensure `REACT_APP_API_BASE_URL` and `REACT_APP_WS_URL` are set to the *public* URL of your deployed backend.

### Option C: Virtual Private Server (VPS) / EC2

For simpler, single-server deployments (not recommended for high availability or scalability without additional setup).

1.  **Provision a VPS:** Create a virtual machine (e.g., AWS EC2, DigitalOcean Droplet).
2.  **Install Docker & Docker Compose:** On the VPS.
3.  **Copy Files:** Transfer your `docker-compose.yml`, `backend/.env`, `frontend/.env`, and `nginx.conf` (if you modified it for production) to the VPS.
4.  **Update `docker-compose.yml`:**
    *   Change `image` names to your container registry if you pushed images there.
    *   Remove `volumes` for `./backend:/app` and `./frontend:/app` as you don't need live reload.
    *   Ensure `ports` are configured correctly (e.g., `80:80` for frontend, `443:443` if using Nginx for SSL).
5.  **External Services:** Connect to your managed PostgreSQL and Redis instances. Do NOT run them directly on the same VPS in production.
6.  **Run:** `docker-compose up -d`
7.  **Reverse Proxy & SSL:**
    *   It's highly recommended to place Nginx in front of your frontend and backend services for SSL termination (HTTPS), domain routing, and potentially load balancing (if you scale services on the same VPS).
    *   The `frontend/nginx.conf` provided in the `frontend` Dockerfile is for serving the React app. For a robust setup with SSL and API/WS proxying, you'd typically have a separate Nginx or Caddy container handling all incoming traffic and routing it to `frontend` and `backend` services internally.
    *   Obtain an SSL certificate (e.g., using Certbot with Let's Encrypt).

## 5. Post-Deployment Steps

1.  **DNS Configuration:** Point your domain (e.g., `chat.your-domain.com`) to the IP address or load balancer URL of your deployed frontend.
2.  **HTTPS/SSL:** Configure HTTPS for both your frontend and backend domains. Use a reverse proxy (Nginx, Caddy, or cloud load balancer) for SSL termination. WebSocket connections should use `wss://` in production.
3.  **Monitoring & Logging:**
    *   Set up external monitoring for your application (e.g., uptime, latency).
    *   Integrate your backend logs (Winston) with a centralized logging service (e.g., ELK Stack, Loggly, Papertrail, cloud provider's logging).
4.  **Backup Strategy:** Implement regular backups for your PostgreSQL database.
5.  **Security Audits:** Regularly review security configurations, dependencies, and follow best practices.
6.  **CI/CD Pipeline:** Configure your CI/CD pipeline (e.g., GitHub Actions) to automatically build, test, and deploy your application to your chosen production environment on every successful merge to the main branch.

## 6. CI/CD Integration (Refer to `.github/workflows/ci-cd.yml`)

The provided `.github/workflows/ci-cd.yml` file demonstrates a basic CI/CD pipeline. For production deployment, you would extend this:

*   **Build Stage:** Build Docker images for both frontend and backend.
*   **Test Stage:** Run unit, integration, and API tests.
*   **Security Scans:** Add vulnerability scanning for dependencies and Docker images.
*   **Push Images:** Push built images to a container registry (e.g., AWS ECR, Google Container Registry).
*   **Deployment Stage:**
    *   For Kubernetes: Use `kubectl` or Helm to update deployments in your cluster.
    *   For PaaS: Use platform-specific deployment commands or API calls.
    *   For VPS: SSH into the server and run `docker-compose pull && docker-compose up -d`.

**Important:** Never hardcode sensitive credentials in your CI/CD configuration. Use GitHub Secrets or your CI/CD provider's secret management system.
```