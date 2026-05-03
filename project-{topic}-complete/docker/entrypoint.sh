```bash
#!/bin/bash
set -e

# Wait for PostgreSQL to be ready
# The 'depends_on' in docker-compose with 'service_healthy' condition already handles this
# but an extra wait here can be robust for specific scenarios or for non-compose deployments.
echo "Waiting for PostgreSQL to be ready..."
/usr/bin/pg_isready -h "$ML_DB_HOST" -p "$ML_DB_PORT" -U "$ML_DB_USER" -d "$ML_DB_NAME"
until /usr/bin/pg_isready -h "$ML_DB_HOST" -p "$ML_DB_PORT" -U "$ML_DB_USER" -d "$ML_DB_NAME"; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done
echo "PostgreSQL is up and running!"

# Execute migrations and seed data
# Note: For production, a dedicated migration tool (e.g., Flyway, Liquibase, custom script)
# is recommended rather than relying solely on docker-entrypoint-initdb.d for robust versioning.
# This entrypoint could execute a C++ migration tool or Python script if available.
# For this project, `docker-entrypoint-initdb.d` takes care of initial setup.
# If manual migrations are needed post-initial setup, you might run `psql` commands here.

# Start the ML-Toolkit server
echo "Starting ML-Toolkit server..."
./MLToolkit_Server
```