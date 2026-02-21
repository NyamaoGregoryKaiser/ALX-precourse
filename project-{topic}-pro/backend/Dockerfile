# Use the official Node.js 18 LTS image as the base
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) to the working directory
# This allows caching of node_modules layer if package files don't change
COPY package*.json ./

# Install project dependencies
RUN npm ci --only=production

# Copy the rest of the application source code
COPY . .

# Run migrations and seed data during the build process
# This is suitable for development/testing environments or simple production setups
# For more complex production deployments, migrations should be run as a separate step
# after the database is available and the application containers are running.
# Example: docker exec -it [container_name] npx sequelize-cli db:migrate
# For now, we'll keep it commented out to prevent issues if DB is not ready during build
# RUN npx sequelize-cli db:migrate
# RUN npx sequelize-cli db:seed:all

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
CMD ["npm", "start"]