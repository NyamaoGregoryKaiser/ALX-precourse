```dockerfile
# Stage 1: Build the React application
FROM node:20-alpine as builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN npm install --frozen-lockfile

COPY . .

ENV REACT_APP_API_URL=${REACT_APP_API_URL} # Pass API URL during build

RUN npm run build

# Stage 2: Serve the static files with Nginx
FROM nginx:alpine

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built React app from the builder stage
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```