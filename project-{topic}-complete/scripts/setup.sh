```bash
#!/bin/bash
set -e

echo "--- CMS Drogon Project Setup Script ---"

# Check for Docker and Docker Compose
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker."
    exit 1
fi
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose."
    exit 1
fi

# 1. Create .env file from example if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env from .env.example"
    cp .env.example .env
else
    echo ".env file already exists. Skipping creation."
fi

# 2. Build and start Docker containers
echo "Building and starting Docker containers..."
docker-compose up --build -d

echo "Waiting for database to be healthy..."
docker-compose ps -q db | xargs docker inspect --format='{{json .State.Health.Status}}' | grep -q "healthy" || \
docker-compose up -d db

# Loop until DB is healthy (or max retries)
MAX_RETRIES=30
RETRY_COUNT=0
while [ "$(docker inspect -f {{.State.Health.Status}} $(docker-compose ps -q db))" != "healthy" ]; do
  if [ ${RETRY_COUNT} -ge ${MAX_RETRIES} ]; then
    echo "Error: Database did not become healthy in time. Check logs."
    exit 1
  fi
  echo "Database is not yet healthy. Waiting 5 seconds..."
  sleep 5
  RETRY_COUNT=$((RETRY_COUNT+1))
done

echo "Database is healthy."
echo "CMS application is running. Access it at http://localhost:${APP_PORT:-8080}"
echo "Admin panel: http://localhost:${APP_PORT:-8080}/admin/login"
echo "API Docs: See docs/API.md"
echo "Default Admin Credentials: admin@example.com / password123 (from seed.sql)"
echo "--- Setup Complete ---"
```