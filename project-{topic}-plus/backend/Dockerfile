# Use a Node.js LTS image as the base
FROM node:20-slim as builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies, prioritizing production dependencies
RUN npm install --frozen-lockfile --production=false

# Copy the rest of the application source code
COPY . .

# Build the TypeScript application
RUN npm run build

# Generate Prisma client (necessary for runtime)
# The postinstall script in package.json will also do this,
# but running it explicitly here ensures it's done during build
# before creating the final production image.
RUN npx prisma generate

# -------------------------------------------------------------------
# Production Stage - A slimmer image for deployment
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy only production dependencies from the builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy built application and Prisma schema from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.env.example ./.env.example

# Expose the port the app runs on
EXPOSE 5000

# Run Prisma migrations and seed the database upon container start
# This ensures the database is ready when the application starts up.
# For production, you might want to run `npx prisma migrate deploy`
# in a separate init container or CI/CD step before starting the app.
# For this example, we'll run seed as well.
ENV DATABASE_URL=$DATABASE_URL # Pass DATABASE_URL as an environment variable to the container
CMD sh -c "npx prisma migrate deploy && npx prisma db seed && npm start"
# Note: For real production, seeding might be a one-time operation,
# or handled more carefully. Running `db seed` every startup
# might try to re-insert existing data if not handled idempotently in seed.ts.
# Our seed.ts uses upsert, making it idempotent.
```