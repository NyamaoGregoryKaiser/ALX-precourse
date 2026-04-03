```dockerfile
# Stage 1: Build the NestJS application
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock* ./
RUN npm ci --only=production # Install production dependencies first to cache

COPY . .
RUN npm ci # Install dev dependencies for building
RUN npm run build

# Stage 2: Create a lighter production image with Puppeteer dependencies
# Use a Debian-based image for Puppeteer's full functionality
FROM public.ecr.aws/lambda/nodejs:18

WORKDIR /app

# Install necessary Puppeteer dependencies for Chrome
# This setup is based on recommended practices for running Puppeteer in Docker
RUN apt-get update && apt-get install -yq --no-install-recommends \
    chromium \
    fontconfig \
    libgbm1 \
    libatk-bridge2.0-0 \
    libcups2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxrandr2 \
    libxcursor1 \
    libnss3 \
    libasound2 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    libxss1 \
    libexpat1 \
    libglib2.0-0 \
    libnspr4 \
    libfreetype6 \
    libxext6 \
    libx11-xcb1 \
    libxtst6 \
    libdbus-1-3 \
    libdrm-dev \
    libatspi2.0-0 \
    libxcb-dri3-0 \
    libxfixes3 \
    libxrender1 \
    libxxf86vm1 \
    libxcb-shape0 \
    libxcb-shm0 \
    libxcb-xfixes0 \
    libxcb-render-util0 \
    libxcb-sync1 \
    libxdamage1 \
    libxshmfence1 \
    fonts-noto-color-emoji \
    xvfb \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Set Chromium as the executable path for Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy production dependencies
COPY --from=builder /app/node_modules /app/node_modules
# Copy built application
COPY --from=builder /app/dist /app/dist
COPY package.json /app/package.json
COPY .env.example /app/.env.example # Provide example, actual .env from mounted volume or env vars

# Expose the port the app runs on
EXPOSE 3000

# Set Node.js environment to production
ENV NODE_ENV production

# Run database migrations and start the application
# For production, migrations should typically be run as a separate step/job
CMD ["sh", "-c", "npm run typeorm migration:run && npm run start:prod"]

```