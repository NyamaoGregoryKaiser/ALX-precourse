```dockerfile
# Stage 1: Build Prisma client (if not already built, for better multi-stage build optimization)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --omit=dev
COPY prisma ./prisma/
RUN npx prisma generate --data-proxy false

# Stage 2: Production image
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY src ./src
COPY package.json .env.example ./

# Expose port (ensure it matches your app.js port)
EXPOSE 5000

# Set environment variables for the application
ENV NODE_ENV=production
ENV PORT=5000

# Command to run the application (migrations are run via docker-compose for sequencing)
CMD ["node", "src/server.js"]
```