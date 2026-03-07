```bash
#!/bin/bash
set -e

DB_PATH="./db/app.db"
SCHEMA_PATH="./db/schema.sql"
SEED_PATH="./db/seed.sql"

# Ensure the db directory exists
mkdir -p $(dirname $DB_PATH)

echo "Applying database schema from $SCHEMA_PATH to $DB_PATH"
sqlite3 $DB_PATH < $SCHEMA_PATH
echo "Schema applied successfully."

echo "Applying seed data from $SEED_PATH to $DB_PATH"
sqlite3 $DB_PATH < $SEED_PATH
echo "Seed data applied successfully."

echo "Database setup complete."
```