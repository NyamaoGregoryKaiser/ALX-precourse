# Use a Node.js base image
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app/backend

# Copy package.json and install dependencies
COPY backend/package*.json ./
RUN npm install

# Copy source code
COPY backend/src ./src
COPY backend/ormconfig.ts ./
COPY backend/tsconfig.json ./

# Build TypeScript code
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine

WORKDIR /app/backend

# Copy production dependencies from build stage
COPY --from=build /app/backend/package*.json ./
RUN npm install --only=production

# Copy built application and TypeORM config
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/ormconfig.ts ./
COPY --from=build /app/backend/tsconfig.json ./ # Required for TypeORM CLI at runtime
COPY --from=build /app/backend/src/db/migrations ./src/db/migrations # Required for migrations at runtime
COPY --from=build /app/backend/src/db/seeders ./src/db/seeders # Required for seeders at runtime

# Expose port
EXPOSE 5000

# Command to run the application (migrations are run by docker-compose for initial setup)
CMD ["node", "dist/server.js"]
```

#### `docker/frontend.Dockerfile`
```dockerfile