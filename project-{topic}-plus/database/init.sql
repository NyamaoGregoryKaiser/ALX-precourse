-- init.sql: Executed on PostgreSQL container startup if the database is empty.
-- This creates a superuser and a database. Docker compose handles DB_USER, DB_PASSWORD, DB_NAME automatically.
-- No need to create user/db manually if env vars are set.
-- This file is mainly for potential custom extensions or initial data if not using TypeORM seeders.

-- Example: Create a custom function or extension if needed
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TypeORM will create tables and handle schema via migrations.
-- This file mostly serves as a placeholder if you had specific
-- initial database setup needs beyond what TypeORM handles.
-- For this project, it's largely symbolic as TypeORM migrations
-- are the primary schema management tool.
```

#### `.github/workflows/main.yml` (CI/CD Pipeline with GitHub Actions)
```yaml