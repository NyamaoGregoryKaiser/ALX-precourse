```sql
-- Migration 001: Initial Schema Setup

-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user', -- 'user' or 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create Monitored Databases Table
CREATE TABLE IF NOT EXISTS monitored_databases (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    db_type VARCHAR(50) NOT NULL DEFAULT 'PostgreSQL', -- e.g., 'PostgreSQL', 'MySQL'
    host VARCHAR(255) NOT NULL,
    port INT NOT NULL,
    db_name VARCHAR(255) NOT NULL,
    db_user VARCHAR(255) NOT NULL,
    db_password VARCHAR(255) NOT NULL, -- In production, use KMS or encrypted storage!
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user
        FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- Create Query Logs Table
CREATE TABLE IF NOT EXISTS query_logs (
    id SERIAL PRIMARY KEY,
    monitored_db_id INT NOT NULL,
    query_text TEXT NOT NULL,
    execution_time_ms INT NOT NULL,
    rows_affected INT,
    plan_output TEXT, -- EXPLAIN ANALYZE output
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_monitored_db
        FOREIGN KEY(monitored_db_id)
        REFERENCES monitored_databases(id)
        ON DELETE CASCADE
);

-- Index on monitored_db_id and captured_at for faster filtering
CREATE INDEX IF NOT EXISTS idx_query_logs_db_id_captured_at ON query_logs(monitored_db_id, captured_at);

-- Create Optimization Reports Table
CREATE TABLE IF NOT EXISTS optimization_reports (
    id SERIAL PRIMARY KEY,
    monitored_db_id INT NOT NULL,
    report_type VARCHAR(50) NOT NULL, -- e.g., 'Index Recommendation', 'Query Rewrite'
    recommendation TEXT NOT NULL,
    details JSONB, -- Store JSON details like query_id, table_name, column_name, etc.
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'applied', 'dismissed'
    CONSTRAINT fk_monitored_db_report
        FOREIGN KEY(monitored_db_id)
        REFERENCES monitored_databases(id)
        ON DELETE CASCADE
);

-- Index on monitored_db_id for reports
CREATE INDEX IF NOT EXISTS idx_optimization_reports_db_id ON optimization_reports(monitored_db_id);

-- Add pg_stat_statements extension (required for monitoring)
-- This should be enabled in postgresql.conf and run once per database.
-- For the monitored databases, users need to ensure this is enabled.
-- The DB-Optimizer itself doesn't need it on its own DB.
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```