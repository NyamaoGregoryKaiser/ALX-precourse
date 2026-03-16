# Stage 1: Build the React application
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY .env.example ./frontend/.env.example # If .env is used directly in build, copy it
COPY tsconfig.json ./
COPY public ./public
COPY src ./src

# Set REACT_APP_API_BASE_URL during build. In production, this might be a fixed value
# or dynamically injected. For local docker-compose, this links to the backend service.
ARG REACT_APP_API_BASE_URL
ENV REACT_APP_API_BASE_URL=${REACT_APP_API_BASE_URL:-http://localhost:5000/api}

RUN npm run build

# Stage 2: Serve the application with Nginx (for production)
# For development with docker-compose, we can just run `npm start`
# For a production setup, you would use a web server like Nginx
FROM nginx:alpine AS production-serve

COPY --from=build /app/build /usr/share/nginx/html

# Optional: Custom Nginx configuration
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# For development purposes, you can use a simpler Dockerfile that runs `npm start`
# FROM node:18-alpine

# WORKDIR /app

# COPY package*.json ./
# RUN npm install

# COPY .env.example ./.env # For development, copy .env directly or manage differently
# COPY public ./public
# COPY src ./src

# EXPOSE 3000
# CMD ["npm", "start"]