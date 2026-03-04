```sql
-- V1__initial_schema.sql

-- Data Sources
CREATE TABLE data_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    connection_string TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    schema JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Visualizations
CREATE TABLE visualizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    data_source_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    FOREIGN KEY (data_source_id) REFERENCES data_sources(id) ON DELETE CASCADE
);

-- Dashboards
CREATE TABLE dashboards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    visualization_ids INTEGER[] NOT NULL DEFAULT '{}', -- PostgreSQL array type
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- Indexes
CREATE INDEX idx_data_sources_name ON data_sources(name);
CREATE INDEX idx_visualizations_data_source_id ON visualizations(data_source_id);
CREATE INDEX idx_dashboards_name ON dashboards(name);
CREATE INDEX idx_users_username ON users(username);
```