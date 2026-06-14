```dockerfile
# Stage 1: Build the application
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY . .

# Stage 2: Run the application
FROM node:18-alpine

WORKDIR /app

# Copy only necessary files from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 5000

CMD ["node", "server.js"]
```