# Stage 1: Build the TypeScript application
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Stage 2: Run the application
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm install --only=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/src/db/mock_data ./src/db/mock_data # Copy mock data for seeding

EXPOSE 5000

CMD ["node", "dist/server.js"]