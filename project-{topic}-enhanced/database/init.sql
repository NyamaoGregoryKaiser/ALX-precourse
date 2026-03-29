```sql
-- Create a new database for the application if it doesn't exist
SELECT 'CREATE DATABASE dataviz_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'dataviz_db')\gexec

-- Connect to the newly created database
\c dataviz_db;

-- Create a user role with limited privileges if it doesn't exist
DO
$do$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dataviz_user') THEN
      CREATE ROLE dataviz_user WITH LOGIN PASSWORD 'dataviz_password';
   END IF;
END
$do$;

-- Grant privileges on the database to the user
GRANT ALL PRIVILEGES ON DATABASE dataviz_db TO dataviz_user;
ALTER DATABASE dataviz_db OWNER TO dataviz_user;
```