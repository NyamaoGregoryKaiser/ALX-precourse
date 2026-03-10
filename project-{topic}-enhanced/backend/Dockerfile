```dockerfile
# Use a Node.js base image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app/backend

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
# Use npm start in production, npm run dev for development
CMD ["npm", "start"]
```