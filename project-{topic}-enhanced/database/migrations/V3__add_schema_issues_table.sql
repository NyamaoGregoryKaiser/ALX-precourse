-- V3__add_schema_issues_table.sql

-- Table for storing schema issues (e.g., missing FKs, suboptimal data types)
CREATE TABLE IF NOT EXISTS schema_issues (
    id SERIAL PRIMARY KEY,
    issue_type VARCHAR(255) NOT NULL, -- e.g., 'MISSING_FK', 'NON_NORMALIZED', 'SUBOPTIMAL_DATATYPE'
    object_name VARCHAR(255) NOT NULL, -- Table or Column name
    object_type VARCHAR(50) NOT NULL,  -- 'TABLE', 'COLUMN'
    description TEXT,
    recommendation TEXT,               -- SQL or general advice to fix
    severity VARCHAR(50) DEFAULT 'MEDIUM' NOT NULL,
    status VARCHAR(50) DEFAULT 'OPEN' NOT NULL, -- 'OPEN', 'RESOLVED', 'IGNORED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookup by issue type and object name
CREATE INDEX idx_schema_issues_type_object ON schema_issues(issue_type, object_name);
```