```sql
-- V1__initial_schema.sql

-- Drop tables if they exist to allow clean re-runs in dev (NOT for prod migration)
-- DROP TABLE IF EXISTS dashboard_visualizations;
-- DROP TABLE IF EXISTS user_roles;
-- DROP TABLE IF EXISTS dashboards;
-- DROP TABLE IF EXISTS visualizations;
-- DROP TABLE IF EXISTS datasets;
-- DROP TABLE IF EXISTS data_sources;
-- DROP TABLE IF EXISTS roles;
-- DROP TABLE IF EXISTS users;

-- Create Users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create Roles table
CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL
);

-- Create User_Roles join table
CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
);

-- Create Data_Sources table
CREATE TABLE data_sources (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'POSTGRES', 'CSV_UPLOAD', 'API'
    connection_details TEXT, -- JSON string for connection configs
    owner_id BIGINT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create Datasets table
CREATE TABLE datasets (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    data_source_id BIGINT NOT NULL,
    query_or_table TEXT NOT NULL, -- SQL query, table name, or API path
    schema_definition TEXT, -- JSON string of column names and types
    transformation_logic TEXT, -- JSON string for filters, aggregations, etc.
    owner_id BIGINT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY (data_source_id) REFERENCES data_sources (id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create Visualizations table
CREATE TABLE visualizations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    dataset_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'BAR_CHART', 'LINE_CHART'
    config TEXT, -- JSON string for chart specific options (axes, colors)
    owner_id BIGINT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY (dataset_id) REFERENCES datasets (id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create Dashboards table
CREATE TABLE dashboards (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id BIGINT NOT NULL,
    layout_config TEXT, -- JSON string for dashboard layout
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create Dashboard_Visualizations join table
CREATE TABLE dashboard_visualizations (
    dashboard_id BIGINT NOT NULL,
    visualization_id BIGINT NOT NULL,
    PRIMARY KEY (dashboard_id, visualization_id),
    FOREIGN KEY (dashboard_id) REFERENCES dashboards (id) ON DELETE CASCADE,
    FOREIGN KEY (visualization_id) REFERENCES visualizations (id) ON DELETE CASCADE
);

-- Add indexes for performance optimization
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_data_sources_owner_id ON data_sources (owner_id);
CREATE INDEX idx_datasets_data_source_id ON datasets (data_source_id);
CREATE INDEX idx_datasets_owner_id ON datasets (owner_id);
CREATE INDEX idx_visualizations_dataset_id ON visualizations (dataset_id);
CREATE INDEX idx_visualizations_owner_id ON visualizations (owner_id);
CREATE INDEX idx_dashboards_owner_id ON dashboards (owner_id);
```