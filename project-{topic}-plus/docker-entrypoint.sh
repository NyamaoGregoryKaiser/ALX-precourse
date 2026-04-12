#!/bin/bash
set -e

# Ensure the 'data' and 'logs' directories exist and have correct permissions
# This handles cases where volumes might be empty or new
mkdir -p /app/data
mkdir -p /app/logs
chown -R appuser:appgroup /app/data /app/logs

# Use gosu to run commands as the appuser
# gosu makes sure we start as root to do file permission changes
# but then switch to appuser for actual application execution.

# Run migrations
echo "Running database migrations..."
gosu appuser /app/build/migrations

# Run seeders
echo "Running database seeders..."
gosu appuser /app/build/seed

# Execute the main command passed to the script (e.g., api_server)
echo "Starting application: $@"
exec gosu appuser /app/build/"$@"
```