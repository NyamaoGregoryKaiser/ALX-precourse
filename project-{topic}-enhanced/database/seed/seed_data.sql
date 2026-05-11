-- seed_data.sql
-- This script should be run after migrations to populate initial data.
-- It's included in Docker setup but typically separate from migrations for dev/test environments.

-- Insert a default admin user (password 'admin_password_secure' hashed)
-- Use AuthService::hashPassword("admin_password_secure") to get the actual hash if running manually
INSERT INTO users (username, password_hash, email, role) VALUES
('admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'admin@example.com', 'ADMIN')
ON CONFLICT (username) DO NOTHING;

-- Insert some sample query logs
INSERT INTO query_logs (query_text, execution_time_ms, database_name, user_name, client_ip) VALUES
('SELECT * FROM users WHERE username = ''testuser'';', 15.3, 'mydb', 'app_user', '192.168.1.100'),
('SELECT id, name, email FROM customers WHERE email LIKE ''%@example.com'' ORDER BY name;', 75.8, 'mydb', 'analytics', '192.168.1.101'),
('UPDATE products SET price = price * 1.05 WHERE category = ''Electronics'';', 200.1, 'mydb', 'admin', '192.168.1.102'),
('SELECT count(*) FROM orders WHERE status = ''pending'' AND created_at > now() - INTERVAL ''1 day'';', 120.5, 'mydb', 'reporter', '192.168.1.103'),
('SELECT * FROM users WHERE id = 1;', 5.1, 'mydb', 'app_user', '192.168.1.100'),
('SELECT product_name, price FROM products WHERE category = ''Books'' ORDER BY price DESC;', 90.2, 'mydb', 'guest', '192.168.1.104'),
('SELECT customer_id FROM orders WHERE order_date < ''2023-01-01'';', 300.7, 'mydb', 'archive_user', '192.168.1.105');

-- Insert some sample index recommendations
INSERT INTO index_recommendations (table_name, column_name, recommendation_type, recommendation_sql, description, severity, cost_savings, status) VALUES
('customers', 'email', 'B-TREE INDEX', 'CREATE INDEX idx_customers_email ON customers (email);', 'Index email column for faster email lookups in search queries.', 'MEDIUM', 'High', 'PENDING'),
('products', 'category', 'B-TREE INDEX', 'CREATE INDEX idx_products_category ON products (category);', 'Improve performance for filtering products by category.', 'LOW', 'Medium', 'PENDING'),
('orders', 'created_at', 'B-TREE INDEX', 'CREATE INDEX idx_orders_created_at ON orders (created_at);', 'Optimize queries filtering orders by creation date.', 'HIGH', 'High', 'APPLIED');

-- Insert some sample schema issues
INSERT INTO schema_issues (issue_type, object_name, object_type, description, recommendation, severity, status) VALUES
('MISSING_FK', 'order_items.order_id', 'COLUMN', 'Column order_items.order_id seems to be a foreign key to orders.id but lacks a foreign key constraint.', 'ALTER TABLE order_items ADD CONSTRAINT fk_order_id FOREIGN KEY (order_id) REFERENCES orders(id);', 'CRITICAL', 'OPEN'),
('NON_NORMALIZED', 'customers.address_full', 'COLUMN', 'The address_full column in customers table contains multiple address components. Consider normalizing into separate columns or a separate address table.', 'Refactor customers table to store address components (street, city, zip) separately, or create a dedicated addresses table.', 'MEDIUM', 'OPEN'),
('SUBOPTIMAL_DATATYPE', 'products.description', 'COLUMN', 'products.description is TEXT. If descriptions are short, consider VARCHAR(MAX) or specific length.', 'Review usage of TEXT type for products.description. If average length is small, consider VARCHAR(255).', 'LOW', 'OPEN');
```