```dockerfile
# Use the official Node.js 18 LTS image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React app for production
# RUN npm run build # We'll use dev server for easier development in docker-compose

# Expose the port the app runs on
EXPOSE 3000

# Command to run the development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```