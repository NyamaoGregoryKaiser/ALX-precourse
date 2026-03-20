# Use a specific version of Node.js for stability
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
# This means npm install won't run again if only source code changes
COPY package*.json ./

# Install dependencies. Use --omit=dev in production to exclude devDependencies.
RUN npm install --omit=dev

# Copy the rest of the application code
COPY . .

# Generate Prisma Client during the build process
# This is crucial for the application to interact with the database
RUN npx prisma generate

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables for production
ENV NODE_ENV=production

# Command to run the application
# Use 'npm start' which runs 'node src/server.js'
CMD [ "npm", "start" ]
```

#### `docker-compose.yml`

```yaml