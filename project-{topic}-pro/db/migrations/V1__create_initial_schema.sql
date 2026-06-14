```sql
-- V1__create_initial_schema.sql

-- Create the users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a function to update `updated_at` automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to the users table
CREATE OR REPLACE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create the metrics_metadata table to store unique metric names and their properties
CREATE TABLE IF NOT EXISTS metrics_metadata (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    unit VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the metric_data table to store actual time-series metric values
CREATE TABLE IF NOT EXISTS metric_data (
    id BIGSERIAL PRIMARY KEY,
    metric_name VARCHAR(255) NOT NULL, -- Storing name directly for simplicity, or could reference metrics_metadata.id
    value DOUBLE PRECISION NOT NULL,
    timestamp BIGINT NOT NULL, -- Unix timestamp in milliseconds
    collected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for query optimization
-- Index on metric_name and timestamp for efficient time-series queries
CREATE INDEX IF NOT EXISTS idx_metric_data_name_timestamp
ON metric_data (metric_name, timestamp DESC);

-- Index on just timestamp for general time-based queries/cleanup
CREATE INDEX IF NOT EXISTS idx_metric_data_timestamp
ON metric_data (timestamp DESC);

-- Index on metric_name for faster lookups of available metrics
CREATE INDEX IF NOT EXISTS idx_metrics_metadata_name
ON metrics_metadata (metric_name);

-- Prepared statements for the application
-- Note: These are defined in the application's C++ code using pqxx::connection::prepare.
-- This SQL file only defines the schema.

-- Example of a prepared statement equivalent logic:
-- SELECT id, username, password_hash FROM users WHERE username = $1;
-- INSERT INTO users (username, password_hash, email) VALUES ($1, $2, $3) RETURNING id;
-- INSERT INTO metric_data (metric_name, value, timestamp) VALUES ($1, $2, $3);
-- SELECT value, timestamp FROM metric_data WHERE metric_name = $1 AND timestamp >= $2 AND timestamp <= $3 ORDER BY timestamp DESC LIMIT $4;
```