3.  **Create and configure `.env`:** Place your production `.env` file in the root directory.
4.  **Update `docker-compose.yml` for Nginx (Optional, but Recommended):**
    If you're using Nginx as a reverse proxy within Docker Compose, you'll need to add an Nginx service and potentially adjust volume mounts for the frontend's `build` directory and backend's `uploads`.
    *Self-note: For this quick example, the `docker-compose.yml` does NOT include Nginx, but it's crucial for production.*
    A simpler approach for single-server production without a dedicated Nginx container might be to modify the frontend `Dockerfile` to serve the React build using Nginx directly, but it makes the `docker-compose.yml` more complex. For simplicity, we'll assume Nginx is set up separately (on the host or another container) and directly proxies to ports `3000` (frontend) and `5000` (backend).
5.  **Run database migrations and seeders:**