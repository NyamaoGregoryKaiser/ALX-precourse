```sql
-- Migration: 001_initial_schema.sql
-- Description: Creates the initial database schema for ML-Toolkit.

-- This script should be idempotent, meaning it can be run multiple times
-- without causing errors, e.g., using CREATE TABLE IF NOT EXISTS.

-- IMPORTANT: Ensure the PostgreSQL user has necessary privileges (CREATE, SELECT, INSERT, UPDATE, DELETE).

-- Create Datasets Table
CREATE TABLE IF NOT EXISTS datasets (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    file_path VARCHAR(512) NOT NULL,
    row_count BIGINT DEFAULT 0,
    col_count BIGINT DEFAULT 0,
    feature_names TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for dataset name for performance
CREATE INDEX IF NOT EXISTS idx_datasets_name ON datasets (name);

-- Create Models Table
CREATE TABLE IF NOT EXISTS models (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    artifact_path VARCHAR(512) NOT NULL,
    dataset_id BIGINT REFERENCES datasets(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for model name, type, and dataset_id
CREATE INDEX IF NOT EXISTS idx_models_name ON models (name);
CREATE INDEX IF NOT EXISTS idx_models_type ON models (type);
CREATE INDEX IF NOT EXISTS idx_models_dataset_id ON models (dataset_id);

-- Create Pipelines Table
CREATE TABLE IF NOT EXISTS pipelines (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    dataset_id BIGINT REFERENCES datasets(id) ON DELETE SET NULL,
    steps JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for pipeline name and dataset_id
CREATE INDEX IF NOT EXISTS idx_pipelines_name ON pipelines (name);
CREATE INDEX IF NOT EXISTS idx_pipelines_dataset_id ON pipelines (dataset_id);

-- Create or Replace Function to update 'updated_at' column automatically
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply Triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_dataset_timestamp') THEN
        CREATE TRIGGER trg_update_dataset_timestamp
        BEFORE UPDATE ON datasets
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_model_timestamp') THEN
        CREATE TRIGGER trg_update_model_timestamp
        BEFORE UPDATE ON models
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_pipeline_timestamp') THEN
        CREATE TRIGGER trg_update_pipeline_timestamp
        BEFORE UPDATE ON pipelines
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp();
    END IF;
END $$;

-- Optional: Create a table to track applied migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);
```