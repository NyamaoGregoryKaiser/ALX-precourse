```dockerfile
# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and yarn.lock/package-lock.json to install dependencies
COPY frontend/package.json frontend/yarn.lock* ./
RUN yarn install --frozen-lockfile

# Copy the rest of the application source code
COPY frontend .

# Build the React app
RUN yarn build

# Stage 2: Serve the React application with Nginx
FROM nginx:alpine

# Copy the Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built React app from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 for the Nginx server
EXPOSE 80

# Command to run Nginx
CMD ["nginx", "-g", "daemon off;"]
```