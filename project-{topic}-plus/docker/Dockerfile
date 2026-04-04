```dockerfile
# Stage 1: Build the application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (only production dependencies by default)
RUN npm install --omit=dev

# Copy Prisma schema and migrations (needed for prisma generate)
# Ensure migrations are copied for `prisma generate` in production or for `prisma migrate deploy` if preferred
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy the rest of the application code
COPY . .

# Stage 2: Create a slim production image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy production dependencies and generated Prisma client from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/.env.example ./
COPY --from=builder /app/package.json ./

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables for production
ENV NODE_ENV=production

# Command to run the application
CMD ["node", "src/server.js"]
```