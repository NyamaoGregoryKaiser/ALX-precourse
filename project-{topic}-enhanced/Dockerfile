```dockerfile
# Stage 1: Build the TypeScript application
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Run the application
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm install --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.env.example ./.env.example
# Copy .env if you want to bake it in, but usually it's better to mount it or pass as env vars
# COPY --from=builder /app/.env ./.env

EXPOSE 3000

CMD ["node", "dist/server.js"]
```