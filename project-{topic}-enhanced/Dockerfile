# Stage 1: Build the TypeScript application
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/backend ./src/backend
RUN npm run build


# Stage 2: Run the application
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies
COPY package.json package-lock.json ./
RUN npm install --only=production

# Copy built application from the build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/backend/database/migrations ./src/backend/database/migrations
COPY --from=build /app/src/backend/scripts ./src/backend/scripts
COPY .env.example .env # Copy .env for production (filled by CI/CD or secrets)

EXPOSE 5000

CMD ["node", "dist/server.js"]