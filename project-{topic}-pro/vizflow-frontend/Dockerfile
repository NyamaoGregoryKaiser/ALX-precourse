```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json .
COPY yarn.lock .

RUN yarn install --frozen-lockfile

COPY . .

# Build React app
RUN yarn build

FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

# Expose port 3000 for the frontend (or 80 for Nginx default)
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```