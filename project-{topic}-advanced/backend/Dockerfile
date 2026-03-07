```Dockerfile
# Use the official Node.js 20 LTS image as the base image
FROM node:20-alpine AS build

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
# We copy these first to leverage Docker's layer caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the TypeScript application
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine

WORKDIR /app

# Copy only necessary files from the build stage
COPY --from=build /app/package*.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.env.example ./.env.example # Useful for deploying and configuring env vars
COPY --from=build /app/logs ./logs # Ensure logs directory exists if logging to files
COPY --from=build /app/src/migrations ./src/migrations # Migrations are needed for runtime

# Expose the port the app runs on
EXPOSE 5000

# Set environment variables (these can be overridden by docker-compose or Kubernetes)
ENV NODE_ENV=production
ENV PORT=5000

# Command to run the application
# We ensure migrations are run *before* starting the app.
# The `npm run migration:run` command is configured in package.json
CMD ["sh", "-c", "npm run migration:run && npm start"]
```