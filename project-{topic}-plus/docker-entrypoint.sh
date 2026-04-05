#!/bin/sh

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to become available..."
/usr/bin/env python /app/manage.py wait_for_db

# Apply database migrations
echo "Applying database migrations..."
/usr/bin/env python /app/manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
/usr/bin/env python /app/manage.py collectstatic --noinput --clear

# Run custom seed script if in debug mode and not already seeded
if [ "$DEBUG" = "True" ]; then
    echo "Checking for seed data..."
    if ! /usr/bin/env python /app/manage.py shell -c "from core_users.models import User; print(User.objects.count())" | grep -q "0"; then
        echo "Database already has users. Skipping seed."
    else
        echo "Seeding initial data..."
        /usr/bin/env python /app/manage.py seed_db
    fi
fi

# Start Gunicorn
echo "Starting Gunicorn..."
exec gunicorn my_enterprise_cms.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 120
```