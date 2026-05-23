#!/bin/sh

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
/usr/bin/wait-for-it.sh db:5432 --timeout=60 --strict -- echo "PostgreSQL is up!"

# Run migrations
echo "Running TypeORM migrations..."
npm run typeorm:migration:run

# Seed data (optional)
# echo "Seeding database..."
# npm run seed

echo "Starting ML Utils Hub server..."
# Start the application
exec npm start
```