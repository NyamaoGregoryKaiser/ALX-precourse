```dockerfile
# Stage 1: Build dependencies
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: Production image
FROM node:20-alpine

WORKDIR /app

# Copy production dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules

COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Set environment variables (these can be overridden by docker-compose or Kubernetes)
ENV NODE_ENV=production
ENV PORT=5000

# Run database migrations and seeding before starting the application
# This is a common practice for simpler deployments, for more complex scenarios
# consider separate migration containers or tools.
RUN npx sequelize-cli db:migrate

# Command to run the application
CMD [ "node", "server.js" ]
```