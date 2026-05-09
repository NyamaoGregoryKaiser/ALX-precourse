```sql
-- Migration: 002_add_dashboards_table.sql
-- Description: Adds the dashboards table for storing dashboard configurations.

CREATE TABLE IF NOT EXISTS dashboards (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    layout_json JSONB NOT NULL DEFAULT '{}'::jsonb, -- Stores the layout and widget configurations as JSON
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dashboards_user_id ON dashboards (user_id);
```