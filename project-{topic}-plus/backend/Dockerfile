```dockerfile
# Stage 1: Build the TypeScript application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package.json yarn.lock ./
# Install dependencies
RUN yarn install --frozen-lockfile --production=false

# Copy source code
COPY . .

# Build the TypeScript project
RUN yarn build

# Stage 2: Run the application
FROM node:18-alpine

WORKDIR /app

# Copy only production dependencies from builder stage
COPY --from=builder /app/package.json /app/yarn.lock ./
RUN yarn install --frozen-lockfile --production=true

# Copy built application code
COPY --from=builder /app/dist ./dist
# Copy migrations, seeds and data_uploads (if any)
COPY --from=builder /app/src/migrations ./src/migrations
COPY --from=builder /app/src/seeds ./src/seeds
COPY --from=builder /app/data_uploads ./data_uploads

# Expose the port the app runs on
EXPOSE 5000

# Set environment variables (if any, typically handled by docker-compose .env)
# ENV NODE_ENV=production

# Command to run the application
CMD ["node", "dist/server.js"]
```