```dockerfile
# Stage 1: Build dependencies and TypeScript
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
COPY yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy all source files
COPY . .

# Build the TypeScript code
RUN yarn build

# Stage 2: Run the application
FROM node:18-alpine

WORKDIR /app

# Copy production dependencies only
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./
RUN yarn install --frozen-lockfile --production

# Copy built application code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/database/migrations ./src/database/migrations
COPY --from=builder /app/src/database/seeds ./src/database/seeds
COPY --from=builder /app/src/config/database.ts ./src/config/database.ts # Needed for typeorm cli
COPY --from=builder /app/src/entities ./src/entities
COPY --from=builder /app/logs ./logs # Ensure logs directory exists if logging to file

# Set environment variables (if any needed for production image)
ENV NODE_ENV=production

# Expose the port the app runs on
EXPOSE 5000

# Command to run migrations and then start the application
# Note: For production, seed:run should typically be a one-time operation or managed by a more robust deployment script.
# Running it on every container startup is mostly for dev convenience.
CMD ["sh", "-c", "npm run migrate:run && npm run seed:run && npm start"]
```

## 4. Testing & Quality

Tests are located in `backend/tests/`.

### Backend Unit Tests (Example: `auth.service.test.ts`)
See `backend/tests/unit/auth.service.test.ts` above.

### Backend Integration Tests (Example: `auth.integration.test.ts`)
See `backend/tests/integration/auth.integration.test.ts` above.

### Frontend Unit/Component Tests (Conceptual - using React Testing Library)

#### `frontend/src/components/AuthForm.test.tsx`