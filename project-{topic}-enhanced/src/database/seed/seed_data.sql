```sql
-- seed_data.sql

-- Insert a default admin user (password 'password123' hashed with bcrypt)
-- HASH for 'password123' generated using Crypto::hash_password
INSERT INTO users (id, username, email, password_hash)
ON CONFLICT (email) DO NOTHING
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Example UUID
    'admin',
    'admin@example.com',
    '$2a$12$Kk07tUa7b/Tq5F.x2.sR4.eL8jFmO/G.sR9zFmO/G.' -- Hashed 'password123'
);

-- Insert a default system for the admin user
INSERT INTO systems (id, user_id, name, description, api_key)
ON CONFLICT (api_key) DO NOTHING
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Example UUID
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- admin user ID
    'Main Web Server',
    'Primary server hosting the application.',
    'some_secure_api_key_for_main_web_server_123' -- Example API Key
);

-- Insert some example metrics for the default system
INSERT INTO metrics (system_id, metric_name, metric_value, timestamp)
VALUES
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cpu_usage', 25.5, NOW() - INTERVAL '5 minutes'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'memory_free', 1024.0, NOW() - INTERVAL '5 minutes'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'disk_io_wait', 0.1, NOW() - INTERVAL '5 minutes'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cpu_usage', 30.1, NOW() - INTERVAL '2 minutes'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'memory_free', 980.5, NOW() - INTERVAL '2 minutes');

-- Insert an example alert for the admin user and system
INSERT INTO alerts (id, user_id, system_id, metric_name, threshold_value, comparison_operator, status, alert_message)
ON CONFLICT (id) DO NOTHING
VALUES (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Example UUID
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- admin user ID
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Main Web Server system ID
    'cpu_usage',
    80.0,
    '>',
    'active',
    'High CPU usage detected!'
);
```