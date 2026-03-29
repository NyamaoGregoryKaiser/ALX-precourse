# Stage 1: Build the backend application
FROM node:18-alpine AS build

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: Run the backend application
FROM node:18-alpine

WORKDIR /app

# Copy production dependencies from build stage
COPY --from=build /app/package*.json ./
# Only install production dependencies
RUN npm install --only=production

# Copy built application and logs directory
COPY --from=build /app/dist ./dist
COPY --from=build /app/logs ./logs
COPY --from=