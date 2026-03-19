```dockerfile
# Stage 1: Build the TypeScript application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Stage 2: Run the application
FROM node:18-alpine AS runner

WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm install --production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env.example ./.env.example # Copy example env

# Expose port (ensure this matches your application's listen port)
EXPOSE 5000

# Set environment variables (if any specific to runtime)
ENV NODE_ENV production

# Command to run the application
CMD ["node", "dist/server.js"]
```