```sql
-- V2_add_alert_tables.sql

-- Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    threshold_value DOUBLE PRECISION NOT NULL,
    comparison_operator VARCHAR(10) NOT NULL, -- e.g., '>', '<', '>=', '<=', '='
    status VARCHAR(20) DEFAULT 'active' NOT NULL, -- 'active', 'inactive'
    alert_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fetching alerts by user and system
CREATE INDEX IF NOT EXISTS idx_alerts_user_system ON alerts (user_id, system_id);

-- Alert History Table (records when an alert was triggered)
CREATE TABLE IF NOT EXISTS alert_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actual_value DOUBLE PRECISION NOT NULL,
    message TEXT NOT NULL
);

-- Index for fetching alert history by alert
CREATE INDEX IF NOT EXISTS idx_alert_history_alert_id ON alert_history (alert_id, triggered_at DESC);

-- Trigger for alerts table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_alerts_timestamp') THEN
        CREATE TRIGGER set_alerts_timestamp
        BEFORE UPDATE ON alerts
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp_column();
    END IF;
END $$;
```