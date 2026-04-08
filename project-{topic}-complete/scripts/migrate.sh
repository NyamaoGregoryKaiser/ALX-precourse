```bash
#!/bin/bash
# scripts/migrate.sh
# Applies SQL migration scripts to the DB-Optimizer's database.

set -e

DB_HOST=${DB_OPTIMIZER_DB_HOST:-localhost}
DB_PORT=${DB_OPTIMIZER_DB_PORT:-5432}
DB_NAME=${DB_OPTIMIZER_DB_NAME:-db_optimizer_db}
DB_USER=${DB_OPTIMIZER_DB_USER:-db_optimizer_user}
DB_PASSWORD=${DB_OPTIMIZER_DB_PASSWORD:-db_optimizer_password}

MIGRATIONS_DIR="./app/db/migrations"

echo "Applying database migrations to ${DB_NAME} on ${DB_HOST}:${DB_PORT}..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to become available..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done
echo "PostgreSQL is up and running!"

for file in $(ls $MIGRATIONS_DIR/*.sql | sort); do
  echo "Applying migration: $file"
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$file"
done

echo "All migrations applied successfully."
```