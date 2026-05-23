```sql
-- Seed Data for CMS

-- Users
-- Passwords are 'password123'
INSERT INTO users (username, email, password_hash, role) VALUES
('adminuser', 'admin@example.com', 'hashed_salt_password123_secure', 'admin'),
('editoruser', 'editor@example.com', 'hashed_salt_password123_secure', 'editor'),
('vieweruser', 'viewer@example.com', 'hashed_salt_password123_secure', 'viewer');

-- Categories
INSERT INTO categories (name, description) VALUES
('Technology', 'Articles related to software, hardware, and IT trends.'),
('News', 'Latest global and local news updates.'),
('Lifestyle', 'Topics on health, fitness, travel, and personal development.'),
('Tutorials', 'Step-by-step guides and how-to articles.');

-- Posts
INSERT INTO posts (title, content, author_id, category_id, published, content_type) VALUES
('Introduction to Drogon C++ Web Framework', 'Drogon is a C++17/20 based HTTP application framework. Lorem ipsum...', (SELECT id FROM users WHERE username = 'adminuser'), (SELECT id FROM categories WHERE name = 'Technology'), TRUE, 'markdown'),
('The Future of AI in Content Management', 'Artificial intelligence is set to revolutionize how we create, manage, and distribute content. This article explores the implications...', (SELECT id FROM users WHERE username = 'editoruser'), (SELECT id FROM categories WHERE name = 'Technology'), TRUE, 'markdown'),
('10 Tips for Effective Remote Work', 'Working from home can be challenging. Here are 10 tips to boost your productivity and well-being.', (SELECT id FROM users WHERE username = 'editoruser'), (SELECT id FROM categories WHERE name = 'Lifestyle'), TRUE, 'markdown'),
('Breaking News: Global Economic Outlook', 'An analysis of the current global economic situation and predictions for the coming quarter.', (SELECT id FROM users WHERE username = 'adminuser'), (SELECT id FROM categories WHERE name = 'News'), FALSE, 'markdown'), -- Unpublished post
('Getting Started with PostgreSQL', 'A beginner-friendly guide to installing and setting up PostgreSQL for your projects.', (SELECT id FROM users WHERE username = 'vieweruser'), (SELECT id FROM categories WHERE name = 'Tutorials'), TRUE, 'markdown');

-- Note: In a real scenario, 'hashed_salt_password123_secure' would be a real Argon2/bcrypt hash.
-- The actual hash generation is handled by `CMS::Models::UserMapper::hashPassword`.
```