```sql
-- V2__Add_Seed_Data.sql

-- Add default categories
INSERT INTO categories (id, name, description) VALUES
(101, 'Electronics', 'Gadgets and electronic devices.'),
(102, 'Books', 'Fiction, non-fiction, and educational books.'),
(103, 'Apparel', 'Clothing and accessories for all.'),
(104, 'Home & Kitchen', 'Essentials for your home and kitchen.');

-- Add a default admin user (password 'adminpass') and a regular user (password 'userpass')
INSERT INTO users (id, username, email, password_hash, first_name, last_name, role) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin', 'admin@example.com', '$2a$10$T806k9dK5vVj7W2mPj2D1.l.1j1S7R8v0s8h0s0h0s0h0s0h0s0h0s0h0s0h0s0h', 'Admin', 'User', 'ADMIN'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'johndoe', 'john.doe@example.com', '$2a$10$T806k9dK5vVj7W2mPj2D1.l.1j1S7R8v0s8h0s0h0s0h0s0h0s0h0s0h0s0h0s0h', 'John', 'Doe', 'CUSTOMER');

-- Add some products
INSERT INTO products (id, name, description, price, stock_quantity, category_id, image_url) VALUES
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Laptop Pro X', 'Powerful laptop for professionals.', 1200.00, 50, 101, 'https://example.com/laptop.jpg'),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'The Great Novel', 'A captivating story for all ages.', 25.99, 100, 102, 'https://example.com/novel.jpg'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Cotton T-Shirt', 'Comfortable and stylish cotton t-shirt.', 19.99, 200, 103, 'https://example.com/tshirt.jpg'),
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'Smartwatch Series 5', 'Track your fitness and stay connected.', 299.00, 75, 101, 'https://example.com/smartwatch.jpg'),
('11eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'Cookbook Essentials', 'Recipes for everyday cooking.', 35.00, 60, 104, 'https://example.com/cookbook.jpg');

-- Ensure sequence for categories is updated
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));
```