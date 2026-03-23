```dockerfile
# Stage 1: Build the TypeScript application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Run the application
FROM node:18-alpine

WORKDIR /app

# Copy only necessary files from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/.env.example ./.env.example # Copy example, but .env should be mounted

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables (production specific)
ENV NODE_ENV=production

# Command to run the application
CMD ["npm", "start"]
```