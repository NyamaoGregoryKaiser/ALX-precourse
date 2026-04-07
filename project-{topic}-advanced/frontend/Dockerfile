# Use Nginx as a reverse proxy for the React app
FROM nginx:alpine

# Copy the built React app to the Nginx public directory
COPY build /usr/share/nginx/html

# Copy the Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]