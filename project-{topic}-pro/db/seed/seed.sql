```sql
-- seed.sql

-- Insert a default admin user (password 'adminpass')
INSERT INTO users (username, password_hash, email) VALUES
('admin', '$2a$10$Y7L0kGqZ/fS7A8xQ6eL.cOY.2N.jN.x.q.1R.p.B.x.t.0.x.x.x', 'admin@example.com') -- Hashed password for 'adminpass'
ON CONFLICT (username) DO NOTHING;

-- Insert some example metric metadata
INSERT INTO metrics_metadata (metric_name, description, unit) VALUES
('system.cpu.usage', 'Percentage of CPU utilized', '%'),
('system.memory.used_gb', 'Gigabytes of RAM currently in use', 'GB'),
('system.disk.usage', 'Percentage of disk space utilized', '%'),
('system.network.in_mbps', 'Incoming network traffic', 'Mbps'),
('system.network.out_mbps', 'Outgoing network traffic', 'Mbps'),
('app.api.response_time_ms', 'Average API response time', 'ms'),
('app.api.error_count', 'Number of API errors', 'count')
ON CONFLICT (metric_name) DO NOTHING;
```