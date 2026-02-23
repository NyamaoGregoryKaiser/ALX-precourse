```dockerfile
# Stage 1: Build dependencies
FROM node:18-alpine as builder

WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package.json package-lock.json ./

# Install dependencies (only production dependencies by default)
RUN npm ci --only=production

# Stage 2: Production environment
FROM node:18-alpine

WORKDIR /app

# Copy installed production dependencies from the builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy the rest of the application code
COPY . .

# Create a directory for logs
RUN mkdir -p logs

# Expose the port the app runs on
EXPOSE 5000

# Set environment variables (ensure .env is not committed to git, but used for local dev/CI/CD)
# For production, these should be managed by your orchestrator (e.g., Kubernetes, Docker Compose .env file)
# Example: ENV NODE_ENV=production

# Command to run the application
CMD ["node", "src/server.js"]
```