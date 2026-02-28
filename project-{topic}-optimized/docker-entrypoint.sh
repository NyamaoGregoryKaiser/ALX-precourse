#!/bin/sh

echo "Waiting for PostgreSQL to be ready..."
# Loop until `pg_isready` reports success
# `db` is the hostname of the PostgreSQL container as defined in docker-compose.yml
# `5432` is the default PostgreSQL port
until pg_isready -h "db" -p "5432" -U "user"; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "PostgreSQL is up - executing commands"

# Run database migrations
echo "Running database migrations..."
flask db upgrade
echo "Migrations complete."

# Seed the database if it's empty or specific seed logic
echo "Seeding initial data..."
python seed_db.py
echo "Seeding complete."

# Execute the main command passed to the script (e.g., gunicorn)
exec "$@"