```dockerfile
# Stage 1: Build the application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client and build TypeScript code
RUN npx prisma generate
RUN npm run build

# Stage 2: Run the application
FROM node:20-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy built application from the build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/.env.example ./

# Expose port (ensure this matches your app's listen port)
EXPOSE 5000

# Set environment variables (for production, these should be managed by orchestration)
# ENV NODE_ENV=production
# ENV DATABASE_URL="..."
# ENV JWT_SECRET="..."
# ENV REFRESH_TOKEN_SECRET="..."
# ENV REDIS_URL="..."
# ENV PORT=5000

# Command to run the application
CMD ["node", "dist/server.js"]
```