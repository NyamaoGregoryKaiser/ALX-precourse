-- V2__Seed_Data.sql

-- Insert default roles
INSERT INTO roles (name) VALUES ('ROLE_USER') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('ROLE_ADMIN') ON CONFLICT (name) DO NOTHING;

-- Insert initial admin user (password 'adminpass')
-- In a real application, passwords should be hashed before insertion.
-- For this example, it's hashed by the AuthService.registerUser upon first run if using that.
-- For direct DB insertion, you'd hash it outside or use a specific function.
-- Here, we'll rely on the application to create it, but providing a default if needed.
-- We'll assume the `AuthService.registerUser` is the primary way for users to get in.
-- So, for seed data, we'll create a user with a pre-hashed password.
-- Example: password "adminpass" hashed with BCrypt (cost=10)
-- Use a tool to generate bcrypt hash or let the application register an initial user.
-- For direct seed, this is how you might insert:
-- INSERT INTO users (username, email, password) VALUES ('admin', 'admin@example.com', '$2a$10$WqU2j/Q8B7M1o1N4z8pQfOQ0lQ9qP5k6M7m9P0p1g0u8e3i2a7t2');
-- (Hash for "adminpass" - you should regenerate this for production)

-- For simplicity and relying on the app to manage, we'll add admin after the app starts
-- or ensure it's created via an API call. For seed data, we will add only roles for now.
-- Categories
INSERT INTO categories (name, description) VALUES ('Electronics', 'Gadgets and electronic devices');
INSERT INTO categories (name, description) VALUES ('Books', 'Fiction and non-fiction books');
INSERT INTO categories (name, description) VALUES ('Home & Kitchen', 'Appliances and decor for home');
INSERT INTO categories (name, description) VALUES ('Apparel', 'Clothing and accessories');

-- Products (linking to categories by name for now, actual app uses IDs)
-- In a real Flyway script, you would get category IDs dynamically or ensure order.
-- For simplicity, let's assume IDs are 1, 2, 3, 4 for 'Electronics', 'Books', 'Home & Kitchen', 'Apparel' respectively.
INSERT INTO products (name, description, price, stock_quantity, category_id) VALUES
('Laptop Pro X', 'High-performance laptop for professionals', 1200.00, 50, (SELECT id FROM categories WHERE name = 'Electronics')),
('The DevOps Handbook', 'Essential guide for DevOps practitioners', 35.50, 100, (SELECT id FROM categories WHERE name = 'Books')),
('Smart Coffee Maker', 'Brew coffee with smart features', 89.99, 30, (SELECT id FROM categories WHERE name = 'Home & Kitchen')),
('Wireless Headphones', 'Noise-cancelling over-ear headphones', 199.99, 75, (SELECT id FROM categories WHERE name = 'Electronics')),
('Fantasy Novel Series', 'Epic fantasy adventure series, 5 books', 75.00, 60, (SELECT id FROM categories WHERE name = 'Books')),
('Blender Master', 'High-power blender for smoothies and more', 65.00, 40, (SELECT id FROM categories WHERE name = 'Home & Kitchen')),
('Denim Jacket', 'Classic blue denim jacket', 59.99, 120, (SELECT id FROM categories WHERE name = 'Apparel'));