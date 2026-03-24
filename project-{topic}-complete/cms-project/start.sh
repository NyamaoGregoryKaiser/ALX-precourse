#!/bin/bash
set -e

echo "Running database migrations..."
flask db upgrade

echo "Seeding database with initial data..."
python seed.py

echo "Starting Gunicorn server..."
exec gunicorn -b :5000 --access-logfile - --error-logfile - --workers 4 manage:app
```