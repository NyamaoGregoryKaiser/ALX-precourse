#!/bin/bash
# docker-entrypoint.sh

set -e

echo "Starting database initialization..."

# Check if the database file exists. If not, create and seed it.
if [ ! -f "$DATABASE_PATH" ]; then
    echo "Database file $DATABASE_PATH not found. Initializing new database."
    sqlite3 "$DATABASE_PATH" < /app/db/schema.sql
    sqlite3 "$DATABASE_PATH" < /app/db/seed.sql
    echo "Database initialized and seeded successfully."
else
    echo "Database file $DATABASE_PATH found. Skipping initialization."
    # Optional: You could run migration scripts here if you had a more advanced setup
    # sqlite3 "$DATABASE_PATH" < /app/db/migrations/001_create_tables.sql
fi

echo "Database readiness check complete. Starting application."

# Execute the main application command
exec "$@"