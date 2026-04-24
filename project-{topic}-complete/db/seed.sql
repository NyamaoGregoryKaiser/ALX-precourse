```sql
-- Seed Users (passwords are 'password123' for demo - in production, use strong hashing)
-- Note: password_hash here is a placeholder. A real system would use a robust hashing algorithm like bcrypt.
-- For this demo, we'll use a simple SHA256 simulation in C++ for the hash, but it's not truly secure.
-- admin@example.com / password123 (hash of 'password123' via simple SHA256 simulation: 3c9909afec25354d551dae21590bb26e38d53f2173b8d3dc3eee4c047e7ab1c1)
INSERT INTO users (username, email, password_hash, role) VALUES
('AdminUser', 'admin@example.com', '3c9909afec25354d551dae21590bb26e38d53f2173b8d3dc3eee4c047e7ab1c1', 'admin');

-- user@example.com / password123 (same hash as above for simplicity)
INSERT INTO users (username, email, password_hash, role) VALUES
('TestCustomer', 'user@example.com', '3c9909afec25354d551dae21590bb26e38d53f2173b8d3dc3eee4c047e7ab1c1', 'customer');

-- Seed Products
INSERT INTO products (name, description, price, stock, image_url) VALUES
('Laptop Pro X', 'Powerful laptop for professionals.', 1200.00, 50, 'https://example.com/laptop.jpg'),
('Mechanical Keyboard', 'High-quality mechanical keyboard with RGB.', 150.00, 100, 'https://example.com/keyboard.jpg'),
('Wireless Mouse', 'Ergonomic wireless mouse.', 45.50, 200, 'https://example.com/mouse.jpg'),
('4K Monitor', '27-inch 4K IPS monitor.', 350.00, 30, 'https://example.com/monitor.jpg'),
('Webcam HD', 'Full HD 1080p webcam for video calls.', 75.00, 120, 'https://example.com/webcam.jpg');

-- Create initial carts for seeded users
INSERT INTO carts (user_id) SELECT id FROM users WHERE email = 'admin@example.com';
INSERT INTO carts (user_id) SELECT id FROM users WHERE email = 'user@example.com';

-- Optional: Add some items to the customer's cart
INSERT INTO cart_items (cart_id, product_id, quantity)
SELECT c.id, p.id, 1
FROM carts c, products p
WHERE c.user_id = (SELECT id FROM users WHERE email = 'user@example.com')
  AND p.name = 'Mechanical Keyboard';

INSERT INTO cart_items (cart_id, product_id, quantity)
SELECT c.id, p.id, 2
FROM carts c, products p
WHERE c.user_id = (SELECT id FROM users WHERE email = 'user@example.com')
  AND p.name = 'Wireless Mouse';

-- Optional: Create an initial order for the customer
-- This would typically be done via the application, not direct seeding,
-- but for demonstration of order data, we can manually add.
-- First, insert the order
INSERT INTO orders (user_id, total_amount, status)
SELECT id, 0.00, 'delivered' FROM users WHERE email = 'user@example.com';

-- Then, insert order items and update total_amount
WITH last_order AS (
    SELECT id FROM orders WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com') ORDER BY created_at DESC LIMIT 1
)
INSERT INTO order_items (order_id, product_id, quantity, price)
SELECT (SELECT id FROM last_order), p.id, 1, p.price
FROM products p WHERE p.name = 'Laptop Pro X';

WITH last_order AS (
    SELECT id FROM orders WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com') ORDER BY created_at DESC LIMIT 1
)
INSERT INTO order_items (order_id, product_id, quantity, price)
SELECT (SELECT id FROM last_order), p.id, 1, p.price
FROM products p WHERE p.name = '4K Monitor';

-- Update the total amount for the last order
UPDATE orders
SET total_amount = (SELECT SUM(oi.quantity * oi.price) FROM order_items oi WHERE oi.order_id = orders.id)
WHERE id = (SELECT id FROM orders WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com') ORDER BY created_at DESC LIMIT 1);
```