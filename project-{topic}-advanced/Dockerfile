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

# Install only production dependencies
COPY --from=builder /app/package*.json ./
RUN npm install --only=production

# Copy built application and environment file
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env.example ./.env # In production, .env should be managed securely

EXPOSE 5000

CMD ["node", "dist/server.js"]
```