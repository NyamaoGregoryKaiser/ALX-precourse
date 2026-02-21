# Stage 1: Build the React application
FROM node:18-alpine as builder

WORKDIR /app

# Copy package.json and yarn.lock (or package-lock.json)
COPY package.json ./
COPY yarn.lock ./

# Install dependencies
# Using npm ci ensures clean install and exact versions from lock file
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the React app for production
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the built React app from the builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom Nginx configuration (optional, if you have one)
# This default.conf redirects all traffic to index.html for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (Nginx default)
EXPOSE 80

# Command to run Nginx
CMD ["nginx", "-g", "daemon off;"]