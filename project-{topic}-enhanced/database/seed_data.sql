```sql
-- Connect to the dataviz_db as dataviz_user or postgres
-- \c dataviz_db;
-- SET ROLE dataviz_user;

-- Seed an admin user (password 'adminpass' will be hashed by backend on first run if not using fixed hash)
-- For demonstration, we'll manually insert a hashed password (e.g., SHA256 of 'adminpass')
-- In a real scenario, the backend's registration endpoint would handle hashing.
-- Example SHA256 for 'adminpass': 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
INSERT INTO users (email, password_hash, role)
VALUES ('admin@example.com', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'admin')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role;

-- Seed a regular user (password 'userpass')
-- Example SHA256 for 'userpass': 96e00000a68d7162986422f254924c80330691880482069c990263309a96e000
INSERT INTO users (email, password_hash, role)
VALUES ('user@example.com', '96e00000a68d7162986422f254924c80330691880482069c990263309a96e000', 'user')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role;

-- Example seed for a dataset (requires the file to exist in `backend/assets/datasets/sample.csv`)
-- SELECT id FROM users WHERE email = 'user@example.com' (assuming user@example.com is ID 2)
-- Actual file_path will depend on the Docker volume mounting.
-- For local testing, ensure 'backend/assets/datasets/sample.csv' exists.
-- Sample columns_metadata structure:
-- [{"name": "Category", "type": "string", "isDimension": true, "isMeasure": false},
--  {"name": "Value", "type": "number", "isDimension": false, "isMeasure": true}]
INSERT INTO datasets (user_id, name, description, file_path, file_type, columns_metadata)
VALUES (
    (SELECT id FROM users WHERE email = 'user@example.com'),
    'Sample Sales Data',
    'A sample dataset of sales figures by product category.',
    './assets/datasets/sample_sales.csv', -- Path within the backend container
    'csv',
    '[{"name": "Product", "type": "string", "isDimension": true, "isMeasure": false}, {"name": "Sales", "type": "number", "isDimension": false, "isMeasure": true}, {"name": "Region", "type": "string", "isDimension": true, "isMeasure": false}, {"name": "Date", "type": "date", "isDimension": true, "isMeasure": false}]'::jsonb
)
ON CONFLICT DO NOTHING;

-- Example seed for a visualization (assuming Dataset ID 1 and user ID 2 from above)
INSERT INTO visualizations (user_id, dataset_id, name, description, chart_type, config)
VALUES (
    (SELECT id FROM users WHERE email = 'user@example.com'),
    (SELECT id FROM datasets WHERE name = 'Sample Sales Data' AND user_id = (SELECT id FROM users WHERE email = 'user@example.com')),
    'Sales by Product Bar Chart',
    'Bar chart showing total sales for each product.',
    'bar',
    '{
        "xAxis": {"column": "Product", "label": "Product Name"},
        "yAxis": {"column": "Sales", "label": "Total Sales", "aggregation": "sum"},
        "colors": ["#4285F4", "#DB4437", "#F4B400", "#0F9D58"],
        "title": "Total Sales by Product"
    }'::jsonb
)
ON CONFLICT DO NOTHING;
```