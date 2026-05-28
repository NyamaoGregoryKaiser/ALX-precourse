```dockerfile
# Stage 1: Build Node.js application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Run tests (optional for build stage, can be done in CI/CD)
# RUN npm test

# Build any frontend assets if this was a monolithic app (not applicable for separate frontend)
# RUN npm run build

# Stage 2: Production-ready image
FROM node:18-alpine

WORKDIR /app

# Copy node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy only necessary application files for production
COPY --from=builder /app/src ./src
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/seeders ./seeders
COPY --from=builder /app/.sequelizerc ./
COPY --from=builder /app/package*.json ./

# Expose the port the app runs on
EXPOSE 5000

# Run database migrations and then start the application
# In a real production environment, migrations and seeding are often
# separate steps orchestrated by the CI/CD pipeline or a dedicated
# migration service before the application containers start.
# This approach is suitable for simple deployments or dev setups.
CMD ["sh", "-c", "npx sequelize db:migrate && npx sequelize db:seed:all && npm start"]
```