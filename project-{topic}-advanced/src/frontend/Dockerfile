```dockerfile
# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

# Copy a custom Nginx configuration to disable caching for development or specific routes
# For production, default Nginx config or a more optimized one might be used.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
```