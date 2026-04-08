# Use a Node.js LTS image as the base
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) to the working directory
# This allows Docker to use the cache for npm install if dependencies haven't changed
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY backend/src src/
COPY backend/.sequelizerc .sequelizerc
COPY backend/.env.example .env.example # For reference

# Expose the port the application runs on
EXPOSE 5000

# Command to run the application
# This will be overridden by docker-compose for dev, but good for standalone run
CMD ["npm", "start"]
```