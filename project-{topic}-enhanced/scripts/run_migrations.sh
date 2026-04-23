```bash
#!/bin/bash
echo "Waiting for PostgreSQL to become available..."
# Loop until PostgreSQL is ready
until pg_isready -h "$POSTGRES_SERVER" -p "$POSTGRES_PORT" -U "$POSTGRES_USER"; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "PostgreSQL is up - running migrations..."

# Run Alembic migrations
alembic upgrade head

echo "Migrations completed."
```