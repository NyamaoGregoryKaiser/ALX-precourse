```dockerfile
# Stage 1: Build the React application
FROM node:18-alpine AS builder

WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ .env ./.env
COPY frontend/src ./src
COPY frontend/public ./public

RUN npm run build

# Stage 2: Serve the React application (e.g., using Nginx for production)
# For development, the npm start command runs a dev server, so this stage is more for production.
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

# Copy the custom Nginx configuration for serving React app (optional if default is fine)
# COPY docker/nginx/frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000 # This port will be exposed by the internal Nginx, then mapped by docker-compose
CMD ["nginx", "-g", "daemon off;"]
```
(Note: The `frontend/Dockerfile` above is for building a static React app. For development, `docker-compose` runs `npm start` which typically uses `webpack-dev-server` on port 3000. For production, the built static files would be served by Nginx or a similar web server.)