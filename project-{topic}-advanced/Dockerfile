# Use a Node.js 18 image as base
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if any)
# to install dependencies
COPY server/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY server/ ./

# Build the TypeScript application
RUN npm run build

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
CMD ["npm", "run", "serve"]