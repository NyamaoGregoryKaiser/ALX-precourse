```sql
-- Seed data for VisuFlow Analytics Platform
-- This script should be run AFTER all migrations are applied.

-- Insert a default admin user
INSERT INTO users (username, hashed_password, email, role)
VALUES ('admin', '5e884898da28047151d0e56f8dc6292773603d0d6aabbd670b36814620027806', 'admin@example.com', 'admin') -- 'password' hashed with a mock SHA256 (for demonstration only)
ON CONFLICT (username) DO NOTHING;

-- Insert a default editor user
INSERT INTO users (username, hashed_password, email, role)
VALUES ('editor', '5e884898da28047151d0e56f8dc6292773603d0d6aabbd670b36814620027806', 'editor@example.com', 'editor')
ON CONFLICT (username) DO NOTHING;

-- Insert some example data sources for the 'admin' user (assuming admin user ID is 1)
INSERT INTO data_sources (name, type, connection_string, query, user_id)
SELECT 'Sales Database (PostgreSQL)', 'PostgreSQL', 'host=visuflow_db port=5432 dbname=visuflow_db user=visuflow_user password=password', 'SELECT date_trunc(''month'', order_date) as month, SUM(amount) as sales FROM orders WHERE order_date BETWEEN {startDate} AND {endDate} GROUP BY 1 ORDER BY 1', users.id
FROM users WHERE users.username = 'admin'
ON CONFLICT (id) DO NOTHING; -- Using ID as a placeholder for simpler unique check; in real app, might need unique name for user

INSERT INTO data_sources (name, type, connection_string, query, user_id)
SELECT 'Product Categories (CSV)', 'CSV', '/app/data/products.csv', 'SELECT category, count(*) FROM products GROUP BY category', users.id
FROM users WHERE users.username = 'admin'
ON CONFLICT (id) DO NOTHING;

-- Insert an example dashboard for the 'admin' user (assuming admin user ID is 1)
INSERT INTO dashboards (name, description, layout_json, user_id)
SELECT 'Executive Dashboard', 'Key performance indicators for the executive team.',
'{
    "widgets": [
        {
            "id": "widget1",
            "title": "Monthly Sales Trend",
            "chartType": "line",
            "dataSourceId": 1,
            "groupBy": "month",
            "metric": "sales",
            "filters": {}
        },
        {
            "id": "widget2",
            "title": "Sales by Category",
            "chartType": "bar",
            "dataSourceId": 2,
            "groupBy": "category",
            "metric": "count",
            "filters": {}
        }
    ]
}'::jsonb, users.id
FROM users WHERE users.username = 'admin'
ON CONFLICT (id) DO NOTHING;

-- Create some mock data in the database for the 'Sales Database (PostgreSQL)' data source to query
-- This would typically be part of a fixture or test setup, but for a full-scale example,
-- we'll assume the data exists in the external source.
-- For a simple direct query, we'll create a mock `orders` table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    category VARCHAR(50)
);

-- Insert some mock order data
INSERT INTO orders (order_date, amount, category) VALUES
('2023-01-01', 100.50, 'Electronics'),
('2023-01-15', 250.75, 'Clothing'),
('2023-02-01', 120.00, 'Books'),
('2023-02-10', 300.00, 'Electronics'),
('2023-03-05', 50.25, 'Clothing'),
('2023-03-20', 180.00, 'Books')
ON CONFLICT DO NOTHING; -- Assuming no unique constraint on (order_date, amount, category)
```