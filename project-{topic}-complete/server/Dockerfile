# Use a Node.js 20 base image
FROM node:20-alpine AS build

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the TypeScript application
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json again for production dependencies
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy the built application from the build stage
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma
COPY --from=build /usr/src/app/.env ./.env

# Expose the port the app runs on
EXPOSE 5000

# Run Prisma migrations and seed the database (optional for production, usually done in CI/CD or deployment script)
# For development/testing in docker-compose, this can be convenient.
# In a real production environment, you'd typically manage migrations outside of the app startup.
# Entrypoint for production could be more sophisticated, e.g., checking if migrations already ran.
ENTRYPOINT ["/bin/sh", "-c"]
CMD ["npx prisma migrate deploy && npx ts-node prisma/seed.ts || true && node dist/server.js"]
# The `|| true` for seed.ts is to prevent the container from crashing if seed runs on an already seeded DB in dev.
# In production, seed should be run once, not on every deploy.