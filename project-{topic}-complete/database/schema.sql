```sql
-- Schema for ML-Toolkit: Enterprise ML Utilities System

-- Create Tablespaces (Optional, for production environments to manage storage)
-- CREATE TABLESPACE ml_toolkit_data LOCATION '/var/lib/postgresql/ml_toolkit/data';
-- CREATE TABLESPACE ml_toolkit_index LOCATION '/var/lib/postgresql/ml_toolkit/index';

-- Create Schema if not exists (Optional, for better organization within a database)
-- CREATE SCHEMA IF NOT EXISTS ml_toolkit;

-- Set search path (Optional, if using custom schema)
-- SET search_path TO ml_toolkit, public;

-- Datasets Table
-- Stores metadata about registered datasets.
CREATE TABLE IF NOT EXISTS datasets (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    file_path VARCHAR(512) NOT NULL, -- Path to the actual data file (e.g., S3 URL, local path)
    row_count BIGINT DEFAULT 0,
    col_count BIGINT DEFAULT 0,
    feature_names TEXT[] DEFAULT '{}', -- Array of feature names (PostgreSQL array type)
    metadata JSONB DEFAULT '{}'::jsonb, -- Store additional dataset metadata (e.g., column types, statistics)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups by name
CREATE INDEX IF NOT EXISTS idx_datasets_name ON datasets (name);

-- Models Table
-- Stores metadata about trained machine learning models.
CREATE TABLE IF NOT EXISTS models (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- e.g., 'LINEAR_REGRESSION', 'LOGISTIC_REGRESSION', 'KMEANS'
    artifact_path VARCHAR(512) NOT NULL, -- Path to the serialized model artifact (e.g., S3 URL, local file)
    dataset_id BIGINT REFERENCES datasets(id) ON DELETE SET NULL, -- Dataset used for training
    metadata JSONB DEFAULT '{}'::jsonb, -- Store model parameters, evaluation metrics, version info
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups by name and type
CREATE INDEX IF NOT EXISTS idx_models_name ON models (name);
CREATE INDEX IF NOT EXISTS idx_models_type ON models (type);
CREATE INDEX IF NOT EXISTS idx_models_dataset_id ON models (dataset_id);

-- Pipelines Table
-- Stores definitions of data processing pipelines (preprocessing, feature engineering steps).
CREATE TABLE IF NOT EXISTS pipelines (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    dataset_id BIGINT REFERENCES datasets(id) ON DELETE SET NULL, -- The dataset this pipeline is typically applied to
    steps JSONB DEFAULT '[]'::jsonb, -- Array of pipeline steps, each step being a JSON object {name: "Scaler", params: {}}
    metadata JSONB DEFAULT '{}'::jsonb, -- Store fitted parameters (e.g., scaler min/max, imputer means)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups by name
CREATE INDEX IF NOT EXISTS idx_pipelines_name ON pipelines (name);
CREATE INDEX IF NOT EXISTS idx_pipelines_dataset_id ON pipelines (dataset_id);

-- Function to update 'updated_at' column automatically
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for datasets table
DROP TRIGGER IF EXISTS trg_update_dataset_timestamp ON datasets;
CREATE TRIGGER trg_update_dataset_timestamp
BEFORE UPDATE ON datasets
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Trigger for models table
DROP TRIGGER IF EXISTS trg_update_model_timestamp ON models;
CREATE TRIGGER trg_update_model_timestamp
BEFORE UPDATE ON models
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Trigger for pipelines table
DROP TRIGGER IF EXISTS trg_update_pipeline_timestamp ON pipelines;
CREATE TRIGGER trg_update_pipeline_timestamp
BEFORE UPDATE ON pipelines
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
```