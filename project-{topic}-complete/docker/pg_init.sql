```sql
-- This script runs inside target PostgreSQL containers (db_optimizer_postgres and target_postgres_db)
-- to enable pg_stat_statements, which is crucial for the DB-Optimizer to collect query statistics.

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Adjust shared_preload_libraries in postgresql.conf if not already done.
-- This usually requires a server restart.
-- Example: shared_preload_libraries = 'pg_stat_statements'
-- In Docker, this can be done via entrypoint or configuration file mount.
-- For `postgres:alpine`, it's often configured via `docker-entrypoint-initdb.d` scripts
-- or by setting environment variables like POSTGRES_INITDB_ARGS=-E UTF-8 --lc-collate=C --lc-ctype=C.UTF-8 --encoding=UTF8
-- A simpler way for a quick demo is to just try creating the extension.
-- If the shared_preload_libraries isn't set, it might fail. For full production,
-- ensure postgresql.conf is properly configured.
```