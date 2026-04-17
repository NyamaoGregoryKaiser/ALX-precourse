-- V2__Seed_Data.sql

-- Insert Roles
INSERT INTO roles (name) VALUES ('ROLE_USER') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('ROLE_ADMIN') ON CONFLICT (name) DO NOTHING;

-- Insert Admin User (password is 'adminpass' encrypted with BCrypt)
INSERT INTO users (first_name, last_name, username, email, password, address, phone_number)
VALUES ('Admin', 'User', 'admin', 'admin@example.com', '$2a$10$iN44u7lM3wK4u5.9/s6yA.7vGfVp.M.K8d.S8d.K9g0d.0K9g0d.0', '123 Admin St', '555-1234')
ON CONFLICT (username) DO NOTHING;

-- Insert Regular User (password is 'userpass' encrypted with BCrypt)
INSERT INTO users (first_name, last_name, username, email, password, address, phone_number)
VALUES ('John', 'Doe', 'john.doe', 'john.doe@example.com', '$2a$10$wN3T3uY2rF3wY4l9b.5wG7.z.K7d.S8d.K9g0d.0K9g0d.0', '456 User Ave', '555-5678')
ON CONFLICT (username) DO NOTHING;

-- Assign Roles
-- Get role IDs (assuming roles are already inserted from previous statement)
DO $$
DECLARE
    admin_role_id BIGINT;
    user_role_id BIGINT;
    admin_user_id BIGINT;
    john_doe_id BIGINT;
BEGIN
    SELECT id INTO admin_role_id FROM roles WHERE name = 'ROLE_ADMIN';
    SELECT id INTO user_role_id FROM roles WHERE name = 'ROLE_USER';

    SELECT id INTO admin_user_id FROM users WHERE username = 'admin';
    SELECT id INTO john_doe_id FROM users WHERE username = 'john.doe';

    -- Admin user gets ADMIN and USER roles
    IF admin_user_id IS NOT NULL AND admin_role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id) VALUES (admin_user_id, admin_role_id) ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
    IF admin_user_id IS NOT NULL AND user_role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id) VALUES (admin_user_id, user_role_id) ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;

    -- John Doe gets USER role
    IF john_doe_id IS NOT NULL AND user_role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id) VALUES (john_doe_id, user_role_id) ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;

END $$;


-- Insert Categories
INSERT INTO categories (name, description) VALUES
('Electronics', 'Gadgets and electronic devices.'),
('Books', 'Fiction and non-fiction books.'),
('Apparel', 'Clothing and fashion accessories.')
ON CONFLICT (name) DO NOTHING;

-- Insert Products
DO $$
DECLARE
    electronics_id BIGINT;
    books_id BIGINT;
    apparel_id BIGINT;
BEGIN
    SELECT id INTO electronics_id FROM categories WHERE name = 'Electronics';
    SELECT id INTO books_id FROM categories WHERE name = 'Books';
    SELECT id INTO apparel_id FROM categories WHERE name = 'Apparel';

    IF electronics_id IS NOT NULL THEN
        INSERT INTO products (name, description, price, stock_quantity, image_url, category_id) VALUES
        ('Laptop Pro 15', 'High-performance laptop with M2 chip and 16GB RAM.', 1499.99, 50, 'https://example.com/laptop.jpg', electronics_id),
        ('Wireless Headphones', 'Noise-cancelling over-ear headphones with 30-hour battery life.', 199.99, 120, 'https://example.com/headphones.jpg', electronics_id),
        ('Smartwatch Series 7', 'Latest smartwatch with health tracking and GPS.', 349.99, 80, 'https://example.com/smartwatch.jpg', electronics_id);
    END IF;

    IF books_id IS NOT NULL THEN
        INSERT INTO products (name, description, price, stock_quantity, image_url, category_id) VALUES
        ('The Great Novel', 'A captivating story of adventure and discovery.', 25.00, 200, 'https://example.com/novel.jpg', books_id),
        ('Learning Java in 24 Hours', 'Beginner-friendly guide to Java programming.', 35.50, 150, 'https://example.com/java_book.jpg', books_id);
    END IF;

    IF apparel_id IS NOT NULL THEN
        INSERT INTO products (name, description, price, stock_quantity, image_url, category_id) VALUES
        ('Classic T-Shirt', '100% cotton, comfortable fit, available in multiple colors.', 19.99, 500, 'https://example.com/tshirt.jpg', apparel_id),
        ('Denim Jeans Slim Fit', 'Stylish slim-fit jeans for everyday wear.', 59.99, 100, 'https://example.com/jeans.jpg', apparel_id);
    END IF;
END $$;


-- Insert Reviews
DO $$
DECLARE
    john_doe_id BIGINT;
    laptop_pro_id BIGINT;
    headphones_id BIGINT;
    java_book_id BIGINT;
BEGIN
    SELECT id INTO john_doe_id FROM users WHERE username = 'john.doe';
    SELECT id INTO laptop_pro_id FROM products WHERE name = 'Laptop Pro 15';
    SELECT id INTO headphones_id FROM products WHERE name = 'Wireless Headphones';
    SELECT id INTO java_book_id FROM products WHERE name = 'Learning Java in 24 Hours';

    IF john_doe_id IS NOT NULL AND laptop_pro_id IS NOT NULL THEN
        INSERT INTO reviews (product_id, user_id, rating, comment) VALUES
        (laptop_pro_id, john_doe_id, 5, 'Absolutely love this laptop! Super fast and reliable.');
    END IF;

    IF john_doe_id IS NOT NULL AND headphones_id IS NOT NULL THEN
        INSERT INTO reviews (product_id, user_id, rating, comment) VALUES
        (headphones_id, john_doe_id, 4, 'Great sound quality, but a bit uncomfortable after long use.');
    END IF;

    IF john_doe_id IS NOT NULL AND java_book_id IS NOT NULL THEN
        INSERT INTO reviews (product_id, user_id, rating, comment) VALUES
        (java_book_id, john_doe_id, 3, 'Good for beginners, but lacks in-depth examples.');
    END IF;
END $$;


-- Insert Orders (example, manually created for specific products)
DO $$
DECLARE
    john_doe_id BIGINT;
    laptop_pro_id BIGINT;
    headphones_id BIGINT;
    order1_id BIGINT;
    order2_id BIGINT;
BEGIN
    SELECT id INTO john_doe_id FROM users WHERE username = 'john.doe';
    SELECT id INTO laptop_pro_id FROM products WHERE name = 'Laptop Pro 15';
    SELECT id INTO headphones_id FROM products WHERE name = 'Wireless Headphones';

    IF john_doe_id IS NOT NULL AND laptop_pro_id IS NOT NULL THEN
        -- Order 1 for John Doe
        INSERT INTO orders (user_id, total_amount, status, shipping_address)
        VALUES (john_doe_id, 1499.99, 'DELIVERED', '456 User Ave, Apt 101, City, State, 10001')
        RETURNING id INTO order1_id;

        INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
        VALUES (order1_id, laptop_pro_id, 1, 1499.99);
    END IF;

    IF john_doe_id IS NOT NULL AND headphones_id IS NOT NULL THEN
        -- Order 2 for John Doe (pending)
        INSERT INTO orders (user_id, total_amount, status, shipping_address)
        VALUES (john_doe_id, 399.98, 'PENDING', '456 User Ave, Apt 101, City, State, 10001')
        RETURNING id INTO order2_id;

        INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
        VALUES (order2_id, headphones_id, 2, 199.99);
    END IF;

END $$;
```

### 3. Configuration & Setup

**src/main/resources/logback-spring.xml**

```xml