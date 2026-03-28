# Use a Node.js 20 LTS Alpine image for a small footprint
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire backend source code
COPY . .

# Build the TypeScript project
RUN npm run build

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
# This command will apply migrations and then start the server.
# In a real production CI/CD, migrations might be applied as a separate step.
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma generate && node dist/server.js"]