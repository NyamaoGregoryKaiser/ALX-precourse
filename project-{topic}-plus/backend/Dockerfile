```dockerfile
# Stage 1: Build the application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Run tests before building final image
RUN npm test -- --coverage # Ensure tests pass and coverage is collected

# Stage 2: Create the production-ready image
FROM node:18-alpine

WORKDIR /app

# Copy only necessary files from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.env.example ./.env.example
COPY --from=builder /app/swagger.js ./swagger.js

# Expose the port the app runs on
EXPOSE 5000

# Set environment variables for production (can be overridden by docker-compose or Kubernetes)
ENV NODE_ENV=production
ENV PORT=5000

# Command to run the application
CMD ["node", "src/server.js"]
```