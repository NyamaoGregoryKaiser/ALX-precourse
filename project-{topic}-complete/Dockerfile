```dockerfile
# --- Multi-stage build for frontend ---
FROM node:18-alpine as frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Backend build and runtime ---
FROM node:18-alpine as backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./

# Install Chromium for Puppeteer in a production-ready environment
# See: https://github.com/puppeteer/puppeteer/blob/main/docs/puppeteer-api.md#puppeteerlaunchoptions
# Install these dependencies for Puppeteer to run headless Chrome
RUN apk add --no-cache udev chromium nss freetype fontconfig harfbuzz ca-certificates

# Expose the port the app runs on
EXPOSE 8000

# Copy frontend build artifacts to backend public folder
COPY --from=frontend-builder /app/frontend/build /app/backend/src/public

# Set environment variables (production specific)
ENV NODE_ENV=production
# Define where Puppeteer should look for Chromium executable
ENV CHROME_BIN=/usr/bin/chromium-browser

# Start the application
CMD ["node", "src/server.js"]
```