# Use a Node.js base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
# Using `npm ci` for clean installs in CI/CD and production environments
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Run database migrations and seeds (optional, often done in CI/CD or separate migration service)
# For production, it's safer to run migrations as a separate step/service.
# CMD npm run migrate && npm run seed && npm start
# For this example, we'll assume migrations/seeds are handled externally or on first run by devops.
# Or you can add a script to server.js to run migrations on app start (careful in production).

# Start the application
CMD ["npm", "start"]