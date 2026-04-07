```sql
-- Seed Data for WebScraper
-- This file assumes the schema from 001_initial_schema.sql is already applied.

-- Seed Users
INSERT INTO users (id, username, email, password_hash) VALUES
('b3014c2b-8a8b-4a5d-8b01-1b2c3d4e5f60', 'testuser', 'test@example.com', 'c2FsdF9jb2RlMA==$770e59c5d1e8c7553b47e24a73740203f533a1e1b4097f4a2113337f7a731d10'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'adminuser', 'admin@example.com', 'c2FsdF9jb2RlMQ==$3d6067759231f7a83d3e6015b3c4f275a28b0669c5e3240e0242137e38287510');
-- The password hash here is a placeholder (simplified 'salt_codeX' + 'password123' SHA256)
-- In a real app, generate these hashes properly with a robust salt.
-- For 'testuser', password_hash = base64_encode("salt_code0") + "$" + sha256("password123salt_code0")
-- For 'adminuser', password_hash = base64_encode("salt_code1") + "$" + sha256("adminpassword!@#salt_code1")

-- Seed Scraping Jobs for testuser
INSERT INTO scraping_jobs (id, user_id, name, description, status, run_interval_seconds, is_active) VALUES
('b3014c2b-8a8b-4a5d-8b01-1b2c3d4e5f61', 'b3014c2b-8a8b-4a5d-8b01-1b2c3d4e5f60', 'Daily News Scrape', 'Scrape top headlines daily', 'completed', 86400, TRUE),
('b3014c2b-8a8b-4a5d-8b01-1b2c3d4e5f62', 'b3014c2b-8a8b-4a5d-8b01-1b2c3d4e5f60', 'Product Price Check', 'Check prices of specific products hourly', 'pending', 3600, TRUE),
('b3014c2b-8a8b-4a5d-8b01-1b2c3d4e5f63', 'b3014c2b-8a8b-4a5d-8b01-1b2c3d4e5f60', 'One-time Blog Post', 'Scrape a single blog post once', 'pending', 0, TRUE);

-- Seed Scraping Targets for Daily News Scrape job
INSERT INTO scraping_targets (id, job_id, url, method, selectors) VALUES
('c1014c2b-8a8b-4a5d-8b01-1b2c3d4e5f61', 'b3014c2b-8a8b-4a5d-8b01-1b2c3d4e5f61', 'http://quotes.toscrape.com/', 'GET', '{
    "title": "h1.col-md-8 a",
    "top_quotes": ".quote .text",
    "authors": ".quote .author"
}'::jsonb);

-- Seed Scraping Targets for Product Price Check job
INSERT INTO scraping_targets (id, job_id, url, method, selectors) VALUES
('c1014c2b-8a8b-4a5d-8b01-1b2c3d4e5f62', 'b3014c2b-8a8b-4a5d-8b01-1b2c3d4e5f62', 'http://quotes.toscrape.com/tag/love/', 'GET', '{
    "quotes_about_love": ".quote .text"
}'::jsonb);

-- Seed Scraped Results for Daily News Scrape (example data)
INSERT INTO scraped_results (job_id, target_id, data) VALUES
('b3014c2b-8a8b-4a5d-8b01-1b2c3d4e5f61', 'c1014c2b-8a8b-4a5d-8b01-1b2c3d4e5f61', '{
    "title": "Quotes to Scrape",
    "top_quotes": [
        "“The world as we have created it is a process of our thinking. It cannot be changed without changing our thinking.”",
        "“It is our choices, Harry, that show what we truly are, far more than our abilities.”"
    ],
    "authors": [
        "Albert Einstein",
        "J.K. Rowling"
    ]
}'::jsonb);

INSERT INTO scraped_results (job_id, target_id, data) VALUES
('b3014c2b-8a8b-4a5d-8b01-1b2c3d4e5f61', 'c1014c2b-8a8b-4a5d-8b01-1b2c3d4e5f61', '{
    "title": "Quotes to Scrape",
    "top_quotes": [
        "“There are only two ways to live your life. One is as though nothing is a miracle. The other is as though everything is a miracle.”"
    ],
    "authors": [
        "Albert Einstein"
    ]
}'::jsonb);
```