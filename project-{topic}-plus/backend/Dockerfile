```dockerfile
# Stage 1: Build the TypeScript application
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build Prisma Client
ENV DATABASE_URL="postgresql://user:password@db:5432/realtime_chat_db?schema=public"
RUN npx prisma generate

RUN npm run build

# Stage 2: Create the production-ready image
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma

# Expose the port the app runs on
EXPOSE 5000

# Set environment variables for production
ENV NODE_ENV=production
# These should ideally be passed at runtime or via Docker secrets
# ENV DATABASE_URL="postgresql://user:password@db:5432/realtime_chat_db?schema=public"
# ENV JWT_SECRET="your_very_strong_and_secret_jwt_key_here"
# ENV REDIS_URL="redis://redis:6379"
# ENV PORT=5000

# Run Prisma migrations when the container starts
# This ensures the database schema is up-to-date before the application starts.
# For more complex deployments, consider running migrations as a separate step.
CMD sh -c "npx prisma migrate deploy && node dist/server.js"
```