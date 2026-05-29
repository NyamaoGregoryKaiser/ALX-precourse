```dockerfile
FROM nginx:alpine
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
# For production, you might also copy SSL certificates here
# COPY ./certs /etc/nginx/certs
EXPOSE 80
EXPOSE 443
CMD ["nginx", "-g", "daemon off;"]
```