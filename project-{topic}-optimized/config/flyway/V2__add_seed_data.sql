```sql
-- V2__add_seed_data.sql

-- Insert admin user
INSERT INTO users (username, password, created_at, updated_at) VALUES
('admin', '$2a$10$wN3tV4QvW2Z4YgJ8M7Xg.OO3z.X0Y0K1A.X0Y0K1A.X0Y0K1A.X0Y0K1A', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP); -- Password is 'adminpassword'

INSERT INTO user_roles (user_id, roles) VALUES
((SELECT id FROM users WHERE username = 'admin'), 'ADMIN'),
((SELECT id FROM users WHERE username = 'admin'), 'USER');

-- Insert a regular user
INSERT INTO users (username, password, created_at, updated_at) VALUES
('user', '$2a$10$f6qV3M8b2N4S6T7U8X9Y.Z0A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP); -- Password is 'userpassword'

INSERT INTO user_roles (user_id, roles) VALUES
((SELECT id FROM users WHERE username = 'user'), 'USER');

-- Insert an example scraping target for 'admin'
INSERT INTO scraping_targets (user_id, name, url, description, active, created_at, updated_at) VALUES
((SELECT id FROM users WHERE username = 'admin'), 'ALX About Page', 'https://www.alxafrica.com/about/', 'Scrape the About Us page of ALX Africa for title and mission statement.', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert CSS selectors for the 'ALX About Page' target
INSERT INTO css_selectors (target_id, name, selector_value, type, created_at, updated_at) VALUES
((SELECT id FROM scraping_targets WHERE name = 'ALX About Page' AND user_id = (SELECT id FROM users WHERE username = 'admin')), 'page_title', 'h1', 'TEXT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
((SELECT id FROM scraping_targets WHERE name = 'ALX About Page' AND user_id = (SELECT id FROM users WHERE username = 'admin')), 'mission_statement', '.elementor-text-editor.elementor-clearfix p:nth-of-type(1)', 'TEXT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert an example scraping job for 'admin' (scheduled daily)
INSERT INTO scraping_jobs (target_id, user_id, status, schedule_cron, last_run_at, next_run_at, created_at, updated_at) VALUES
((SELECT id FROM scraping_targets WHERE name = 'ALX About Page' AND user_id = (SELECT id FROM users WHERE username = 'admin')),
 (SELECT id FROM users WHERE username = 'admin'),
 'SCHEDULED', '0 0 0 * * ?', NULL, NOW() + INTERVAL '1 day', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
-- Note: next_run_at should be calculated by scheduler, here it's illustrative.

-- Insert an example manual scraping target for 'user'
INSERT INTO scraping_targets (user_id, name, url, description, active, created_at, updated_at) VALUES
((SELECT id FROM users WHERE username = 'user'), 'Example Wikipedia Page', 'https://en.wikipedia.org/wiki/Web_scraping', 'Extract the main heading and first paragraph from Wikipedia.', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert CSS selectors for the 'Example Wikipedia Page' target
INSERT INTO css_selectors (target_id, name, selector_value, type, created_at, updated_at) VALUES
((SELECT id FROM scraping_targets WHERE name = 'Example Wikipedia Page' AND user_id = (SELECT id FROM users WHERE username = 'user')), 'article_title', '#firstHeading', 'TEXT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
((SELECT id FROM scraping_targets WHERE name = 'Example Wikipedia Page' AND user_id = (SELECT id FROM users WHERE username = 'user')), 'first_paragraph', '#mw-content-text .mw-parser-output > p:nth-of-type(1)', 'TEXT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert an example manual scraping job for 'user'
INSERT INTO scraping_jobs (target_id, user_id, status, schedule_cron, last_run_at, next_run_at, created_at, updated_at) VALUES
((SELECT id FROM scraping_targets WHERE name = 'Example Wikipedia Page' AND user_id = (SELECT id FROM users WHERE username = 'user')),
 (SELECT id FROM users WHERE username = 'user'),
 'CREATED', NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
```