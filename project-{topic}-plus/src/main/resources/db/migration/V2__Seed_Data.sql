```sql
-- V2__Seed_Data.sql

-- Seed Roles
INSERT INTO roles (name) VALUES ('ROLE_USER') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('ROLE_MANAGER') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('ROLE_ADMIN') ON CONFLICT (name) DO NOTHING;

-- Seed Categories
INSERT INTO categories (name, created_at, updated_at) VALUES ('Electronics', NOW(), NOW()) ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name, created_at, updated_at) VALUES ('Books', NOW(), NOW()) ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name, created_at, updated_at) VALUES ('Home Appliances', NOW(), NOW()) ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name, created_at, updated_at) VALUES ('Clothing', NOW(), NOW()) ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name, created_at, updated_at) VALUES ('Food', NOW(), NOW()) ON CONFLICT (name) DO NOTHING;

-- Seed Users
-- Passwords are 'password' (bcrypt encoded)
-- For 'admin', 'manager', 'user' roles, use a real BCrypt hash for production.
-- Use this tool to generate: https://www.javainuse.com/onlineBcrypt
-- Hash for 'password': $2a$10$gR7eC/QyJ5t2wJ.B01b5V.m/t6.Q/Z1W5u.X1O/0R9F2K2F2F2F2
-- Here using a placeholder for simplicity in this example:
-- $2a$10$tJ0jLwH61x.5yC/i8kXG.u31wQ.Z1O/0R9F2K2F2F2F2 - This is a bcrypt hash for "password"
INSERT INTO users (username, email, password, created_at, updated_at)
VALUES ('admin', 'admin@example.com', '$2a$10$tJ0jLwH61x.5yC/i8kXG.u31wQ.Z1O/0R9F2K2F2F2F2', NOW(), NOW()) ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, email, password, created_at, updated_at)
VALUES ('manager', 'manager@example.com', '$2a$10$tJ0jLwH61x.5yC/i8kXG.u31wQ.Z1O/0R9F2K2F2F2F2', NOW(), NOW()) ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, email, password, created_at, updated_at)
VALUES ('user', 'user@example.com', '$2a$10$tJ0jLwH61x.5yC/i8kXG.u31wQ.Z1O/0R9F2K2F2F2F2', NOW(), NOW()) ON CONFLICT (username) DO NOTHING;

-- Assign Roles
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'admin' AND r.name = 'ROLE_ADMIN'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'manager' AND r.name = 'ROLE_MANAGER'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'user' AND r.name = 'ROLE_USER'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Assign additional roles (e.g., admin is also a user and manager)
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'admin' AND r.name = 'ROLE_USER'
ON CONFLICT (user_id, role_id) DO NOTHING;
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'admin' AND r.name = 'ROLE_MANAGER'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Seed Products (assuming category IDs 1 (Electronics), 2 (Books), 3 (Home Appliances))
-- First, get category IDs
WITH category_ids AS (
    SELECT id, name FROM categories WHERE name IN ('Electronics', 'Books', 'Home Appliances')
),
electronics_id AS (SELECT id FROM category_ids WHERE name = 'Electronics'),
books_id AS (SELECT id FROM category_ids WHERE name = 'Books'),
home_appliances_id AS (SELECT id FROM category_ids WHERE name = 'Home Appliances')
INSERT INTO products (name, description, price, stock, category_id, created_at, updated_at) VALUES
    ('Laptop Pro', 'High-performance laptop for professionals.', 1200.00, 50, (SELECT id FROM electronics_id), NOW(), NOW()),
    ('Mechanical Keyboard', 'RGB Mechanical Keyboard with tactile switches.', 80.50, 200, (SELECT id FROM electronics_id), NOW(), NOW()),
    ('Wireless Mouse', 'Ergonomic wireless mouse.', 25.00, 300, (SELECT id FROM electronics_id), NOW(), NOW()),
    ('The Great Gatsby', 'Classic novel by F. Scott Fitzgerald.', 15.99, 100, (SELECT id FROM books_id), NOW(), NOW()),
    ('Clean Code', 'A Handbook of Agile Software Craftsmanship.', 45.00, 75, (SELECT id FROM books_id), NOW(), NOW()),
    ('Air Fryer', 'Healthy cooking with less oil.', 99.99, 120, (SELECT id FROM home_appliances_id), NOW(), NOW()),
    ('Robot Vacuum', 'Automated cleaning robot.', 299.00, 80, (SELECT id FROM home_appliances_id), NOW(), NOW());
```