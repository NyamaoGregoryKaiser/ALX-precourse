```dockerfile
# Stage 1: Build the TypeScript application
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY tsconfig.json .
COPY src ./src
COPY prisma ./prisma

RUN npx prisma generate
RUN npm run build

# Stage 2: Run the application
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm install --omit=dev # Install only production dependencies

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY .env.example ./.env # Copy .env.example and rename for Docker (ensure to map real .env for production)

EXPOSE 5000

# Run Prisma migrations when the container starts
# This is suitable for development/testing, but in production, migrations should be handled carefully
# and usually as a separate step or a dedicated migration container.
CMD npx prisma migrate deploy && npm start
```