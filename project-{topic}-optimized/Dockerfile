# Use a slim Node.js base image for smaller size
FROM node:20-slim AS base

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy the rest of the application code
COPY . .

# Generate Prisma client (important for Docker builds)
RUN npx prisma generate

# Expose the port your app runs on
EXPOSE 3000

# Command to run the application
CMD [ "npm", "start" ]

# --- Development Stage (optional, for faster dev builds if needed) ---
FROM base AS dev
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# No CMD, as this stage is typically used for building images that
# are then run with different commands in local dev setups (e.g., nodemon)
# or for running tests in CI.