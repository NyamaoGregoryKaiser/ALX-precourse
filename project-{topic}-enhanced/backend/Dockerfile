```dockerfile
# Stage 1: Build the TypeScript application
FROM node:18-alpine AS build

WORKDIR /app/backend

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package.json yarn.lock ./
# If using npm: COPY package.json package-lock.json ./

# Install dependencies
RUN npm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN npm run build

# Stage 2: Run the application
FROM node:18-alpine

WORKDIR /app/backend

# Copy package.json and package-lock.json again for production dependencies
COPY package.json yarn.lock ./
# If using npm: COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm install --only=production --frozen-lockfile

# Copy built application from the build stage
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/ormconfig.json ./ormconfig.json
# If you have other static assets or config files needed at runtime, copy them here
# e.g., COPY --from=build /app/backend/.env.production ./.env

# Expose the port the app runs on
EXPOSE 5000

# Set environment variables for production
ENV NODE_ENV production
ENV PORT 5000

# Command to run the application
# Before starting, run migrations and potentially seed data
# This is a simple approach for Docker Compose. In Kubernetes, migrations might be a separate initContainer.
CMD ["sh", "-c", "npm run migrate:run && node dist/server.js"]
```