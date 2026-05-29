```dockerfile
# Stage 1: Build dependencies
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json
COPY api/package*.json ./

# Install dependencies
RUN npm install

# Stage 2: Run application
FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json again (to leverage layer caching)
COPY api/package*.json ./

# Copy installed dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy the rest of the application source code
COPY api/src ./src
COPY api/database ./database
COPY api/.env.example ./.env.example

# Expose port (if not using Nginx for direct access)
EXPOSE 5000

# Command to run migrations, seeds, and then start the API
# This is for development/testing convenience.
# In production, migrations should be run as a separate step.
CMD ["sh", "-c", "npm install && npm run migrate && npm run seed && npm run dev"]
# For production: CMD ["npm", "run", "migrate", "&&", "npm", "start"]
```