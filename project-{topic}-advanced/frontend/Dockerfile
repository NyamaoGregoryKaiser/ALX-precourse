```Dockerfile
# Dockerfile for React Frontend
# Stage 1: Build the React app
FROM node:18-alpine as builder
WORKDIR /app
COPY package.json ./
COPY yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . ./
RUN yarn build

# Stage 2: Serve the app with Nginx
FROM nginx:alpine
# Copy the build output from the builder stage
COPY --from=builder /app/build /usr/share/nginx/html
# Copy custom Nginx configuration
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```