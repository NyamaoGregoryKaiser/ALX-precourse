```dockerfile
# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React app for production
# This command is typically run for a production build.
# For development, we'll use `npm start` (or `yarn start`)
# RUN npm run build

# Expose port 3000 for the React app
EXPOSE 3000

# Command to run the application
# For production, you'd typically serve the 'build' directory with a static server like Nginx or serve it from backend.
# For development, we use `npm start`.
CMD ["npm", "start"]
```

**CI/CD Pipeline Configuration (GitHub Actions)**: