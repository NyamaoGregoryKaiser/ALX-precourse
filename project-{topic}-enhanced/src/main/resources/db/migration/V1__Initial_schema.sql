```sql
-- V1__Initial_schema.sql

-- Drop tables if they exist (for clean re-runs in development, remove in production)
DROP TABLE IF EXISTS feature_sets;
DROP TABLE IF EXISTS models;
DROP TABLE IF EXISTS datasets;
DROP TABLE IF EXISTS experiments;
DROP TABLE IF EXISTS users_roles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

-- Create Roles Table
CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- Create Users Table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Join Table for Users and Roles
CREATE TABLE users_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Create Experiments Table
CREATE TABLE experiments (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITHOUT TIME ZONE,
    end_date TIMESTAMP WITHOUT TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- e.g., PENDING, RUNNING, COMPLETED, FAILED
    objective TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id BIGINT NOT NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Create Datasets Table
CREATE TABLE datasets (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    version VARCHAR(50) NOT NULL,
    source_uri TEXT, -- e.g., S3 path, HDFS path, URL
    description TEXT,
    size_mb BIGINT,
    row_count BIGINT,
    format VARCHAR(50), -- e.g., CSV, Parquet, JSON
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id BIGINT NOT NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    UNIQUE (name, version)
);

-- Create Feature Sets Table
CREATE TABLE feature_sets (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    description TEXT,
    source_dataset_id BIGINT,
    transformation_code_uri TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id BIGINT NOT NULL,
    FOREIGN KEY (source_dataset_id) REFERENCES datasets(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    UNIQUE (name, version)
);

-- Create Models Table
CREATE TABLE models (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    experiment_id BIGINT,
    dataset_id BIGINT, -- The dataset used to train this model
    feature_set_id BIGINT, -- The feature set used by this model
    model_uri TEXT, -- e.g., S3 path, local path to saved model
    framework VARCHAR(100), -- e.g., Scikit-learn, TensorFlow, PyTorch
    accuracy DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    precision_score DECIMAL(5,4),
    recall_score DECIMAL(5,4),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id BIGINT NOT NULL,
    FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE SET NULL,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE SET NULL,
    FOREIGN KEY (feature_set_id) REFERENCES feature_sets(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    UNIQUE (name, version)
);

-- Add indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_experiments_name ON experiments(name);
CREATE INDEX idx_datasets_name_version ON datasets(name, version);
CREATE INDEX idx_feature_sets_name_version ON feature_sets(name, version);
CREATE INDEX idx_models_name_version ON models(name, version);
CREATE INDEX idx_models_experiment_id ON models(experiment_id);
```