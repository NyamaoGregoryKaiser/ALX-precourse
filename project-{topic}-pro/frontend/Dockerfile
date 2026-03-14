# Stage 1: Build the React app
FROM node:18-alpine as build-stage

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build the app for production
RUN npm run build

# Stage 2: Serve the app with Nginx
FROM nginx:alpine as production-stage

# Copy the built React app to Nginx's public directory
COPY --from=build-stage /app/build /usr/share/nginx/html

# Copy custom Nginx configuration (optional, for advanced routing/SSL)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]