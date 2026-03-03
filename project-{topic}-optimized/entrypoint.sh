#!/bin/sh

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to start..."
while ! pg_isready -h db -p 5432 > /dev/null 2>&1; do
  sleep 1
done
echo "PostgreSQL started."

# Apply database migrations
echo "Applying database migrations..."
flask db upgrade
echo "Database migrations applied."

# Seed initial data (optional, only for development/first run)
if [ ! -f /app/.seeded ]; then
    echo "Seeding initial data..."
    python seed_data.py
    touch /app/.seeded
    echo "Initial data seeded."
fi

# Determine the command to run
if [ "$1" = "flask_run" ]; then
  echo "Starting Flask development server..."
  exec gunicorn --bind 0.0.0.0:5000 --workers 4 app:create_app()
else
  # Execute the command passed to the entrypoint (e.g., celery worker/beat)
  exec "$@"
fi
```