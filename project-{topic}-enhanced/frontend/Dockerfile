```dockerfile
# Stage 1: Build the React application
FROM node:18-alpine AS build

WORKDIR /app/frontend

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package.json yarn.lock ./
# If using npm: COPY package.json package-lock.json ./

# Install dependencies
RUN npm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the React app
# Make sure to set environment variables required for build, e.g., REACT_APP_API_BASE_URL
# During CI/CD, these would be passed securely. For local docker-compose, they come from .env in the parent.
# For a production build, specify the actual public API URL.
ARG REACT_APP_API_BASE_URL
ENV REACT_APP_API_BASE_URL=${REACT_APP_API_BASE_URL}
RUN npm run build

# Stage 2: Serve the React application with Nginx
FROM nginx:alpine

# Copy the Nginx default configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Remove the default Nginx index.html and copy the React build output
COPY --from=build /app/frontend/build /usr/share/nginx/html

# Expose port 80 for Nginx
EXPOSE 80

# Command to start Nginx
CMD ["nginx", "-g", "daemon off;"]
```