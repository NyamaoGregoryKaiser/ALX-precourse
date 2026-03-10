```dockerfile
# Use a Node.js base image to build the React app
FROM node:18-alpine as build

WORKDIR /app/frontend

COPY package*.json ./

RUN npm install

COPY . .

# Build the React app for production
RUN npm run build

# Use Nginx to serve the React app
FROM nginx:alpine

# Copy the built React app to Nginx's public directory
COPY --from=build /app/frontend/build /usr/share/nginx/html

# Copy custom nginx configuration (optional)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Command to start Nginx (default command for nginx:alpine)
CMD ["nginx", "-g", "daemon off;"]
```