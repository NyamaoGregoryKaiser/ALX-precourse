```dockerfile
# Stage 1: Build the TypeScript application
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Run the application
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm install --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/database/migrations ./src/database/migrations # Copy migrations for runtime
COPY --from=builder /app/.env.example ./.env.example # For reference if needed, but .env is bind-mounted

EXPOSE 5000

CMD ["sh", "-c", "npm run migration:run && npm start"] # Run migrations then start the app
```