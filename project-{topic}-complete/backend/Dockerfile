# Stage 1: Build the NestJS application
FROM node:18-alpine as build

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
COPY package-lock.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Run the production application
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package.json ./
COPY package-lock.json ./
RUN npm install --only=production

# Copy built application from the build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.env.development ./
COPY --from=build /app/.env ./ # Copy default .env as fallback
COPY --from=build /app/nest-cli.json ./ # Needed for TypeORM CLI scripts at runtime
COPY --from=build /app/src/database/typeorm.config.ts ./src/database/typeorm.config.ts
COPY --from=build /app/src/database/seed.ts ./src/database/seed.ts

# Create an 'uploads' directory for storing files (datasets/models)
RUN mkdir -p uploads
# Create a 'logs' directory for storing logs
RUN mkdir -p logs

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables (production specific if needed)
ENV NODE_ENV=production
# ENV PORT=3000 # Configured via .env or docker-compose

# Run migrations and seed data before starting the app
# Use a custom entrypoint script to handle this
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]

# Start the application
CMD ["npm", "run", "start:prod"]
```

### `backend/docker-entrypoint.sh`

```bash