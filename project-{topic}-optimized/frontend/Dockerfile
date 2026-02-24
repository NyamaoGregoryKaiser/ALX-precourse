```dockerfile
# Stage 1: Build the React application
FROM node:20-alpine as builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Build the React app
# Pass VITE_API_BASE_URL and VITE_WS_BASE_URL at build time
# These values will be baked into the static assets
# However, for docker-compose, passing them via environment variables in docker-compose.yml
# and using them at runtime is more flexible for local dev vs. deployed scenarios.
# For production deployment, you might hardcode the production URLs here or use a specific build stage for production.
ARG VITE_API_BASE_URL
ARG VITE_WS_BASE_URL
ENV VITE_API_BASE_URL ${VITE_API_BASE_URL}
ENV VITE_WS_BASE_URL ${VITE_WS_BASE_URL}

RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy Nginx custom configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built React app from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
```