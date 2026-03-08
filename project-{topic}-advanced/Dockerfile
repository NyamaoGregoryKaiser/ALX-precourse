```dockerfile
# Stage 1: Build the application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Run tests before building for production (optional, can also be in CI)
# RUN npm test

# Build step if you had a frontend build process (e.g., React build)
# RUN npm run build --prefix frontend # if frontend is in a subdir

# Stage 2: Create the production-ready image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy only necessary files from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/config ./config
COPY --from=builder /app/models ./models
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/seeders ./seeders
COPY --from=builder /app/public ./public
COPY --from=builder /app/.env.example ./
COPY --from=builder /app/.sequelizerc ./

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables for production
ENV NODE_ENV=production

# Command to run the application
CMD ["npm", "start"]
```