# Use a Node.js 18 (or latest LTS) image as the base
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the TypeScript code
RUN npm run build

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application (in production mode)
# In development, you would override this with `npm run dev` in docker-compose
CMD ["npm", "start"]