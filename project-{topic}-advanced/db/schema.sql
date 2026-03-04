```sql
-- Migration 001_initial_schema.sql

-- Table for Data Sources
CREATE TABLE IF NOT EXISTS data_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,          -- e.g., 'csv', 'sql', 'api'
    connection_string TEXT NOT NULL, -- Path to CSV, DB connection URL, API endpoint
    created_at INTEGER NOT NULL, -- Unix timestamp (milliseconds)
    updated_at INTEGER NOT NULL, -- Unix timestamp (milliseconds)
    schema TEXT NOT NULL DEFAULT '[]' -- JSON array of inferred field definitions
);

-- Table for Visualizations
CREATE TABLE IF NOT EXISTS visualizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    data_source_id INTEGER NOT NULL,
    type TEXT NOT NULL,          -- e.g., 'bar', 'line', 'scatter', 'table'
    config TEXT NOT NULL DEFAULT '{}', -- JSON string for chart specific configurations (e.g., x_axis, y_axis, aggregation)
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (data_source_id) REFERENCES data_sources(id) ON DELETE CASCADE
);

-- Table for Dashboards
CREATE TABLE IF NOT EXISTS dashboards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    visualization_ids TEXT NOT NULL DEFAULT '', -- Comma-separated list of visualization IDs (e.g., "1,2,5")
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Table for Users (Authentication/Authorization)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer', -- 'admin', 'editor', 'viewer'
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Index for faster data source lookups by name
CREATE INDEX IF NOT EXISTS idx_data_sources_name ON data_sources(name);
```