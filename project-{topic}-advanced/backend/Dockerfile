```dockerfile
# Stage 1: Build the TypeScript application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Generate TypeORM config and build TypeScript
RUN npm run build

# Stage 2: Run the application
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY --from=builder /app/package*.json ./
RUN npm install --only=production

# Copy built application files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env.example ./.env.example

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
CMD ["node", "dist/server.js"]
```

#### Core Application Files