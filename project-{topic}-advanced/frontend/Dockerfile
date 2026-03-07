```Dockerfile
# Use the official Node.js 20 LTS image as the build image
FROM node:20-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React application
ENV REACT_APP_API_BASE_URL=http://localhost:5000/api/v1 # This can be overridden at runtime
RUN npm run build

# --- Production Stage ---
# Use a lightweight web server like Nginx to serve the static files
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Remove default Nginx configuration
RUN rm -rf ./*

# Copy the built React app from the build stage
COPY --from=build /app/build .

# Copy custom Nginx configuration (optional, if you need specific config)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (default for web servers)
EXPOSE 80

# The default command for Nginx will start the server
CMD ["nginx", "-g", "daemon off;"]
```