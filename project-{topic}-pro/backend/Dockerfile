# Use a Node.js LTS image as the base
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) to the working directory
# This allows caching of node_modules layer
COPY package*.json ./

# Install dependencies
RUN npm install --production
# For development, you might use `npm install`
# If you need puppeteer to work inside Alpine, you might need additional dependencies:
# RUN apk add --no-cache udev chromium

# Copy the rest of the application code
COPY . .

# Ensure Knexfile is present for migrations/seeds
COPY knexfile.js ./knexfile.js

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
# This command will first run migrations and seeds, then start the server.
# It assumes your database and Redis are already healthy and accessible.
CMD sh -c "npx knex migrate:latest && npx knex seed:run && npm start"