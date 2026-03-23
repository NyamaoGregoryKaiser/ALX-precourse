```dockerfile
# Stage 1: Build the React application
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile

COPY .env.example ./.env # Copy .env.example for build stage

COPY public ./public
COPY src ./src

RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the built React app from the builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```