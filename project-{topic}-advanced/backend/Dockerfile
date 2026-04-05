```dockerfile
# Stage 1: Build the TypeScript application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the TypeScript code
RUN npm run build

# Stage 2: Run the production application
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json from builder stage
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm install --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env.example ./.env.example

# Expose port
EXPOSE 5000
EXPOSE 9999 # For Prometheus metrics

# Define the command to run migrations, seeds, and then start the server
# This will run migrations and seeds only once on first boot if the DB is empty.
# In a real production scenario, migrations should be run as a separate step.
# For simplicity in this demo, it's combined.
CMD sh -c "if [ ! -f ./.env ]; then cp ./.env.example ./.env; fi && \
  npm run typeorm migration:run -d dist/database/data-source.js && \
  if [ $(ls -A dist/database/seeds/*.js 2>/dev/null | wc -l) -gt 0 ] && [ $(npm run typeorm query \"SELECT COUNT(*) FROM users\" -d dist/database/data-source.js | grep -o '\"count\": \"0\"' | wc -l) -eq 1 ]; then \
    npm run seed; \
  fi && \
  npm start"
```