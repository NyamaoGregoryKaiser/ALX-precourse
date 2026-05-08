```sql
-- Seed data for initial setup

-- Roles
INSERT INTO roles (id, name) VALUES (1, 'ROLE_USER') ON CONFLICT (id) DO NOTHING;
INSERT INTO roles (id, name) VALUES (2, 'ROLE_ORGANIZER') ON CONFLICT (id) DO NOTHING;
INSERT INTO roles (id, name) VALUES (3, 'ROLE_ADMIN') ON CONFLICT (id) DO NOTHING;

-- Categories
INSERT INTO categories (id, name, description) VALUES (1, 'Concert', 'Live music performances') ON CONFLICT (id) DO NOTHING;
INSERT INTO categories (id, name, description) VALUES (2, 'Festival', 'Multi-day events with various activities') ON CONFLICT (id) DO NOTHING;
INSERT INTO categories (id, name, description) VALUES (3, 'Conference', 'Professional gatherings for knowledge sharing') ON CONFLICT (id) DO NOTHING;
INSERT INTO categories (id, name, description) VALUES (4, 'Sports', 'Sporting events and competitions') ON CONFLICT (id) DO NOTHING;
INSERT INTO categories (id, name, description) VALUES (5, 'Workshop', 'Interactive educational sessions') ON CONFLICT (id) DO NOTHING;

-- Admin User (password is 'adminpassword', encoded with BCrypt)
-- You should generate this password with BCryptPasswordEncoder
-- E.g., `new BCryptPasswordEncoder().encode("adminpassword")`
INSERT INTO users (id, username, password, email, first_name, last_name, created_at, updated_at)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin',
    '$2a$10$v0a00s000s000s000s000e00t00e00d00r00a00g00i00s00n00i00n00g0000000', -- This is a placeholder, REPLACE WITH ACTUAL HASH for 'adminpassword'
    'admin@example.com',
    'System',
    'Admin',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

-- Assign ADMIN role to the admin user
INSERT INTO user_roles (user_id, role_id)
SELECT (SELECT id FROM users WHERE username = 'admin'), (SELECT id FROM roles WHERE name = 'ROLE_ADMIN')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Example Organizer User (password is 'organizerpassword')
INSERT INTO users (id, username, password, email, first_name, last_name, created_at, updated_at)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'organizer1',
    '$2a$10$v0a00s000s000s000s000e00t00e00d00r00a00g00i00s00n00i00n00g0000000', -- Placeholder, REPLACE WITH ACTUAL HASH for 'organizerpassword'
    'organizer1@example.com',
    'Org',
    'User',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

-- Assign ORGANIZER role to organizer1
INSERT INTO user_roles (user_id, role_id)
SELECT (SELECT id FROM users WHERE username = 'organizer1'), (SELECT id FROM roles WHERE name = 'ROLE_ORGANIZER')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Example Regular User (password is 'userpassword')
INSERT INTO users (id, username, password, email, first_name, last_name, created_at, updated_at)
VALUES (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    'user1',
    '$2a$10$v0a00s000s000s000s000e00t00e00d00r00a00g00i00s00n00i00n00i00g0000000', -- Placeholder, REPLACE WITH ACTUAL HASH for 'userpassword'
    'user1@example.com',
    'Regular',
    'User',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

-- Assign USER role to user1
INSERT INTO user_roles (user_id, role_id)
SELECT (SELECT id FROM users WHERE username = 'user1'), (SELECT id FROM roles WHERE name = 'ROLE_USER')
ON CONFLICT (user_id, role_id) DO NOTHING;
```