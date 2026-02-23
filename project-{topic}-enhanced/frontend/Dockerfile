```dockerfile
# Stage 1: Build the React application
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . ./
RUN npm run build

# Stage 2: Serve the application with Nginx (or another web server)
FROM nginx:alpine
# Copy the built React app from the builder stage
COPY --from=builder /app/build /usr/share/nginx/html
# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf
# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
*(Note: `frontend/nginx.conf` is used if the frontend Dockerfile also includes Nginx, but for `docker-compose.yml`, a separate Nginx service is more flexible. The `docker-compose.yml` above uses a separate Nginx service.)*

This `frontend/Dockerfile` is suitable if you want to bundle Nginx directly with the frontend. However, the `docker-compose.yml` uses a *separate* Nginx service for proxying both frontend and backend, which is generally more flexible. So, the `frontend/Dockerfile` doesn't strictly need to include Nginx for this `docker-compose` setup if the `nginx.conf` configures Nginx to serve static files from a volume.

Let's assume the Nginx service in `docker-compose.yml` will serve the React build and proxy the backend.