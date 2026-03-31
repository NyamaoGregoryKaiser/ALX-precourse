```dockerfile
# Stage 1: Build the React application
FROM node:18-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . ./

# Build the React app for production
# Set REACT_APP_API_URL during build. In docker-compose, this will be defined.
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html

# Copy a custom Nginx configuration to disable caching for index.html
# and to ensure React Router works correctly with direct URL access.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000 # The port Nginx will listen on for the frontend
CMD ["nginx", "-g", "daemon off;"]
```