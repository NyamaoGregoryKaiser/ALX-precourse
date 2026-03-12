# Use a Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose port
EXPOSE 5000

# Command to run the application (in production, use `npm start`)
# For local dev with docker-compose, `npm run dev` is often used via docker-compose.yml
CMD ["npm", "start"]