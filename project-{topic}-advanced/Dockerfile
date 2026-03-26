```dockerfile
# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install app dependencies
# Use `npm ci` for clean installs in CI/CD and production environments
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Generate swagger.json during build if it's used for static serving
# Remove this line if swagger.json is generated dynamically or not used directly.
RUN npm run generate-docs

# Expose the port the app runs on
EXPOSE 3000

# Define environment variable for production (can be overridden)
ENV NODE_ENV=production

# Run the application
CMD ["npm", "start"]
```