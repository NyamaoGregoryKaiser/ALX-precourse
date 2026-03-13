This command will:
    *   Build optimized Docker images.
    *   Start PostgreSQL, Redis, Backend, and Nginx (serving the React app).
    *   The backend container will automatically run database migrations and seed data on startup.

5.  **Reverse Proxy (Optional but Recommended for Production):**
    For a production environment, you should typically put Nginx (or another web server) in front of your Dockerized frontend (even though the frontend Dockerfile already uses Nginx) and backend. This allows for:
    *   SSL termination (HTTPS).
    *   Load balancing (if you scale services).
    *   Centralized logging and access control.

    Example Nginx configuration on the host machine to proxy to Docker containers: