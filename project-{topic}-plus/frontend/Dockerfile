# Stage 1: Build the React application
FROM node:18-alpine as build

WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React app
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the built React app from the build stage to Nginx's public directory
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80 (default for Nginx)
EXPOSE 80

# Command to run Nginx
CMD ["nginx", "-g", "daemon off;"]
```

#### `backend/.github/workflows/main.yml` (CI/CD for Backend)
```yaml