```sql
-- Seed data for initial setup (example for development/testing)

-- Insert a default admin user if not exists (handled by AuthManager in C++ also)
INSERT INTO users (username, hashed_password, role, created_at, updated_at)
SELECT 'admin', 'HASH_admin', 'admin', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- Example Data Source (assuming 'data/sales_data.csv' exists)
INSERT INTO data_sources (name, type, connection_string, created_at, updated_at, schema)
SELECT 'Sales Data CSV', 'csv', 'data/sales_data.csv', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000,
'[{"name":"Year","type":"int"},{"name":"Category","type":"string"},{"name":"Value","type":"double"},{"name":"Region","type":"string"}]'
WHERE NOT EXISTS (SELECT 1 FROM data_sources WHERE name = 'Sales Data CSV');

-- Example Visualization (Bar chart of Sales Value by Category)
-- This would typically be created via the API after data source is registered.
-- For a seed script, you would need to get the ID of the 'Sales Data CSV' first.
-- Example assuming data_source_id = 1
-- INSERT INTO visualizations (name, data_source_id, type, config, created_at, updated_at)
-- SELECT 'Sales by Category Bar Chart', 1, 'bar',
-- '{"x_axis":"Category", "y_axis":"Value", "aggregation_operation":"sum", "aggregation_column":"Value", "group_by":"Category"}',
-- strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
-- WHERE NOT EXISTS (SELECT 1 FROM visualizations WHERE name = 'Sales by Category Bar Chart');
```