```dockerfile
# Stage 1: Build the TypeScript application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and yarn.lock/package-lock.json to install dependencies
COPY backend/package.json backend/yarn.lock* ./
RUN yarn install --frozen-lockfile --production=false

# Copy the rest of the application source code
COPY backend/src src/
COPY backend/tsconfig.json tsconfig.json
COPY backend/ormconfig.ts ormconfig.ts

# Build the TypeScript code
RUN npx tsc

# Stage 2: Create the production-ready image
FROM node:20-alpine

WORKDIR /app

# Copy only production dependencies
COPY --from=builder /app/package.json /app/yarn.lock* ./
RUN yarn install --frozen-lockfile --production=true

# Copy the built application code from the builder stage
COPY --from=builder /app/dist dist/
COPY --from=builder /app/src/migrations src/migrations/ # Keep migrations for running in container if needed
COPY --from=builder /app/ormconfig.ts ormconfig.ts

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
CMD ["node", "dist/server.js"]
```