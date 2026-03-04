-- Create dashboards table
CREATE TABLE IF NOT EXISTS dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    layout_config JSONB NOT NULL, -- JSON config for dashboard layout, including contained visualization IDs and their positions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_dashboard_name UNIQUE (user_id, name)
);

-- Index for faster dashboard lookups by user
CREATE INDEX IF NOT EXISTS idx_dashboards_user_id ON dashboards (user_id);