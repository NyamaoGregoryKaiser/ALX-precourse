```dockerfile
# Stage 1: Build TypeScript
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile

COPY tsconfig.json ormconfig.ts ./
COPY src ./src

RUN npm run build

# Stage 2: Production environment
FROM node:18-alpine

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm install --only=production --frozen-lockfile

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/migrations ./src/migrations
COPY --from=builder /app/src/seed ./src/seed
COPY --from=builder /app/src/models ./src/models # Required for TypeORM migration path in dist
COPY ormconfig.ts ./ormconfig.ts # Required for TypeORM in production

# Environment variables
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["sh", "-c", "npm run migrate:run && npm start"]
```