# Use a Node.js 18 LTS Alpine image for a smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Run database migrations and seeds (optional, can be external)
# For production, consider running migrations as a separate step.
# Here we do it as part of build or entrypoint for simplicity in dev.
# ENV NODE_ENV=production # Or development, test

# Run migrations and seed data
# This is usually done outside the Dockerfile (e.g., in a CI/CD pipeline or docker-compose run command)
# RUN npm run db:migrate && npm run db:seed

# Command to run the application
CMD ["npm", "start"]