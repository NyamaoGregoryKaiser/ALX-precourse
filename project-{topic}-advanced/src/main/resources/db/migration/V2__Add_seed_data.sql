```sql
-- V2__Add_seed_data.sql

-- Add some users
INSERT INTO users (username, email, password, created_at) VALUES
    ('admin', 'admin@example.com', '$2a$10$N/qE7y3.L/g/2D5hB6W6cO.S1T.b1J0Q.c9H.x.C/S.1R.L.5.2', CURRENT_TIMESTAMP), -- password: 'password'
    ('johndoe', 'john.doe@example.com', '$2a$10$N/qE7y3.L/g/2D5hB6W6cO.S1T.b1J0Q.c9H.x.C/S.1R.L.5.2', CURRENT_TIMESTAMP), -- password: 'password'
    ('janesmith', 'jane.smith@example.com', '$2a$10$N/qE7y3.L/g/2D5hB6W6cO.S1T.b1J0Q.c9H.x.C/S.1R.L.5.2', CURRENT_TIMESTAMP); -- password: 'password'

-- Assign roles
INSERT INTO user_roles (user_id, roles) VALUES
    ((SELECT id FROM users WHERE username = 'admin'), 'ROLE_ADMIN'),
    ((SELECT id FROM users WHERE username = 'admin'), 'ROLE_USER'),
    ((SELECT id FROM users WHERE username = 'johndoe'), 'ROLE_USER'),
    ((SELECT id FROM users WHERE username = 'janesmith'), 'ROLE_USER');

-- Add some products
INSERT INTO products (name, description, price, stock_quantity, image_url, created_at) VALUES
    ('Smartphone X', 'Latest generation smartphone with AI camera', 999.99, 100, 'http://example.com/smartphone_x.jpg', CURRENT_TIMESTAMP),
    ('Laptop Pro 16', 'Powerful laptop for professionals', 1499.50, 50, 'http://example.com/laptop_pro.jpg', CURRENT_TIMESTAMP),
    ('Wireless Earbuds', 'Noise-cancelling earbuds with long battery life', 129.00, 200, 'http://example.com/earbuds.jpg', CURRENT_TIMESTAMP),
    ('Smartwatch Series 7', 'Fitness tracker and smart notifications', 299.99, 75, 'http://example.com/smartwatch.jpg', CURRENT_TIMESTAMP),
    ('USB-C Hub', 'Multi-port adapter for modern devices', 49.99, 150, 'http://example.com/usb_hub.jpg', CURRENT_TIMESTAMP);

-- Add some orders
INSERT INTO orders (user_id, order_date, total_amount, status) VALUES
    ((SELECT id FROM users WHERE username = 'johndoe'), CURRENT_TIMESTAMP - INTERVAL '2 days', 999.99, 'DELIVERED'),
    ((SELECT id FROM users WHERE username = 'janesmith'), CURRENT_TIMESTAMP - INTERVAL '1 day', 1578.49, 'PROCESSING'),
    ((SELECT id FROM users WHERE username = 'johndoe'), CURRENT_TIMESTAMP, 129.00, 'PENDING');

-- Add order items
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
    ((SELECT id FROM orders WHERE user_id = (SELECT id FROM users WHERE username = 'johndoe') AND total_amount = 999.99 LIMIT 1),
     (SELECT id FROM products WHERE name = 'Smartphone X'), 1, 999.99),

    ((SELECT id FROM orders WHERE user_id = (SELECT id FROM users WHERE username = 'janesmith') AND total_amount = 1578.49 LIMIT 1),
     (SELECT id FROM products WHERE name = 'Laptop Pro 16'), 1, 1499.50),
    ((SELECT id FROM orders WHERE user_id = (SELECT id FROM users WHERE username = 'janesmith') AND total_amount = 1578.49 LIMIT 1),
     (SELECT id FROM products WHERE name = 'USB-C Hub'), 1, 49.99),
    ((SELECT id FROM orders WHERE user_id = (SELECT id FROM users WHERE username = 'janesmith') AND total_amount = 1578.49 LIMIT 1),
     (SELECT id FROM products WHERE name = 'Wireless Earbuds'), 1, 129.00),

    ((SELECT id FROM orders WHERE user_id = (SELECT id FROM users WHERE username = 'johndoe') AND total_amount = 129.00 LIMIT 1),
     (SELECT id FROM products WHERE name = 'Wireless Earbuds'), 1, 129.00);
```

---

### 3. Configuration & Setup

#### Docker Setup