# Stage 1: Build the Next.js application
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY .env.local ./.env.local # Copy .env.local for build time env vars (NEXT_PUBLIC_...)

RUN npm install

COPY . .

RUN npm run build

# Stage 2: Run the Next.js application
FROM node:20-alpine AS runner

WORKDIR /app

# The Next.js app is pre-built, only production dependencies are needed
COPY --from=builder /app/package*.json ./
RUN npm install --only=production

# Copy the Next.js build output from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/.env.local ./.env.local # .env.local for runtime env vars

EXPOSE 3000

CMD ["npm", "start"]