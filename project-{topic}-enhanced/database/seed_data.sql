-- Seed data for testing and initial setup
-- This should only be run in development environments!

-- Note: Password hashes below are DUMMY hashes.
-- In a real system, generate them securely using the application's hashing function.

INSERT INTO users (id, username, email, password_hash) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin', 'admin@example.com', 'hashed_admin_password'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'testuser', 'test@example.com', 'hashed_test_password')
ON CONFLICT (id) DO NOTHING;

INSERT INTO data_sources (id, user_id, name, type, connection_string, schema_definition, file_path) VALUES
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sales Data Q1', 'CSV', NULL, 
'{"columns": [{"name": "Region", "type": "string"}, {"name": "Product", "type": "string"}, {"name": "Sales", "type": "number"}, {"name": "Date", "type": "date"}]}', 
'data_uploads/example_sales_data.csv')
ON CONFLICT (id) DO NOTHING;

INSERT INTO data_sources (id, user_id, name, type, connection_string, schema_definition, file_path) VALUES
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'User Activity Logs', 'PostgreSQL', 
'postgresql://loguser:logpass@externaldb:5432/activity_logs', 
'{"table": "user_events", "columns": [{"name": "event_type", "type": "string"}, {"name": "user_id", "type": "string"}, {"name": "timestamp", "type": "datetime"}]}', 
NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO visualizations (id, user_id, name, description, data_source_id, type, configuration) VALUES
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sales by Region Bar Chart', 'Bar chart showing sales aggregation by region', 
'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'bar_chart', 
'{"xAxis": "Region", "yAxis": "Sales", "aggregation": {"field": "Sales", "operation": "sum"}, "title": "Total Sales by Region"}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO dashboards (id, user_id, name, description, layout_config) VALUES
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Executive Sales Dashboard', 'Overview of Q1 sales performance',
'{"widgets": [
    {"vizId": "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15", "x": 0, "y": 0, "width": 6, "height": 4},
    {"vizId": "some-other-viz-id", "x": 6, "y": 0, "width": 6, "height": 4}
]}')
ON CONFLICT (id) DO NOTHING;