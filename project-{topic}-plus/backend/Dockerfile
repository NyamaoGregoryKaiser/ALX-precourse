```dockerfile
# Stage 1: Build the application
FROM node:20-alpine as builder

WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package.json yarn.lock ./
# Install dependencies
RUN npm install --frozen-lockfile # Use --frozen-lockfile for production builds

# Copy the rest of the application code
COPY . .

# Run build script if you have one (e.g., for frontend within backend for monolith)
# In this microservice setup, backend is pure Node.js, so no build step needed here.

# Stage 2: Create a slim production image
FROM node:20-alpine

WORKDIR /app

# Copy only necessary files from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.env.example ./.env.example
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/seeders ./seeders
COPY --from=builder /app/sequelize_config.js ./sequelize_config.js # if exists, otherwise config is in src/config/config.js

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Run database migrations and seeders, then start the application
# This command is run by docker-compose for convenience.
# If running standalone, you might separate migration/seed jobs.
CMD ["sh", "-c", "npx sequelize-cli db:migrate && npx sequelize-cli db:seed:all && npm start"]

# Alternatively, for production, you might have separate entrypoint scripts:
# ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
# CMD ["npm", "start"]
# And docker-entrypoint.sh would handle migrations/seeds.
```