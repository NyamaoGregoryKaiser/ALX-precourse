```sql
-- V1__Initial_schema.sql

-- Create 'users' table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(120) NOT NULL,
    email VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create 'roles' table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE
);

-- Create join table for many-to-many relationship between users and roles
CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Create 'datasets' table
CREATE TABLE datasets (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    storage_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    size_bytes BIGINT,
    num_rows INT,
    num_columns INT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create 'models' table
CREATE TABLE models (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    algorithm VARCHAR(100) NOT NULL,
    target_variable VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create 'model_versions' table
CREATE TABLE model_versions (
    id BIGSERIAL PRIMARY KEY,
    model_id BIGINT NOT NULL,
    version_number VARCHAR(50) NOT NULL,
    artifact_path VARCHAR(500),
    training_metrics TEXT, -- JSON string
    deployment_status VARCHAR(50), -- e.g., 'Development', 'Staging', 'Production', 'Archived'
    deployed_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE,
    UNIQUE (model_id, version_number)
);

-- Create 'feature_definitions' table
CREATE TABLE feature_definitions (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., "NUMERIC", "CATEGORICAL", "TEXT"
    version VARCHAR(50) NOT NULL,
    description TEXT,
    source_dataset_id BIGINT, -- Optional: Link to the dataset it originates from
    transformation_logic TEXT, -- Code/description of how the feature is derived/transformed
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_dataset_id) REFERENCES datasets(id) ON DELETE SET NULL,
    UNIQUE (name, version)
);

-- Create join table for many-to-many relationship between model_versions and feature_definitions
CREATE TABLE model_version_features (
    model_version_id BIGINT NOT NULL,
    feature_definition_id BIGINT NOT NULL,
    PRIMARY KEY (model_version_id, feature_definition_id),
    FOREIGN KEY (model_version_id) REFERENCES model_versions(id) ON DELETE CASCADE,
    FOREIGN KEY (feature_definition_id) REFERENCES feature_definitions(id) ON DELETE CASCADE
);

-- Add indexes for performance
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_datasets_name ON datasets (name);
CREATE INDEX idx_models_name ON models (name);
CREATE INDEX idx_model_versions_model_id ON model_versions (model_id);
CREATE INDEX idx_feature_definitions_name ON feature_definitions (name);
CREATE INDEX idx_feature_definitions_dataset_id ON feature_definitions (source_dataset_id);
```