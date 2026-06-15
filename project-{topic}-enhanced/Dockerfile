```dockerfile
# Stage 1: Build the NestJS application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build the application
COPY . .
RUN npm run build

# Stage 2: Run the production application
FROM node:18-alpine

WORKDIR /app

# Copy package.json for production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy .env.example for structure, but production should use real env vars
COPY .env.example ./.env.example

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables for production (can be overridden at runtime)
ENV NODE_ENV production
ENV DATABASE_HOST=task_management_db
ENV REDIS_HOST=task_management_redis

# Command to run the application
CMD ["node", "dist/main"]
```