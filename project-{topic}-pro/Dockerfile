# Use a Node.js 18 LTS image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
# to install dependencies first. This step is cached if dependencies don't change.
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port your app runs on
EXPOSE 5000

# Run database migrations and seeds (optional, can also be done via CI/CD or separate migration service)
# It's generally better to run migrations as a separate step in CI/CD or startup script
# RATHER than directly in the Dockerfile if you want to apply migrations to an *existing* DB.
# For simplicity in initial setup, showing it here.
RUN npm run migrate:latest
# RUN npm run seed:run # Only run seeds in dev/test, not production

# Command to run the application
CMD [ "npm", "start" ]