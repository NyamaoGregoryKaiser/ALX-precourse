# Use a Node.js image as the base
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if any)
# to leverage Docker cache for dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy TypeScript source code
COPY . .

# Build the TypeScript project
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine AS production

WORKDIR /app

# Copy only necessary files from the base stage
COPY --from=base /app/package*.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/.env.example ./
COPY --from=base /app/src/database/migrations ./src/database/migrations
COPY --from=base /app/src/database/seeders ./src/database/seeders


# Expose the port the app runs on
EXPOSE 3000

# Set environment variables for production
ENV NODE_ENV=production

# Command to run the application
CMD ["node", "dist/server.js"]