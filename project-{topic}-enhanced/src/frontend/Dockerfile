# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
RUN npm install

COPY . ./
RUN npm run build


# Stage 2: Serve the React application with Nginx (optional, can serve with Node too)
# For simplicity, let's serve directly with a minimal static server or just via Node
# In a real production scenario, you'd use Nginx or a CDN for static assets.

# Option 1: Serve with a simple static server (e.g., `serve`)
FROM node:20-alpine AS production_serve

WORKDIR /app

COPY --from=build /app/build ./build
COPY src/frontend/package.json ./package.json # Only copy if 'serve' is a dependency
RUN npm install -g serve # Install a simple static server

EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000"]

# Option 2: If you want to use Nginx, you would use an Nginx base image
# FROM nginx:stable-alpine AS production_nginx
# COPY --from=build /app/build /usr/share/nginx/html
# COPY nginx/default.conf /etc/nginx/conf.d/default.conf # You would need a nginx folder
# EXPOSE 80
# CMD ["nginx", "-g", "daemon off;"]