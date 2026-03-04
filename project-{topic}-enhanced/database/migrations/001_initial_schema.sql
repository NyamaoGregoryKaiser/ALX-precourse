-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster user lookups by email
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Create data_sources table
CREATE TABLE IF NOT EXISTS data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'CSV', 'PostgreSQL', 'API'
    connection_string TEXT, -- JSON or connection string for external databases/APIs
    schema_definition JSONB, -- JSON schema for data fields (e.g., column names, types)
    file_path TEXT, -- Local path for file-based data sources (e.g., CSV)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_data_source_name UNIQUE (user_id, name)
);

-- Index for faster data source lookups by user
CREATE INDEX IF NOT EXISTS idx_data_sources_user_id ON data_sources (user_id);

-- Create visualizations table
CREATE TABLE IF NOT EXISTS visualizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- e.g., 'bar_chart', 'line_chart', 'pie_chart'
    configuration JSONB NOT NULL, -- JSON config for chart options (axes, series, colors, filters, aggregations)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_visualization_name UNIQUE (user_id, name)
);

-- Index for faster visualization lookups by user and data source
CREATE INDEX IF NOT EXISTS idx_visualizations_user_id ON visualizations (user_id);
CREATE INDEX IF NOT EXISTS idx_visualizations_data_source_id ON visualizations (data_source_id);