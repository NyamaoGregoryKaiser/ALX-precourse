```bash
#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

DB_PATH="./data/app.db"
SCHEMA_SQL="./db/schema.sql"
SEED_SQL="./db/seed.sql"

# Create data directory if it doesn't exist
mkdir -p "$(dirname "$DB_PATH")"

echo "Checking database at $DB_PATH..."

# Check if database file exists. If not, create it.
if [ ! -f "$DB_PATH" ]; then
    echo "Database file not found. Creating a new database."
    sqlite3 "$DB_PATH" "" # Create an empty database file
fi

echo "Applying schema from $SCHEMA_SQL..."
sqlite3 "$DB_PATH" < "$SCHEMA_SQL"

echo "Applying seed data from $SEED_SQL..."
# The seed script reads admin user details from environment variables
# This ensures that the admin user specified in .env is always present and updated.
# Using 'sqlite3 :memory:' to pre-process the seed data might be safer for complex replacements
# but for simple ENV variable replacement, direct echo is fine.
# Make sure to escape single quotes if needed in actual passwords.
cat "$SEED_SQL" | sed \
    -e "s|\${ADMIN_USERNAME}|$ADMIN_USERNAME|g" \
    -e "s|\${ADMIN_PASSWORD}|$ADMIN_PASSWORD|g" \
    -e "s|\${JWT_SECRET_KEY}|$JWT_SECRET_KEY|g" \
    | sqlite3 "$DB_PATH"

echo "Database migrations and seeding complete."
```