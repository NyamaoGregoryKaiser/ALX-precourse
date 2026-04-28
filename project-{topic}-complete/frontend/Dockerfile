# Stage 1: Build the React application
FROM node:18-alpine as build

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
COPY package-lock.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the build output from the build stage to Nginx's HTML directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration (optional, but good practice for SPAs)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Command to start Nginx
CMD ["nginx", "-g", "daemon off;"]
```

### `frontend/nginx.conf`

```nginx