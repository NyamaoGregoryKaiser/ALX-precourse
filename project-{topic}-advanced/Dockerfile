```dockerfile
# Stage 1: Build the TypeScript application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the TypeScript code
RUN npm run build

# Stage 2: Run the application
FROM node:20-alpine

WORKDIR /app

# Copy package.json and production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy built application from the build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/.env.example ./.env.example
# Copy .env file if it exists, otherwise rely on env vars from docker-compose
# For production, env vars should be passed directly or via secrets
COPY --from=build /app/.env ./.env || true


# Expose the port the app runs on
EXPOSE 5000

# Set environment variables for Prisma at runtime
ENV DATABASE_URL=${DATABASE_URL}
ENV NODE_ENV=production

# Run database migrations (only on initial deployment or when schema changes)
# In production, this might be run as a separate step or a dedicated migration container
# Ensure your entrypoint script handles this carefully for zero-downtime deployments
# ENTRYPOINT ["/usr/local/bin/node", "dist/server.js"]
CMD npx prisma migrate deploy && npm start
```