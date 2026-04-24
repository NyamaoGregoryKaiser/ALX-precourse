```bash
#!/bin/bash
set -e

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to start..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done
echo "PostgreSQL is up and running!"

# Apply database schema and seed data
echo "Applying database schema..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /app/db/schema.sql || { echo "Schema application failed!"; exit 1; }
echo "Schema applied successfully."

echo "Seeding database with initial data..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /app/db/seed.sql || { echo "Seed data application failed!"; exit 1; }
echo "Database seeded successfully."

# Start the C++ backend application
echo "Starting E-commerce Backend..."
exec ./ecommerce_backend
```