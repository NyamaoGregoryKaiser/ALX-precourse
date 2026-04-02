```sql
-- V2__insert_initial_data.sql

-- Insert default roles
INSERT INTO roles (name) VALUES ('ROLE_USER') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('ROLE_MODERATOR') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('ROLE_ADMIN') ON CONFLICT (name) DO NOTHING;

-- Insert a default admin user
-- Password for 'admin@example.com' is 'adminpass' (encoded with BCrypt for security)
-- Use a password encoder in your Spring Boot application to generate real passwords.
-- Example for 'adminpass': $2a$10$wK1k.rS/YhD4o1cQ/9D3S.uW/Lw4.Z8fB9R5hRj7mO0M9j8L7k.f (change this!)
INSERT INTO users (username, email, password, created_at, updated_at) VALUES
('admin', 'admin@example.com', '$2a$10$wK1k.rS/YhD4o1cQ/9D3S.uW/Lw4.Z8fB9R5hRj7mO0M9j8L7k.f', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username, password = EXCLUDED.password, updated_at = EXCLUDED.updated_at;

-- Insert a default moderator user
-- Password for 'mod@example.com' is 'modpass'
-- Example for 'modpass': $2a$10$j.y0xV/P8zG9g6v5i2k0j.c/S.gB.hJ.tH.yL7k.fO0M9j8L7k.f (change this!)
INSERT INTO users (username, email, password, created_at, updated_at) VALUES
('moderator', 'mod@example.com', '$2a$10$j.y0xV/P8zG9g6v5i2k0j.c/S.gB.hJ.tH.yL7k.fO0M9j8L7k.f', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username, password = EXCLUDED.password, updated_at = EXCLUDED.updated_at;

-- Insert a default regular user
-- Password for 'user@example.com' is 'userpass'
-- Example for 'userpass': $2a$10$Q.kL7vP9zG9g6v5i2k0j.c/S.gB.hJ.tH.yL7k.fO0M9j8L7k.f (change this!)
INSERT INTO users (username, email, password, created_at, updated_at) VALUES
('testuser', 'user@example.com', '$2a$10$Q.kL7vP9zG9g6v5i2k0j.c/S.gB.hJ.tH.yL7k.fO0M9j8L7k.f', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username, password = EXCLUDED.password, updated_at = EXCLUDED.updated_at;


-- Assign roles to users
-- Admin gets ADMIN role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'admin@example.com' AND r.name = 'ROLE_ADMIN'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Moderator gets MODERATOR and USER roles
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'mod@example.com' AND r.name = 'ROLE_MODERATOR'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'mod@example.com' AND r.name = 'ROLE_USER'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Regular user gets USER role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'user@example.com' AND r.name = 'ROLE_USER'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Insert some default categories
INSERT INTO categories (name, description, created_at, updated_at) VALUES
('Technology', 'Articles about technology and software development', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (name) DO NOTHING,
('Science', 'Explorations into various scientific fields', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (name) DO NOTHING,
('Education', 'Educational resources and learning guides', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (name) DO NOTHING;

-- Insert some default tags
INSERT INTO tags (name, created_at, updated_at) VALUES
('Java', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (name) DO NOTHING,
('Spring Boot', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (name) DO NOTHING,
('Database', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (name) DO NOTHING,
('CMS', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (name) DO NOTHING,
('ALX', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (name) DO NOTHING;

-- Insert sample content
INSERT INTO contents (title, slug, body, published_at, published, created_at, updated_at, author_id, category_id)
SELECT
    'Introduction to ALX Software Engineering',
    'introduction-to-alx-software-engineering',
    'This article provides an overview of the ALX Software Engineering program, covering its goals, curriculum, and impact on aspiring software developers. It emphasizes practical skills and problem-solving.',
    CURRENT_TIMESTAMP,
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    (SELECT id FROM users WHERE email = 'admin@example.com'),
    (SELECT id FROM categories WHERE name = 'Education')
WHERE NOT EXISTS (SELECT 1 FROM contents WHERE slug = 'introduction-to-alx-software-engineering');

INSERT INTO contents (title, slug, body, published_at, published, created_at, updated_at, author_id, category_id)
SELECT
    'Building a RESTful API with Spring Boot',
    'building-restful-api-spring-boot',
    'A step-by-step guide to developing robust RESTful APIs using Spring Boot, focusing on best practices, error handling, and security. This covers basic CRUD operations.',
    CURRENT_TIMESTAMP,
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    (SELECT id FROM users WHERE email = 'mod@example.com'),
    (SELECT id FROM categories WHERE name = 'Technology')
WHERE NOT EXISTS (SELECT 1 FROM contents WHERE slug = 'building-restful-api-spring-boot');

INSERT INTO contents (title, slug, body, published_at, published, created_at, updated_at, author_id, category_id)
SELECT
    'Understanding Database Migrations with Flyway',
    'understanding-database-migrations-flyway',
    'Explore the importance of database migration tools like Flyway for managing schema changes in a controlled and versioned manner, ensuring consistency across environments.',
    CURRENT_TIMESTAMP,
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    (SELECT id FROM users WHERE email = 'user@example.com'),
    (SELECT id FROM categories WHERE name = 'Technology')
WHERE NOT EXISTS (SELECT 1 FROM contents WHERE slug = 'understanding-database-migrations-flyway');

INSERT INTO contents (title, slug, body, published_at, published, created_at, updated_at, author_id, category_id)
SELECT
    'The Future of AI in Content Creation',
    'the-future-of-ai-in-content-creation',
    'Discussing how Artificial Intelligence is transforming the landscape of content generation, from automated writing to intelligent content recommendations.',
    CURRENT_TIMESTAMP,
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    (SELECT id FROM users WHERE email = 'admin@example.com'),
    (SELECT id FROM categories WHERE name = 'Science')
WHERE NOT EXISTS (SELECT 1 FROM contents WHERE slug = 'the-future-of-ai-in-content-creation');


-- Link content to tags
-- Content 1: 'Introduction to ALX Software Engineering' (Java, ALX, CMS)
INSERT INTO content_tags (content_id, tag_id)
SELECT c.id, t.id
FROM contents c, tags t
WHERE c.slug = 'introduction-to-alx-software-engineering' AND t.name IN ('Java', 'ALX', 'CMS')
ON CONFLICT (content_id, tag_id) DO NOTHING;

-- Content 2: 'Building a RESTful API with Spring Boot' (Java, Spring Boot, API)
INSERT INTO content_tags (content_id, tag_id)
SELECT c.id, t.id
FROM contents c, tags t
WHERE c.slug = 'building-restful-api-spring-boot' AND t.name IN ('Java', 'Spring Boot')
ON CONFLICT (content_id, tag_id) DO NOTHING;

-- Content 3: 'Understanding Database Migrations with Flyway' (Database, Java)
INSERT INTO content_tags (content_id, tag_id)
SELECT c.id, t.id
FROM contents c, tags t
WHERE c.slug = 'understanding-database-migrations-flyway' AND t.name IN ('Database', 'Java')
ON CONFLICT (content_id, tag_id) DO NOTHING;

-- Content 4: 'The Future of AI in Content Creation' (CMS, Technology)
INSERT INTO content_tags (content_id, tag_id)
SELECT c.id, t.id
FROM contents c, tags t
WHERE c.slug = 'the-future-of-ai-in-content-creation' AND t.name IN ('CMS', 'Spring Boot') -- Using Spring Boot as generic 'technology' tag here
ON CONFLICT (content_id, tag_id) DO NOTHING;
```