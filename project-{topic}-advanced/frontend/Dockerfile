FROM node:20-alpine as builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

ENV CI=true # Suppress create-react-app warnings about tests

RUN npm run build

FROM nginx:stable-alpine

COPY --from=builder /app/build /usr/share/nginx/html

# Optional: Custom Nginx configuration for better caching, compression, etc.
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]