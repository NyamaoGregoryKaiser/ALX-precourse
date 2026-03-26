-- Seed data for testing and initial setup

-- Users
INSERT INTO users (username, email, password_hash, role, created_at, updated_at) VALUES
('adminuser', 'admin@example.com', '$2a$12$R.S/XfWwG8B7G.P5V0j7N.kKq2Q2g4T9E.X0D.X9Q0N0E5Z0O0C0K0L', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('editoruser', 'editor@example.com', '$2a$12$R.S/XfWwG8B7G.P5V0j7N.kKq2Q2g4T9E.X0D.X9Q0N0E5Z0O0C0K0L', 'editor', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('testuser', 'test@example.com', '$2a$12$R.S/XfWwG8B7G.P5V0j7N.kKq2Q2g4T9E.X0D.X9Q0N0E5Z0O0C0K0L', 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
-- Note: '$2a$12$R.S/XfWwG8B7G.P5V0j7N.kKq2Q2g4T9E.X0D.X9Q0N0E5Z0O0C0K0L' is a bcrypt hash for "password123".
-- Always use proper hashing in production.

-- Categories
INSERT INTO categories (name, slug, description, created_at, updated_at) VALUES
('Technology', 'technology', 'Articles related to technology and software.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Science', 'science', 'Latest discoveries and research in science.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Health', 'health', 'Wellness and health-related content.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Content
INSERT INTO content (title, slug, body, summary, status, type, author_id, category_id, published_at, created_at, updated_at) VALUES
('Getting Started with C++ CMS', 'getting-started-cpp-cms', 'This is the full body of the C++ CMS introductory article...', 'An introduction to building a CMS with C++.', 'published', 'post', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('The Future of Web Development', 'future-web-dev', 'Exploring new trends and technologies in web development...', 'A look at emerging web technologies.', 'published', 'post', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Healthy Eating Habits', 'healthy-eating-habits', 'Tips and tricks for maintaining a healthy diet.', 'Practical advice for a healthier lifestyle.', 'draft', 'post', 2, 3, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('About Us', 'about-us', 'Information about our company and mission.', 'Learn more about us.', 'published', 'page', 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Comments
INSERT INTO comments (content, author_id, content_id, status, created_at, updated_at) VALUES
('Great article, very insightful!', 3, 1, 'approved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('I have a question about the backend framework.', 2, 1, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Looking forward to more content!', 3, 2, 'approved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);