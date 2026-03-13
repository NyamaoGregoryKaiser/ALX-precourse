-- seed.sql
-- This script inserts initial data into the CMS database.

-- Insert an admin user
INSERT INTO users (id, username, email, password_hash, role)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Fixed UUID for consistency in seeding
    'admin',
    'admin@example.com',
    '$2a$10$WkG.1.L7/o4ZkH0F9P282.q2O6jO7X.9Y2P4g9k0S.C0h0F.2F.4', -- Hashed 'password'
    'admin'
)
ON CONFLICT (username) DO NOTHING;

-- Insert an editor user
INSERT INTO users (id, username, email, password_hash, role)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'editor',
    'editor@example.com',
    '$2a$10$WkG.1.L7/o4ZkH0F9P282.q2O6jO7X.9Y2P4g9k0S.C0h0F.2F.4', -- Hashed 'password'
    'editor'
)
ON CONFLICT (username) DO NOTHING;


-- Insert some initial content
INSERT INTO content (id, title, slug, body, author_id, status, published_at)
VALUES (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'Welcome to the ALX C++ CMS',
    'welcome-to-alx-cpp-cms',
    'This is the first piece of content in our new C++ CMS. It demonstrates basic content management capabilities.',
    (SELECT id FROM users WHERE username = 'admin'),
    'published',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO content (id, title, slug, body, author_id, status)
VALUES (
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    'Draft Article Example',
    'draft-article-example',
    'This article is currently in draft status and not yet visible to the public.',
    (SELECT id FROM users WHERE username = 'editor'),
    'draft'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO content (id, title, slug, body, author_id, status, published_at)
VALUES (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
    'Another Published Post',
    'another-published-post',
    'Here is another article demonstrating the content publishing workflow.',
    (SELECT id FROM users WHERE username = 'admin'),
    'published',
    CURRENT_TIMESTAMP - INTERVAL '1 hour'
)
ON CONFLICT (slug) DO NOTHING;
```