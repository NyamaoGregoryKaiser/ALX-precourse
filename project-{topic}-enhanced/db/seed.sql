-- Insert a default admin user (password 'adminpass' hashed with SHA256)
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@example.com', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'ADMIN')
ON CONFLICT (username) DO NOTHING; -- Avoid re-inserting if it exists

-- Insert a default regular user (password 'userpass' hashed with SHA256)
INSERT INTO users (username, email, password_hash, role) VALUES
('testuser', 'testuser@example.com', '98e29a8a25c1b69606820c74b9715978f0d5564887375a0242220d52467554f7', 'USER')
ON CONFLICT (username) DO NOTHING;

-- Get user IDs for seeding scrape jobs
SELECT id INTO @admin_id FROM users WHERE username = 'admin';
SELECT id INTO @testuser_id FROM users WHERE username = 'testuser';

-- Insert example scrape jobs for admin
INSERT INTO scrape_jobs (user_id, name, target_url, selectors, cron_schedule, status) VALUES
(@admin_id, 'Example Product Page Scraper', 'http://quotes.toscrape.com', '[{"key": "quote_text", "selector": "span.text"}, {"key": "author", "selector": "small.author"}]'::jsonb, 'every_10_minutes', 'PENDING'),
(@admin_id, 'News Headline Scraper', 'http://example.com', '[{"key": "title", "selector": "h1"}, {"key": "paragraph", "selector": "p"}]'::jsonb, 'manual', 'PENDING')
ON CONFLICT (name) DO NOTHING; -- Name uniqueness is not enforced, but good practice for seed data

-- Insert example scrape job for testuser
INSERT INTO scrape_jobs (user_id, name, target_url, selectors, cron_schedule, status) VALUES
(@testuser_id, 'Test User Simple Scraper', 'https://www.google.com/search?q=hello', '[{"key": "result_stats", "selector": "#result-stats"}]'::jsonb, 'manual', 'PENDING')
ON CONFLICT (name) DO NOTHING;