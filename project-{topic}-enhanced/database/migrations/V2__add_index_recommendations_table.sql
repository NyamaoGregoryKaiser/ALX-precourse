-- V2__add_index_recommendations_table.sql

-- Table for storing index recommendations
CREATE TABLE IF NOT EXISTS index_recommendations (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(255) NOT NULL,
    column_name VARCHAR(255) NOT NULL,
    recommendation_type VARCHAR(100) NOT NULL, -- e.g., 'B-TREE INDEX', 'GIN INDEX'
    recommendation_sql TEXT NOT NULL,          -- The SQL to apply the recommendation
    description TEXT,
    status VARCHAR(50) DEFAULT 'PENDING' NOT NULL, -- e.g., 'PENDING', 'APPLIED', 'REJECTED'
    severity VARCHAR(50) DEFAULT 'MEDIUM' NOT NULL, -- e.g., 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    cost_savings VARCHAR(50),                     -- e.g., 'LOW', 'MEDIUM', 'HIGH'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Ensure only one pending/active recommendation per table.column
    UNIQUE (table_name, column_name, status)
);

-- Index for quick lookup of recommendations by table and column
CREATE INDEX idx_index_recs_table_column ON index_recommendations(table_name, column_name);
```