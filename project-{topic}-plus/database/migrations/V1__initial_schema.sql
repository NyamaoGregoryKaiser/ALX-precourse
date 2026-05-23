-- V1__initial_schema.sql
-- This script contains the initial schema creation, equivalent to schema.sql
-- In a real migration system (like Flyway or Liquibase), each schema change
-- would be a separate script (V2__add_new_feature.sql, V3__refactor_table.sql).

-- Please refer to database/schema.sql for the full content of V1.
-- The content of schema.sql would typically be placed here for the first migration.

-- For brevity, explicitly stating:
-- The content of database/schema.sql should be placed here.
-- This file serves as a placeholder to indicate the use of migration scripts.

-- Example:
-- CREATE TABLE users (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     username VARCHAR(255) UNIQUE NOT NULL,
--     ...
-- );