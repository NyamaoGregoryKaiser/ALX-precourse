```sql
-- Create a new database
CREATE DATABASE scraper_db;

-- Create a user with password for the database
CREATE USER scraper_user WITH PASSWORD 'scraper_password';

-- Grant privileges to the user on the database
GRANT ALL PRIVILEGES ON DATABASE scraper_db TO scraper_user;

-- Connect to the newly created database to apply schema
\c scraper_db

-- Grant all privileges to the user on the schema 'public'
GRANT ALL PRIVILEGES ON SCHEMA public TO scraper_user;

-- Alter default privileges for future tables/sequences
ALTER DEFAULT PRIVILEGES FOR USER scraper_user IN SCHEMA public
GRANT ALL ON TABLES TO scraper_user;

ALTER DEFAULT PRIVILEGES FOR USER scraper_user IN SCHEMA public
GRANT ALL ON SEQUENCES TO scraper_user;

ALTER DEFAULT PRIVILEGES FOR USER scraper_user IN SCHEMA public
GRANT ALL ON FUNCTIONS TO scraper_user;
```