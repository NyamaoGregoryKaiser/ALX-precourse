```sql
-- V2__Add_users_roles_data.sql
-- Seed initial user data.

-- Insert a default admin user
-- Password for 'adminuser' is 'adminpass' (encoded with BCrypt for security)
-- Password for 'testuser' is 'testpass' (encoded with BCrypt for security)
INSERT INTO users (id, username, password, email, role, created_at, updated_at) VALUES
(gen_random_uuid(), 'adminuser', '$2a$10$w8c7.D/xWJz.4N8M1x.EHe2k.e1Y0p1P7qG.8jZ1s.7K.x.8n3Y8i', 'admin@example.com', 'ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'testuser', '$2a$10$Q7i3q.J4N7R0b8M0z9x.Fh3k.g2Y1p2P8rG.9jZ2s.8K.y.9o4Y9j', 'test@example.com', 'USER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Note on password hashing:
-- The provided bcrypt hashes are example static hashes.
-- For real applications, passwords should always be hashed dynamically
-- during user registration.
--
-- 'adminpass' -> $2a$10$w8c7.D/xWJz.4N8M1x.EHe2k.e1Y0p1P7qG.8jZ1s.7K.x.8n3Y8i
-- 'testpass'  -> $2a$10$Q7i3q.J4N7R0b8M0z9x.Fh3k.g2Y1p2P8rG.9jZ2s.8K.y.9o4Y9j

-- You can retrieve the UUIDs of the inserted users for further testing if needed:
-- SELECT id, username FROM users;

-- Example: Insert a scraping task for 'testuser' (you'd need to manually get testuser's UUID)
-- To get 'testuser' ID: SELECT id FROM users WHERE username = 'testuser';
-- Let's assume testuser_id = 'a1b2c3d4-e5f6-7890-1234-567890abcdef' for this example.
-- In a real scenario, you'd integrate this with your application's logic or generate dynamically.

-- Example scraping task definition (assuming 'a1b2c3d4-e5f6-7890-1234-567890abcdef' is a valid user ID)
-- This assumes a website structure like:
-- <div class="product-item">
--    <h2 class="product-name">Product A</h2>
--    <span class="product-price">$100</span>
--    <a href="/details/product-a" class="product-link">Details</a>
-- </div>
-- etc.
DO $$
DECLARE
    testuser_id UUID;
    example_task_id UUID;
BEGIN
    SELECT id INTO testuser_id FROM users WHERE username = 'testuser';

    IF testuser_id IS NOT NULL THEN
        INSERT INTO scraping_tasks (id, user_id, name, target_url, status, cron_expression, created_at, updated_at, last_run_at, last_run_message) VALUES
        (gen_random_uuid(), testuser_id, 'Example Product Scraper', 'https://example.com/products', 'SCHEDULED', '0 0 12 * * ?', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL)
        RETURNING id INTO example_task_id;

        -- Insert data fields for the example task
        INSERT INTO task_data_fields (task_id, field_name, css_selector, attribute) VALUES
        (example_task_id, 'productName', '.product-item .product-name', NULL),
        (example_task_id, 'productPrice', '.product-item .product-price', NULL),
        (example_task_id, 'productUrl', '.product-item .product-link', 'href');
    END IF;
END $$;
```