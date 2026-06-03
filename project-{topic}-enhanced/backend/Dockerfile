```dockerfile
# Stage 1: Build dependencies
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: Production image
FROM node:18-alpine

WORKDIR /app

# Copy production dependencies
COPY --from=builder /app/node_modules ./node_modules
# Copy application source code
COPY . .

# Expose the application port
EXPOSE 5000

# Run database migrations and seeds (one-time on first run or build)
# In production, these should be handled by CI/CD or separate migration service
# RUN npm run migrate:latest
# RUN npm run seed:run

# Set default command to run the application
CMD ["node", "src/server.js"]
```