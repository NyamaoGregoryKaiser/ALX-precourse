# Use a Node.js image with Playwright dependencies pre-installed for better stability
FROM mcr.microsoft.com/playwright/node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./

# Install dependencies, including Playwright browsers
# The base image comes with browsers already. We just need Node dependencies.
RUN npm install

COPY . .

# Generate Prisma client and run migrations.
# This ensures that the Prisma client is generated in the Docker build context
# and that migrations are applied when the container starts.
RUN npx prisma generate

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application (overridden by docker-compose)
# Using `npm start` which will run `node src/server.js`
CMD [ "npm", "start" ]