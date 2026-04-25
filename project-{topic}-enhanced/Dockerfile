```dockerfile
# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json and package-lock.json are copied
COPY package*.json ./

# Install dependencies, --omit=dev prevents dev dependencies from being installed in production
RUN npm install --omit=dev

# Copy the entire application to the working directory
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Run database migrations and seed data
# In a real production scenario, migrations should be handled by your CI/CD or a dedicated migration job,
# not directly in the Dockerfile, or as a separate entrypoint script.
# For demonstration purposes, we include it here.
# RUN npx sequelize db:migrate
# RUN npx sequelize db:seed:all

# Command to run the application
CMD [ "npm", "start" ]
```