```bash
#!/bin/bash
set -e

echo "Running initial database setup (migrations and seed data)..."

# Wait for PostgreSQL to be ready
until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "PostgreSQL is up - executing initial setup."

# Execute migrations (This part is conceptual, as C++ app runs migrations)
# In a real scenario, you might have a dedicated migration runner or run the first migration
# for the schema_migrations table here.
# For this project, the C++ `main.cpp` runs migrations. We can just add seed data.

# Execute seed data
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    \i /app/scripts/db/seed.sql
EOSQL

echo "Database initial setup completed."
```