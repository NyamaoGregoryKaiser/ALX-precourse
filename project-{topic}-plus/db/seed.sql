-- db/seed.sql

-- Insert sample users
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@example.com', '$2a$10$f0sDqA3eY/YyNnI8T8Xq.O4p5Xp7q6p8q9r0s1t2u3v4w5x6y7z.', 'ADMIN'), -- password: adminpass
('john_doe', 'john.doe@example.com', '$2a$10$f0sDqA3eY/YyNnI8T8Xq.O4p5Xp7q6p8q9r0s1t2u3v4w5x6y7z.', 'USER'), -- password: userpass
('jane_smith', 'jane.smith@example.com', '$2a$10$f0sDqA3eY/YyNnI8T8Xq.O4p5Xp7q6p8q9r0s1t2u3v4w5x6y7z.', 'USER'); -- password: userpass

-- Insert sample products
INSERT INTO products (name, description, price, stock_quantity) VALUES
('Laptop Pro X', 'Powerful laptop for professionals.', 1200.00, 50),
('Mechanical Keyboard', 'RGB backlit mechanical keyboard.', 85.50, 200),
('Wireless Mouse', 'Ergonomic wireless mouse with long battery life.', 35.99, 300),
('4K Monitor 27"', 'High-resolution monitor for gaming and design.', 450.00, 75);

-- Insert sample orders
-- Order by john_doe
INSERT INTO orders (user_id, total_amount, status) VALUES
(2, 1285.50, 'COMPLETED'); -- user_id 2 is john_doe

-- Order items for john_doe's order
INSERT INTO order_items (order_id, product_id, quantity, price_at_order) VALUES
(1, 1, 1, 1200.00), -- Laptop Pro X
(1, 2, 1, 85.50);    -- Mechanical Keyboard

-- Order by jane_smith
INSERT INTO orders (user_id, total_amount, status) VALUES
(3, 71.98, 'PENDING'); -- user_id 3 is jane_smith

-- Order items for jane_smith's order
INSERT INTO order_items (order_id, product_id, quantity, price_at_order) VALUES
(2, 3, 2, 35.99);    -- Wireless Mouse x2