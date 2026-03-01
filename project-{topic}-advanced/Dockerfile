```Dockerfile
# Dockerfile
# ALX Principle: Containerization
# Package application and dependencies into a portable image.

# Use a specific Node.js version for stability
FROM node:18-alpine

# Set working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
# if dependencies haven't changed
COPY package*.json ./

# Install dependencies. Use `npm ci` for clean installs in CI/CD and production.
# This ensures deterministic builds.
RUN npm ci --only=production

# Copy the rest of the application source code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Define environment variables (can be overridden at runtime)
ENV NODE_ENV=production
# ENV DB_HOST=database # Example if DB is another service named 'database' in docker-compose

# Run database migrations before starting the application.
# This ensures the database schema is up-to-date.
# For production, you might run this as a separate step or init container.
RUN npx sequelize-cli db:migrate

# Command to run the application
CMD ["npm", "start"]

# Best practices:
# - Use multi-stage builds for smaller images (e.g., separate build stage for dev dependencies)
# - Do not include .env files in the image; manage environment variables via Docker secrets or Compose.
# - Implement health checks.
```