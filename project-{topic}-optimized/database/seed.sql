-- Seed data for initial setup

-- Users
-- Passwords are 'password123' for all, but hashed with different salts
INSERT INTO users (username, email, password_hash, password_salt, role) VALUES
('admin_user', 'admin@example.com', '69e7f7b3c2c7f5c7e8a9f0a2d4c6f8e0b2d4f6c8a0e2c4f6c8a0f2d4c6e8f0b2', 'random_salt_admin', 'admin'),
('john_doe', 'john.doe@example.com', 'f0e2d4c6e8f0b2d4f6c8a0e2c4f6c8a0e2c4f6c8a0e2c4f6c8a0f2d4c6e8f0b2', 'random_salt_john', 'user'),
('jane_smith', 'jane.smith@example.com', 'e2c4f6c8a0e2c4f6c8a0f2d4c6e8f0b2d4f6c8a0e2c4f6c8a0f2d4c6e8f0b2', 'random_salt_jane', 'user');

-- Products
INSERT INTO products (name, description, price, stock_quantity) VALUES
('Smartphone X', 'Latest generation smartphone with advanced camera and battery.', 999.99, 100),
('Laptop Pro 15', 'High-performance laptop for professionals and gamers.', 1499.00, 50),
('Wireless Earbuds Z', 'Noise-cancelling earbuds with crystal clear audio.', 129.50, 200),
('Smartwatch Lite', 'Fitness tracker and smartwatch with long battery life.', 199.99, 150),
('4K Monitor 27"', '27-inch 4K UHD monitor for immersive viewing.', 349.99, 75);

-- Orders (Example: John Doe placed an order)
-- Note: Order items are dependent on existing product IDs. Adjust if product IDs change from `BIGSERIAL` starting at 1.
INSERT INTO orders (user_id, total_amount, status) VALUES
((SELECT id FROM users WHERE username = 'john_doe'), 1259.49, 'processed');

-- Order Items for John Doe's order
INSERT INTO order_items (order_id, product_id, product_name, price_at_purchase, quantity) VALUES
((SELECT id FROM orders WHERE user_id = (SELECT id FROM users WHERE username = 'john_doe') LIMIT 1),
 (SELECT id FROM products WHERE name = 'Smartphone X'), 'Smartphone X', 999.99, 1),
((SELECT id FROM orders WHERE user_id = (SELECT id FROM users WHERE username = 'john_doe') LIMIT 1),
 (SELECT id FROM products WHERE name = 'Wireless Earbuds Z'), 'Wireless Earbuds Z', 129.50, 2),
((SELECT id FROM orders WHERE user_id = (SELECT id FROM users WHERE username = 'john_doe') LIMIT 1),
 (SELECT id FROM products WHERE name = 'Smartwatch Lite'), 'Smartwatch Lite', 199.99, 1);

-- Update stock quantities for products in the order
UPDATE products SET stock_quantity = stock_quantity - 1 WHERE name = 'Smartphone X';
UPDATE products SET stock_quantity = stock_quantity - 2 WHERE name = 'Wireless Earbuds Z';
UPDATE products SET stock_quantity = stock_quantity - 1 WHERE name = 'Smartwatch Lite';