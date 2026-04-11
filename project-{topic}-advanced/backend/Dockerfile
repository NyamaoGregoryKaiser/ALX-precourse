```Dockerfile
# Use a Node.js base image
FROM node:20-alpine AS build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

# Generate Prisma client and build TypeScript
RUN npm run prisma:generate
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine

WORKDIR /app

# Copy necessary files from the build stage
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/.env.example ./.env.example # Provide example, user provides actual .env

# Expose the port the app runs on
EXPOSE 5000

# Run the application
CMD ["node", "dist/server.js"]
```