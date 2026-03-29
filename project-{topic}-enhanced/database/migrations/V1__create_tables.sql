```sql
-- Connect to the dataviz_db as dataviz_user or postgres
-- (If running migrations manually, ensure the database exists and user has rights)
-- \c dataviz_db;
-- SET ROLE dataviz_user;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user', -- e.g., 'user', 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS datasets (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL, -- Path to the stored CSV/JSON file
    file_type VARCHAR(50) NOT NULL, -- e.g., 'csv', 'json'
    columns_metadata JSONB DEFAULT '[]'::jsonb, -- Store inferred schema of the dataset (e.g., column names, types)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user
        FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS visualizations (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    dataset_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    chart_type VARCHAR(50) NOT NULL, -- e.g., 'bar', 'line', 'scatter', 'pie'
    config JSONB NOT NULL DEFAULT '{}'::jsonb, -- JSON config for the visualization (axes, filters, colors, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user
        FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_dataset
        FOREIGN KEY(dataset_id)
        REFERENCES datasets(id)
        ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_datasets_user_id ON datasets(user_id);
CREATE INDEX IF NOT EXISTS idx_visualizations_user_id ON visualizations(user_id);
CREATE INDEX IF NOT EXISTS idx_visualizations_dataset_id ON visualizations(dataset_id);
```