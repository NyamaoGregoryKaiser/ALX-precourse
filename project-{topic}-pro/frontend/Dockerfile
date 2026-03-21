```dockerfile
# Stage 1: Build React application
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile

COPY . ./

RUN npm run build

# Stage 2: Serve React application with Nginx
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom Nginx configuration for better security headers (optional)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```